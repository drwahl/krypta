import { useState, useEffect, useRef, useCallback } from 'react';
import { Room, MatrixClient } from 'matrix-js-sdk';

export interface ElementCallConfig {
  baseUrl: string;
  existingCallId?: string;
}

export const useElementCall = (room: Room | null, client: MatrixClient | null) => {
  const [showCallFrame, setShowCallFrame] = useState(false);
  const [callUrl, setCallUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Detect if room supports Element Call
  const isElementCallRoom = useCallback(() => {
    if (!room) return false;

    // Check room type
    const createEvent = room.currentState.getStateEvents('m.room.create', '');
    const roomType = createEvent?.getContent()?.type;
    if (roomType === 'org.matrix.msc3401.call' || 
        roomType === 'org.matrix.msc3417.call' ||
        roomType === 'io.element.call') {
      return true;
    }

    // Check for Element Call widgets
    const widgetEventTypes = ['im.vector.modular.widgets', 'io.element.widgets.layout', 'm.widgets'];
    for (const eventType of widgetEventTypes) {
      const widgetEvents = room.currentState.getStateEvents(eventType);
      if (widgetEvents && widgetEvents.length > 0) {
        for (const event of widgetEvents) {
          const content = event.getContent();
          const url = content?.url || '';
          const type = content?.type || '';
          if (url.includes('element.io/call') || 
              url.includes('call.element.io') ||
              type === 'jitsi' ||
              type === 'io.element.call') {
            return true;
          }
        }
      }
    }

    // Check for existing call state events
    const callStateEvents = room.currentState.getStateEvents('org.matrix.msc3401.call');
    if (callStateEvents && callStateEvents.length > 0) {
      return true;
    }

    // Check room name for common patterns
    const roomName = room.name?.toLowerCase() || '';
    if (roomName.includes('video room') || 
        roomName.includes('video call') || 
        roomName.includes('call room') ||
        roomName.includes('conference')) {
      return true;
    }

    return false;
  }, [room]);

  // Find existing active call in room
  const findExistingCall = useCallback(() => {
    if (!room) return null;

    const callStateEvents = room.currentState.getStateEvents('org.matrix.msc3401.call');
    if (!callStateEvents || callStateEvents.length === 0) return null;

    for (const event of callStateEvents) {
      const content = event.getContent();
      const stateKey = event.getStateKey();
      
      // Check if call is active (not terminated)
      if (!content?.['m.terminated'] && stateKey) {
        return stateKey; // State key is the call ID
      }
    }

    return null;
  }, [room]);

  // Get Element Call base URL from config
  const getElementCallBaseUrl = useCallback(async (): Promise<string> => {
    if (!client) return 'https://call.element.io';

    const homeserver = client.getHomeserverUrl();
    
    try {
      const homeserverUrl = new URL(homeserver);
      const wellknownUrl = `${homeserverUrl.protocol}//${homeserverUrl.host}/.well-known/matrix/client`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(wellknownUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        
        // Check for explicit Element Call URL
        if (data?.['io.element.call']?.url) {
          return data['io.element.call'].url;
        }
        
        if (data?.['org.matrix.msc4143.element_call_url']) {
          return data['org.matrix.msc4143.element_call_url'];
        }
        
        // Check for m.integrations_ui
        if (data?.['m.integrations_ui']?.url) {
          const integrationsUrl = data['m.integrations_ui'].url;
          if (integrationsUrl.includes('element.io') || integrationsUrl.includes('/call')) {
            return integrationsUrl;
          }
        }
        
        // Check for LiveKit
        const rtcFoci = data?.['org.matrix.msc4143.rtc_foci'];
        if (rtcFoci && Array.isArray(rtcFoci) && rtcFoci.length > 0) {
          const livekitFocus = rtcFoci.find((focus: any) => focus.type === 'livekit');
          if (livekitFocus?.livekit_service_url) {
            // Try homeserver Element Call UI first
            const callUrl = `${homeserverUrl.protocol}//${homeserverUrl.host}/element-call`;
            try {
              const testResponse = await fetch(callUrl, { method: 'HEAD' });
              if (testResponse.ok) {
                return callUrl;
              }
            } catch (e) {
              // Fall through to public Element Call
            }
            
            // Use public Element Call with LiveKit backend
            return 'https://call.element.io';
          }
        }
      }
    } catch (error) {
      // Silently fall back
    }

    return 'https://call.element.io';
  }, [client]);

  // Build complete Element Call URL
  const buildCallUrl = useCallback(async (): Promise<string> => {
    if (!room || !client) throw new Error('Room or client not available');

    const roomId = room.roomId;
    const homeserver = client.getHomeserverUrl();
    const userId = client.getUserId();
    const displayName = client.getUser(userId || '')?.displayName || userId?.split(':')[0] || 'User';
    const deviceId = client.getDeviceId();
    const existingCallId = findExistingCall();

    // Get base URL
    const baseUrl = await getElementCallBaseUrl();
    const url = new URL(baseUrl);

    // Widget API parameters (CRITICAL: Element Call expects these exact names)
    url.searchParams.set('widgetId', `element-call-${roomId}`);  // NO underscore
    url.searchParams.set('parentUrl', window.location.origin);   // NO underscore
    
    // Room and user info (Element Call expects these exact names)
    url.searchParams.set('roomId', roomId);       // NO underscore
    url.searchParams.set('baseUrl', homeserver);  // NO underscore, this tells it YOUR homeserver
    url.searchParams.set('userId', userId || ''); // NO underscore
    url.searchParams.set('deviceId', deviceId || '');  // NO underscore
    url.searchParams.set('displayName', displayName);  // NO underscore
    
    // UI configuration (Element Call expects these exact names)
    url.searchParams.set('hideHeader', 'true');     // NO underscore
    url.searchParams.set('skipLobby', 'true');      // NO underscore
    url.searchParams.set('preload', 'true');
    url.searchParams.set('confineToRoom', 'true');  // NO underscore

    // Build fragment (hash) - this is where the actual room/call routing happens
    let fragment = `room/${encodeURIComponent(roomId)}`;
    if (existingCallId) {
      fragment += `?call=${encodeURIComponent(existingCallId)}`;
    }

    // Final URL: https://call.domain/?params#/room/!roomId?call=callId
    const finalUrl = `${url.origin}${url.pathname}?${url.searchParams.toString()}#/${fragment}`;
    return finalUrl;
  }, [room, client, findExistingCall, getElementCallBaseUrl]);

  // Join call
  const joinCall = useCallback(async () => {
    if (!room || !client) return;

    setIsLoading(true);
    try {
      const url = await buildCallUrl();
      setCallUrl(url);
      setShowCallFrame(true);
    } catch (error) {
      console.error('Failed to join call:', error);
      alert('Failed to join call. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [room, client, buildCallUrl]);

  // Leave call
  const leaveCall = useCallback(() => {
    setShowCallFrame(false);
    setCallUrl('');
  }, []);

  // Widget API message handling
  useEffect(() => {
    if (!showCallFrame || !client || !callUrl) return;

    const callOrigin = new URL(callUrl).origin;
    
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from Element Call iframe
      if (event.origin !== callOrigin) return;
      if (!event.data || event.data.api !== 'fromWidget') return;

      const { requestId, action, widgetId } = event.data;
      
      // Use event.source - the window that sent the message
      const targetWindow = event.source as Window;
      if (!targetWindow) return;
      
      const respond = (responseData: any) => {
        targetWindow.postMessage({
          api: 'toWidget',
          widgetId,
          requestId,
          response: responseData,
        }, event.origin);
      };

      // Handle actions
      if (action === 'supported_api_versions') {
        respond({ supported_versions: ['0.0.1', '0.0.2'] });
      } else if (action === 'content_loaded') {
        respond({});
      } else if (action === 'capabilities') {
        respond({ capabilities: { 'm.always_on_screen': true } });
      } else if (action === 'get_openid' || action === 'org.matrix.msc3819.get_openid') {
        client.getOpenIdToken()
          .then((token) => {
            respond({
              state: 'allowed',
              access_token: token.access_token,
              token_type: 'Bearer',
              matrix_server_name: token.matrix_server_name,
              expires_in: token.expires_in,
            });
          })
          .catch(() => {
            respond({ state: 'blocked' });
          });
      } else {
        respond({});
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [showCallFrame, callUrl, client]);

  // Close call when room changes
  useEffect(() => {
    if (showCallFrame) {
      setShowCallFrame(false);
      setCallUrl('');
    }
  }, [room?.roomId]);

  return {
    isElementCallRoom: isElementCallRoom(),
    showCallFrame,
    callUrl,
    isLoading,
    iframeRef,
    joinCall,
    leaveCall,
  };
};

