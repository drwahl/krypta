import React, { useState, useRef, useEffect } from 'react';
import { useMatrix } from '../MatrixContext';
import { useTheme } from '../ThemeContext';
import { Send, Paperclip, Smile } from 'lucide-react';
import { Room } from 'matrix-js-sdk';

interface UserSuggestion {
  userId: string;
  displayName: string;
}

interface MessageInputProps {
  room?: Room; // Optional room prop for multi-pane support
}

const MessageInput: React.FC<MessageInputProps> = ({ room: roomProp }) => {
  const { currentRoom: contextRoom, sendMessage, client } = useMatrix();
  const { theme } = useTheme();
  
  // Use prop if provided, otherwise fall back to context
  const currentRoom = roomProp || contextRoom;
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<number>();
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [message]);

  // Get room members for autocomplete
  const getRoomMembers = (): UserSuggestion[] => {
    if (!currentRoom) return [];
    
    const members = currentRoom.getJoinedMembers();
    return members.map(member => ({
      userId: member.userId,
      displayName: member.name || member.userId
    }));
  };

  // Check for mention trigger and show suggestions
  const checkForMention = (text: string, cursorPos: number) => {
    // Find the last @ before cursor
    const beforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) {
      setUserSuggestions([]);
      setMentionStart(-1);
      return;
    }
    
    // Check if @ is at start or has whitespace before it
    const isValidStart = lastAtIndex === 0 || /\s/.test(text[lastAtIndex - 1]);
    if (!isValidStart) {
      setUserSuggestions([]);
      setMentionStart(-1);
      return;
    }
    
    // Get the search query after @
    const searchQuery = beforeCursor.substring(lastAtIndex + 1).toLowerCase();
    
    // Check if there's a space after @ (invalid mention)
    if (searchQuery.includes(' ')) {
      setUserSuggestions([]);
      setMentionStart(-1);
      return;
    }
    
    // Filter members by search query
    const members = getRoomMembers();
    const filtered = members.filter(member => 
      member.displayName.toLowerCase().includes(searchQuery) ||
      member.userId.toLowerCase().includes(searchQuery)
    );
    
    if (filtered.length > 0) {
      setUserSuggestions(filtered);
      setMentionStart(lastAtIndex);
      setSelectedSuggestionIndex(0);
    } else {
      setUserSuggestions([]);
      setMentionStart(-1);
    }
  };

  // Insert mention into message
  const insertMention = (user: UserSuggestion) => {
    if (mentionStart === -1 || !textareaRef.current) return;
    
    const cursorPos = textareaRef.current.selectionStart;
    const beforeMention = message.substring(0, mentionStart);
    const afterMention = message.substring(cursorPos);
    
    // Use friendly @displayname format for typing (will be converted to Matrix.to link on send)
    const mentionText = `@${user.displayName}`;
    const newMessage = beforeMention + mentionText + ' ' + afterMention;
    const newCursorPos = beforeMention.length + mentionText.length + 1;
    
    setMessage(newMessage);
    setUserSuggestions([]);
    setMentionStart(-1);
    
    // Restore cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
        textareaRef.current.focus();
      }
    }, 0);
  };

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
    // Handle autocomplete navigation
    if (userSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < userSuggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : userSuggestions.length - 1
        );
        return;
      }
      
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        insertMention(userSuggestions[selectedSuggestionIndex]);
        return;
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        setUserSuggestions([]);
        setMentionStart(-1);
        return;
      }
    }
    
    // Handle Tab for mention completion even without dropdown
    if (e.key === 'Tab' && textareaRef.current) {
      const cursorPos = textareaRef.current.selectionStart;
      checkForMention(message, cursorPos);
      
      if (userSuggestions.length > 0) {
        e.preventDefault();
        return;
      }
    }
    
    // Handle Enter to send
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!currentRoom) {
    return null;
  }

  return (
    <div 
      className="flex-shrink-0 relative"
      style={{
        backgroundColor: 'var(--color-bgSecondary)',
        borderTop: '1px solid var(--color-border)',
        padding: theme.style.compactMode ? 'var(--spacing-inputPadding)' : '1rem',
      }}
    >
      {/* User mention autocomplete dropdown */}
      {userSuggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute bottom-full mb-2 shadow-2xl max-h-64 overflow-y-auto z-50"
          style={{
            left: theme.style.compactMode ? '0.5rem' : '1rem',
            right: theme.style.compactMode ? '0.5rem' : '1rem',
            backgroundColor: 'var(--color-bgSecondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--sizing-borderRadius)',
          }}
        >
          {userSuggestions.map((user, index) => (
            <button
              key={user.userId}
              type="button"
              onClick={() => insertMention(user)}
              className="w-full text-left transition flex items-center"
              style={{
                padding: theme.style.compactMode ? '0.25rem 0.5rem' : '0.5rem 1rem',
                gap: '0.75rem',
                backgroundColor: index === selectedSuggestionIndex ? 'var(--color-hover)' : 'transparent',
                color: 'var(--color-text)',
                fontSize: 'var(--sizing-textBase)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-hover)';
              }}
              onMouseLeave={(e) => {
                if (index !== selectedSuggestionIndex) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {!theme.style.compactMode && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div 
                  className="font-medium truncate"
                  style={{ 
                    color: 'var(--color-text)',
                    fontSize: 'var(--sizing-textBase)',
                  }}
                >
                  {user.displayName}
                </div>
                {!theme.style.compactMode && (
                  <div 
                    className="text-xs truncate"
                    style={{ color: 'var(--color-textMuted)' }}
                  >
                    {user.userId}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      
      <form 
        onSubmit={handleSubmit} 
        className="flex items-end"
        style={{ gap: theme.style.compactMode ? '0.5rem' : '0.75rem' }}
      >
        {!theme.style.compactMode && (
          <button
            type="button"
            className="transition"
            style={{
              padding: '0.5rem',
              borderRadius: 'var(--sizing-borderRadius)',
              color: 'var(--color-textMuted)',
              marginBottom: '0.25rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-hover)';
              e.currentTarget.style.color = 'var(--color-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--color-textMuted)';
            }}
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
        )}

        <div 
          className="flex-1 overflow-hidden transition"
          style={{
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--sizing-borderRadius)',
            display: 'flex',
            alignItems: 'center',
            gap: theme.style.compactMode ? '0.25rem' : '0.5rem',
            paddingLeft: theme.style.compactMode ? '0.5rem' : '1rem',
            paddingRight: theme.style.compactMode ? '0.5rem' : '1rem',
          }}
        >
          {/* Terminal-style prompt for compact mode */}
          {theme.style.compactMode && (
            <span 
              style={{ 
                color: 'var(--color-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--sizing-textBase)',
                fontWeight: 'bold',
                flexShrink: 0,
              }}
            >
              &gt;
            </span>
          )}
          
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
              
              // Check for mentions on input change
              if (textareaRef.current) {
                const cursorPos = textareaRef.current.selectionStart;
                checkForMention(e.target.value, cursorPos);
              }
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // Delay hiding suggestions to allow click events to fire
              setTimeout(() => {
                setUserSuggestions([]);
                setMentionStart(-1);
              }, 200);
            }}
            placeholder={theme.style.compactMode ? '' : `Message ${currentRoom.name}`}
            className="w-full bg-transparent focus:outline-none resize-none"
            style={{
              color: 'var(--color-text)',
              fontFamily: theme.style.compactMode ? 'var(--font-mono)' : 'inherit',
              fontSize: 'var(--sizing-textBase)',
              padding: theme.style.compactMode ? '0.25rem 0' : '0.75rem 0',
              maxHeight: '200px',
            }}
            rows={1}
          />
        </div>

        {!theme.style.compactMode && (
          <button
            type="button"
            className="transition"
            style={{
              padding: '0.5rem',
              borderRadius: 'var(--sizing-borderRadius)',
              color: 'var(--color-textMuted)',
              marginBottom: '0.25rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-hover)';
              e.currentTarget.style.color = 'var(--color-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--color-textMuted)';
            }}
            title="Add emoji"
          >
            <Smile className="w-5 h-5" />
          </button>
        )}

        <button
          type="submit"
          disabled={!message.trim()}
          className="transition"
          style={{
            backgroundColor: message.trim() ? 'var(--color-primary)' : 'var(--color-bgTertiary)',
            color: message.trim() ? (theme.name === 'terminal' ? '#000' : '#fff') : 'var(--color-textMuted)',
            padding: theme.style.compactMode ? '0.25rem 0.5rem' : '0.5rem',
            borderRadius: 'var(--sizing-borderRadius)',
            marginBottom: theme.style.compactMode ? '0' : '0.25rem',
            cursor: message.trim() ? 'pointer' : 'not-allowed',
            fontSize: theme.style.compactMode ? 'var(--sizing-textBase)' : undefined,
            fontFamily: theme.style.compactMode ? 'var(--font-mono)' : undefined,
            fontWeight: theme.style.compactMode ? 'bold' : undefined,
          }}
          onMouseEnter={(e) => {
            if (message.trim()) {
              e.currentTarget.style.backgroundColor = 'var(--color-primaryHover)';
            }
          }}
          onMouseLeave={(e) => {
            if (message.trim()) {
              e.currentTarget.style.backgroundColor = 'var(--color-primary)';
            }
          }}
          title="Send message"
        >
          {theme.style.compactMode ? '↵' : <Send className="w-5 h-5" />}
        </button>
      </form>

      {!theme.style.compactMode && (
        <div 
          className="mt-2"
          style={{
            fontSize: 'var(--sizing-textXs)',
            color: 'var(--color-textMuted)',
          }}
        >
          <span className="font-medium">@username</span> to mention • <span className="font-medium">Tab</span> to autocomplete • <span className="font-medium">Shift + Enter</span> for new line • <span className="font-medium">Enter</span> to send
        </div>
      )}
    </div>
  );
};

export default MessageInput;

