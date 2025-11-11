import React, { useEffect, useRef, useState } from 'react';
import { useMatrix } from '../MatrixContext';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { Smile, Reply, Lock, LockOpen, ShieldAlert, Upload } from 'lucide-react';
import { MatrixEvent } from 'matrix-js-sdk';

const MessageTimeline: React.FC = () => {
  const { currentRoom, client, sendReaction, loadMoreHistory } = useMatrix();
  const [messages, setMessages] = useState<MatrixEvent[]>([]);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const [reactionUpdate, setReactionUpdate] = useState(0); // Force re-render for reactions
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null); // Track which message's picker is open
  const [selectedCategory, setSelectedCategory] = useState('Smileys'); // Track selected emoji category
  const [customEmojis, setCustomEmojis] = useState<Array<{ url: string; name: string }>>([]); // Custom uploaded emojis
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Load custom emojis from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('custom_emojis');
    if (stored) {
      try {
        setCustomEmojis(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load custom emojis:', e);
      }
    }
  }, []);

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
      
      // Upload to Matrix media repository
      const response = await client.uploadContent(file, {
        name: file.name,
        type: file.type,
      });

      const mxcUrl = response.content_uri;
      const httpUrl = client.mxcUrlToHttp(mxcUrl);
      
      if (!httpUrl) {
        throw new Error('Failed to convert MXC URL to HTTP');
      }

      // Add to custom emojis
      const newEmoji = {
        url: httpUrl,
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
      };

      const updated = [...customEmojis, newEmoji];
      setCustomEmojis(updated);
      localStorage.setItem('custom_emojis', JSON.stringify(updated));
      
      // Switch to Custom category
      setSelectedCategory('Custom');
      
      console.log('✅ Custom emoji uploaded successfully');
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

  const handleLoadMore = async () => {
    if (!currentRoom || isLoadingMore || !canLoadMore) return;
    
    setIsLoadingMore(true);
    try {
      const hasMore = await loadMoreHistory(currentRoom);
      setCanLoadMore(hasMore);
    } catch (error) {
      console.error('Error loading more history:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

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

  return (
    <div className="flex-1 flex flex-col bg-slate-900 min-h-0">
      {/* Room header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-white">{currentRoom.name}</h2>
          {isRoomEncrypted && (
            <div className="flex items-center gap-1 text-green-400" title="End-to-end encrypted">
              <Lock className="w-4 h-4" />
              <span className="text-xs">Encrypted</span>
            </div>
          )}
        </div>
        <p className="text-sm text-slate-400">
          {currentRoom.getJoinedMemberCount()} members
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Load More Button */}
        {canLoadMore && messages.length > 0 && (
          <div className="flex justify-center pb-4">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-slate-300 rounded-lg transition text-sm flex items-center gap-2"
            >
              {isLoadingMore ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More Messages'
              )}
            </button>
          </div>
        )}

        <div ref={messagesStartRef} />

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
                        {isDecryptionFailure ? (
                          <div className="flex items-center gap-2 text-red-400">
                            <ShieldAlert className="w-4 h-4" />
                            <span className="text-sm">Unable to decrypt message</span>
                          </div>
                        ) : (
                          <>
                            <ReactMarkdown className="markdown-body">
                              {content.body || ''}
                            </ReactMarkdown>
                            {isEncrypted && (
                              <div className="flex items-center gap-1 mt-1 text-xs opacity-50">
                                <Lock className="w-3 h-3" />
                                <span>Encrypted</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Reaction button */}
                      {hoveredMessage === eventId && (
                        <div className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition">
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
                                      {customEmojis.map((emoji, index) => (
                                        <button
                                          key={`custom-${index}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleReaction(eventId, emoji.url);
                                          }}
                                          className="p-1 hover:bg-slate-700 rounded-lg transition relative group"
                                          title={emoji.name}
                                        >
                                          <img 
                                            src={emoji.url} 
                                            alt={emoji.name}
                                            className="w-8 h-8 object-contain"
                                          />
                                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
                                            {emoji.name}
                                          </span>
                                        </button>
                                      ))}
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
                            // Check if it's a custom emoji (URL)
                            const isCustomEmoji = emoji.startsWith('http');
                            
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
                                {isCustomEmoji ? (
                                  <img src={emoji} alt="custom emoji" className="w-5 h-5 object-contain" />
                                ) : (
                                  <span>{emoji}</span>
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

