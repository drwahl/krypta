import React, { useEffect, useRef, useState } from 'react';
import { useMatrix } from '../MatrixContext';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { Smile, Reply, Lock, LockOpen, ShieldAlert } from 'lucide-react';
import { MatrixEvent } from 'matrix-js-sdk';

const MessageTimeline: React.FC = () => {
  const { currentRoom, client, sendReaction, loadMoreHistory } = useMatrix();
  const [messages, setMessages] = useState<MatrixEvent[]>([]);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesStartRef = useRef<HTMLDivElement>(null);

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

    const handleTimeline = () => {
      updateMessages();
    };

    client?.on('Room.timeline' as any, handleTimeline);

    return () => {
      client?.removeListener('Room.timeline' as any, handleTimeline);
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
    if (!currentRoom) return;
    try {
      await sendReaction(currentRoom.roomId, eventId, emoji);
    } catch (error) {
      console.error('Failed to send reaction:', error);
    }
  };

  const getReactions = (event: MatrixEvent) => {
    if (!currentRoom) return {};
    
    try {
      // Try to get relations from the room
      const eventId = event.getId();
      if (!eventId) return {};
      
      // Get all events and filter for reactions to this event
      const timeline = currentRoom.getLiveTimeline().getEvents();
      const reactionEvents = timeline.filter((e) => {
        if (e.getType() !== 'm.reaction') return false;
        const relation = e.getRelation();
        return relation?.event_id === eventId;
      });

      const reactionCounts: { [key: string]: number } = {};
      reactionEvents.forEach((reaction) => {
        const key = reaction.getRelation()?.key;
        if (key) {
          reactionCounts[key] = (reactionCounts[key] || 0) + 1;
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
                            onClick={() => handleReaction(eventId, '👍')}
                            className="bg-slate-700 hover:bg-slate-600 p-1.5 rounded-full text-slate-300 hover:text-white transition"
                            title="Add reaction"
                          >
                            <Smile className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Reactions display */}
                      {Object.keys(reactions).length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {Object.entries(reactions).map(([emoji, count]) => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(eventId, emoji)}
                              className="bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded-full text-xs flex items-center gap-1 transition"
                            >
                              <span>{emoji}</span>
                              <span className="text-slate-400">{count}</span>
                            </button>
                          ))}
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

