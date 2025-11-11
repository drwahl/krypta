import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { Room } from 'matrix-js-sdk';

type LayoutDirection = 'horizontal' | 'vertical';

interface MultiRoomContextType {
  openRooms: Room[];
  addRoom: (room: Room) => void;
  removeRoom: (roomId: string) => void;
  setActiveRoom: (roomId: string) => void;
  activeRoomId: string | null;
  maxRooms: number;
  layoutDirection: LayoutDirection;
  setLayoutDirection: (direction: LayoutDirection) => void;
  roomSizes: Record<string, number>;
  setRoomSize: (roomId: string, size: number) => void;
}

const MultiRoomContext = createContext<MultiRoomContextType | undefined>(undefined);

export const MultiRoomProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [openRooms, setOpenRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [layoutDirection, setLayoutDirectionState] = useState<LayoutDirection>(() => {
    const stored = localStorage.getItem('nychatt_layout_direction');
    return (stored === 'vertical' || stored === 'horizontal') ? stored : 'horizontal';
  });
  const [roomSizes, setRoomSizesState] = useState<Record<string, number>>({});
  const maxRooms = 3; // Maximum number of rooms that can be open simultaneously

  // Persist layout direction to localStorage
  useEffect(() => {
    localStorage.setItem('nychatt_layout_direction', layoutDirection);
  }, [layoutDirection]);

  const setLayoutDirection = useCallback((direction: LayoutDirection) => {
    setLayoutDirectionState(direction);
  }, []);

  const setRoomSize = useCallback((roomId: string, size: number) => {
    setRoomSizesState(prev => ({ ...prev, [roomId]: size }));
  }, []);

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

  const contextValue = useMemo(() => ({
    openRooms, 
    addRoom, 
    removeRoom, 
    setActiveRoom: setActiveRoomId,
    activeRoomId,
    maxRooms,
    layoutDirection,
    setLayoutDirection,
    roomSizes,
    setRoomSize
  }), [openRooms, addRoom, removeRoom, activeRoomId, layoutDirection, setLayoutDirection, roomSizes, setRoomSize]);

  return (
    <MultiRoomContext.Provider value={contextValue}>
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

