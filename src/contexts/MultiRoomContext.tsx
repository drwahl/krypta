import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Room } from 'matrix-js-sdk';

interface MultiRoomContextType {
  openRooms: Room[];
  addRoom: (room: Room) => void;
  removeRoom: (roomId: string) => void;
  setActiveRoom: (roomId: string) => void;
  activeRoomId: string | null;
  maxRooms: number;
}

const MultiRoomContext = createContext<MultiRoomContextType | undefined>(undefined);

export const MultiRoomProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [openRooms, setOpenRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const maxRooms = 3; // Maximum number of rooms that can be open simultaneously

  const addRoom = (room: Room) => {
    if (!room) return;
    
    // If room is already open, just make it active
    if (openRooms.some(r => r.roomId === room.roomId)) {
      setActiveRoomId(room.roomId);
      return;
    }
    
    setOpenRooms(prev => {
      // If at max capacity, remove the first (leftmost) room
      if (prev.length >= maxRooms) {
        const newRooms = [...prev.slice(1), room];
        setActiveRoomId(room.roomId);
        return newRooms;
      }
      
      // Otherwise just add it
      setActiveRoomId(room.roomId);
      return [...prev, room];
    });
  };

  const removeRoom = (roomId: string) => {
    setOpenRooms(prev => {
      const filtered = prev.filter(r => r.roomId !== roomId);
      
      // If we removed the active room, set active to the last remaining room
      if (activeRoomId === roomId && filtered.length > 0) {
        setActiveRoomId(filtered[filtered.length - 1].roomId);
      } else if (filtered.length === 0) {
        setActiveRoomId(null);
      }
      
      return filtered;
    });
  };

  return (
    <MultiRoomContext.Provider value={{ 
      openRooms, 
      addRoom, 
      removeRoom, 
      setActiveRoom: setActiveRoomId,
      activeRoomId,
      maxRooms 
    }}>
      {children}
    </MultiRoomContext.Provider>
  );
};

export const useMultiRoom = () => {
  const context = useContext(MultiRoomContext);
  if (!context) {
    throw new Error('useMultiRoom must be used within MultiRoomProvider');
  }
  return context;
};

