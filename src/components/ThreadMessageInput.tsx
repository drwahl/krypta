import React, { useState } from 'react';
import { useThreads } from '../contexts/ThreadsContext';
import { useMatrix } from '../MatrixContext';
import { Send } from 'lucide-react';

/**
 * ThreadMessageInput Component
 * Allows users to add messages directly to a thread
 */
interface ThreadMessageInputProps {
  threadId: string;
  onMessageAdded?: () => void | Promise<void>;
}

export const ThreadMessageInput: React.FC<ThreadMessageInputProps> = ({
  threadId,
  onMessageAdded,
}) => {
  const { addMessage, threadManager } = useThreads();
  const { client, currentRoom } = useMatrix();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🚀 handleSubmit called');
    console.log('🚀 content:', content);
    console.log('🚀 isSubmitting:', isSubmitting);
    
    e.preventDefault();
    if (!content.trim() || !client || !currentRoom) {
      console.log('❌ Missing required data:', { 
        hasContent: !!content.trim(), 
        hasClient: !!client, 
        hasRoom: !!currentRoom 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log(`🔍 Looking for thread with ID: ${threadId}`);
      console.log(`🔍 ThreadManager available:`, !!threadManager);
      console.log(`🔍 Total threads in manager:`, threadManager?.threads.size);
      console.log(`🔍 All thread IDs:`, Array.from(threadManager?.threads.keys() || []));
      
      // Get thread to find root event ID
      const thread = threadManager?.getThread(threadId);
      if (!thread) {
        console.error(`❌ Thread not found with ID: ${threadId}`);
        console.error(`❌ Available threads:`, Array.from(threadManager?.threads.keys() || []));
        setIsSubmitting(false);
        return;
      }
      
      console.log(`✅ Thread found:`, {
        id: thread.id,
        rootEventId: thread.rootEventId,
        title: thread.title,
        messageCount: thread.messages.size,
      });

      // Use the thread's rootEventId (which is a Matrix event ID)
      const threadRootEventId = thread.rootEventId;
      
      if (!threadRootEventId || !threadRootEventId.startsWith('$')) {
        console.error(`❌ Invalid thread root event ID: "${threadRootEventId}"`);
        console.error(`❌ Expected format: $eventId, got: ${threadRootEventId}`);
        setIsSubmitting(false);
        return;
      }

      console.log(`📨 Sending message to Matrix thread: ${threadRootEventId}`);
      
      // Send via Matrix with proper thread formatting for Element compatibility
      // According to MSC3440, threaded messages need fallback for older clients
      const messageContent = {
        body: content.trim(),
        msgtype: 'm.text',
        'm.relates_to': {
          rel_type: 'm.thread',
          event_id: threadRootEventId,
          is_falling_back: true,
          'm.in_reply_to': {
            event_id: threadRootEventId,
          },
        },
      };
      
      console.log('📤 Sending thread message:', messageContent);
      const result = await client.sendEvent(currentRoom.roomId, 'm.room.message', messageContent);
      console.log('✅ Message sent to Matrix thread successfully:', result);
      
      // Note: The message will be picked up automatically by the room timeline listener
      // and added to the thread by the ThreadsContext
      
      setContent('');
      onMessageAdded?.();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSubmit(e as any);
    }
  };

  console.log('🎨 Rendering input - isSubmitting:', isSubmitting, 'content:', content);

  return (
    <form onSubmit={handleSubmit} className="p-2 border-t border-slate-700 bg-slate-900/50 flex-shrink-0">
      <div className="flex gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add message... (Ctrl+Enter)"
          className="flex-1 px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none text-sm"
          style={{ height: '60px' }}
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-600 text-white text-sm font-medium rounded transition flex items-center gap-1 self-end flex-shrink-0"
        >
          {isSubmitting ? (
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-3 h-3" />
          )}
        </button>
      </div>
    </form>
  );
};

export default ThreadMessageInput;
