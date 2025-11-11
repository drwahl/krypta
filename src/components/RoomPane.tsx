import React from 'react';
import { Room } from 'matrix-js-sdk';
import { useMatrix } from '../MatrixContext';
import { useMultiRoom } from '../contexts/MultiRoomContext';
import MessageTimeline from './MessageTimeline';
import MessageInput from './MessageInput';
import { X } from 'lucide-react';

interface RoomPaneProps {
  room: Room;
  isActive: boolean;
}

const RoomPane: React.FC<RoomPaneProps> = ({ room, isActive }) => {
  const { setCurrentRoom } = useMatrix();
  const { removeRoom, setActiveRoom, openRooms } = useMultiRoom();
  
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
      className="flex-1 flex flex-col min-w-0 relative"
      style={{
        borderRight: openRooms.length > 1 ? '1px solid var(--color-border)' : 'none',
        backgroundColor: isActive ? 'var(--color-bg)' : 'var(--color-bgSecondary)',
        opacity: isActive ? 1 : 0.7,
        transition: 'opacity 0.2s',
      }}
      onClick={handleClick}
    >
      {/* Close button */}
      {openRooms.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="absolute top-2 right-2 z-10 transition"
          style={{
            padding: '0.25rem',
            borderRadius: 'var(--sizing-borderRadius)',
            backgroundColor: 'var(--color-bgTertiary)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-error)';
            e.currentTarget.style.borderColor = 'var(--color-error)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bgTertiary)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
          title="Close room"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      
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
      
      <MessageTimeline room={room} />
      <MessageInput room={room} />
    </div>
  );
};

export default RoomPane;

