import { useState, useEffect, useRef, useCallback, type RefCallback } from 'react';
import { Room, MatrixClient } from 'matrix-js-sdk';
import {
  ClientWidgetApi,
  Widget,
  type IWidgetApiRequest,
  type IWidgetApiRequestData,
  type IWidgetApiResponseData,
} from 'matrix-widget-api';

import { ElementCallWidgetDriver, ELEMENT_CALL_WIDGET_TYPE } from '../utils/ElementCallWidgetDriver';

interface ElementCallConfig {
  url?: string;
  useEmbedded?: boolean;
}

// Helper to check if room is a video room
const isVideoRoom = (room: Room): boolean => {
  const roomType = room.currentState.getStateEvents('m.room.create', '')?.getContent()?.type;
  return roomType === 'org.matrix.msc3401.call' || roomType === 'io.element.call';
};

// Helper to check if call has already started
const hasCallStarted = (room: Room, client: MatrixClient): boolean => {
  // Check for active call membership events
  const callMemberEvents = room.currentState.getStateEvents('org.matrix.msc3401.call.member');
  
  if (!callMemberEvents || callMemberEvents.length === 0) return false;
  
  // Find the oldest call member that isn't us
  const currentUserId = client.getUserId();
  const otherMembers = callMemberEvents.filter(event => 
    event.getStateKey() !== currentUserId &&
    event.getContent()?.['m.calls']?.length > 0
  );
  
  return otherMembers.length > 0;
};

// Generate Element Call widget URL (based on Element Web's implementation)
const generateElementCallUrl = (
  client: MatrixClient,
  room: Room,
  elementCallConfig: ElementCallConfig
): string => {
  const roomId = room.roomId;
  
  // Determine base URL
  let baseCallUrl: string;
  if (elementCallConfig.url) {
    baseCallUrl = elementCallConfig.url;
  } else {
    // Default to embedded Element Call
    baseCallUrl = 'https://call.element.io';
  }
  
  // Create URL object
  const url = new URL(baseCallUrl);
  
  // Determine if room has encryption
  const hasEncryption = room.hasEncryptionStateEvent();
  
  const widgetId = `krypta_call_${roomId}`;
  const userId = client.getUserId() || '';
  const displayName =
    client.getUser(userId)?.displayName || userId.split(':')[0]?.replace(/^@/, '') || userId || 'Matrix User';
  const parentUrl = window.location.origin;

  // Build parameters similar to Element Web
  const params = new URLSearchParams({
    perParticipantE2EE: hasEncryption ? 'true' : 'false',
    userId,
    displayName,
    deviceId: client.getDeviceId() || '',
    roomId,
    baseUrl: client.baseUrl,
    lang: navigator.language.replace('_', '-'),
    fontScale: '1',
    theme: 'dark',
    widgetId,
    parentUrl,
  });
  
  // Determine intent based on room type and state (EXACTLY like Element Web)
  // See: element-web/src/models/Call.ts -> appendRoomParams()
  const isVideo = isVideoRoom(room);
  const callStarted = hasCallStarted(room, client);
  
  if (isVideo) {
    // Video rooms always join existing call
    params.append('intent', 'join_existing');
    params.append('skipLobby', 'false');
    params.append('preload', 'false');
  } else {
    // Regular rooms: check if call is active
    if (callStarted) {
      params.append('intent', 'join_existing');
    } else {
      params.append('intent', 'start_call');
    }
    params.append('preload', 'false');
  }
  
  // Log everything for debugging
  const paramsObj = Object.fromEntries(params.entries());
  console.log('═══════════════════════════════════════════════');
  console.log('[ElementCall] 🔗 BUILDING URL (Element Web style)');
  console.log('Base URL:', baseCallUrl);
  console.log('Room ID:', roomId);
  console.log('User ID:', client.getUserId());
  console.log('Base URL (homeserver):', client.baseUrl);
  console.log('Intent:', params.get('intent'));
  console.log('All Params:', paramsObj);
  
  // Use Element Web's exact URL format: #?params
  // See: element-web/src/models/Call.ts line 723
  url.hash = `#?${params.toString()}`;
  
  const finalUrl = url.toString();
  console.log('✅ Final URL:', finalUrl);
  console.log('═══════════════════════════════════════════════');
  
  return finalUrl;
};

// Detect if room supports Element Call
export const detectElementCallRoom = (room: Room): boolean => {
  if (!room) return false;
  
  // Check 1: Room type
  const roomType = room.currentState.getStateEvents('m.room.create', '')?.getContent()?.type;
  if (roomType === 'org.matrix.msc3401.call' || roomType === 'io.element.call') {
    return true;
  }
  
  // Check 2: Active call state
  const callMemberEvents = room.currentState.getStateEvents('org.matrix.msc3401.call.member');
  if (callMemberEvents && callMemberEvents.length > 0) {
    const hasActiveMembers = callMemberEvents.some(event => {
      const calls = event.getContent()?.['m.calls'];
      return Array.isArray(calls) && calls.length > 0;
    });
    if (hasActiveMembers) return true;
  }
  
  // Check 3: Call widget
  const widgets = room.currentState.getStateEvents('im.vector.modular.widgets', '');
  if (widgets) {
    const content = widgets.getContent();
    if (content?.type === 'io.element.call' || content?.type === 'm.call') {
      return true;
    }
  }
  
  // Check 4: Room name patterns (common Element Call room names)
  const roomName = room.name?.toLowerCase() || '';
  if (roomName.includes('video room') || 
      roomName.includes('video call') || 
      roomName.includes('call room') ||
      roomName.includes('conference')) {
    return true;
  }
  
  return false;
};

export const useElementCall = (room: Room | null, client: MatrixClient | null) => {
  const [callUrl, setCallUrl] = useState<string | null>(null);
  const [isCallRoom, setIsCallRoom] = useState(false);
  const [elementCallConfig, setElementCallConfig] = useState<ElementCallConfig>({});
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const widgetApiRef = useRef<ClientWidgetApi | null>(null);
  const widgetDriverRef = useRef<ElementCallWidgetDriver | null>(null);
  const actionCleanupRef = useRef<(() => void)[]>([]);
  const deviceMuteStateRef = useRef({ audio_enabled: true, video_enabled: true });
  
  const teardownWidget = useCallback(() => {
    if (widgetApiRef.current) {
      actionCleanupRef.current.forEach((fn) => {
        try {
          fn();
        } catch (error) {
          console.warn('[ElementCall] Failed to clean up widget action listener', error);
        }
      });
      actionCleanupRef.current = [];
      widgetApiRef.current.removeAllListeners();
      widgetApiRef.current.stop();
      widgetApiRef.current = null;
    }
    if (widgetDriverRef.current) {
      widgetDriverRef.current.dispose();
      widgetDriverRef.current = null;
    }
  }, []);

  const setupWidget = useCallback(() => {
    if (!iframeRef.current || !callUrl || !client || !room) {
      return;
    }

    teardownWidget();

    try {
      const widgetId = `krypta_call_${room.roomId}`;
      deviceMuteStateRef.current = { audio_enabled: true, video_enabled: true };

      const widget = new Widget({
        id: widgetId,
        creatorUserId: client.getUserId() || '',
        type: ELEMENT_CALL_WIDGET_TYPE,
        url: callUrl,
        name: room.name ?? 'Element Call',
        waitForIframeLoad: false,
        data: {
          roomId: room.roomId,
          theme: 'dark',
        },
      });

      const driver = new ElementCallWidgetDriver(client, room);
      const api = new ClientWidgetApi(widget, iframeRef.current, driver);

      widgetDriverRef.current = driver;
      widgetApiRef.current = api;
      actionCleanupRef.current = [];

      api.on('ready', () => {
        console.log('[ElementCall] Widget ready');
      });

      api.on('error:preparing', (error) => {
        console.error('[ElementCall] Widget preparation error', error);
      });

      const registerAction = (
        action: string,
        handler: (data: IWidgetApiRequestData) => Promise<IWidgetApiResponseData | void> | IWidgetApiResponseData | void,
      ) => {
        const listener = async (ev: CustomEvent<IWidgetApiRequest>) => {
          ev.preventDefault();
          try {
            const result = await handler(ev.detail.data);
            api.transport.reply(ev.detail, result ?? {});
          } catch (error) {
            console.error(`[ElementCall] Failed to handle action ${action}`, error);
            api.transport.reply(ev.detail, {
              error: { message: error instanceof Error ? error.message : 'Unhandled widget action' },
            });
          }
        };
        api.on(`action:${action}`, listener);
        actionCleanupRef.current.push(() => api.off(`action:${action}`, listener));
      };

      registerAction('io.element.device_mute', async (data) => {
        const state = deviceMuteStateRef.current;
        const payload = data as { audio_enabled?: boolean; video_enabled?: boolean };
        if (typeof payload.audio_enabled === 'boolean') {
          state.audio_enabled = payload.audio_enabled;
        }
        if (typeof payload.video_enabled === 'boolean') {
          state.video_enabled = payload.video_enabled;
        }
        return { ...state };
      });

      const noopHandler = async () => ({});
      registerAction('io.element.join', noopHandler);
      registerAction('io.element.spotlight_layout', noopHandler);
      registerAction('set_always_on_screen', noopHandler);
      registerAction('io.element.leave', noopHandler);
    } catch (error) {
      console.error('[ElementCall] Failed to initialise Element Call widget', error);
    }
  }, [callUrl, client, room, teardownWidget]);

  const attachCallIframe: RefCallback<HTMLIFrameElement> = useCallback(
    (node) => {
      if (iframeRef.current === node) return;
      iframeRef.current = node;
      if (node) {
        setupWidget();
      } else {
        teardownWidget();
      }
    },
    [setupWidget, teardownWidget]
  );

  useEffect(() => {
    if (iframeRef.current) {
      setupWidget();
    }

    return () => {
      teardownWidget();
    };
  }, [setupWidget, teardownWidget]);

  // Fetch Element Call configuration from .well-known
  useEffect(() => {
    if (!client) return;
    
    const fetchConfig = async () => {
      try {
        console.log('[ElementCall] Fetching .well-known from:', client.baseUrl);
        
        // Manually fetch .well-known since getClientWellKnown might not be available
        const homeserverUrl = new URL(client.baseUrl);
        const wellKnownUrl = `${homeserverUrl.origin}/.well-known/matrix/client`;
        
        console.log('[ElementCall] Fetching:', wellKnownUrl);
        
        const response = await fetch(wellKnownUrl);
        if (!response.ok) {
          throw new Error(`Well-known fetch failed: ${response.status}`);
        }
        
        const wellKnown = await response.json();
        console.log('[ElementCall] Well-known data:', wellKnown);
        
        // Check for Element Call configuration
        const ecConfig = wellKnown?.['io.element.call'];
        if (ecConfig?.url) {
          console.log('[ElementCall] ✅ Found Element Call config:', ecConfig);
          setElementCallConfig({
            url: ecConfig.url,
            useEmbedded: ecConfig.use_exclusively,
          });
          return;
        }
        
        // Check for LiveKit configuration
        const livekitConfig = wellKnown?.['org.matrix.msc4143.rtc_foci'];
        if (livekitConfig) {
          console.log('[ElementCall] ✅ Found LiveKit config:', livekitConfig);
          // LiveKit is configured, but we still use call.element.io as the Element Call frontend
          // call.element.io will connect to your homeserver's LiveKit via the baseUrl parameter
          console.log('[ElementCall] Using call.element.io (will connect to your LiveKit via baseUrl)');
          setElementCallConfig({
            url: 'https://call.element.io',
          });
          return;
        }
        
        console.log('[ElementCall] ⚠️ No Element Call or LiveKit config found, using call.element.io');
        setElementCallConfig({
          url: 'https://call.element.io',
        });
      } catch (error) {
        console.error('[ElementCall] ❌ Failed to fetch .well-known:', error);
        // Fallback to call.element.io
        console.log('[ElementCall] Falling back to call.element.io');
        setElementCallConfig({
          url: 'https://call.element.io',
        });
      }
    };
    
    fetchConfig();
  }, [client]);
  
  // Detect if current room is an Element Call room
  useEffect(() => {
    if (!room || !client) {
      setIsCallRoom(false);
      setCallUrl(null);
      return;
    }
    
    // Don't generate URL until we have config
    if (!elementCallConfig.url) {
      console.log('[ElementCall] Waiting for config...');
      return;
    }
    
    const detected = detectElementCallRoom(room);
    setIsCallRoom(detected);
    
    if (detected) {
      console.log('[ElementCall] 🎯 Generating URL with config:', elementCallConfig);
      const url = generateElementCallUrl(client, room, elementCallConfig);
      console.log('[ElementCall] 🔗 Generated URL:', url);
      console.log('[ElementCall] 🏠 Room ID:', room.roomId);
      console.log('[ElementCall] 🌐 Base URL:', client.baseUrl);
      console.log('[ElementCall] 📍 Element Call URL:', elementCallConfig.url);
      setCallUrl(url);
    } else {
      console.log('[ElementCall] ❌ Room not detected as Element Call room');
      setCallUrl(null);
    }
  }, [room, client, elementCallConfig]);
  
  const leaveCall = useCallback(async () => {
    if (widgetApiRef.current) {
      try {
        await widgetApiRef.current.transport.send('im.vector.hangup', {});
      } catch (error) {
        console.warn('[ElementCall] Failed to send hangup action', error);
      }

      try {
        await widgetApiRef.current.transport.send('io.element.leave', {});
      } catch (error) {
        console.warn('[ElementCall] Failed to send leave action', error);
      }
    }
  }, []);

  return {
    isCallRoom,
    callUrl,
    callIframeRef: attachCallIframe,
    leaveCall,
  };
};
