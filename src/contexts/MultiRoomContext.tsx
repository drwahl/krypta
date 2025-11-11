import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { Room } from 'matrix-js-sdk';
import { useMatrix } from '../MatrixContext';

type LayoutDirection = 'horizontal' | 'vertical';

interface MultiRoomContextType {
  openRooms: Room[];
  addRoom: (room: Room) => void;
  removeRoom: (roomId: string) => void;
  setActiveRoom: (roomId: string) => void;
  activeRoomId: string | null;
  maxRooms: number;
  setMaxRooms: (max: number) => void;
  layoutDirection: LayoutDirection;
  setLayoutDirection: (direction: LayoutDirection) => void;
  roomSizes: Record<string, number>;
  setRoomSize: (roomId: string, size: number) => void;
}

const MultiRoomContext = createContext<MultiRoomContextType | undefined>(undefined);

export const MultiRoomProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { client, rooms, spaces } = useMatrix();
  const [openRooms, setOpenRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(() => {
    // Restore active room ID from localStorage
    return localStorage.getItem('nychatt_active_room_id');
  });
  const [openRoomIds, setOpenRoomIds] = useState<string[]>(() => {
    // Restore open room IDs from localStorage
    const stored = localStorage.getItem('nychatt_open_room_ids');
    return stored ? JSON.parse(stored) : [];
  });
  const [restoredSession, setRestoredSession] = useState(false);
  const [layoutDirection, setLayoutDirectionState] = useState<LayoutDirection>(() => {
    const stored = localStorage.getItem('nychatt_layout_direction');
    return (stored === 'vertical' || stored === 'horizontal') ? stored : 'horizontal';
  });
  const [roomSizes, setRoomSizesState] = useState<Record<string, number>>({});
  const [maxRooms, setMaxRoomsState] = useState<number>(() => {
    // Restore max rooms from localStorage, default to 3
    const stored = localStorage.getItem('nychatt_max_rooms');
    const parsed = stored ? parseInt(stored, 10) : 3;
    // Ensure value is between 1 and 10
    return Math.max(1, Math.min(10, parsed));
  });

  // Restore open rooms when client is ready and rooms are loaded
  useEffect(() => {
    if (!client || restoredSession || openRoomIds.length === 0) return;
    if (rooms.length === 0 && spaces.length === 0) return;

    const allRooms = [...rooms, ...spaces];
    const roomsToRestore: Room[] = [];

    // Find room objects for stored IDs
    for (const roomId of openRoomIds) {
      const room = allRooms.find(r => r.roomId === roomId);
      if (room) {
        roomsToRestore.push(room);
      }
    }

    if (roomsToRestore.length > 0) {
      console.log(`🔄 Restoring ${roomsToRestore.length} open room(s)`);
      setOpenRooms(roomsToRestore);
      
      // Restore active room if it's in the restored set
      if (activeRoomId && roomsToRestore.some(r => r.roomId === activeRoomId)) {
        // Active room is already set from localStorage
        console.log(`✅ Restored active room: ${activeRoomId}`);
      } else if (roomsToRestore.length > 0) {
        // Fallback to first restored room if active room is not in set
        setActiveRoomId(roomsToRestore[0].roomId);
        console.log(`✅ Set active room to first restored: ${roomsToRestore[0].roomId}`);
      }
    }

    setRestoredSession(true);
  }, [client, rooms, spaces, restoredSession, openRoomIds, activeRoomId]);

  // Persist active room ID to localStorage
  useEffect(() => {
    if (activeRoomId) {
      localStorage.setItem('nychatt_active_room_id', activeRoomId);
    } else {
      localStorage.removeItem('nychatt_active_room_id');
    }
  }, [activeRoomId]);

  // Persist open room IDs to localStorage
  useEffect(() => {
    const roomIds = openRooms.map(r => r.roomId);
    localStorage.setItem('nychatt_open_room_ids', JSON.stringify(roomIds));
  }, [openRooms]);

  // Persist layout direction to localStorage
  useEffect(() => {
    localStorage.setItem('nychatt_layout_direction', layoutDirection);
  }, [layoutDirection]);

  // Persist max rooms to localStorage
  useEffect(() => {
    localStorage.setItem('nychatt_max_rooms', maxRooms.toString());
  }, [maxRooms]);

  // Close extra rooms if maxRooms is reduced below current open rooms count
  useEffect(() => {
    if (openRooms.length > maxRooms) {
      const roomsToKeep = openRooms.slice(-maxRooms); // Keep the most recent rooms
      setOpenRooms(roomsToKeep);
      
      // If active room was removed, set active to the last remaining room
      if (activeRoomId && !roomsToKeep.some(r => r.roomId === activeRoomId)) {
        setActiveRoomId(roomsToKeep[roomsToKeep.length - 1].roomId);
      }
    }
  }, [maxRooms]); // Only depend on maxRooms to avoid infinite loops

  const setLayoutDirection = useCallback((direction: LayoutDirection) => {
    setLayoutDirectionState(direction);
  }, []);

  const setMaxRooms = useCallback((max: number) => {
    // Ensure value is between 1 and 10
    const clampedMax = Math.max(1, Math.min(10, max));
    setMaxRoomsState(clampedMax);
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
    setMaxRooms,
    layoutDirection,
    setLayoutDirection,
    roomSizes,
    setRoomSize
  }), [openRooms, addRoom, removeRoom, activeRoomId, maxRooms, setMaxRooms, layoutDirection, setLayoutDirection, roomSizes, setRoomSize]);

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

