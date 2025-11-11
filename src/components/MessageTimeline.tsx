import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMatrix } from '../MatrixContext';
import { useTheme } from '../ThemeContext';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { Smile, Lock, ShieldAlert, Upload, Video, Trash2, X } from 'lucide-react';
import { MatrixEvent, Room } from 'matrix-js-sdk';

interface MessageTimelineProps {
  room?: Room; // Optional room prop for multi-pane support
}

const MessageTimeline: React.FC<MessageTimelineProps> = ({ room: roomProp }) => {
  const { currentRoom: contextRoom, client, sendReaction, deleteMessage, loadMoreHistory } = useMatrix();
  const { theme } = useTheme();
  
  // Use prop if provided, otherwise fall back to context
  const currentRoom = roomProp || contextRoom;
  const [messages, setMessages] = useState<MatrixEvent[]>([]);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const [reactionUpdate, setReactionUpdate] = useState(0); // Force re-render for reactions
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null); // Track which message's picker is open
  const [selectedCategory, setSelectedCategory] = useState('Smileys'); // Track selected emoji category
  const [customEmojis, setCustomEmojis] = useState<Array<{ mxcUrl: string; name: string; blobUrl?: string }>>([]); // Custom uploaded emojis
  const [isUploading, setIsUploading] = useState(false);
  const [showCallFrame, setShowCallFrame] = useState(false); // Track if Element Call is embedded
  const [callUrl, setCallUrl] = useState<string>(''); // Store the call URL
  const fileInputRef = useRef<HTMLInputElement>(null);
  const callIframeRef = useRef<HTMLIFrameElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesStartRef = useRef<HTMLDivElement>(null);

  // Comprehensive emoji list organized by category
  const emojiCategories = {
    'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'],
    'Emotions': ['😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'],
    'Gestures': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋'],
    'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
    'Symbols': ['✅', '❌', '⭕', '✔️', '✖️', '➕', '➖', '➗', '♾️', '💯', '🔥', '💫', '⭐', '🌟', '✨', '⚡', '💥', '💢', '💨', '💦', '💤', '🕳️', '🎯', '🎲', '🎰', '🎱', '🔮', '🧿', '🪬'],
    'Activities': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤾', '🏌️', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚴', '🚵', '🤹'],
    'Food': ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜'],
    'Drinks': ['☕', '🫖', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊'],
    'Travel': ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🦯', '🦽', '🦼', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '⛽', '🚧', '🚦', '🚥', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️'],
    'Nature': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🪶', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'],
    'Plants': ['💐', '🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🪴', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🪹', '🪺'],
    'Weather': ['☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '💧', '💦', '☔', '☂️', '🌊', '🌫️', '🌪️', '🌈'],
    'Objects': ['📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '🧾']
  };
  
  // Flatten all emojis for easy access
  const allEmojis = Object.values(emojiCategories).flat();

  // Parse message for user mentions and render as pills
  const renderMessageWithMentions = (text: string) => {
    if (!currentRoom) return text;
    
    // Match Matrix.to user links: https://matrix.to/#/@user:homeserver
    const matrixLinkRegex = /https:\/\/matrix\.to\/#\/(@[a-zA-Z0-9._=\-]+:[a-zA-Z0-9.\-]+)/g;
    // Also match plain @username patterns for backwards compatibility
    const plainMentionRegex = /@([a-zA-Z0-9.\-_\s]+?)(?=\s|$|[.,!?;:])/g;
    
    const parts = [];
    let lastIndex = 0;
    
    // First, process Matrix.to links
    let match;
    const processedRanges: Array<{start: number, end: number}> = [];
    
    while ((match = matrixLinkRegex.exec(text)) !== null) {
      const userId = match[1];
      const matchStart = match.index;
      const matchEnd = match.index + match[0].length;
      
      // Add text before mention
      if (matchStart > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {text.substring(lastIndex, matchStart)}
          </span>
        );
      }
      
      // Find the user in the room
      const members = currentRoom.getJoinedMembers();
      const mentionedUser = members.find(member => member.userId === userId);
      const displayName = mentionedUser?.name || userId.split(':')[0].substring(1);
      
      // Render mention as clickable pill link
      parts.push(
        <a
          key={`mention-${matchStart}`}
          href={match[0]}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 hover:bg-primary-500/30 transition font-medium no-underline"
          title={userId}
          onClick={(e) => {
            e.stopPropagation();
            console.log('Clicked user:', userId);
          }}
        >
          @{displayName}
        </a>
      );
      
      processedRanges.push({ start: matchStart, end: matchEnd });
      lastIndex = matchEnd;
    }
    
    // Reset for second pass (plain mentions)
    plainMentionRegex.lastIndex = 0;
    
    // Process plain @mentions that weren't already covered by Matrix.to links
    const textSegments = text.split('');
    let currentText = '';
    let currentStart = lastIndex === 0 ? 0 : lastIndex;
    
    // If we processed Matrix.to links, handle remaining text
    if (processedRanges.length > 0) {
      // Add remaining text after last Matrix.to link
      if (lastIndex < text.length) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {text.substring(lastIndex)}
          </span>
        );
      }
      return parts.length > 0 ? parts : text;
    }
    
    // No Matrix.to links found, process plain mentions
    while ((match = plainMentionRegex.exec(text)) !== null) {
      const mentionedName = match[1];
      const matchStart = match.index;
      const matchEnd = match.index + match[0].length;
      
      // Add text before mention
      if (matchStart > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {text.substring(lastIndex, matchStart)}
          </span>
        );
      }
      
      // Find the user in the room
      const members = currentRoom.getJoinedMembers();
      const mentionedUser = members.find(member => 
        member.name === mentionedName || 
        member.userId === `@${mentionedName}` ||
        member.userId.toLowerCase().includes(mentionedName.toLowerCase())
      );
      
      // Render mention as pill (non-link for plain mentions)
      parts.push(
        <span
          key={`mention-${matchStart}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 hover:bg-primary-500/30 transition cursor-pointer font-medium"
          title={mentionedUser?.userId || `@${mentionedName}`}
          onClick={(e) => {
            e.stopPropagation();
            if (mentionedUser) {
              console.log('Clicked user:', mentionedUser.userId);
            }
          }}
        >
          @{mentionedName}
        </span>
      );
      
      lastIndex = matchEnd;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.substring(lastIndex)}
        </span>
      );
    }
    
    return parts.length > 0 ? parts : text;
  };

  // Check if the current room has Element Call enabled
  const isElementCallRoom = () => {
    if (!currentRoom) return false;
    
    // Check for Element Call room type (org.matrix.msc3401.call or io.element.call)
    const createEvent = currentRoom.currentState.getStateEvents('m.room.create', '');
    const roomType = createEvent?.getContent()?.type;
    if (roomType === 'org.matrix.msc3401.call' || roomType === 'io.element.call') {
      return true;
    }
    
    // Check for Element Call widget state events (multiple possible event types)
    const widgetEventTypes = [
      'im.vector.modular.widgets',
      'io.element.widgets.layout',
      'm.widgets'
    ];
    
    for (const eventType of widgetEventTypes) {
      const widgetEvents = currentRoom.currentState.getStateEvents(eventType);
      if (widgetEvents && widgetEvents.length > 0) {
        // Check if any widget is an Element Call widget
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
    
    // Check room name for common video call patterns (fallback)
    const roomName = currentRoom.name?.toLowerCase() || '';
    if (roomName.includes('video room') || 
        roomName.includes('video call') || 
        roomName.includes('call room')) {
      return true;
    }
    
    return false;
  };

  // Join Element Call
  const joinElementCall = async () => {
    if (!currentRoom || !client) return;
    
    const roomId = currentRoom.roomId;
    const homeserver = client.getHomeserverUrl();
    const accessToken = client.getAccessToken();
    const userId = client.getUserId();
    const displayName = client.getUser(userId || '')?.displayName || userId;
    const deviceId = client.getDeviceId();
    
    console.log('🎥 Attempting to join Element Call...');
    console.log('🎥 Room:', currentRoom.name, '(' + roomId + ')');
    
    let callUrl = '';
    let existingCallId = '';
    
    // Check for existing active calls in the room
    // Element Call uses org.matrix.msc3401.call and org.matrix.msc3401.call.member events
    try {
      const callStateEvents = currentRoom.currentState.getStateEvents('org.matrix.msc3401.call');
      console.log('🔍 Checking for active calls in room...');
      
      if (callStateEvents && callStateEvents.length > 0) {
        for (const event of callStateEvents) {
          const content = event.getContent();
          const stateKey = event.getStateKey();
          
          // Check if this call is active (not terminated)
          if (content && !content['m.terminated'] && stateKey) {
            existingCallId = stateKey; // The state key IS the call ID
            console.log('✅ Found existing active call:', existingCallId);
            break;
          }
        }
      }
      
      if (!existingCallId) {
        console.log('⚠️ No active call found, Element Call will create a new one');
      }
    } catch (error) {
      console.warn('Failed to check for existing calls:', error);
    }
    
    // First check if there's a specific Element Call widget in the room
    const widgetEvents = currentRoom.currentState.getStateEvents('im.vector.modular.widgets');
    
    if (widgetEvents && widgetEvents.length > 0) {
      for (const event of widgetEvents) {
        const content = event.getContent();
        const type = content?.type || '';
        const url = content?.url || '';
        const data = content?.data || {};
        
        console.log('🔍 Found widget:', { type, url: url.substring(0, 50) + '...' });
        
        // Look for Element Call widgets
        if (type === 'io.element.call' || url.includes('element.io/call') || url.includes('call.element.io')) {
          // Use the widget URL and substitute template variables
          callUrl = url
            .replace('$matrix_room_id', encodeURIComponent(roomId))
            .replace('$matrix_user_id', encodeURIComponent(userId || ''))
            .replace('$matrix_display_name', encodeURIComponent(displayName || ''))
            .replace('$matrix_device_id', encodeURIComponent(deviceId || ''))
            .replace('$org.matrix.msc3401.call_id', existingCallId || data?.call_id || '');
          
          console.log('✅ Found Element Call widget in room state');
          break;
        }
      }
    }
    
    // If no widget found, try wellknown configuration
    if (!callUrl && homeserver) {
      try {
        const homeserverUrl = new URL(homeserver);
        const wellknownUrl = `${homeserverUrl.protocol}//${homeserverUrl.host}/.well-known/matrix/client`;
        
        console.log('🔍 Checking .well-known/matrix/client at:', wellknownUrl);
        
        // Try to fetch wellknown with a timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        try {
          const response = await fetch(wellknownUrl, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          console.log('📥 .well-known response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('📦 .well-known data:', data);
            
            // Check for Element Call configuration first
            const elementCallUrl = data?.['io.element.call']?.url;
            
            if (elementCallUrl) {
              callUrl = elementCallUrl;
              console.log('✅ Found Element Call URL in .well-known:', elementCallUrl);
            } else {
              // Check for LiveKit configuration (newer standard)
              const rtcFoci = data?.['org.matrix.msc4143.rtc_foci'];
              console.log('🔍 rtc_foci in .well-known:', rtcFoci);
              
              if (rtcFoci && Array.isArray(rtcFoci) && rtcFoci.length > 0) {
                const livekitFocus = rtcFoci.find((focus: any) => focus.type === 'livekit');
                console.log('🔍 LiveKit focus found:', livekitFocus);
                
                if (livekitFocus?.livekit_service_url) {
                  // When LiveKit is configured, we use Element Call with LiveKit backend
                  callUrl = 'https://call.element.io'; // Use public Element Call UI with your LiveKit backend
                  console.log('✅ Found LiveKit configuration:', livekitFocus.livekit_service_url);
                  console.log('✅ Will use Element Call UI with your LiveKit backend');
                }
              }
              
              if (!callUrl) {
                console.log('⚠️ No Element Call or LiveKit configuration in .well-known');
              }
            }
          } else {
            console.log('⚠️ .well-known returned status:', response.status);
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            console.log('⏱️ .well-known request timed out after 5 seconds');
          } else {
            console.log('⚠️ .well-known request failed:', fetchError.message);
          }
        }
      } catch (error) {
        console.warn('❌ Failed to check .well-known:', error);
      }
    }
    
    // Final fallback to public Element Call
    if (!callUrl) {
      callUrl = 'https://call.element.io';
      console.log('🎥 Using public Element Call (call.element.io) as fallback');
    }
    
    // Construct the full call URL with proper widget parameters
    // Element Call in widget mode: https://call.domain/?widget_id=...&parent_url=...#/room/!roomId?callId=...
    
    // If callUrl already has parameters (from widget), parse them
    const parsedUrl = new URL(callUrl);
    
    // Widget mode parameters - these tell Element Call to use Widget API for auth
    parsedUrl.searchParams.set('widgetId', 'element-call-' + roomId);
    parsedUrl.searchParams.set('parentUrl', window.location.origin);
    parsedUrl.searchParams.set('roomId', roomId); // CRITICAL: roomId as query param for widget mode
    
    // CRITICAL: baseUrl is the Matrix homeserver URL - required for widget mode
    if (homeserver) {
      parsedUrl.searchParams.set('baseUrl', homeserver);
      console.log('📡 Passing baseUrl (homeserver) to Element Call:', homeserver);
    }
    
    parsedUrl.searchParams.set('embed', 'true'); // Enable embedded mode
    parsedUrl.searchParams.set('hideHeader', 'true'); // Hide the Element Call header
    parsedUrl.searchParams.set('preload', 'true'); // Preload the call
    parsedUrl.searchParams.set('skipLobby', 'true'); // Skip lobby
    parsedUrl.searchParams.set('displayName', displayName || '');
    parsedUrl.searchParams.set('userId', userId || '');
    parsedUrl.searchParams.set('deviceId', deviceId || '');
    
    // If there's an existing call, pass the call ID as a parameter too
    if (existingCallId) {
      parsedUrl.searchParams.set('callId', existingCallId);
      console.log('📞 Passing call ID as parameter:', existingCallId);
    }
    
    // Build the hash/fragment for the room
    // If there's an existing call, include the call ID so Element Call joins it
    let callFragment = `/room/${encodeURIComponent(roomId)}`;
    if (existingCallId) {
      callFragment += `?callId=${encodeURIComponent(existingCallId)}`;
      console.log('✅ Joining existing call with ID:', existingCallId);
    } else {
      console.log('⚠️ No call ID - Element Call will create a new call');
    }
    
    // Construct final URL: base + query params + hash
    const finalUrl = `${parsedUrl.origin}${parsedUrl.pathname}?${parsedUrl.searchParams.toString()}#${callFragment}`;
    
    console.log('🎥 Embedding Element Call in widget mode');
    console.log('🎥 Base URL:', callUrl);
    console.log('🎥 Room ID:', roomId);
    console.log('🎥 Widget ID:', 'element-call-' + roomId);
    console.log('🎥 Final URL:', finalUrl);
    
    // Set state to show the embedded call frame
    setCallUrl(finalUrl);
    setShowCallFrame(true);
  };

  // Fetch authenticated media for custom emojis (creates blob URLs for caching)
  const fetchAuthenticatedMedia = useCallback(async (mxcUrl: string): Promise<string | null> => {
    if (!client) return null;
    
    try {
      const httpUrl = client.mxcUrlToHttp(mxcUrl);
      if (!httpUrl) {
        console.error('Failed to convert MXC URL to HTTP:', mxcUrl);
        return null;
      }
      
      const accessToken = client.getAccessToken();
      
      // Matrix media endpoints expect access_token as query parameter
      const urlWithAuth = `${httpUrl}${httpUrl.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(accessToken || '')}`;
      
      // Fetch with authentication via query parameter
      const response = await fetch(urlWithAuth);
      
      if (!response.ok) {
        console.error('Failed to fetch media:', response.status, response.statusText, mxcUrl);
        return null;
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      return blobUrl;
    } catch (error) {
      console.error('Error fetching authenticated media:', mxcUrl, error);
      return null;
    }
  }, [client]);

  // Load custom emojis from localStorage on mount
  useEffect(() => {
    const loadCustomEmojis = async () => {
      const stored = localStorage.getItem('custom_emojis');
      if (!stored || !client) return;
      
      try {
        const parsed = JSON.parse(stored);
        
        // Migrate old format (url) to new format (mxcUrl)
        const migrated = parsed.map((emoji: any) => {
          // If it has the old 'url' property instead of 'mxcUrl', clear it
          if (emoji.url && !emoji.mxcUrl) {
            console.warn('Clearing old format custom emoji:', emoji.name);
            return null;
          }
          return emoji;
        }).filter(Boolean);
        
        if (migrated.length !== parsed.length) {
          console.log('Migrated custom emojis from old format');
          localStorage.setItem('custom_emojis', JSON.stringify(migrated));
        }
        
        // Fetch blob URLs for all emojis
        console.log('📦 Loading', migrated.length, 'custom emojis...');
        const withBlobs = await Promise.all(
          migrated.map(async (emoji: any) => {
            const blobUrl = await fetchAuthenticatedMedia(emoji.mxcUrl);
            return {
              ...emoji,
              blobUrl: blobUrl || undefined
            };
          })
        );
        
        console.log('✅ Custom emojis loaded');
        setCustomEmojis(withBlobs);
      } catch (e) {
        console.error('Failed to load custom emojis:', e);
      }
    };
    
    loadCustomEmojis();
  }, [client, fetchAuthenticatedMedia]);

  // Media renderer component - uses direct authenticated URLs for better performance
  const MediaRenderer: React.FC<{ content: any }> = React.memo(({ content }) => {
    const msgtype = content.msgtype;
    const mxcUrl = content.url;
    
    if (!mxcUrl || !client) return null;
    
    const httpUrl = client.mxcUrlToHttp(mxcUrl);
    if (!httpUrl) return null;
    
    const accessToken = client.getAccessToken();
    const authenticatedUrl = `${httpUrl}${httpUrl.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(accessToken || '')}`;
    
    const filename = content.body || 'file';
    const filesize = content.info?.size;
    
    // Images
    if (msgtype === 'm.image') {
      const width = content.info?.w;
      const thumbnailUrl = content.info?.thumbnail_url 
        ? client.mxcUrlToHttp(content.info.thumbnail_url)
        : null;
      const authenticatedThumbnailUrl = thumbnailUrl 
        ? `${thumbnailUrl}${thumbnailUrl.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(accessToken || '')}`
        : null;
      
      const displayUrl = authenticatedThumbnailUrl || authenticatedUrl;
      
      return (
        <div className="mt-2">
          <a href={authenticatedUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={displayUrl}
              alt={filename}
              className="max-w-sm max-h-96 rounded-lg cursor-pointer hover:opacity-90 transition"
              style={{ maxWidth: width && width < 400 ? width : undefined }}
              loading="lazy"
            />
          </a>
          {filename && (
            <div className="text-xs text-slate-400 mt-1">{filename}</div>
          )}
        </div>
      );
    }
    
    // Videos
    if (msgtype === 'm.video') {
      return (
        <div className="mt-2">
          <video
            src={authenticatedUrl}
            controls
            className="max-w-sm max-h-96 rounded-lg"
            preload="metadata"
          >
            Your browser doesn't support video playback.
          </video>
          {filename && (
            <div className="text-xs text-slate-400 mt-1">{filename}</div>
          )}
        </div>
      );
    }
    
    // Files
    if (msgtype === 'm.file') {
      const filesizeStr = filesize ? `(${(filesize / 1024).toFixed(1)} KB)` : '';
      
      return (
        <div className="mt-2">
          <a
            href={authenticatedUrl}
            download={filename}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition text-sm"
          >
            <Upload className="w-4 h-4" />
            <span>{filename}</span>
            {filesizeStr && <span className="text-xs text-slate-400">{filesizeStr}</span>}
          </a>
        </div>
      );
    }
    
    return null;
  });

  // Handle custom emoji upload
  const handleEmojiUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !client) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
      alert('Image must be smaller than 1MB');
      return;
    }

    setIsUploading(true);
    try {
      console.log('📤 Uploading custom emoji...');
      console.log('📤 File:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      // Upload to Matrix media repository
      const response = await client.uploadContent(file, {
        name: file.name,
        type: file.type,
      });

      const mxcUrl = response.content_uri;
      
      console.log('✅ Uploaded to Matrix:', mxcUrl);
      
      // Fetch the image with authentication and create blob URL
      const blobUrl = await fetchAuthenticatedMedia(mxcUrl);
      console.log('✅ Blob URL created:', !!blobUrl);

      // Add to custom emojis - store MXC URL (canonical format) and blob URL
      const newEmoji = {
        mxcUrl: mxcUrl,
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
        blobUrl: blobUrl || undefined
      };

      const updated = [...customEmojis, newEmoji];
      setCustomEmojis(updated);
      
      // Only save MXC URL to localStorage (blob URLs don't persist)
      const toSave = updated.map(e => ({ mxcUrl: e.mxcUrl, name: e.name }));
      localStorage.setItem('custom_emojis', JSON.stringify(toSave));
      
      // Switch to Custom category
      setSelectedCategory('Custom');
      
      console.log('✅ Custom emoji uploaded successfully');
      console.log('✅ Saved emoji:', newEmoji);
    } catch (error) {
      console.error('❌ Failed to upload custom emoji:', error);
      alert('Failed to upload emoji. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Close call frame when room changes
  useEffect(() => {
    setShowCallFrame(false);
    setCallUrl('');
  }, [currentRoom]);

  // Handle Widget API communication with Element Call iframe
  useEffect(() => {
    if (!showCallFrame || !callIframeRef.current || !client) return;

    const handleMessage = (event: MessageEvent) => {
      // Security check: only accept messages from Element Call origin
      const callOrigin = new URL(callUrl).origin;
      if (event.origin !== callOrigin) {
        console.log('❌ Ignoring message from wrong origin:', event.origin, 'expected:', callOrigin);
        return;
      }

      const data = event.data;
      
      console.log('📨 Widget API message from Element Call:', data);
      console.log('📨 Message origin:', event.origin);
      console.log('📨 event.source === iframe.contentWindow:', event.source === callIframeRef.current?.contentWindow);

      // Handle widget API requests - respond to the iframe directly
      if (data.api === 'fromWidget' && callIframeRef.current?.contentWindow) {
        const { requestId, action, widgetId } = data;
        const targetWindow = callIframeRef.current.contentWindow;

        // Respond to supported API versions
        if (action === 'supported_api_versions') {
          const response = {
            api: 'toWidget',
            widgetId: widgetId,
            requestId: requestId,
            data: {
              supported_versions: ['0.0.2']  // Only claim to support 0.0.2
            }
          };
          console.log('📤 Sending supported API versions response:', response);
          console.log('📤 Target origin:', callOrigin);
          console.log('📤 Using iframe.contentWindow directly');
          
          try {
            targetWindow.postMessage(response, callOrigin);
            console.log('✅ postMessage to iframe completed successfully');
          } catch (e) {
            console.error('❌ postMessage failed:', e);
          }
        }

        // Respond to capabilities request
        if (action === 'capabilities') {
          const response = {
            api: 'toWidget',
            widgetId: widgetId,
            requestId: requestId,
            data: {
              capabilities: [
                'org.matrix.msc3401.call',
                'org.matrix.msc3401.call.member',
                'org.matrix.msc2762.timeline:*',
                'org.matrix.msc2762.receive.event:m.room.message',
                'org.matrix.msc2762.receive.state_event:m.room.member',
                'org.matrix.msc2762.send.event:m.room.message',
                'org.matrix.msc2762.send.state_event:m.room.member'
              ]
            }
          };
          targetWindow.postMessage(response, callOrigin);
          console.log('✅ Sent capabilities response');
        }

        // Acknowledge content_loaded
        if (action === 'content_loaded') {
          const response = {
            api: 'toWidget',
            widgetId: widgetId,
            requestId: requestId,
            data: {}
          };
          targetWindow.postMessage(response, callOrigin);
          console.log('✅ Acknowledged content_loaded');
        }

        // Respond to transport info request with auth credentials
        if (action === 'transport') {
          const response = {
            api: 'toWidget',
            widgetId: widgetId,
            requestId: requestId,
            data: {
              homeserver: client.getHomeserverUrl(),
              userId: client.getUserId(),
              deviceId: client.getDeviceId(),
              accessToken: client.getAccessToken()
            }
          };
          targetWindow.postMessage(response, callOrigin);
          console.log('✅ Sent transport/auth credentials');
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Log when iframe loads (but don't send initial message - Element Call will initiate)
    const iframe = callIframeRef.current;
    const handleLoad = () => {
      console.log('📞 Element Call iframe loaded, waiting for Widget API requests...');
    };

    iframe?.addEventListener('load', handleLoad);

    return () => {
      window.removeEventListener('message', handleMessage);
      iframe?.removeEventListener('load', handleLoad);
    };
  }, [showCallFrame, callUrl, client]);

  useEffect(() => {
    if (!currentRoom) {
      setMessages([]);
      return;
    }

    const updateMessages = () => {
      const timelineEvents = currentRoom.getLiveTimeline().getEvents();
      const messageEvents = timelineEvents.filter(
        (event) => event.getType() === 'm.room.message'
      );
      setMessages(messageEvents);
      
      // Log encryption status for debugging (only if there are failures)
      const encryptedCount = messageEvents.filter(e => e.isEncrypted()).length;
      const failedCount = messageEvents.filter(e => e.isDecryptionFailure()).length;
      if (failedCount > 0) {
        console.warn(`🔒 ${currentRoom.name}: ${failedCount}/${encryptedCount} messages failed to decrypt`);
      } else if (encryptedCount > 0) {
        console.log(`🔒 ${currentRoom.name}: All ${encryptedCount} encrypted messages decrypted successfully`);
      }
    };

    updateMessages();

    const handleTimeline = (event: MatrixEvent) => {
      updateMessages();
      // If it's a reaction or redaction, force a re-render to update reaction counts
      const eventType = event.getType();
      if (eventType === 'm.reaction') {
        console.log('👍 Reaction received, updating UI...');
        setReactionUpdate(prev => prev + 1);
      } else if (eventType === 'm.room.redaction') {
        console.log('👎 Redaction received, updating UI...');
        setReactionUpdate(prev => prev + 1);
      }
    };

    // Listen for both timeline events and relation events (reactions)
    client?.on('Room.timeline' as any, handleTimeline);
    client?.on('Room.redaction' as any, handleTimeline);
    currentRoom?.on('Room.timeline' as any, handleTimeline);

    return () => {
      client?.removeListener('Room.timeline' as any, handleTimeline);
      client?.removeListener('Room.redaction' as any, handleTimeline);
      currentRoom?.removeListener('Room.timeline' as any, handleTimeline);
    };
  }, [currentRoom, client]);

  useEffect(() => {
    // Only auto-scroll if we're not loading more history
    if (!isLoadingMore && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoadingMore]);

  // Infinite scroll: auto-load more messages when scrolling to top
  useEffect(() => {
    if (!messagesStartRef.current || !currentRoom) return;
    
    const observer = new IntersectionObserver(
      async (entries) => {
        const [entry] = entries;
        
        // If the top sentinel is visible and we're not already loading and there's more to load
        if (entry.isIntersecting && !isLoadingMore && canLoadMore && messages.length > 0) {
          console.log('📜 Loading more messages (infinite scroll)...');
          setIsLoadingMore(true);
          
          try {
            const hasMore = await loadMoreHistory(currentRoom);
            setCanLoadMore(hasMore);
          } catch (error) {
            console.error('❌ Error loading more history:', error);
          } finally {
            setIsLoadingMore(false);
          }
        }
      },
      {
        root: null, // viewport
        rootMargin: '100px', // Trigger 100px before reaching the top
        threshold: 0.1,
      }
    );
    
    observer.observe(messagesStartRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, [currentRoom, isLoadingMore, canLoadMore, messages.length, loadMoreHistory]);

  // Reset state when room changes - DON'T auto-load
  useEffect(() => {
    if (currentRoom) {
      setCanLoadMore(true);
      setIsLoadingMore(false);
    }
  }, [currentRoom?.roomId]);

  const handleReaction = async (eventId: string, emoji: string) => {
    if (!currentRoom || !client) return;
    
    // Close emoji picker
    setShowEmojiPicker(null);
    
    try {
      // Get the message event to check existing reactions
      const messageEvent = messages.find(m => m.getId() === eventId);
      if (!messageEvent) return;
      
      const reactions = getReactions(messageEvent);
      const reactionData = reactions[emoji];
      
      // If user already reacted with this emoji, remove it instead
      if (reactionData && reactionData.userReacted) {
        console.log(`👎 Removing reaction ${emoji} from event ${eventId}`);
        const currentUserId = client.getUserId();
        const userReactionEvent = reactionData.reactionEvents.find(
          r => r.getSender() === currentUserId
        );
        
        if (userReactionEvent && userReactionEvent.getId()) {
          await client.redactEvent(currentRoom.roomId, userReactionEvent.getId()!);
          console.log(`✅ Reaction ${emoji} removed successfully`);
        }
      } else {
        // Add new reaction
        console.log(`👍 Sending reaction ${emoji} to event ${eventId}`);
        await sendReaction(currentRoom.roomId, eventId, emoji);
        console.log(`✅ Reaction ${emoji} sent successfully`);
      }
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  };

  const handleDeleteMessage = async (eventId: string) => {
    if (!currentRoom || !client) return;
    
    if (!confirm('Are you sure you want to delete this message?')) {
      return;
    }
    
    try {
      await deleteMessage(currentRoom.roomId, eventId);
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Failed to delete message. Please try again.');
    }
  };

  const getReactions = (event: MatrixEvent) => {
    if (!currentRoom) return {};
    
    try {
      const eventId = event.getId();
      if (!eventId) return {};
      
      const reactionCounts: { [key: string]: { count: number; reactionEvents: MatrixEvent[]; userReacted: boolean } } = {};
      const currentUserId = client?.getUserId();
      
      // Try to get aggregated relations (recommended approach)
      let reactionEvents: MatrixEvent[] = [];
      try {
        const relations = currentRoom.relations?.getChildEventsForEvent(
          eventId,
          'm.annotation',
          'm.reaction'
        );
        
        if (relations) {
          reactionEvents = relations.getRelations();
        }
      } catch (e) {
        // Fall through to manual search if relations API not available
      }
      
      // Fallback: manually search timeline for reactions
      if (reactionEvents.length === 0) {
        const timeline = currentRoom.getLiveTimeline().getEvents();
        reactionEvents = timeline.filter((e) => {
          if (e.getType() !== 'm.reaction') return false;
          const content = e.getContent();
          const relatesTo = content['m.relates_to'];
          return relatesTo?.event_id === eventId;
        });
      }
      
      // Count reactions and track user's reactions
      reactionEvents.forEach((reaction) => {
        const content = reaction.getContent();
        const key = content['m.relates_to']?.key;
        if (key) {
          if (!reactionCounts[key]) {
            reactionCounts[key] = { count: 0, reactionEvents: [], userReacted: false };
          }
          reactionCounts[key].count++;
          reactionCounts[key].reactionEvents.push(reaction);
          if (reaction.getSender() === currentUserId) {
            reactionCounts[key].userReacted = true;
          }
        }
      });

      return reactionCounts;
    } catch (error) {
      console.error('Error getting reactions:', error);
      return {};
    }
  };

  if (!currentRoom) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to NyChatt</h2>
          <p className="text-slate-400">Select a room to start chatting</p>
        </div>
      </div>
    );
  }

  const isRoomEncrypted = currentRoom?.hasEncryptionStateEvent();
  const hasElementCall = isElementCallRoom();

  return (
    <div 
      className="flex-1 flex flex-col min-h-0"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* Room header */}
      <div 
        className="flex-shrink-0"
        style={{
          backgroundColor: 'var(--color-bgSecondary)',
          borderBottom: '1px solid var(--color-border)',
          padding: theme.style.compactMode ? 'var(--spacing-sidebarPadding)' : '1rem 1.5rem',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{currentRoom.name}</h2>
              {isRoomEncrypted && (
                <div className="flex items-center gap-1 text-green-400" title="End-to-end encrypted">
                  <Lock className="w-4 h-4" />
                  <span className="text-xs">Encrypted</span>
                </div>
              )}
              {hasElementCall && (
                <div className="flex items-center gap-1 text-blue-400" title="Video call available">
                  <Video className="w-4 h-4" />
                  <span className="text-xs">Call Available</span>
                </div>
              )}
            </div>
            <p className="text-sm text-slate-400">
              {currentRoom.getJoinedMemberCount()} members
            </p>
          </div>
          
          {/* Join Call button */}
          {hasElementCall && (
            <button
              onClick={joinElementCall}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center gap-2 font-medium"
              title="Join video call"
            >
              <Video className="w-5 h-5" />
              Join Call
            </button>
          )}
        </div>
      </div>

      {/* Element Call Frame */}
      {showCallFrame && callUrl && (
        <div className="relative bg-slate-900 border-b border-slate-700" style={{ height: '600px' }}>
          <button
            onClick={() => setShowCallFrame(false)}
            className="absolute top-4 right-4 z-10 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium shadow-lg flex items-center gap-2"
            title="Leave call"
          >
            <X className="w-5 h-5" />
            Leave Call
          </button>
          <iframe
            ref={callIframeRef}
            src={callUrl}
            className="w-full h-full"
            allow="camera; microphone; display-capture; autoplay; clipboard-write"
            allowFullScreen
            title="Element Call"
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Infinite scroll sentinel - triggers loading when scrolled near top */}
        <div ref={messagesStartRef} style={{ height: '1px', marginBottom: '1rem' }} />
        
        {/* Loading indicator at top */}
        {isLoadingMore && messages.length > 0 && (
          <div className="flex justify-center py-2">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              <span>Loading more messages...</span>
            </div>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center text-slate-500 mt-8">
            {isLoadingMore ? 'Loading messages...' : 'No messages yet. Start the conversation!'}
          </div>
        ) : (
          messages.map((event) => {
            const sender = event.getSender();
            const content = event.getContent();
            const timestamp = event.getTs();
            const eventId = event.getId()!;
            const reactions = getReactions(event);
            const isOwn = sender === client?.getUserId();
            const isEncrypted = event.isEncrypted();
            const isDecryptionFailure = event.isDecryptionFailure();
            const isRedacted = event.isRedacted();

            // Terminal-style rendering
            if (theme.style.messageStyle === 'terminal') {
              const senderShort = sender?.split(':')[0] || 'user'; // Extract @username part only
              
              return (
                <div
                  key={eventId}
                  className="group"
                  onMouseEnter={() => setHoveredMessage(eventId)}
                  onMouseLeave={() => setHoveredMessage(null)}
                  style={{
                    padding: 'var(--spacing-messagePadding)',
                    marginBottom: 'var(--spacing-messageGap)',
                    fontSize: 'var(--sizing-textBase)',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-text)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                    position: 'relative',
                  }}
                >
                  {/* Terminal-style prompt */}
                  <span style={{ color: 'var(--color-textMuted)', flexShrink: 0 }}>
                    [{format(timestamp, 'HH:mm:ss')}]
                  </span>
                  <span style={{ color: 'var(--color-accent)', flexShrink: 0, fontWeight: 'bold' }}>
                    {senderShort}
                  </span>
                  <span style={{ color: 'var(--color-textMuted)', flexShrink: 0 }}>$</span>
                  
                  {/* Message content */}
                  <div className="flex-1 min-w-0" style={{ wordBreak: 'break-word' }}>
                    {isRedacted ? (
                      <span style={{ color: 'var(--color-textMuted)', fontStyle: 'italic' }}>
                        [message deleted]
                      </span>
                    ) : isDecryptionFailure ? (
                      <span style={{ color: 'var(--color-error)' }}>
                        [unable to decrypt]
                      </span>
                    ) : (
                      <>
                        {(content.msgtype === 'm.text' || (content.body && content.msgtype !== 'm.image' && content.msgtype !== 'm.video')) && (
                          <span>{renderMessageWithMentions(content.body || '')}</span>
                        )}
                        <MediaRenderer content={content} />
                        {isEncrypted && (
                          <span style={{ color: 'var(--color-success)', marginLeft: '0.5rem' }}>
                            [encrypted]
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Reactions in terminal style */}
                  {Object.keys(reactions).length > 0 && (
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginLeft: '0.5rem' }}>
                      {Object.entries(reactions).map(([emoji, { count, userReacted }]) => {
                        const isCustomEmoji = emoji.startsWith('mxc://');
                        const cachedEmoji = isCustomEmoji 
                          ? customEmojis.find(e => e.mxcUrl === emoji)
                          : null;
                        
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(eventId, emoji)}
                            style={{
                              backgroundColor: userReacted ? 'var(--color-primary)' : 'var(--color-bgTertiary)',
                              color: userReacted && theme.name === 'terminal' ? '#000' : 'var(--color-text)',
                              padding: '0 0.25rem',
                              fontSize: 'var(--sizing-textXs)',
                              fontWeight: userReacted ? 'bold' : 'normal',
                              border: userReacted ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                              cursor: 'pointer',
                            }}
                            title={`${count} reaction${count > 1 ? 's' : ''}`}
                          >
                            {isCustomEmoji && cachedEmoji?.blobUrl ? (
                              <img 
                                src={cachedEmoji.blobUrl} 
                                alt="custom emoji" 
                                style={{ width: '0.75rem', height: '0.75rem', display: 'inline-block', objectFit: 'contain', verticalAlign: 'middle' }}
                                onError={(e) => {
                                  console.error('Failed to load custom emoji reaction:', emoji);
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <span>{isCustomEmoji ? '🖼️' : emoji}</span>
                            )}
                            {count > 1 && <span style={{ marginLeft: '0.125rem' }}>{count}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Compact actions on hover - use fixed width container to prevent bounce */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '0.25rem', 
                    marginLeft: '0.5rem',
                    flexShrink: 0,
                    minWidth: isOwn ? '3rem' : '1.5rem', // Reserve space to prevent layout shift
                    justifyContent: 'flex-end',
                  }}>
                    {hoveredMessage === eventId && (
                      <>
                        <button
                          onClick={() => {
                            if (showEmojiPicker === eventId) {
                              setShowEmojiPicker(null);
                            } else {
                              setShowEmojiPicker(eventId);
                              setSelectedCategory('Smileys');
                            }
                          }}
                          style={{
                            backgroundColor: 'var(--color-bgTertiary)',
                            color: 'var(--color-text)',
                            padding: '0.125rem 0.25rem',
                            fontSize: 'var(--sizing-textXs)',
                            border: '1px solid var(--color-border)',
                            cursor: 'pointer',
                          }}
                          title="Add reaction"
                        >
                          +
                        </button>
                        {isOwn && (
                          <button
                            onClick={() => handleDeleteMessage(eventId)}
                            style={{
                              backgroundColor: 'var(--color-bgTertiary)',
                              color: 'var(--color-error)',
                              padding: '0.125rem 0.25rem',
                              fontSize: 'var(--sizing-textXs)',
                              border: '1px solid var(--color-border)',
                              cursor: 'pointer',
                            }}
                            title="Delete message"
                          >
                            x
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Emoji picker for terminal mode (same as bubble mode but positioned differently) */}
                  {showEmojiPicker === eventId && (
                    <>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setShowEmojiPicker(null)}
                      />
                      
                      <div 
                        className="absolute left-0 bottom-full mb-2 z-50 w-80"
                        style={{
                          backgroundColor: 'var(--color-bgSecondary)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--sizing-borderRadius)',
                        }}
                      >
                        {/* Same emoji picker content as bubble mode - keeping it simple */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleEmojiUpload}
                          className="hidden"
                        />
                        
                        <div className="flex border-b overflow-x-auto" style={{ borderBottomColor: 'var(--color-border)' }}>
                          {Object.keys(emojiCategories).map((category) => (
                            <button
                              key={category}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCategory(category);
                              }}
                              className="px-3 py-2 whitespace-nowrap transition"
                              style={{
                                fontSize: 'var(--sizing-textXs)',
                                fontWeight: 'medium',
                                color: selectedCategory === category ? 'var(--color-primary)' : 'var(--color-textMuted)',
                                borderBottom: selectedCategory === category ? '2px solid var(--color-primary)' : 'none',
                              }}
                            >
                              {category}
                            </button>
                          ))}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCategory('Custom');
                            }}
                            className="px-3 py-2 whitespace-nowrap transition"
                            style={{
                              fontSize: 'var(--sizing-textXs)',
                              fontWeight: 'medium',
                              color: selectedCategory === 'Custom' ? 'var(--color-primary)' : 'var(--color-textMuted)',
                              borderBottom: selectedCategory === 'Custom' ? '2px solid var(--color-primary)' : 'none',
                            }}
                          >
                            Custom {customEmojis.length > 0 && `(${customEmojis.length})`}
                          </button>
                        </div>
                        
                        <div className="p-2 max-h-64 overflow-y-auto">
                          {selectedCategory === 'Custom' ? (
                            <div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fileInputRef.current?.click();
                                }}
                                disabled={isUploading}
                                className="w-full mb-2 px-3 py-2 text-sm rounded-lg transition flex items-center justify-center gap-2"
                                style={{
                                  backgroundColor: isUploading ? 'var(--color-bgTertiary)' : 'var(--color-primary)',
                                  color: theme.name === 'terminal' ? '#000' : '#fff',
                                  fontSize: 'var(--sizing-textSm)',
                                }}
                              >
                                {isUploading ? (
                                  <>
                                    <div style={{ width: '1rem', height: '1rem', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-4 h-4" />
                                    Upload Custom Emoji
                                  </>
                                )}
                              </button>
                              
                              {customEmojis.length > 0 ? (
                                <div className="grid grid-cols-6 gap-2">
                                  {customEmojis.map((emoji, index) => {
                                    if (!emoji.blobUrl) return null;
                                    
                                    return (
                                      <button
                                        key={`custom-${index}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleReaction(eventId, emoji.mxcUrl);
                                        }}
                                        className="p-1 hover:bg-[var(--color-hover)] transition relative group"
                                        title={emoji.name}
                                      >
                                        <img 
                                          src={emoji.blobUrl} 
                                          alt={emoji.name}
                                          className="w-8 h-8 object-contain"
                                          onError={(e) => {
                                            console.error('Failed to load custom emoji blob:', emoji.mxcUrl);
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p style={{ textAlign: 'center', color: 'var(--color-textMuted)', fontSize: 'var(--sizing-textSm)' }}>
                                  No custom emojis yet
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="grid grid-cols-8 gap-1">
                              {(emojiCategories[selectedCategory as keyof typeof emojiCategories] || []).map((emoji, index) => (
                                <button
                                  key={`${selectedCategory}-${index}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReaction(eventId, emoji);
                                  }}
                                  className="p-1 text-2xl hover:bg-[var(--color-hover)] transition hover:scale-110"
                                  title={emoji}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            }
            
            // Bubble-style rendering (default)
            return (
              <div
                key={eventId}
                className="group"
                onMouseEnter={() => setHoveredMessage(eventId)}
                onMouseLeave={() => setHoveredMessage(null)}
              >
                <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-2xl ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isOwn && (
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                          {sender?.charAt(1).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-300">{sender}</span>
                        <span className="text-xs text-slate-500">
                          {format(timestamp, 'HH:mm')}
                        </span>
                      </div>
                    )}
                    
                    <div className="relative">
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-primary-600 text-white rounded-br-sm'
                            : 'bg-slate-800 text-slate-100 rounded-bl-sm'
                        }`}
                      >
                        {isRedacted ? (
                          <div className="flex items-center gap-2 text-slate-500 italic">
                            <Trash2 className="w-4 h-4" />
                            <span className="text-sm">Message deleted</span>
                          </div>
                        ) : isDecryptionFailure ? (
                          <div className="flex items-center gap-2 text-red-400">
                            <ShieldAlert className="w-4 h-4" />
                            <span className="text-sm">Unable to decrypt message</span>
                          </div>
                        ) : (
                          <>
                            {/* Text content - only show if not media-only or if it has a caption */}
                            {(content.msgtype === 'm.text' || (content.body && content.msgtype !== 'm.image' && content.msgtype !== 'm.video')) && (
                              <div className="markdown-body">
                                {renderMessageWithMentions(content.body || '')}
                              </div>
                            )}
                            
                            {/* Media content (images, videos, files) */}
                            <MediaRenderer content={content} />
                            
                            {isEncrypted && (
                              <div className="flex items-center gap-1 mt-1 text-xs opacity-50">
                                <Lock className="w-3 h-3" />
                                <span>Encrypted</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Message actions (reaction, delete) */}
                      {hoveredMessage === eventId && (
                        <div className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition flex gap-1">
                          <button
                            onClick={() => {
                              if (showEmojiPicker === eventId) {
                                setShowEmojiPicker(null);
                              } else {
                                setShowEmojiPicker(eventId);
                                setSelectedCategory('Smileys'); // Reset to Smileys when opening
                              }
                            }}
                            className="bg-slate-700 hover:bg-slate-600 p-1.5 rounded-full text-slate-300 hover:text-white transition"
                            title="Add reaction"
                          >
                            <Smile className="w-4 h-4" />
                          </button>
                          
                          {/* Delete button - only for own messages */}
                          {isOwn && (
                            <button
                              onClick={() => handleDeleteMessage(eventId)}
                              className="bg-slate-700 hover:bg-red-600 p-1.5 rounded-full text-slate-300 hover:text-white transition"
                              title="Delete message"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                      
                      {/* Emoji picker dropdown */}
                      {showEmojiPicker === eventId && (
                        <>
                          {/* Backdrop to close picker when clicking outside */}
                          <div 
                            className="fixed inset-0 z-40"
                            onClick={() => setShowEmojiPicker(null)}
                          />
                          
                          <div 
                            className="absolute right-0 bottom-full mb-2 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 w-80"
                          >
                            {/* Hidden file input */}
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleEmojiUpload}
                              className="hidden"
                            />
                            
                            {/* Category tabs */}
                            <div className="flex border-b border-slate-700 overflow-x-auto">
                              {Object.keys(emojiCategories).map((category) => (
                                <button
                                  key={category}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCategory(category);
                                  }}
                                  className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition ${
                                    selectedCategory === category
                                      ? 'text-primary-400 border-b-2 border-primary-400'
                                      : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  {category}
                                </button>
                              ))}
                              {/* Custom emoji tab */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCategory('Custom');
                                }}
                                className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition ${
                                  selectedCategory === 'Custom'
                                    ? 'text-primary-400 border-b-2 border-primary-400'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                Custom {customEmojis.length > 0 && `(${customEmojis.length})`}
                              </button>
                            </div>
                            
                            {/* Emoji grid */}
                            <div className="p-2 max-h-64 overflow-y-auto">
                              {selectedCategory === 'Custom' ? (
                                <div>
                                  {/* Upload button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      fileInputRef.current?.click();
                                    }}
                                    disabled={isUploading}
                                    className="w-full mb-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-700 text-white text-sm rounded-lg transition flex items-center justify-center gap-2"
                                  >
                                    {isUploading ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Uploading...
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="w-4 h-4" />
                                        Upload Custom Emoji
                                      </>
                                    )}
                                  </button>
                                  
                                  {/* Custom emoji grid */}
                                  {customEmojis.length > 0 ? (
                                    <div className="grid grid-cols-6 gap-2">
                                      {customEmojis.map((emoji, index) => {
                                        if (!emoji.blobUrl) {
                                          console.warn('No blob URL for emoji:', emoji.name);
                                          return null;
                                        }
                                        
                                        return (
                                          <button
                                            key={`custom-${index}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleReaction(eventId, emoji.mxcUrl);
                                            }}
                                            className="p-1 hover:bg-slate-700 rounded-lg transition relative group"
                                            title={emoji.name}
                                          >
                                            <img 
                                              src={emoji.blobUrl} 
                                              alt={emoji.name}
                                              className="w-8 h-8 object-contain"
                                              onError={(e) => {
                                                console.error('Failed to load custom emoji blob:', emoji.mxcUrl);
                                                e.currentTarget.style.display = 'none';
                                              }}
                                            />
                                            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
                                              {emoji.name}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-center text-slate-400 text-sm py-4">
                                      No custom emojis yet. Upload one to get started!
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="grid grid-cols-8 gap-1">
                                  {emojiCategories[selectedCategory as keyof typeof emojiCategories].map((emoji, index) => (
                                    <button
                                      key={`${emoji}-${index}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReaction(eventId, emoji);
                                      }}
                                      className="text-2xl p-1.5 hover:bg-slate-700 rounded-lg transition transform hover:scale-110"
                                      title={`React with ${emoji}`}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Reactions display */}
                      {Object.keys(reactions).length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {Object.entries(reactions).map(([emoji, data]) => {
                            // Check if it's a custom emoji (MXC URL)
                            const isCustomEmoji = emoji.startsWith('mxc://');
                            
                            // Find if we have this emoji cached
                            const cachedEmoji = isCustomEmoji 
                              ? customEmojis.find(e => e.mxcUrl === emoji)
                              : null;
                            
                            const displayEmoji = cachedEmoji?.blobUrl || emoji;
                            
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(eventId, emoji)}
                                className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 transition ${
                                  data.userReacted
                                    ? 'bg-primary-600 hover:bg-primary-700 text-white'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                }`}
                                title={data.userReacted ? 'Click to remove your reaction' : 'Click to react'}
                              >
                                {isCustomEmoji && cachedEmoji?.blobUrl ? (
                                  <img 
                                    src={cachedEmoji.blobUrl} 
                                    alt="custom emoji" 
                                    className="w-5 h-5 object-contain"
                                    onError={(e) => {
                                      console.error('Failed to load custom emoji reaction:', emoji);
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <span>{isCustomEmoji ? '🖼️' : emoji}</span>
                                )}
                                <span className={data.userReacted ? 'text-white' : 'text-slate-400'}>{data.count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {isOwn && (
                      <span className="text-xs text-slate-500 mt-1">
                        {format(timestamp, 'HH:mm')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageTimeline;

