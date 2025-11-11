import React, { useState, useRef, useEffect } from 'react';
import { useMatrix } from '../MatrixContext';
import { Send, Paperclip, Smile } from 'lucide-react';

const MessageInput: React.FC = () => {
  const { currentRoom, sendMessage, client } = useMatrix();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [message]);

  const handleTyping = () => {
    if (!currentRoom || !client) return;

    if (!isTyping) {
      client.sendTyping(currentRoom.roomId, true, 3000);
      setIsTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      if (client) {
        client.sendTyping(currentRoom.roomId, false, 0);
        setIsTyping(false);
      }
    }, 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !currentRoom) return;

    try {
      await sendMessage(currentRoom.roomId, message);
      setMessage('');
      
      // Stop typing indicator
      if (client) {
        client.sendTyping(currentRoom.roomId, false, 0);
        setIsTyping(false);
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!currentRoom) {
    return null;
  }

  return (
    <div className="bg-slate-800 border-t border-slate-700 p-4 flex-shrink-0">
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <button
          type="button"
          className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white mb-1"
          title="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <div className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent transition">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${currentRoom.name}`}
            className="w-full px-4 py-3 bg-transparent text-white placeholder-slate-500 focus:outline-none resize-none"
            rows={1}
            style={{ maxHeight: '200px' }}
          />
        </div>

        <button
          type="button"
          className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white mb-1"
          title="Add emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        <button
          type="submit"
          disabled={!message.trim()}
          className="bg-primary-600 hover:bg-primary-700 disabled:bg-slate-700 disabled:text-slate-500 text-white p-2 rounded-lg transition mb-1 disabled:cursor-not-allowed"
          title="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>

      <div className="mt-2 text-xs text-slate-500">
        <span className="font-medium">Shift + Enter</span> for new line • <span className="font-medium">Enter</span> to send • Markdown supported
      </div>
    </div>
  );
};

export default MessageInput;

