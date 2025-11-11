import React, { useState } from 'react';
import { useThreads } from '../contexts/ThreadsContext';
import { useMatrix } from '../MatrixContext';
import { ThreadSync } from '../services/threadSync';
import { Send, X } from 'lucide-react';

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
    if (!content.trim()) {
      console.log('❌ Content is empty, aborting');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get thread to find root event ID
      const thread = threadManager?.getThread(threadId);
      if (!thread) {
        console.error('Thread not found');
        setIsSubmitting(false);
        return;
      }

      // Create message object
      const message = {
        id: `msg-${Date.now()}`,
        eventId: `msg-${Date.now()}`,
        source: 'matrix' as const,
        sender: {
          id: client?.getUserId() || 'current-user',
          name: client?.getUserId()?.split(':')[0] || 'You',
          avatar: undefined,
        },
        content: content.trim(),
        timestamp: Date.now(),
        contextualObjects: [],
      };

      // Try to send via Matrix thread if available
      let sentViaMatrix = false;
      if (client && currentRoom && thread.messages.size > 0) {
        const threadSync = new ThreadSync(client);
        
        // Get the first message's event ID as the thread root
        const firstMessage = Array.from(thread.messages.values())[0];
        const threadRootEventId = firstMessage.eventId;

        if (threadRootEventId && threadRootEventId.startsWith('$')) {
          // Send via Matrix thread
          const eventId = await threadSync.sendMessageToThread(
            currentRoom.roomId,
            content.trim(),
            threadRootEventId
          );

          if (eventId) {
            console.log('✅ Message sent to Matrix thread:', eventId);
            // Update message with actual event ID
            message.eventId = eventId;
            sentViaMatrix = true;
          }
        }
      }

      // Always add to local thread (whether sent via Matrix or not)
      console.log(`📝 Adding message to thread: ${threadId}`);
      console.log(`📝 Message:`, message);
      
      const success = await addMessage(threadId, message);
      
      console.log(`📝 addMessage returned: ${success}`);
      
      if (success) {
        setContent('');
        onMessageAdded?.();
        console.log(`✅ Message added to thread (via ${sentViaMatrix ? 'Matrix' : 'local'})`);
      } else {
        console.error('❌ Failed to add message to thread');
      }
    } catch (error) {
      console.error('Error adding message:', error);
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
