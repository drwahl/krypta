import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { MatrixEvent } from 'matrix-js-sdk';
import { useMatrix } from '../MatrixContext';

type NotificationMode = 'all' | 'muted' | 'allowed';

interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  mentionsOnly: boolean;
  volume: number;
  mode: NotificationMode;
  mutedRooms: string[];
  allowedRooms: string[];
  soundType: 'beep' | 'bell' | 'chime' | 'custom';
  customSoundUrl: string | null;
}

interface NotificationContextType {
  settings: NotificationSettings;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  requestPermission: () => Promise<boolean>;
  hasPermission: boolean;
  isRoomMuted: (roomId: string) => boolean;
  toggleRoomMute: (roomId: string) => void;
  toggleRoomAllow: (roomId: string) => void;
  shouldNotifyForRoom: (roomId: string) => boolean;
  uploadCustomSound: (file: File) => Promise<void>;
  playNotificationSound: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { client, currentRoom } = useMatrix();
  const [hasPermission, setHasPermission] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );

  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const stored = localStorage.getItem('nychatt_notification_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure new fields exist
      return {
        enabled: parsed.enabled ?? true,
        sound: parsed.sound ?? true,
        desktop: parsed.desktop ?? true,
        mentionsOnly: parsed.mentionsOnly ?? false,
        volume: parsed.volume ?? 0.5,
        mode: parsed.mode ?? 'all',
        mutedRooms: parsed.mutedRooms ?? [],
        allowedRooms: parsed.allowedRooms ?? [],
        soundType: parsed.soundType ?? 'beep',
        customSoundUrl: parsed.customSoundUrl ?? null,
      };
    }
    return {
      enabled: true,
      sound: true,
      desktop: true,
      mentionsOnly: false,
      volume: 0.5,
      mode: 'all',
      mutedRooms: [],
      allowedRooms: [],
      soundType: 'beep',
      customSoundUrl: null,
    };
  });

  // Audio notification sound
  const playNotificationSound = useCallback(() => {
    if (!settings.sound || settings.volume === 0) return;

    // Custom sound file
    if (settings.soundType === 'custom' && settings.customSoundUrl) {
      try {
        const audio = new Audio(settings.customSoundUrl);
        audio.volume = settings.volume;
        audio.play().catch(error => {
          console.error('Failed to play custom sound:', error);
        });
      } catch (error) {
        console.error('Failed to create audio element:', error);
      }
      return;
    }

    // Built-in sounds using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (settings.soundType === 'beep') {
      // Two-tone beep (original)
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      gainNode.gain.value = settings.volume;
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      oscillator.start(audioContext.currentTime);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      oscillator.stop(audioContext.currentTime + 0.2);
    } else if (settings.soundType === 'bell') {
      // Pleasant bell sound
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);

      gainNode.gain.value = settings.volume * 0.3;
      
      oscillator1.frequency.value = 523.25; // C5
      oscillator2.frequency.value = 659.25; // E5
      oscillator1.type = 'sine';
      oscillator2.type = 'sine';

      // Fade out
      gainNode.gain.setValueAtTime(settings.volume * 0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);

      oscillator1.start(audioContext.currentTime);
      oscillator2.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 0.8);
      oscillator2.stop(audioContext.currentTime + 0.8);
    } else if (settings.soundType === 'chime') {
      // Three-note ascending chime
      const times = [0, 0.15, 0.3];
      const frequencies = [440, 554.37, 659.25]; // A4, C#5, E5

      times.forEach((time, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequencies[index];
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0, audioContext.currentTime + time);
        gainNode.gain.linearRampToValueAtTime(settings.volume * 0.4, audioContext.currentTime + time + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + time + 0.5);

        oscillator.start(audioContext.currentTime + time);
        oscillator.stop(audioContext.currentTime + time + 0.5);
      });
    }
  }, [settings.sound, settings.volume, settings.soundType, settings.customSoundUrl]);

  // Show desktop notification
  const showDesktopNotification = useCallback((title: string, body: string, roomId: string) => {
    if (!settings.desktop || !hasPermission) return;

    try {
      const notification = new Notification(title, {
        body,
        icon: '/vite.svg', // You can replace with your app icon
        badge: '/vite.svg',
        tag: roomId, // Prevents duplicate notifications for same room
        requireInteraction: false,
      });

      // Focus the room when notification is clicked
      notification.onclick = () => {
        window.focus();
        notification.close();
        // You could dispatch a custom event here to switch to the room
        window.dispatchEvent(new CustomEvent('notification-click', { detail: { roomId } }));
      };

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }, [settings.desktop, hasPermission]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      console.warn('Notifications not supported in this browser');
      return false;
    }

    // Check for secure context
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      console.error('Notifications require a secure context (HTTPS or localhost)');
      console.log('Current origin:', window.location.origin);
      alert(
        'Desktop notifications require HTTPS or localhost.\n\n' +
        'You are currently accessing the app via: ' + window.location.origin + '\n\n' +
        'Solutions:\n' +
        '• Access via https://\n' +
        '• Access via http://localhost:5173\n' +
        '• Access via http://127.0.0.1:5173\n\n' +
        'Audio notifications will still work!'
      );
      return false;
    }

    if (Notification.permission === 'granted') {
      setHasPermission(true);
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission was previously denied');
      console.log('To reset: Check your browser settings for', window.location.origin);
      return false;
    }

    try {
      console.log('Requesting notification permission...');
      const permission = await Notification.requestPermission();
      console.log('Permission result:', permission);
      const granted = permission === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('nychatt_notification_settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Check if a room should send notifications
  const shouldNotifyForRoom = useCallback((roomId: string): boolean => {
    if (settings.mode === 'all') {
      return true;
    } else if (settings.mode === 'muted') {
      return !settings.mutedRooms.includes(roomId);
    } else if (settings.mode === 'allowed') {
      return settings.allowedRooms.includes(roomId);
    }
    return true;
  }, [settings.mode, settings.mutedRooms, settings.allowedRooms]);

  // Check if a specific room is muted
  const isRoomMuted = useCallback((roomId: string): boolean => {
    if (settings.mode === 'muted') {
      return settings.mutedRooms.includes(roomId);
    } else if (settings.mode === 'allowed') {
      return !settings.allowedRooms.includes(roomId);
    }
    return false;
  }, [settings.mode, settings.mutedRooms, settings.allowedRooms]);

  // Toggle room mute (for 'muted' mode)
  const toggleRoomMute = useCallback((roomId: string) => {
    setSettings(prev => {
      const mutedRooms = prev.mutedRooms.includes(roomId)
        ? prev.mutedRooms.filter(id => id !== roomId)
        : [...prev.mutedRooms, roomId];
      const updated = { ...prev, mutedRooms };
      localStorage.setItem('nychatt_notification_settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Toggle room allow (for 'allowed' mode)
  const toggleRoomAllow = useCallback((roomId: string) => {
    setSettings(prev => {
      const allowedRooms = prev.allowedRooms.includes(roomId)
        ? prev.allowedRooms.filter(id => id !== roomId)
        : [...prev.allowedRooms, roomId];
      const updated = { ...prev, allowedRooms };
      localStorage.setItem('nychatt_notification_settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Upload custom notification sound
  const uploadCustomSound = useCallback(async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      // Validate file type
      if (!file.type.startsWith('audio/')) {
        reject(new Error('File must be an audio file'));
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error('File must be less than 5MB'));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          updateSettings({
            customSoundUrl: dataUrl,
            soundType: 'custom',
          });
          resolve();
        } else {
          reject(new Error('Failed to read file'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }, []);

  // Listen for new messages
  useEffect(() => {
    if (!client || !settings.enabled) return;

    const handleTimeline = (event: MatrixEvent) => {
      const eventType = event.getType();
      if (eventType !== 'm.room.message' && eventType !== 'm.sticker') return;

      const sender = event.getSender();
      const currentUserId = client.getUserId();
      
      // Don't notify for own messages
      if (sender === currentUserId) return;

      const room = client.getRoom(event.getRoomId());
      if (!room) return;

      // Don't notify if this is the active room
      if (currentRoom && currentRoom.roomId === room.roomId) return;

      // Check if this room should send notifications
      if (!shouldNotifyForRoom(room.roomId)) return;

      const content = event.getContent();
      const body = content.body || '';
      const roomName = room.name || 'Unknown Room';
      const senderName = room.getMember(sender || '')?.name || sender || 'Someone';

      // Check if we should notify
      let shouldNotify = true;

      if (settings.mentionsOnly) {
        // Only notify on mentions
        const mentionPattern = new RegExp(`@${currentUserId}|@room|@everyone`, 'i');
        shouldNotify = mentionPattern.test(body);
      }

      if (!shouldNotify) return;

      // Show notification
      if (settings.desktop) {
        showDesktopNotification(
          `${roomName}`,
          `${senderName}: ${body.substring(0, 100)}${body.length > 100 ? '...' : ''}`,
          room.roomId
        );
      }

      // Play sound
      if (settings.sound) {
        playNotificationSound();
      }
    };

    client.on('Room.timeline' as any, handleTimeline);

    return () => {
      client.removeListener('Room.timeline' as any, handleTimeline);
    };
  }, [client, settings, currentRoom, showDesktopNotification, playNotificationSound, shouldNotifyForRoom]);

  // Auto-request permission on first load if enabled
  useEffect(() => {
    if (settings.enabled && settings.desktop && !hasPermission) {
      // Don't auto-request, just inform user
      console.log('Notifications enabled but permission not granted. Call requestPermission() to prompt user.');
    }
  }, [settings.enabled, settings.desktop, hasPermission]);

  return (
    <NotificationContext.Provider
      value={{
        settings,
        updateSettings,
        requestPermission,
        hasPermission,
        isRoomMuted,
        toggleRoomMute,
        toggleRoomAllow,
        shouldNotifyForRoom,
        uploadCustomSound,
        playNotificationSound,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

