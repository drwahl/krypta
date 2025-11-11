import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMatrix } from '../MatrixContext';
import { useTheme } from '../ThemeContext';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { Smile, Lock, ShieldAlert, Upload, Video, Trash2, X, Pin } from 'lucide-react';
import { MatrixEvent, Room, MatrixClient } from 'matrix-js-sdk';
import UrlPreview from './UrlPreview';
import { useElementCall } from '../hooks/useElementCall';

interface MessageTimelineProps {
  room?: Room; // Optional room prop for multi-pane support
}

// Generate consistent color from username using simple hash
const getUserColor = (username: string): string => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate HSL color with good saturation and lightness for readability
  const hue = Math.abs(hash) % 360;
  const saturation = 65 + (Math.abs(hash) % 20); // 65-85%
  const lightness = 55 + (Math.abs(hash) % 15); // 55-70%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// Media renderer component - defined outside to prevent recreation on every render
const MediaRenderer = React.memo<{ content: any; client: MatrixClient; eventType?: string }>(({ content, client, eventType }) => {
  const msgtype = content.msgtype;
  const mxcUrl = content.url;
  
  if (!mxcUrl || !client) return null;
  
  const httpUrl = client.mxcUrlToHttp(mxcUrl);
  if (!httpUrl) return null;
  
  const accessToken = client.getAccessToken();
  const authenticatedUrl = `${httpUrl}${httpUrl.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(accessToken || '')}`;
  
  const filename = content.body || 'file';
  const filesize = content.info?.size;
  
  // Stickers (event type m.sticker)
  if (eventType === 'm.sticker') {
    const width = content.info?.w;
    const height = content.info?.h;
    const thumbnailUrl = content.info?.thumbnail_url 
      ? client.mxcUrlToHttp(content.info.thumbnail_url)
      : null;
    const authenticatedThumbnailUrl = thumbnailUrl 
      ? `${thumbnailUrl}${thumbnailUrl.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(accessToken || '')}`
      : null;
    
    // Use thumbnail if available, otherwise use main image
    const displayUrl = authenticatedThumbnailUrl || authenticatedUrl;
    
    // Calculate display size (max 200px, maintain aspect ratio)
    const maxSize = 200;
    let displayWidth = width;
    let displayHeight = height;
    
    if (width && height) {
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          displayWidth = maxSize;
          displayHeight = Math.round((height / width) * maxSize);
        } else {
          displayHeight = maxSize;
          displayWidth = Math.round((width / height) * maxSize);
        }
      }
    }
    
    return (
      <div className="mt-2 inline-block">
        <img
          src={displayUrl}
          alt={content.body || 'Sticker'}
          title={content.body || 'Sticker'}
          loading="lazy"
          style={{
            maxWidth: displayWidth ? `${displayWidth}px` : '200px',
            maxHeight: displayHeight ? `${displayHeight}px` : '200px',
            width: 'auto',
            height: 'auto',
            borderRadius: '4px',
            display: 'block',
          }}
        />
      </div>
    );
  }
  
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
    const width = content.info?.w;
    const height = content.info?.h;
    const mimetype = content.info?.mimetype;
    
    // Get video thumbnail if available
    const thumbnailUrl = content.info?.thumbnail_url 
      ? client.mxcUrlToHttp(content.info.thumbnail_url)
      : null;
    const authenticatedThumbnailUrl = thumbnailUrl 
      ? `${thumbnailUrl}${thumbnailUrl.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(accessToken || '')}`
      : null;
    
    // Calculate display dimensions (max 600px width, maintain aspect ratio)
    const maxWidth = 600;
    let displayWidth = width;
    let displayHeight = height;
    
    if (width && width > maxWidth) {
      displayWidth = maxWidth;
      if (height) {
        displayHeight = Math.round((height / width) * maxWidth);
      }
    }
    
    return (
      <div className="mt-2">
        <video
          controls
          className="rounded-lg bg-slate-800"
          preload="metadata"
          poster={authenticatedThumbnailUrl || undefined}
          style={{
            maxWidth: displayWidth ? `${displayWidth}px` : '600px',
            maxHeight: displayHeight ? `${displayHeight}px` : '400px',
            width: '100%',
            height: 'auto',
          }}
          onError={(e) => {
            console.error('Video playback error:', e);
            console.error('Video URL:', authenticatedUrl);
            console.error('Video mimetype:', mimetype);
            console.error('Video dimensions:', width, 'x', height);
          }}
        >
          <source src={authenticatedUrl} type={mimetype || 'video/mp4'} />
          Your browser doesn't support video playback. Try downloading the video instead.
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

// Helper function to extract URLs from text
const extractUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
  const matches = text.match(urlRegex);
  return matches || [];
};

const MessageTimeline: React.FC<MessageTimelineProps> = ({ room: roomProp }) => {
  const { currentRoom: contextRoom, client, sendReaction, deleteMessage, loadMoreHistory } = useMatrix();
  const { theme } = useTheme();
  
  // Use prop if provided, otherwise fall back to context
  const currentRoom = roomProp || contextRoom;
  const [messages, setMessages] = useState<MatrixEvent[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const [reactionUpdate, setReactionUpdate] = useState(0); // Force re-render for reactions
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null); // Track which message's picker is open
  const [selectedCategory, setSelectedCategory] = useState('Smileys'); // Track selected emoji category
  const [customEmojis, setCustomEmojis] = useState<Array<{ mxcUrl: string; name: string; blobUrl?: string }>>([]); // Custom uploaded emojis
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Element Call integration via hook
  const {
    isElementCallRoom: hasElementCall,
    showCallFrame,
    callUrl,
    isLoading: isJoiningCall,
    iframeRef: callIframeRef,
    joinCall: joinElementCall,
    leaveCall: leaveElementCall,
  } = useElementCall(currentRoom, client);
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

  // Get read receipts for a message - returns list of users who have read up to this message
  const getReadReceipts = (event: MatrixEvent): Array<{ userId: string; displayName: string; avatarUrl: string | null }> => {
    if (!currentRoom || !client) return [];
    
    const eventId = event.getId();
    if (!eventId) return [];
    
    const receipts: Array<{ userId: string; displayName: string; avatarUrl: string | null }> = [];
    const currentUserId = client.getUserId();
    
    // Get all members who have read this specific event
    const receiptMembers = currentRoom.getUsersReadUpTo(event);
    
    receiptMembers.forEach((member: any) => {
      // member could be a RoomMember object or string
      const userId = typeof member === 'string' ? member : (member.userId || member);
      
      // Skip own user
      if (userId === currentUserId) return;
      
      const roomMember = currentRoom.getMember(userId);
      const displayName = roomMember?.name || userId.split(':')[0];
      const avatarMxc = roomMember?.getMxcAvatarUrl();
      const avatarUrl = avatarMxc ? client.mxcUrlToHttp(avatarMxc, 24, 24, 'crop') : null;
      
      receipts.push({ userId, displayName, avatarUrl });
    });
    
    return receipts;
  };

  // Send read receipt for the last visible message
  const sendReadReceipt = useCallback((event: MatrixEvent) => {
    if (!client || !currentRoom) return;
    
    const eventId = event.getId();
    if (!eventId) return;
    
    try {
      client.sendReadReceipt(event);
    } catch (error) {
      console.error('Failed to send read receipt:', error);
    }
  }, [client, currentRoom]);

  // Parse message for user mentions and URLs, render as pills/links
  const renderMessageWithMentions = (text: string) => {
    if (!currentRoom) return text;
    
    // Regex patterns
    const matrixLinkRegex = /https:\/\/matrix\.to\/#\/(@[a-zA-Z0-9._=\-]+:[a-zA-Z0-9.\-]+)/g;
    const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
    const plainMentionRegex = /@([a-zA-Z0-9.\-_\s]+?)(?=\s|$|[.,!?;:])/g;
    
    // Find all matches with their positions
    interface Match {
      type: 'matrixLink' | 'url' | 'mention';
      start: number;
      end: number;
      match: string;
      data?: any;
    }
    
    const matches: Match[] = [];
    let match;
    
    // Find Matrix.to user links
    matrixLinkRegex.lastIndex = 0;
    while ((match = matrixLinkRegex.exec(text)) !== null) {
      const userId = match[1];
      const members = currentRoom.getJoinedMembers();
      const mentionedUser = members.find(member => member.userId === userId);
      const displayName = mentionedUser?.name || userId.split(':')[0].substring(1);
      
      matches.push({
        type: 'matrixLink',
        start: match.index,
        end: match.index + match[0].length,
        match: match[0],
        data: { userId, displayName, url: match[0] }
      });
    }
    
    // Find all other URLs (not Matrix.to user links)
    urlRegex.lastIndex = 0;
    while ((match = urlRegex.exec(text)) !== null) {
      const url = match[0];
      const matchStart = match.index;
      const matchEnd = match.index + match[0].length;
      
      // Skip if this URL is already a Matrix.to user link
      const isAlreadyProcessed = matches.some(m => 
        m.start <= matchStart && m.end >= matchEnd
      );
      
      if (!isAlreadyProcessed) {
        matches.push({
          type: 'url',
          start: matchStart,
          end: matchEnd,
          match: url,
          data: { url }
        });
      }
    }
    
    // Find plain @mentions (not in URLs)
    plainMentionRegex.lastIndex = 0;
    while ((match = plainMentionRegex.exec(text)) !== null) {
      const mentionedName = match[1];
      const matchStart = match.index;
      const matchEnd = match.index + match[0].length;
      
      // Skip if this is inside a URL or Matrix link
      const isInUrl = matches.some(m => 
        m.start <= matchStart && m.end >= matchEnd
      );
      
      if (!isInUrl) {
        const members = currentRoom.getJoinedMembers();
        const mentionedUser = members.find(member => 
          member.name === mentionedName || 
          member.userId === `@${mentionedName}` ||
          member.userId.toLowerCase().includes(mentionedName.toLowerCase())
        );
        
        if (mentionedUser) {
          matches.push({
            type: 'mention',
            start: matchStart,
            end: matchEnd,
            match: match[0],
            data: { user: mentionedUser }
          });
        }
      }
    }
    
    // Sort matches by position
    matches.sort((a, b) => a.start - b.start);
    
    // Build the result
    const parts = [];
    let lastIndex = 0;
    
    matches.forEach((m) => {
      // Add text before this match
      if (m.start > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {text.substring(lastIndex, m.start)}
          </span>
        );
      }
      
      // Add the match
      if (m.type === 'matrixLink') {
        parts.push(
          <a
            key={`link-${m.start}`}
            href={m.data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 hover:bg-primary-500/30 transition font-medium no-underline"
            title={m.data.userId}
            onClick={(e) => e.stopPropagation()}
          >
            @{m.data.displayName}
          </a>
        );
      } else if (m.type === 'url') {
        parts.push(
          <a
            key={`url-${m.start}`}
            href={m.data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
            onClick={(e) => e.stopPropagation()}
          >
            {m.data.url}
          </a>
        );
      } else if (m.type === 'mention') {
        parts.push(
          <span
            key={`mention-${m.start}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 hover:bg-primary-500/30 transition cursor-pointer font-medium"
            title={m.data.user.userId}
            onClick={(e) => {
              e.stopPropagation();
              console.log('Clicked user:', m.data.user.userId);
            }}
          >
            @{m.data.user.name}
          </span>
        );
      }
      
      lastIndex = m.end;
    });
    
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

  // Element Call detection and joining is now handled by useElementCall hook

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
  // Call state management is now in useElementCall hook

  useEffect(() => {
    if (!currentRoom) {
      setMessages([]);
      return;
    }

    const updateMessages = () => {
      const timelineEvents = currentRoom.getLiveTimeline().getEvents();
      const messageEvents = timelineEvents.filter(
        (event) => event.getType() === 'm.room.message' || event.getType() === 'm.sticker'
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

    // Handle read receipt updates
    const handleReceipt = () => {
      // Force re-render to update read receipts
      setReactionUpdate(prev => prev + 1);
    };

    // Listen for both timeline events and relation events (reactions)
    client?.on('Room.timeline' as any, handleTimeline);
    client?.on('Room.redaction' as any, handleTimeline);
    client?.on('Room.receipt' as any, handleReceipt);
    currentRoom?.on('Room.timeline' as any, handleTimeline);
    currentRoom?.on('Room.receipt' as any, handleReceipt);

    return () => {
      client?.removeListener('Room.timeline' as any, handleTimeline);
      client?.removeListener('Room.redaction' as any, handleTimeline);
      client?.removeListener('Room.receipt' as any, handleReceipt);
      currentRoom?.removeListener('Room.timeline' as any, handleTimeline);
      currentRoom?.removeListener('Room.receipt' as any, handleReceipt);
    };
  }, [currentRoom, client]);

  useEffect(() => {
    // Only auto-scroll if we're not loading more history
    if (!isLoadingMore && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoadingMore]);

  // Automatically send read receipts for visible messages
  useEffect(() => {
    if (!currentRoom || messages.length === 0) return;

    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.5 // Message must be 50% visible
    };

    const observers = new Map<string, IntersectionObserver>();

    messages.forEach((event) => {
      const eventId = event.getId();
      if (!eventId) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Send read receipt for this message
            sendReadReceipt(event);
          }
        });
      }, options);

      // Find the DOM element for this message
      const element = document.querySelector(`[data-event-id="${eventId}"]`);
      if (element) {
        observer.observe(element);
        observers.set(eventId, observer);
      }
    });

    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, [messages, currentRoom, sendReadReceipt]);

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

  const handlePinMessage = async (eventId: string) => {
    if (!currentRoom || !client) return;
    
    try {
      // Get current pinned events
      const pinnedEvent = currentRoom.currentState.getStateEvents('m.room.pinned_events', '');
      const currentPinned = pinnedEvent?.getContent()?.pinned || [];
      
      // Check if already pinned
      if (currentPinned.includes(eventId)) {
        alert('This message is already pinned');
        return;
      }
      
      // Add to pinned
      const newPinned = [...currentPinned, eventId];
      
      await client.sendStateEvent(currentRoom.roomId, 'm.room.pinned_events', {
        pinned: newPinned,
      }, '');
      
      console.log('✅ Message pinned successfully');
    } catch (error: any) {
      console.error('Failed to pin message:', error);
      alert(`Failed to pin message: ${error.message || error}`);
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
  // hasElementCall is now provided by useElementCall hook

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
            onClick={leaveElementCall}
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
      <div 
        className="flex-1 overflow-y-auto px-6 py-4"
        style={{
          gap: theme.style.compactMode ? '0.25rem' : '1rem',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
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
            const eventType = event.getType();
            const reactions = getReactions(event);
            const readReceipts = getReadReceipts(event);
            const isOwn = sender === client?.getUserId();
            const isEncrypted = event.isEncrypted();
            const isDecryptionFailure = event.isDecryptionFailure();
            const isRedacted = event.isRedacted();
            
            // Get user avatar
            const senderUser = currentRoom?.getMember(sender || '');
            const avatarMxc = senderUser?.getMxcAvatarUrl();
            const avatarUrl = avatarMxc && client ? client.mxcUrlToHttp(avatarMxc, 32, 32, 'crop') : null;

            // Terminal-style rendering
            if (theme.style.messageStyle === 'terminal') {
              const senderShort = sender?.split(':')[0] || 'user'; // Extract @username part only
              
              return (
                <div
                  key={eventId}
                  data-event-id={eventId}
                  className="group"
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
                  
                  {/* User avatar (small) */}
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={sender || 'User'}
                      className="rounded-full object-cover"
                      style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }}
                    />
                  ) : (
                    <div 
                      className="rounded-full flex items-center justify-center text-white font-semibold"
                      style={{ 
                        width: '1.25rem', 
                        height: '1.25rem', 
                        flexShrink: 0,
                        backgroundColor: getUserColor(sender || 'user'),
                        fontSize: '0.6rem'
                      }}
                    >
                      {sender?.charAt(1).toUpperCase()}
                    </div>
                  )}
                  
                  <span style={{ color: getUserColor(sender || 'user'), flexShrink: 0, fontWeight: 'bold' }}>
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
                        {(content.msgtype === 'm.text' || (content.body && content.msgtype !== 'm.image' && content.msgtype !== 'm.video' && eventType !== 'm.sticker')) && (
                          <span>{renderMessageWithMentions(content.body || '')}</span>
                        )}
                        {client && <MediaRenderer content={content} client={client} eventType={eventType} />}
                        
                        {/* URL Previews */}
                        {content.body && content.msgtype === 'm.text' && extractUrls(content.body).map((url, idx) => (
                          <UrlPreview key={`${eventId}-url-${idx}`} url={url} />
                        ))}
                        
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
                  
                  {/* Compact actions on hover - always rendered but hidden with CSS */}
                  <div 
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ 
                      display: 'flex', 
                      gap: '0.25rem', 
                      marginLeft: '0.5rem',
                      flexShrink: 0,
                      minWidth: isOwn ? '3rem' : '1.5rem', // Reserve space to prevent layout shift
                      justifyContent: 'flex-end',
                    }}
                  >
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
                        <button
                          onClick={() => handlePinMessage(eventId)}
                          style={{
                            backgroundColor: 'var(--color-bgTertiary)',
                            color: 'var(--color-text)',
                            padding: '0.125rem 0.25rem',
                            fontSize: 'var(--sizing-textXs)',
                            border: '1px solid var(--color-border)',
                            cursor: 'pointer',
                          }}
                          title="Pin message"
                        >
                          📌
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
                  
                  {/* Read Receipts - show who has read up to this message */}
                  {readReceipts.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem', marginLeft: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '-0.5rem' }}>
                        {readReceipts.slice(0, 3).map((receipt) => (
                          receipt.avatarUrl ? (
                            <img
                              key={receipt.userId}
                              src={receipt.avatarUrl}
                              alt={receipt.displayName}
                              title={`Read by ${receipt.displayName}`}
                              className="rounded-full object-cover"
                              style={{
                                width: '1rem',
                                height: '1rem',
                                border: '1px solid var(--color-bg)',
                                marginLeft: '-0.25rem'
                              }}
                            />
                          ) : (
                            <div
                              key={receipt.userId}
                              title={`Read by ${receipt.displayName}`}
                              className="rounded-full flex items-center justify-center text-white font-semibold"
                              style={{
                                width: '1rem',
                                height: '1rem',
                                backgroundColor: getUserColor(receipt.userId),
                                fontSize: '0.5rem',
                                border: '1px solid var(--color-bg)',
                                marginLeft: '-0.25rem'
                              }}
                            >
                              {receipt.displayName.charAt(0).toUpperCase()}
                            </div>
                          )
                        ))}
                      </div>
                      {readReceipts.length > 3 && (
                        <span style={{ fontSize: '0.625rem', color: 'var(--color-textMuted)' }}>
                          +{readReceipts.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            }
            
            // Bubble-style rendering (default)
            return (
              <div
                key={eventId}
                data-event-id={eventId}
                className="group"
              >
                <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-2xl ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isOwn && (
                      <div className="flex items-center gap-2 mb-1">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={sender || 'User'}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                            style={{ backgroundColor: getUserColor(sender || 'user') }}
                          >
                            {sender?.charAt(1).toUpperCase()}
                          </div>
                        )}
                        <span 
                          className="text-sm font-medium"
                          style={{ color: getUserColor(sender || 'user') }}
                        >
                          {sender}
                        </span>
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
                            {/* Text content - only show if not media-only or if it has a caption (but not for stickers) */}
                            {(content.msgtype === 'm.text' || (content.body && content.msgtype !== 'm.image' && content.msgtype !== 'm.video' && eventType !== 'm.sticker')) && (
                              <div className="markdown-body">
                                {renderMessageWithMentions(content.body || '')}
                              </div>
                            )}
                            
                            {/* Media content (images, videos, files, stickers) */}
                            {client && <MediaRenderer content={content} client={client} eventType={eventType} />}
                            
                            {/* URL Previews */}
                            {content.body && content.msgtype === 'm.text' && extractUrls(content.body).map((url, idx) => (
                              <UrlPreview key={`${eventId}-url-${idx}`} url={url} />
                            ))}
                            
                            {isEncrypted && (
                              <div className="flex items-center gap-1 mt-1 text-xs opacity-50">
                                <Lock className="w-3 h-3" />
                                <span>Encrypted</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Message actions (reaction, delete) - always rendered but hidden with CSS */}
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
                          
                          {/* Pin button */}
                          <button
                            onClick={() => handlePinMessage(eventId)}
                            className="bg-slate-700 hover:bg-slate-600 p-1.5 rounded-full text-slate-300 hover:text-white transition"
                            title="Pin message"
                          >
                            <Pin className="w-4 h-4" />
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
                    
                    {/* Read Receipts - show who has read up to this message */}
                    {readReceipts.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        <div className="flex items-center">
                          {readReceipts.slice(0, 3).map((receipt, index) => (
                            receipt.avatarUrl ? (
                              <img
                                key={receipt.userId}
                                src={receipt.avatarUrl}
                                alt={receipt.displayName}
                                title={`Read by ${receipt.displayName}`}
                                className="w-4 h-4 rounded-full object-cover border border-slate-700"
                                style={{ marginLeft: index > 0 ? '-6px' : '0' }}
                              />
                            ) : (
                              <div
                                key={receipt.userId}
                                title={`Read by ${receipt.displayName}`}
                                className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-semibold border border-slate-700"
                                style={{
                                  backgroundColor: getUserColor(receipt.userId),
                                  marginLeft: index > 0 ? '-6px' : '0'
                                }}
                              >
                                {receipt.displayName.charAt(0).toUpperCase()}
                              </div>
                            )
                          ))}
                        </div>
                        {readReceipts.length > 3 && (
                          <span className="text-[10px] text-slate-400">
                            +{readReceipts.length - 3}
                          </span>
                        )}
                      </div>
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

