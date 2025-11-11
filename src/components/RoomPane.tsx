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

const RoomPane: React.FC<RoomPaneProps> = ({ room, isActive }) => {
  const { setCurrentRoom } = useMatrix();
  const { removeRoom, setActiveRoom, openRooms } = useMultiRoom();
  const { theme } = useTheme();
  const [showInfo, setShowInfo] = useState(false);
  
  // Set the room as current in MatrixContext when this pane is active
  React.useEffect(() => {
    if (isActive) {
      setCurrentRoom(room);
    }
  }, [isActive, room, setCurrentRoom]);

  const handleClose = () => {
    removeRoom(room.roomId);
  };

  const handleClick = () => {
    if (!isActive) {
      setActiveRoom(room.roomId);
      setCurrentRoom(room);
    }
  };

  return (
    <div 
      className="flex-1 flex min-w-0 relative"
      style={{
        borderRight: openRooms.length > 1 ? '1px solid var(--color-border)' : 'none',
        backgroundColor: isActive ? 'var(--color-bg)' : 'var(--color-bgSecondary)',
        opacity: isActive ? 1 : 0.7,
        transition: 'opacity 0.2s',
      }}
      onClick={handleClick}
    >
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Room header */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{
            backgroundColor: 'var(--color-bgSecondary)',
            borderBottom: '1px solid var(--color-border)',
            padding: theme.style.compactMode ? 'var(--spacing-sidebarPadding)' : '1rem 1.5rem',
          }}
        >
          <h3 
            className="font-bold truncate"
            style={{
              color: 'var(--color-text)',
              fontSize: theme.style.compactMode ? 'var(--sizing-textBase)' : 'var(--sizing-textLg)',
              fontFamily: theme.style.compactMode ? 'var(--font-mono)' : 'inherit',
            }}
          >
            {theme.style.compactMode ? `> ${room.name}` : room.name}
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
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              backgroundColor: 'var(--color-primary)',
              zIndex: 10,
            }}
          />
        )}
        
        <MessageTimeline room={room} isActive={isActive} />
        <MessageInput room={room} isActive={isActive} />
      </div>
      
      {/* Room Info Panel */}
      {showInfo && (
        <RoomInfo room={room} onClose={() => setShowInfo(false)} />
      )}
    </div>
  );
};

export default RoomPane;

