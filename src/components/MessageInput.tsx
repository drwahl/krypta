import React, { useState, useRef, useEffect } from 'react';
import { useMatrix } from '../MatrixContext';
import { useTheme } from '../ThemeContext';
import { Send, Paperclip, Smile } from 'lucide-react';
import { Room } from 'matrix-js-sdk';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface UserSuggestion {
  userId: string;
  displayName: string;
}

interface MessageInputProps {
  room?: Room; // Optional room prop for multi-pane support
  replyText?: string; // Text to prepopulate (for replies)
  onReplyTextUsed?: () => void; // Callback when reply text is used
  editingEvent?: { eventId: string; originalText: string } | null; // Event being edited
  onEditComplete?: () => void; // Callback when edit is complete
}

const MessageInput: React.FC<MessageInputProps> = ({ 
  room: roomProp, 
  replyText, 
  onReplyTextUsed,
  editingEvent,
  onEditComplete 
}) => {
  const { currentRoom: contextRoom, sendMessage, client, setAllowUnverifiedForRoom } = useMatrix();
  const { theme } = useTheme();
  
  // Use prop if provided, otherwise fall back to context
  const currentRoom = roomProp || contextRoom;
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showUnverifiedDialog, setShowUnverifiedDialog] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<number>();
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [message]);

  // Handle reply text
  useEffect(() => {
    if (replyText) {
      setMessage(replyText);
      textareaRef.current?.focus();
      if (onReplyTextUsed) {
        onReplyTextUsed();
      }
    }
  }, [replyText, onReplyTextUsed]);

  // Handle editing
  useEffect(() => {
    if (editingEvent) {
      setMessage(editingEvent.originalText);
      textareaRef.current?.focus();
    }
  }, [editingEvent]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Convert emoji shortcodes (like :smile:) to actual emoji
  const convertShortcodes = (text: string): string => {
    // Common emoji shortcode mappings
    const emojiMap: Record<string, string> = {
      ':smile:': '😊', ':laughing:': '😂', ':blush:': '😊', ':heart:': '❤️',
      ':grinning:': '😀', ':smiley:': '😃', ':joy:': '😂', ':heart_eyes:': '😍',
      ':wink:': '😉', ':yum:': '😋', ':stuck_out_tongue:': '😛', ':sunglasses:': '😎',
      ':smirk:': '😏', ':neutral_face:': '😐', ':expressionless:': '😑', ':confused:': '😕',
      ':kissing:': '😗', ':kissing_heart:': '😘', ':kissing_smiling_eyes:': '😙',
      ':stuck_out_tongue_winking_eye:': '😜', ':stuck_out_tongue_closed_eyes:': '😝',
      ':disappointed:': '😞', ':worried:': '😟', ':angry:': '😠', ':rage:': '😡',
      ':cry:': '😢', ':persevere:': '😣', ':triumph:': '😤', ':disappointed_relieved:': '😥',
      ':frowning:': '😦', ':anguished:': '😧', ':fearful:': '😨', ':weary:': '😩',
      ':sleepy:': '😪', ':tired_face:': '😫', ':grimacing:': '😬', ':sob:': '😭',
      ':open_mouth:': '😮', ':hushed:': '😯', ':cold_sweat:': '😰', ':scream:': '😱',
      ':astonished:': '😲', ':flushed:': '😳', ':sleeping:': '😴', ':dizzy_face:': '😵',
      ':no_mouth:': '😶', ':mask:': '😷', ':smile_cat:': '😸', ':joy_cat:': '😹',
      ':smiley_cat:': '😺', ':heart_eyes_cat:': '😻', ':smirk_cat:': '😼',
      ':kissing_cat:': '😽', ':pouting_cat:': '😾', ':crying_cat_face:': '😿',
      ':scream_cat:': '🙀', ':slightly_frowning_face:': '🙁', ':slightly_smiling_face:': '🙂',
      ':upside_down_face:': '🙃', ':roll_eyes:': '🙄', ':no_good:': '🙅', ':ok_woman:': '🙆',
      ':bow:': '🙇', ':see_no_evil:': '🙈', ':hear_no_evil:': '🙉', ':speak_no_evil:': '🙊',
      ':raising_hand:': '🙋', ':raised_hands:': '🙌', ':person_frowning:': '🙍',
      ':person_with_pouting_face:': '🙎', ':pray:': '🙏', ':rocket:': '🚀', ':helicopter:': '🚁',
      ':steam_locomotive:': '🚂', ':railway_car:': '🚃', ':bullettrain_side:': '🚄',
      ':bullettrain_front:': '🚅', ':train2:': '🚆', ':metro:': '🚇', ':light_rail:': '🚈',
      ':station:': '🚉', ':tram:': '🚊', ':train:': '🚋', ':bus:': '🚌', ':oncoming_bus:': '🚍',
      ':trolleybus:': '🚎', ':busstop:': '🚏', ':minibus:': '🚐', ':ambulance:': '🚑',
      ':fire_engine:': '🚒', ':police_car:': '🚓', ':oncoming_police_car:': '🚔',
      ':taxi:': '🚕', ':oncoming_taxi:': '🚖', ':car:': '🚗', ':red_car:': '🚗',
      ':oncoming_automobile:': '🚘', ':blue_car:': '🚙', ':truck:': '🚚',
      ':articulated_lorry:': '🚛', ':tractor:': '🚜', ':monorail:': '🚝', ':mountain_railway:': '🚞',
      ':suspension_railway:': '🚟', ':mountain_cableway:': '🚠', ':aerial_tramway:': '🚡',
      ':ship:': '🚢', ':rowboat:': '🚣', ':speedboat:': '🚤', ':traffic_light:': '🚥',
      ':vertical_traffic_light:': '🚦', ':construction:': '🚧', ':rotating_light:': '🚨',
      ':triangular_flag_on_post:': '🚩', ':door:': '🚪', ':no_entry_sign:': '🚫',
      ':smoking:': '🚬', ':no_smoking:': '🚭', ':bike:': '🚲', ':walking:': '🚶',
      ':mens:': '🚹', ':womens:': '🚺', ':restroom:': '🚻', ':baby_symbol:': '🚼',
      ':toilet:': '🚽', ':potable_water:': '🚰', ':put_litter_in_its_place:': '🚮',
      ':cinema:': '🎦', ':signal_strength:': '📶', ':koko:': '🈁', ':symbols:': '🔣',
      ':information_source:': 'ℹ️', ':abc:': '🔤', ':abcd:': '🔡', ':capital_abcd:': '🔠',
      ':ng:': '🆖', ':ok:': '🆗', ':up:': '🆙', ':cool:': '🆒', ':new:': '🆕', ':free:': '🆓',
      ':+1:': '👍', ':thumbsup:': '👍', ':-1:': '👎', ':thumbsdown:': '👎',
      ':clap:': '👏', ':wave:': '👋', ':fire:': '🔥', ':100:': '💯', ':tada:': '🎉',
      ':eyes:': '👀', ':thinking:': '🤔', ':thinking_face:': '🤔', ':shrug:': '🤷',
      ':facepalm:': '🤦', ':muscle:': '💪', ':star:': '⭐', ':sparkles:': '✨',
      ':zap:': '⚡', ':boom:': '💥', ':zzz:': '💤', ':sweat_drops:': '💦',
      ':dash:': '💨', ':notes:': '🎶', ':v:': '✌️', ':ok_hand:': '👌', ':point_left:': '👈',
      ':point_right:': '👉', ':point_up:': '☝️', ':point_down:': '👇', ':fist:': '✊',
      ':facepunch:': '👊', ':punch:': '👊',':check_mark:': '✅', ':x:': '❌',
      ':bangbang:': '‼️', ':question:': '❓', ':grey_question:': '❔', ':grey_exclamation:': '❕',
      ':exclamation:': '❗', ':heavy_heart_exclamation:': '❣️', ':broken_heart:': '💔',
      ':two_hearts:': '💕', ':sparkling_heart:': '💖', ':heartpulse:': '💗',
      ':blue_heart:': '💙', ':green_heart:': '💚', ':yellow_heart:': '💛',
      ':purple_heart:': '💜', ':gift_heart:': '💝', ':revolving_hearts:': '💞',
      ':heart_decoration:': '💟', ':diamond_shape_with_a_dot_inside:': '💠',
      ':bulb:': '💡', ':anger:': '💢', ':bomb:': '💣', ':collision:': '💥',
      ':droplet:': '💧', ':poop:': '💩',
      ':shit:': '💩', ':hankey:': '💩', ':poo:': '💩', ':smooch:': '💋', ':smiling:': '☺️',
    };

    let result = text;
    for (const [shortcode, emoji] of Object.entries(emojiMap)) {
      result = result.replace(new RegExp(shortcode, 'g'), emoji);
    }
    return result;
  };

  // Handle emoji selection from picker
  const handleEmojiSelect = (emoji: any) => {
    const emojiNative = emoji.native;
    const cursorPos = textareaRef.current?.selectionStart || message.length;
    const newMessage = message.slice(0, cursorPos) + emojiNative + message.slice(cursorPos);
    setMessage(newMessage);
    setShowEmojiPicker(false);
    
    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPos = cursorPos + emojiNative.length;
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

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
      // Handle editing
      if (editingEvent && client) {
        console.log('✏️ MessageInput: Editing message');
        const messageWithEmoji = convertShortcodes(message);
        
        await client.sendEvent(currentRoom.roomId, 'm.room.message' as any, {
          'msgtype': 'm.text',
          'body': `* ${messageWithEmoji}`,
          'format': 'org.matrix.custom.html',
          'formatted_body': `* ${messageWithEmoji}`,
          'm.new_content': {
            'msgtype': 'm.text',
            'body': messageWithEmoji,
          },
          'm.relates_to': {
            'rel_type': 'm.replace',
            'event_id': editingEvent.eventId,
          },
        });
        
        console.log('✅ MessageInput: Message edited');
        setMessage('');
        if (onEditComplete) onEditComplete();
        return;
      }

      console.log('💬 MessageInput: Attempting to send message');
      // Convert emoji shortcodes to actual emoji before sending
      const messageWithEmoji = convertShortcodes(message);
      await sendMessage(currentRoom.roomId, messageWithEmoji);
      console.log('💬 MessageInput: Message sent, clearing input');
      setMessage('');
      
      // Stop typing indicator
      if (client) {
        client.sendTyping(currentRoom.roomId, false, 0);
        setIsTyping(false);
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error: any) {
      console.error('💬 MessageInput: Failed to send message:', error);
      
      // Check if this is an unverified devices error
      if (error?.message === 'UNVERIFIED_DEVICES') {
        console.log('🔐 Unverified devices detected, showing dialog');
        setPendingMessage(message);
        setMessage(''); // Clear input immediately to prevent accidental double-send
        setShowUnverifiedDialog(true);
        return;
      }
      
      alert(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSendAnyway = async (alwaysAllow: boolean) => {
    if (!currentRoom || !pendingMessage) return;

    if (alwaysAllow) {
      // Remember this choice for this room (for future messages)
      setAllowUnverifiedForRoom(currentRoom.roomId, true);
    }

    // Retry sending the message (always use forceSend for this retry)
    try {
      const messageWithEmoji = convertShortcodes(pendingMessage);
      // Always force send when retrying from dialog (state update takes effect for future sends)
      await sendMessage(currentRoom.roomId, messageWithEmoji, undefined, true);
      console.log('✅ Message sent after allowing unverified devices');
      setPendingMessage('');
      setShowUnverifiedDialog(false);
      
      // Stop typing indicator
      if (client) {
        client.sendTyping(currentRoom.roomId, false, 0);
        setIsTyping(false);
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error('❌ Failed to send message even after allowing unverified:', error);
      alert(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowUnverifiedDialog(false);
    }
  };

  const handleCancelSend = () => {
    // Restore the message to the input so user doesn't lose it
    if (pendingMessage) {
      setMessage(pendingMessage);
    }
    setPendingMessage('');
    setShowUnverifiedDialog(false);
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
          <div className="relative" ref={emojiPickerRef}>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="transition"
              style={{
                padding: '0.5rem',
                borderRadius: 'var(--sizing-borderRadius)',
                color: showEmojiPicker ? 'var(--color-primary)' : 'var(--color-textMuted)',
                backgroundColor: showEmojiPicker ? 'var(--color-hover)' : 'transparent',
                marginBottom: '0.25rem',
              }}
              onMouseEnter={(e) => {
                if (!showEmojiPicker) {
                  e.currentTarget.style.backgroundColor = 'var(--color-hover)';
                  e.currentTarget.style.color = 'var(--color-text)';
                }
              }}
              onMouseLeave={(e) => {
                if (!showEmojiPicker) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--color-textMuted)';
                }
              }}
              title="Add emoji"
            >
              <Smile className="w-5 h-5" />
            </button>
            
            {showEmojiPicker && (
              <div 
                className="absolute bottom-full mb-2 right-0 z-50"
                style={{
                  borderRadius: 'var(--sizing-borderRadius)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                }}
              >
                <Picker 
                  data={data} 
                  onEmojiSelect={handleEmojiSelect}
                  theme={theme.name === 'dark' || theme.name === 'terminal' ? 'dark' : 'light'}
                  previewPosition="none"
                  skinTonePosition="none"
                  searchPosition="sticky"
                  navPosition="top"
                  perLine={8}
                  maxFrequentRows={2}
                  set="native"
                />
              </div>
            )}
          </div>
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
          <span className="font-medium">@username</span> to mention • <span className="font-medium">:emoji:</span> for emoji (e.g. :laughing: :heart: :fire:) • <span className="font-medium">Tab</span> to autocomplete • <span className="font-medium">Enter</span> to send
        </div>
      )}

      {/* Unverified devices dialog */}
      {showUnverifiedDialog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
          onClick={handleCancelSend}
        >
          <div 
            className="p-6 rounded-lg shadow-xl max-w-md w-full mx-4"
            style={{
              backgroundColor: 'var(--color-bgSecondary)',
              border: '1px solid var(--color-border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 
              className="text-lg font-semibold mb-3"
              style={{ color: 'var(--color-text)' }}
            >
              Unverified Devices
            </h3>
            <p 
              className="mb-4"
              style={{ 
                color: 'var(--color-textSecondary)',
                fontSize: 'var(--sizing-textSm)',
              }}
            >
              This room contains unverified devices. Messages sent to unverified devices may not be secure. Do you want to send your message anyway?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleSendAnyway(false)}
                className="w-full py-2 px-4 rounded transition"
                style={{
                  backgroundColor: 'var(--color-warning)',
                  color: '#fff',
                  fontSize: 'var(--sizing-textSm)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Send Anyway (Once)
              </button>
              <button
                onClick={() => handleSendAnyway(true)}
                className="w-full py-2 px-4 rounded transition"
                style={{
                  backgroundColor: 'var(--color-error)',
                  color: '#fff',
                  fontSize: 'var(--sizing-textSm)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Always Send to Unverified Devices in this Room
              </button>
              <button
                onClick={handleCancelSend}
                className="w-full py-2 px-4 rounded transition"
                style={{
                  backgroundColor: 'var(--color-bgTertiary)',
                  color: 'var(--color-text)',
                  fontSize: 'var(--sizing-textSm)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-bgTertiary)';
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageInput;

