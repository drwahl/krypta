import React, { useState } from 'react';
import { Room } from 'matrix-js-sdk';
import { useMatrix } from '../MatrixContext';
import { useMultiRoom } from '../contexts/MultiRoomContext';
import { useTheme } from '../ThemeContext';
import MessageTimeline from './MessageTimeline';
import MessageInput from './MessageInput';
import RoomInfo from './RoomInfo';
import { X, Info } from 'lucide-react';

interface RoomPaneProps {
  room: Room;
  isActive: boolean;
}

const RoomPaneComponent: React.FC<RoomPaneProps> = ({ room, isActive }) => {
  const { setCurrentRoom, getParentSpace } = useMatrix();
  const { removeRoom, setActiveRoom, openRooms, layoutDirection } = useMultiRoom();
  const { theme: globalTheme, setCurrentRoom: setThemeCurrentRoom, getRoomThemeObject } = useTheme();
  const [showInfo, setShowInfo] = useState(false);
  const [replyText, setReplyText] = useState<string>('');
  const [editingEvent, setEditingEvent] = useState<{ eventId: string; originalText: string } | null>(null);
  
  // Get the specific theme for this room (respecting hierarchy)
  const spaceId = getParentSpace(room.roomId);
  const roomTheme = getRoomThemeObject(room.roomId, spaceId);
  
  // Set the room as current in MatrixContext and ThemeContext when this pane is active
  React.useEffect(() => {
    if (isActive) {
      setCurrentRoom(room);
      setThemeCurrentRoom(room.roomId, spaceId);
    }
  }, [isActive, room, setCurrentRoom, setThemeCurrentRoom, spaceId]);

  const handleClose = () => {
    removeRoom(room.roomId);
  };

  const handleClick = () => {
    if (!isActive) {
      setActiveRoom(room.roomId);
      setCurrentRoom(room);
    }
  };

  // Create room-specific CSS variables
  const roomThemeStyle: React.CSSProperties = {
    // Colors
    '--color-bg': roomTheme.colors.bg,
    '--color-bgSecondary': roomTheme.colors.bgSecondary,
    '--color-bgTertiary': roomTheme.colors.bgTertiary,
    '--color-text': roomTheme.colors.text,
    '--color-textSecondary': roomTheme.colors.textSecondary,
    '--color-textMuted': roomTheme.colors.textMuted,
    '--color-primary': roomTheme.colors.primary,
    '--color-primaryHover': roomTheme.colors.primaryHover,
    '--color-border': roomTheme.colors.border,
    '--color-messageBubbleOwn': roomTheme.colors.messageBubbleOwn,
    '--color-messageBubbleOther': roomTheme.colors.messageBubbleOther,
    '--color-hover': roomTheme.colors.hover,
    '--color-accent': roomTheme.colors.accent,
    '--color-success': roomTheme.colors.success,
    '--color-error': roomTheme.colors.error,
    '--color-warning': roomTheme.colors.warning,
    // Fonts
    '--font-body': roomTheme.fonts.body,
    '--font-mono': roomTheme.fonts.mono,
    // Spacing
    '--spacing-roomItemPadding': roomTheme.spacing.roomItemPadding,
    '--spacing-roomItemGap': roomTheme.spacing.roomItemGap,
    '--spacing-sidebarPadding': roomTheme.spacing.sidebarPadding,
    '--spacing-messagePadding': roomTheme.spacing.messagePadding,
    '--spacing-messageGap': roomTheme.spacing.messageGap,
    '--spacing-inputPadding': roomTheme.spacing.inputPadding,
    // Sizing
    '--sizing-textBase': roomTheme.sizing.textBase,
    '--sizing-textSm': roomTheme.sizing.textSm,
    '--sizing-textXs': roomTheme.sizing.textXs,
    '--sizing-textLg': roomTheme.sizing.textLg,
    '--sizing-textXl': roomTheme.sizing.textXl,
    '--sizing-roomItemHeight': roomTheme.sizing.roomItemHeight,
    '--sizing-avatarSize': roomTheme.sizing.avatarSize,
    '--sizing-avatarSizeSmall': roomTheme.sizing.avatarSizeSmall,
    '--sizing-borderRadius': roomTheme.sizing.borderRadius,
  } as React.CSSProperties;

  return (
    <div 
      className="flex-1 flex min-w-0 relative h-full"
      style={{
        backgroundColor: isActive ? 'var(--color-bg)' : 'var(--color-bgSecondary)',
        opacity: isActive ? 1 : 0.7,
        transition: 'opacity 0.2s',
      }}
      onClick={handleClick}
    >
      {/* Main chat area - Apply room-specific theme */}
      <div 
        className="flex-1 flex flex-col min-w-0"
        style={roomThemeStyle}
      >
        {/* Room header */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{
            backgroundColor: 'var(--color-bgSecondary)',
            borderBottom: '1px solid var(--color-border)',
            padding: roomTheme.style.compactMode ? 'var(--spacing-sidebarPadding)' : '1rem 1.5rem',
          }}
        >
          <h3 
            className="font-bold truncate"
            style={{
              color: 'var(--color-text)',
              fontSize: roomTheme.style.compactMode ? 'var(--sizing-textBase)' : 'var(--sizing-textLg)',
              fontFamily: roomTheme.style.compactMode ? 'var(--font-mono)' : 'inherit',
            }}
          >
            {roomTheme.style.compactMode ? `> ${room.name}` : room.name}
          </h3>
          
          <div className="flex items-center gap-2">
            {/* Info button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowInfo(!showInfo);
              }}
              className="transition"
              style={{
                padding: '0.5rem',
                borderRadius: 'var(--sizing-borderRadius)',
                backgroundColor: showInfo ? 'var(--color-hover)' : 'transparent',
                color: showInfo ? 'var(--color-primary)' : 'var(--color-textMuted)',
              }}
              onMouseEnter={(e) => {
                if (!showInfo) {
                  e.currentTarget.style.backgroundColor = 'var(--color-hover)';
                  e.currentTarget.style.color = 'var(--color-text)';
                }
              }}
              onMouseLeave={(e) => {
                if (!showInfo) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--color-textMuted)';
                }
              }}
              title="Room info"
            >
              <Info className="w-5 h-5" />
            </button>
            
            {/* Close button */}
            {openRooms.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="transition"
                style={{
                  padding: '0.5rem',
                  borderRadius: 'var(--sizing-borderRadius)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-textMuted)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-error)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--color-textMuted)';
                }}
                title="Close room"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        
        {/* Active indicator */}
        {isActive && openRooms.length > 1 && (
          <div 
            style={layoutDirection === 'horizontal' ? {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              backgroundColor: 'var(--color-primary)',
              zIndex: 10,
            } : {
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: '2px',
              backgroundColor: 'var(--color-primary)',
              zIndex: 10,
            }}
          />
        )}
        
        <MessageTimeline 
          room={room} 
          onReply={setReplyText}
          onEdit={setEditingEvent}
        />
        <MessageInput 
          room={room} 
          replyText={replyText}
          onReplyTextUsed={() => setReplyText('')}
          editingEvent={editingEvent}
          onEditComplete={() => setEditingEvent(null)}
        />
      </div>
      
      {/* Room Info Panel */}
      {showInfo && (
        <RoomInfo room={room} onClose={() => setShowInfo(false)} />
      )}
    </div>
  );
};

// Memoize to prevent unnecessary re-renders during resize
const RoomPane = React.memo(RoomPaneComponent, (prevProps, nextProps) => {
  // Only re-render if room ID or active status changes
  return prevProps.room.roomId === nextProps.room.roomId && prevProps.isActive === nextProps.isActive;
});

export default RoomPane;

