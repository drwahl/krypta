import React, { useState, useEffect, useRef } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { useMatrix } from '../MatrixContext';
import { Bell, BellOff, Volume2, VolumeX, Monitor, MessageSquare, ShieldAlert, BellRing, Filter, CheckSquare, Upload, Play } from 'lucide-react';

const NotificationSettings: React.FC = () => {
  const { settings, updateSettings, requestPermission, hasPermission, isRoomMuted, toggleRoomMute, toggleRoomAllow, uploadCustomSound, playNotificationSound } = useNotifications();
  const { rooms, spaces } = useMatrix();
  const [isSecureContext, setIsSecureContext] = useState(true);
  const [showRoomList, setShowRoomList] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if we're in a secure context (HTTPS or localhost)
    if (typeof window !== 'undefined') {
      setIsSecureContext(window.isSecureContext);
    }
  }, []);

  const handleEnableToggle = async () => {
    if (!settings.enabled) {
      // Enabling notifications - request permission if needed
      if (settings.desktop && !hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          // Error message is now handled in requestPermission
          return;
        }
      }
    }
    updateSettings({ enabled: !settings.enabled });
  };

  const handleDesktopToggle = async () => {
    if (!settings.desktop && !hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        // Error message is now handled in requestPermission
        return;
      }
    }
    updateSettings({ desktop: !settings.desktop });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadCustomSound(file);
      alert('Custom sound uploaded successfully!');
    } catch (error) {
      alert(`Failed to upload sound: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="p-4 space-y-4" style={{ fontFamily: 'var(--font-body)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
          Notifications
        </h3>
        {settings.enabled ? (
          <Bell className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
        ) : (
          <BellOff className="w-5 h-5" style={{ color: 'var(--color-textMuted)' }} />
        )}
      </div>

      {/* Secure Context Warning */}
      {!isSecureContext && (
        <div
          className="p-3 rounded-lg text-sm flex items-start gap-2"
          style={{
            backgroundColor: 'rgba(251, 191, 36, 0.15)',
            border: '1px solid rgba(251, 191, 36, 0.4)',
            color: 'var(--color-text)',
          }}
        >
          <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
          <div>
            <p className="font-semibold mb-1">Desktop Notifications Unavailable</p>
            <p className="text-xs" style={{ color: 'var(--color-textMuted)' }}>
              Desktop notifications require HTTPS or localhost. You're currently accessing via:{' '}
              <code style={{ backgroundColor: 'var(--color-bgTertiary)', padding: '2px 4px', borderRadius: '3px' }}>
                {typeof window !== 'undefined' ? window.location.origin : ''}
              </code>
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--color-textMuted)' }}>
              Use <code style={{ backgroundColor: 'var(--color-bgTertiary)', padding: '2px 4px', borderRadius: '3px' }}>http://localhost:5173</code> or{' '}
              <code style={{ backgroundColor: 'var(--color-bgTertiary)', padding: '2px 4px', borderRadius: '3px' }}>https://</code> instead.
              <br />
              <strong>Audio notifications will still work!</strong>
            </p>
          </div>
        </div>
      )}

      {/* Enable/Disable All Notifications */}
      <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bgTertiary)' }}>
        <div className="flex items-center gap-3">
          {settings.enabled ? (
            <Bell className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
          ) : (
            <BellOff className="w-5 h-5" style={{ color: 'var(--color-textMuted)' }} />
          )}
          <div>
            <p className="font-medium" style={{ color: 'var(--color-text)', fontSize: 'var(--sizing-textBase)' }}>
              Enable Notifications
            </p>
            <p className="text-xs" style={{ color: 'var(--color-textMuted)' }}>
              Receive alerts for new messages
            </p>
          </div>
        </div>
        <button
          onClick={handleEnableToggle}
          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
          style={{
            backgroundColor: settings.enabled ? 'var(--color-success)' : 'var(--color-border)',
          }}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {settings.enabled && (
        <>
          {/* Desktop Notifications */}
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bgTertiary)', opacity: isSecureContext ? 1 : 0.5 }}>
            <div className="flex items-center gap-3">
              <Monitor className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              <div>
                <p className="font-medium" style={{ color: 'var(--color-text)', fontSize: 'var(--sizing-textBase)' }}>
                  Desktop Notifications
                </p>
                <p className="text-xs" style={{ color: 'var(--color-textMuted)' }}>
                  {!isSecureContext 
                    ? 'Requires HTTPS or localhost' 
                    : hasPermission 
                    ? 'Show browser notifications' 
                    : 'Permission not granted'}
                </p>
              </div>
            </div>
            <button
              onClick={handleDesktopToggle}
              disabled={!isSecureContext}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              style={{
                backgroundColor: settings.desktop && isSecureContext ? 'var(--color-success)' : 'var(--color-border)',
                cursor: isSecureContext ? 'pointer' : 'not-allowed',
              }}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.desktop ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Sound Notifications */}
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bgTertiary)' }}>
            <div className="flex items-center gap-3">
              {settings.sound ? (
                <Volume2 className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              ) : (
                <VolumeX className="w-5 h-5" style={{ color: 'var(--color-textMuted)' }} />
              )}
              <div>
                <p className="font-medium" style={{ color: 'var(--color-text)', fontSize: 'var(--sizing-textBase)' }}>
                  Sound Alerts
                </p>
                <p className="text-xs" style={{ color: 'var(--color-textMuted)' }}>
                  Play sound for new messages
                </p>
              </div>
            </div>
            <button
              onClick={() => updateSettings({ sound: !settings.sound })}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              style={{
                backgroundColor: settings.sound ? 'var(--color-success)' : 'var(--color-border)',
              }}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.sound ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Volume Control */}
          {settings.sound && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bgTertiary)' }}>
              <label className="block mb-2">
                <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  Volume
                </span>
              </label>
              <div className="flex items-center gap-3">
                <VolumeX className="w-4 h-4" style={{ color: 'var(--color-textMuted)' }} />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.volume}
                  onChange={(e) => updateSettings({ volume: parseFloat(e.target.value) })}
                  className="flex-1"
                  style={{
                    accentColor: 'var(--color-primary)',
                  }}
                />
                <Volume2 className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                <span className="text-sm w-8 text-right" style={{ color: 'var(--color-text)' }}>
                  {Math.round(settings.volume * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* Sound Type Selector */}
          {settings.sound && (
            <div className="p-3 rounded-lg space-y-2" style={{ backgroundColor: 'var(--color-bgTertiary)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  Sound Type
                </span>
                <button
                  onClick={playNotificationSound}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs transition"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: '#fff',
                  }}
                  title="Test sound"
                >
                  <Play className="w-3 h-3" />
                  Test
                </button>
              </div>
              
              {/* Built-in sounds */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => updateSettings({ soundType: 'beep' })}
                  className="p-2 rounded text-xs transition"
                  style={{
                    backgroundColor: settings.soundType === 'beep' ? 'var(--color-primary)' : 'var(--color-bg)',
                    color: settings.soundType === 'beep' ? '#fff' : 'var(--color-text)',
                    border: `1px solid ${settings.soundType === 'beep' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  }}
                >
                  Beep
                </button>
                <button
                  onClick={() => updateSettings({ soundType: 'bell' })}
                  className="p-2 rounded text-xs transition"
                  style={{
                    backgroundColor: settings.soundType === 'bell' ? 'var(--color-primary)' : 'var(--color-bg)',
                    color: settings.soundType === 'bell' ? '#fff' : 'var(--color-text)',
                    border: `1px solid ${settings.soundType === 'bell' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  }}
                >
                  Bell
                </button>
                <button
                  onClick={() => updateSettings({ soundType: 'chime' })}
                  className="p-2 rounded text-xs transition"
                  style={{
                    backgroundColor: settings.soundType === 'chime' ? 'var(--color-primary)' : 'var(--color-bg)',
                    color: settings.soundType === 'chime' ? '#fff' : 'var(--color-text)',
                    border: `1px solid ${settings.soundType === 'chime' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  }}
                >
                  Chime
                </button>
              </div>

              {/* Custom sound upload */}
              <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full p-2 rounded text-xs transition flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: settings.soundType === 'custom' ? 'var(--color-primary)' : 'var(--color-bg)',
                    color: settings.soundType === 'custom' ? '#fff' : 'var(--color-text)',
                    border: `1px solid ${settings.soundType === 'custom' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    opacity: isUploading ? 0.5 : 1,
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Upload className="w-3 h-3" />
                  {isUploading ? 'Uploading...' : settings.customSoundUrl ? 'Replace Custom Sound' : 'Upload Custom Sound'}
                </button>
                {settings.soundType === 'custom' && settings.customSoundUrl && (
                  <p className="text-xs mt-1 text-center" style={{ color: 'var(--color-textMuted)' }}>
                    Custom sound active
                  </p>
                )}
                <p className="text-xs mt-1 text-center" style={{ color: 'var(--color-textMuted)' }}>
                  Max 5MB • MP3, WAV, OGG, etc.
                </p>
              </div>
            </div>
          )}

          {/* Mentions Only */}
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bgTertiary)' }}>
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              <div>
                <p className="font-medium" style={{ color: 'var(--color-text)', fontSize: 'var(--sizing-textBase)' }}>
                  Mentions Only
                </p>
                <p className="text-xs" style={{ color: 'var(--color-textMuted)' }}>
                  Only notify when mentioned
                </p>
              </div>
            </div>
            <button
              onClick={() => updateSettings({ mentionsOnly: !settings.mentionsOnly })}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              style={{
                backgroundColor: settings.mentionsOnly ? 'var(--color-success)' : 'var(--color-border)',
              }}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.mentionsOnly ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Notification Mode Selector */}
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bgTertiary)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              <p className="font-medium" style={{ color: 'var(--color-text)', fontSize: 'var(--sizing-textBase)' }}>
                Room Filter Mode
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => updateSettings({ mode: 'all' })}
                className="w-full flex items-center justify-between p-2 rounded transition"
                style={{
                  backgroundColor: settings.mode === 'all' ? 'var(--color-primary)' : 'transparent',
                  color: settings.mode === 'all' ? '#fff' : 'var(--color-text)',
                  border: `1px solid ${settings.mode === 'all' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium text-sm">All Rooms</div>
                    <div className="text-xs opacity-75">Notify from all rooms</div>
                  </div>
                </div>
                {settings.mode === 'all' && <CheckSquare className="w-4 h-4" />}
              </button>
              
              <button
                onClick={() => updateSettings({ mode: 'muted' })}
                className="w-full flex items-center justify-between p-2 rounded transition"
                style={{
                  backgroundColor: settings.mode === 'muted' ? 'var(--color-primary)' : 'transparent',
                  color: settings.mode === 'muted' ? '#fff' : 'var(--color-text)',
                  border: `1px solid ${settings.mode === 'muted' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <BellOff className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium text-sm">Mute Specific</div>
                    <div className="text-xs opacity-75">
                      Notify from all except {settings.mutedRooms.length} muted
                    </div>
                  </div>
                </div>
                {settings.mode === 'muted' && <CheckSquare className="w-4 h-4" />}
              </button>
              
              <button
                onClick={() => updateSettings({ mode: 'allowed' })}
                className="w-full flex items-center justify-between p-2 rounded transition"
                style={{
                  backgroundColor: settings.mode === 'allowed' ? 'var(--color-primary)' : 'transparent',
                  color: settings.mode === 'allowed' ? '#fff' : 'var(--color-text)',
                  border: `1px solid ${settings.mode === 'allowed' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium text-sm">Allow Specific</div>
                    <div className="text-xs opacity-75">
                      Only notify from {settings.allowedRooms.length} allowed
                    </div>
                  </div>
                </div>
                {settings.mode === 'allowed' && <CheckSquare className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Room Management Button */}
          {(settings.mode === 'muted' || settings.mode === 'allowed') && (
            <button
              onClick={() => setShowRoomList(!showRoomList)}
              className="w-full p-3 rounded-lg text-left flex items-center justify-between transition"
              style={{
                backgroundColor: showRoomList ? 'var(--color-primary)' : 'var(--color-bgTertiary)',
                color: showRoomList ? '#fff' : 'var(--color-text)',
              }}
            >
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                <span className="font-medium">
                  {settings.mode === 'muted' ? 'Manage Muted Rooms' : 'Manage Allowed Rooms'}
                </span>
              </div>
              <span className="text-sm">
                {settings.mode === 'muted' 
                  ? `${settings.mutedRooms.length} muted` 
                  : `${settings.allowedRooms.length} allowed`}
              </span>
            </button>
          )}

          {/* Room List */}
          {showRoomList && (settings.mode === 'muted' || settings.mode === 'allowed') && (
            <div className="p-3 rounded-lg space-y-2" style={{ backgroundColor: 'var(--color-bgTertiary)' }}>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-textMuted)' }}>
                Click to {settings.mode === 'muted' ? 'mute/unmute' : 'allow/disallow'} rooms:
              </p>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {rooms.map((room) => {
                  const isMuted = isRoomMuted(room.roomId);
                  return (
                    <button
                      key={room.roomId}
                      onClick={() => {
                        if (settings.mode === 'muted') {
                          toggleRoomMute(room.roomId);
                        } else {
                          toggleRoomAllow(room.roomId);
                        }
                      }}
                      className="w-full flex items-center justify-between p-2 rounded text-sm transition hover:bg-[var(--color-hover)]"
                      style={{
                        backgroundColor: isMuted ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                        border: `1px solid ${isMuted ? 'rgba(239, 68, 68, 0.3)' : 'var(--color-border)'}`,
                      }}
                    >
                      <span style={{ color: 'var(--color-text)' }}>{room.name}</span>
                      {isMuted ? (
                        <BellOff className="w-4 h-4" style={{ color: '#ef4444' }} />
                      ) : (
                        <Bell className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {!hasPermission && settings.desktop && (
        <div
          className="p-3 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--color-warning)',
            color: '#000',
          }}
        >
          <strong>Permission Required:</strong> Click the desktop notifications toggle to grant permission.
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;

