import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useMatrix } from '../MatrixContext';
import { useTheme } from '../ThemeContext';
import { useMultiRoom } from '../contexts/MultiRoomContext';
import { Search, Hash, Users, LogOut, MessageCircle, ChevronDown, ChevronRight, Home, Lock, GripVertical, Settings as SettingsIcon, Bell, BellOff, Plus } from 'lucide-react';
import { Room, MatrixClient } from 'matrix-js-sdk';
import { getRoomAvatarUrl, getRoomInitials } from '../utils/roomIcons';
import Settings from './Settings';
import Invites from './Invites';
import CreateRoom from './CreateRoom';
import { SortMode } from './SortSelector';
import { Theme } from '../themeTypes';

// Extracted RoomItem component for proper memoization
interface RoomItemProps {
  room: Room;
  indent?: boolean;
  spaceId?: string;
  client: MatrixClient | null;
  theme: Theme;
  isOpen: boolean; // Changed from openRooms array to boolean
  activeRoomId: string | null;
  draggedItem: { type: 'space' | 'room'; id: string; spaceId?: string } | null;
  sortMode: SortMode;
  onAddRoom: (room: Room) => void;
  onDragStart: (e: React.DragEvent, type: 'space' | 'room', id: string, spaceId?: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetType: 'space' | 'room', targetId: string, targetSpaceId?: string) => void;
  onDragEnd: () => void;
}

const RoomItem: React.FC<RoomItemProps> = React.memo(({
  room,
  indent = false,
  spaceId,
  client,
  theme,
  isOpen, // Now a boolean prop
  activeRoomId,
  draggedItem,
  sortMode,
  onAddRoom,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) => {
  // isOpen is now passed as a prop instead of calculated here
  const isActive = activeRoomId === room.roomId;
  const unreadCount = room.getUnreadNotificationCount();
  const isDragging = draggedItem?.type === 'room' && draggedItem.id === room.roomId;
  const members = room.getJoinedMemberCount();
  const isEncrypted = room.hasEncryptionStateEvent();
  const avatarUrl = useMemo(() => getRoomAvatarUrl(room, client, 32), [room, client]);
  const initials = useMemo(() => getRoomInitials(room.name), [room.name]);

  // Determine if this is a DM (2 members total, including self)
  const isDM = members === 2;
  
  // Build display name with Unix-style paths for terminal theme
  let displayName = room.name;
  if (theme.style.showRoomPrefix) {
    const prefix = isDM ? '/home/' : '/usr/bin/';
    displayName = `${prefix}${room.name}`;
  }

  return (
    <button
      onClick={() => onAddRoom(room)}
      draggable={sortMode === 'custom'}
      onDragStart={(e) => onDragStart(e, 'room', room.roomId, spaceId)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, 'room', room.roomId, spaceId)}
      onDragEnd={onDragEnd}
      className={`w-full flex items-center transition ${
        isActive ? 'border-l-2' : ''
      }`}
      style={{
        padding: theme.style.compactMode ? 'var(--spacing-roomItemPadding)' : '0.75rem 1rem',
        paddingLeft: indent ? (theme.style.compactMode ? '2rem' : '2.5rem') : (theme.style.compactMode ? 'var(--spacing-roomItemPadding)' : '1rem'),
        gap: theme.style.compactMode ? 'var(--spacing-roomItemGap)' : '0.5rem',
        backgroundColor: isActive ? 'var(--color-hover)' : (isOpen ? 'var(--color-bgTertiary)' : 'transparent'),
        borderLeftColor: isActive ? 'var(--color-primary)' : (isOpen ? 'var(--color-accent)' : 'transparent'),
        borderRadius: 'var(--sizing-borderRadius)',
        fontSize: 'var(--sizing-textBase)',
        opacity: isDragging ? 0.5 : 1,
        cursor: sortMode === 'custom' ? 'grab' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'var(--color-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      {/* Drag handle for custom sort mode */}
      {sortMode === 'custom' && (
        <GripVertical 
          className="flex-shrink-0" 
          style={{ 
            width: '1rem', 
            height: '1rem', 
            color: 'var(--color-textMuted)' 
          }} 
        />
      )}
      
      {/* Room Avatar or Initials - Show smaller in compact mode */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={room.name}
          className="flex-shrink-0 object-cover"
          style={{
            width: theme.style.compactMode ? '0.875rem' : '1.25rem',
            height: theme.style.compactMode ? '0.875rem' : '1.25rem',
            borderRadius: theme.style.compactMode ? '2px' : '4px',
          }}
        />
      ) : (
        <div 
          className="bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center font-semibold flex-shrink-0"
          style={{
            width: theme.style.compactMode ? '0.875rem' : '1.25rem',
            height: theme.style.compactMode ? '0.875rem' : '1.25rem',
            borderRadius: theme.style.compactMode ? '2px' : '4px',
            fontSize: theme.style.compactMode ? '0.45rem' : '0.625rem',
            color: 'var(--color-text)',
          }}
        >
          {initials}
        </div>
      )}
      <div className="flex-1 min-w-0 text-left flex items-center" style={{ gap: '0.25rem' }}>
        <p 
          className="font-medium truncate"
          style={{
            color: isActive ? 'var(--color-text)' : 'var(--color-textSecondary)',
            fontFamily: theme.style.compactMode ? 'var(--font-mono)' : 'inherit',
          }}
        >
          {displayName}
        </p>
        {isEncrypted && (
          <Lock 
            className="flex-shrink-0" 
            style={{ 
              width: theme.style.compactMode ? '0.7rem' : '0.75rem',
              height: theme.style.compactMode ? '0.7rem' : '0.75rem',
              color: 'var(--color-success)',
            }} 
            title="Encrypted room" 
          />
        )}
      </div>
      {unreadCount > 0 && (
        <div 
          className="font-bold flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: theme.name === 'terminal' ? '#000' : '#fff',
            fontSize: 'var(--sizing-textXs)',
            borderRadius: theme.style.compactMode ? '0' : '9999px',
            width: theme.style.compactMode ? 'auto' : '1.25rem',
            height: theme.style.compactMode ? 'auto' : '1.25rem',
            padding: theme.style.compactMode ? '0.125rem 0.25rem' : '0',
            minWidth: theme.style.compactMode ? 'auto' : '1.25rem',
          }}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </div>
      )}
    </button>
  );
});

const RoomListComponent: React.FC = () => {
  const { rooms, spaces, logout, client } = useMatrix();
  const { theme } = useTheme();
  const { openRooms, addRoom, activeRoomId } = useMultiRoom();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Persist expanded spaces
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('krypta_expanded_spaces');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  
  // Persist muted spaces
  const [mutedSpaces, setMutedSpaces] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('krypta_muted_spaces');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  
  // Persist orphan rooms expanded state (default to false/collapsed)
  const [isOrphanRoomsExpanded, setIsOrphanRoomsExpanded] = useState(() => {
    const stored = localStorage.getItem('krypta_orphan_rooms_expanded');
    return stored ? JSON.parse(stored) : false;
  });
  
  // Persist expanded space members
  const [expandedSpaceMembers, setExpandedSpaceMembers] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('krypta_expanded_space_members');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; spaceId: string } | null>(null);
  const [createRoomInSpace, setCreateRoomInSpace] = useState<string | null>(null);
  
  // Sort mode
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    return (localStorage.getItem('room_sort_mode') as SortMode) || 'activity';
  });
  
  // Custom order storage
  const [customSpaceOrder, setCustomSpaceOrder] = useState<string[]>(() => {
    const stored = localStorage.getItem('custom_space_order');
    return stored ? JSON.parse(stored) : [];
  });
  
  const [customRoomOrder, setCustomRoomOrder] = useState<Record<string, string[]>>(() => {
    const stored = localStorage.getItem('custom_room_order');
    return stored ? JSON.parse(stored) : {};
  });
  
  // Drag-and-drop state
  const [draggedItem, setDraggedItem] = useState<{ type: 'space' | 'room'; id: string; spaceId?: string } | null>(null);
  
  // Persist sort mode
  useEffect(() => {
    localStorage.setItem('room_sort_mode', sortMode);
  }, [sortMode]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);
  
  // Persist expanded spaces
  useEffect(() => {
    localStorage.setItem('krypta_expanded_spaces', JSON.stringify(Array.from(expandedSpaces)));
  }, [expandedSpaces]);
  
  // Persist orphan rooms expanded state
  useEffect(() => {
    localStorage.setItem('krypta_orphan_rooms_expanded', JSON.stringify(isOrphanRoomsExpanded));
  }, [isOrphanRoomsExpanded]);
  
  // Persist muted spaces
  useEffect(() => {
    localStorage.setItem('krypta_muted_spaces', JSON.stringify(Array.from(mutedSpaces)));
  }, [mutedSpaces]);
  
  // Persist custom orders
  useEffect(() => {
    localStorage.setItem('custom_space_order', JSON.stringify(customSpaceOrder));
  }, [customSpaceOrder]);
  
  useEffect(() => {
    localStorage.setItem('custom_room_order', JSON.stringify(customRoomOrder));
  }, [customRoomOrder]);

  const toggleSpace = (spaceId: string) => {
    const newExpanded = new Set(expandedSpaces);
    if (newExpanded.has(spaceId)) {
      newExpanded.delete(spaceId);
    } else {
      newExpanded.add(spaceId);
    }
    setExpandedSpaces(newExpanded);
    localStorage.setItem('krypta_expanded_spaces', JSON.stringify(Array.from(newExpanded)));
  };

  const toggleSpaceMembers = (spaceId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent space expansion/collapse
    }
    const newExpanded = new Set(expandedSpaceMembers);
    if (newExpanded.has(spaceId)) {
      newExpanded.delete(spaceId);
    } else {
      newExpanded.add(spaceId);
    }
    setExpandedSpaceMembers(newExpanded);
    localStorage.setItem('krypta_expanded_space_members', JSON.stringify(Array.from(newExpanded)));
  };

  const toggleMuteSpace = (spaceId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent space expansion/collapse
    }
    const newMuted = new Set(mutedSpaces);
    if (newMuted.has(spaceId)) {
      newMuted.delete(spaceId);
    } else {
      newMuted.add(spaceId);
    }
    setMutedSpaces(newMuted);
  };

  // Helper function for activity-based sorting
  const sortRoomsByActivity = (roomList: Room[]) => {
    return [...roomList].sort((a, b) => {
      const aTimeline = a.timeline;
      const bTimeline = b.timeline;
      const aLastTs = aTimeline.length > 0 ? aTimeline[aTimeline.length - 1].getTs() : 0;
      const bLastTs = bTimeline.length > 0 ? bTimeline[bTimeline.length - 1].getTs() : 0;
      return bLastTs - aLastTs;
    });
  };

  // Sorting functions
  const sortSpaces = (spaceList: Room[]): Room[] => {
    if (sortMode === 'activity') {
      return sortRoomsByActivity(spaceList);
    } else if (sortMode === 'alphabetical') {
      return [...spaceList].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'custom') {
      const ordered = [...spaceList].sort((a, b) => {
        const aIndex = customSpaceOrder.indexOf(a.roomId);
        const bIndex = customSpaceOrder.indexOf(b.roomId);
        
        // If neither is in custom order, sort alphabetically
        if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name);
        // If one is in custom order and one isn't, prioritize the custom one
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        // Both are in custom order, sort by position
        return aIndex - bIndex;
      });
      return ordered;
    }
    return spaceList;
  };
  
  const sortRoomsInSpace = (roomList: Room[], spaceId?: string): Room[] => {
    if (sortMode === 'activity') {
      return sortRoomsByActivity(roomList);
    } else if (sortMode === 'alphabetical') {
      return [...roomList].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'custom' && spaceId) {
      const customOrder = customRoomOrder[spaceId] || [];
      return [...roomList].sort((a, b) => {
        const aIndex = customOrder.indexOf(a.roomId);
        const bIndex = customOrder.indexOf(b.roomId);
        
        if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    }
    return roomList;
  };

  // Organize rooms by space
  const { roomsInSpaces, roomsWithoutSpace, sortedSpaces } = useMemo(() => {
    const spaceToRooms = new Map<string, Room[]>();
    const roomsInAnySpace = new Set<string>();

    // For each space, find its rooms
    spaces.forEach((space) => {
      const roomsInThisSpace: Room[] = [];
      const childEvents = space.currentState.getStateEvents('m.space.child');
      
      childEvents.forEach((event) => {
        const childRoomId = event.getStateKey();
        if (childRoomId) {
          const room = rooms.find(r => r.roomId === childRoomId);
          if (room) {
            roomsInThisSpace.push(room);
            roomsInAnySpace.add(childRoomId);
          }
        }
      });

      if (roomsInThisSpace.length > 0) {
        spaceToRooms.set(space.roomId, roomsInThisSpace);
      }
    });

    // Rooms not in any space
    const orphanRooms = rooms.filter(room => !roomsInAnySpace.has(room.roomId));

    // Sort spaces based on current sort mode
    const sortedSpacesList = sortSpaces(spaces);

    return {
      roomsInSpaces: spaceToRooms,
      roomsWithoutSpace: orphanRooms,
      sortedSpaces: sortedSpacesList
    };
  }, [rooms, spaces, sortMode, customSpaceOrder, customRoomOrder]);

  // Filter rooms based on search
  const filterRooms = (roomList: Room[]) => {
    if (!searchQuery) return roomList;
    
    return roomList.filter((room) => {
      const name = room.name.toLowerCase();
      const query = searchQuery.toLowerCase();
      return name.includes(query);
    });
  };

  const getUnreadCount = (room: Room) => {
    const notificationCount = room.getUnreadNotificationCount();
    return notificationCount > 0 ? notificationCount : null;
  };

  const getUserDisplayName = () => {
    return client?.getUserId() || 'User';
  };
  
  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, type: 'space' | 'room', id: string, spaceId?: string) => {
    if (sortMode !== 'custom') return;
    
    setDraggedItem({ type, id, spaceId });
    e.dataTransfer.effectAllowed = 'move';
  }, [sortMode]);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (sortMode !== 'custom') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, [sortMode]);
  
  const handleDrop = useCallback((e: React.DragEvent, targetType: 'space' | 'room', targetId: string, targetSpaceId?: string) => {
    e.preventDefault();
    if (sortMode !== 'custom' || !draggedItem) return;
    
    // Dropping a space
    if (draggedItem.type === 'space' && targetType === 'space') {
      const currentOrder = customSpaceOrder.length > 0 ? customSpaceOrder : spaces.map(s => s.roomId);
      const draggedIndex = currentOrder.indexOf(draggedItem.id);
      const targetIndex = currentOrder.indexOf(targetId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newOrder = [...currentOrder];
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedItem.id);
        setCustomSpaceOrder(newOrder);
      }
    }
    
    // Dropping a room within the same space
    if (draggedItem.type === 'room' && targetType === 'room' && draggedItem.spaceId === targetSpaceId && targetSpaceId) {
      const spaceRooms = roomsInSpaces.get(targetSpaceId) || [];
      const currentOrder = customRoomOrder[targetSpaceId] || spaceRooms.map(r => r.roomId);
      const draggedIndex = currentOrder.indexOf(draggedItem.id);
      const targetIndex = currentOrder.indexOf(targetId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newOrder = [...currentOrder];
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedItem.id);
        setCustomRoomOrder({
          ...customRoomOrder,
          [targetSpaceId]: newOrder
        });
      }
    }
    
    // Dropping orphan room
    if (draggedItem.type === 'room' && targetType === 'room' && !draggedItem.spaceId && !targetSpaceId) {
      const currentOrder = customRoomOrder['orphan'] || roomsWithoutSpace.map(r => r.roomId);
      const draggedIndex = currentOrder.indexOf(draggedItem.id);
      const targetIndex = currentOrder.indexOf(targetId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newOrder = [...currentOrder];
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedItem.id);
        setCustomRoomOrder({
          ...customRoomOrder,
          'orphan': newOrder
        });
      }
    }
    
    setDraggedItem(null);
  }, [sortMode, draggedItem, customSpaceOrder, spaces, customRoomOrder, roomsWithoutSpace, roomsInSpaces]);
  
  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
  }, []);

  return (
    <div 
      className="w-80 flex flex-col h-full flex-shrink-0"
      style={{
        backgroundColor: 'var(--color-bgSecondary)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div 
        className="flex-shrink-0"
        style={{
          padding: 'var(--spacing-sidebarPadding)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div 
          className="flex items-center justify-between"
          style={{
            marginBottom: theme.style.compactMode ? '0.25rem' : '1rem',
          }}
        >
          <h2 
            className="font-bold"
            style={{
              fontSize: theme.style.compactMode ? 'var(--sizing-textLg)' : 'var(--sizing-textXl)',
              color: 'var(--color-text)',
            }}
          >
            {theme.style.compactMode ? '> Krypta' : 'Krypta'}
          </h2>
          <div className="flex items-center" style={{ gap: '0.5rem' }}>
            <button
              onClick={() => setShowCreateRoom(true)}
              className="transition"
              style={{
                padding: theme.style.compactMode ? '0.25rem' : '0.5rem',
                borderRadius: 'var(--sizing-borderRadius)',
                color: 'var(--color-textMuted)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-hover)';
                e.currentTarget.style.color = 'var(--color-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-textMuted)';
              }}
              title="Create Room"
            >
              <Plus style={{ width: theme.style.compactMode ? '0.875rem' : '1.25rem', height: theme.style.compactMode ? '0.875rem' : '1.25rem' }} />
            </button>
          <button
            onClick={logout}
            className="transition"
            style={{
              padding: theme.style.compactMode ? '0.25rem' : '0.5rem',
              borderRadius: 'var(--sizing-borderRadius)',
              color: 'var(--color-textMuted)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-hover)';
              e.currentTarget.style.color = 'var(--color-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--color-textMuted)';
            }}
            title="Logout"
          >
            <LogOut style={{ width: theme.style.compactMode ? '0.875rem' : '1.25rem', height: theme.style.compactMode ? '0.875rem' : '1.25rem' }} />
          </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search 
            className="absolute transform -translate-y-1/2" 
            style={{
              left: theme.style.compactMode ? '0.5rem' : '0.75rem',
              top: '50%',
              width: theme.style.compactMode ? '0.75rem' : '1rem',
              height: theme.style.compactMode ? '0.75rem' : '1rem',
              color: 'var(--color-textMuted)',
            }}
          />
          <input
            type="text"
            placeholder={theme.style.compactMode ? '> search...' : 'Search rooms...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full transition"
            style={{
              paddingLeft: theme.style.compactMode ? '1.75rem' : '2.5rem',
              paddingRight: theme.style.compactMode ? '0.5rem' : '1rem',
              paddingTop: theme.style.compactMode ? '0.25rem' : '0.5rem',
              paddingBottom: theme.style.compactMode ? '0.25rem' : '0.5rem',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--sizing-borderRadius)',
              color: 'var(--color-text)',
              fontSize: 'var(--sizing-textSm)',
            }}
          />
        </div>
      </div>

      {/* Invites Section */}
      <Invites />

      {/* User info */}
      {!theme.style.compactMode && (
        <div 
          className="flex-shrink-0"
          style={{
            padding: 'var(--spacing-sidebarPadding)',
            backgroundColor: 'var(--color-bg)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div className="flex items-center" style={{ gap: '0.75rem' }}>
            <div 
              className="bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center font-semibold"
              style={{
                width: 'var(--sizing-avatarSize)',
                height: 'var(--sizing-avatarSize)',
                borderRadius: 'var(--sizing-borderRadius)',
                color: 'var(--color-text)',
              }}
            >
              {getUserDisplayName().charAt(1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p 
                className="font-medium truncate"
                style={{
                  fontSize: 'var(--sizing-textSm)',
                  color: 'var(--color-text)',
                }}
              >
                {getUserDisplayName()}
              </p>
              <p 
                style={{
                  fontSize: 'var(--sizing-textXs)',
                  color: 'var(--color-textMuted)',
                }}
              >
                Online
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tree Navigation */}
      <div className="flex-1 overflow-y-auto">
        {rooms.length === 0 && spaces.length === 0 ? (
          <div className="p-4 text-center text-slate-500">
            {searchQuery ? 'No rooms found' : 'No rooms yet'}
          </div>
        ) : (
          <div className="py-2">
            {/* Rooms without a space */}
            {roomsWithoutSpace.length > 0 && (() => {
              const filteredOrphanRooms = filterRooms(roomsWithoutSpace);
              const totalUnread = roomsWithoutSpace.reduce((sum, room) => sum + (getUnreadCount(room) || 0), 0);
              
              return (
                <>
                  <button
                    onClick={() => setIsOrphanRoomsExpanded(!isOrphanRoomsExpanded)}
                    className="w-full px-4 py-2 flex items-center gap-2 hover:bg-slate-700/30 transition group"
                  >
                    {isOrphanRoomsExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                    <Home className="w-4 h-4 text-slate-400" />
                    <div className="flex-1 min-w-0 text-left">
                      <p 
                        className="text-sm font-medium text-slate-300"
                        style={{
                          fontFamily: theme.style.compactMode ? 'var(--font-mono)' : 'inherit',
                        }}
                      >
                        {theme.style.compactMode ? 'cd ~' : 'Direct Messages & Other'}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">({filteredOrphanRooms.length})</span>
                    {totalUnread > 0 && (
                      <div className="bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {totalUnread > 9 ? '9+' : totalUnread}
                      </div>
                    )}
                    </button>
                  {isOrphanRoomsExpanded && (
                    <div>
                      {sortRoomsInSpace(filteredOrphanRooms, 'orphan').map((room) => (
                        <RoomItem 
                          key={room.roomId} 
                          room={room} 
                          indent={true} 
                          spaceId={undefined}
                          client={client}
                          theme={theme}
                          isOpen={openRooms.some(r => r.roomId === room.roomId)}
                          activeRoomId={activeRoomId}
                          draggedItem={draggedItem}
                          sortMode={sortMode}
                          onAddRoom={addRoom}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          onDragEnd={handleDragEnd}
                        />
                      ))}
                    </div>
                  )}
                </>
              );
            })()}

            {/* Spaces with their rooms */}
            {sortedSpaces.map((space) => {
              const spaceRooms = roomsInSpaces.get(space.roomId) || [];
              const filteredSpaceRooms = filterRooms(spaceRooms);
              const isExpanded = expandedSpaces.has(space.roomId);
              const isMuted = mutedSpaces.has(space.roomId);
              const totalUnread = spaceRooms.reduce((sum, room) => sum + (getUnreadCount(room) || 0), 0);
              const isDraggingSpace = draggedItem?.type === 'space' && draggedItem.id === space.roomId;

              // Hide space if no rooms match search
              if (searchQuery && filteredSpaceRooms.length === 0) {
                return null;
              }

              // Memoize avatar calculations outside JSX
              const spaceAvatarUrl = getRoomAvatarUrl(space, client, 32);
              const spaceInitials = getRoomInitials(space.name);

              return (
                <div key={space.roomId}>
                  {/* Space header */}
                  <button
                    onClick={() => toggleSpace(space.roomId)}
                    onContextMenu={(e) => {
                      // If context menu is already open, close it and show default menu
                      if (contextMenu && contextMenu.spaceId === space.roomId) {
                        setContextMenu(null);
                        return; // Don't prevent default, allow browser menu
                      }
                      
                      // First right-click: show our custom menu
                      e.preventDefault();
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        spaceId: space.roomId,
                      });
                    }}
                    draggable={sortMode === 'custom'}
                    onDragStart={(e) => handleDragStart(e, 'space', space.roomId)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'space', space.roomId)}
                    onDragEnd={handleDragEnd}
                    className="w-full px-4 py-2 flex items-center gap-2 hover:bg-slate-700/30 transition group"
                    style={{
                      opacity: isDraggingSpace ? 0.5 : (isMuted ? 0.6 : 1),
                      cursor: sortMode === 'custom' ? 'grab' : 'pointer',
                    }}
                  >
                    {/* Drag handle for custom sort mode */}
                    {sortMode === 'custom' && (
                      <GripVertical 
                        className="flex-shrink-0" 
                        style={{ 
                          width: '1rem', 
                          height: '1rem', 
                          color: 'var(--color-textMuted)' 
                        }} 
                      />
                    )}
                    
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                    {spaceAvatarUrl ? (
                        <img
                          src={spaceAvatarUrl}
                          alt={space.name}
                          className="rounded-md flex-shrink-0 object-cover"
                          style={{
                          width: theme.style.compactMode ? '0.875rem' : '1.25rem',
                          height: theme.style.compactMode ? '0.875rem' : '1.25rem',
                          borderRadius: theme.style.compactMode ? '2px' : '4px',
                          }}
                        />
                      ) : (
                        <div 
                        className="bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center font-semibold flex-shrink-0"
                          style={{
                          width: theme.style.compactMode ? '0.875rem' : '1.25rem',
                          height: theme.style.compactMode ? '0.875rem' : '1.25rem',
                          borderRadius: theme.style.compactMode ? '2px' : '4px',
                          fontSize: theme.style.compactMode ? '0.45rem' : '0.625rem',
                          color: 'var(--color-text)',
                          }}
                        >
                          {spaceInitials}
                        </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <p 
                        className="text-sm font-semibold text-white truncate"
                        style={{
                          fontFamily: theme.style.compactMode ? 'var(--font-mono)' : 'inherit',
                        }}
                      >
                        {space.name}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">({filteredSpaceRooms.length})</span>
                    
                    {/* Mute/Unmute button */}
                    <button
                      onClick={(e) => toggleMuteSpace(space.roomId, e)}
                      className="flex-shrink-0 p-1 rounded transition"
                      style={{
                        color: isMuted ? 'var(--color-textMuted)' : 'var(--color-text)',
                        opacity: isMuted ? 1 : 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-hover)';
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        if (!isMuted) {
                          e.currentTarget.style.opacity = '0';
                        }
                      }}
                      title={isMuted ? 'Unmute space' : 'Mute space'}
                    >
                      {isMuted ? (
                        <BellOff className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                    </button>
                    
                    {totalUnread > 0 && !isMuted && (
                      <div className="bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {totalUnread > 9 ? '9+' : totalUnread}
                      </div>
                    )}
                  </button>

                  {/* Space rooms (when expanded) */}
                  {isExpanded && (
                    <div style={{ opacity: isMuted ? 0.6 : 1 }}>
                      {sortRoomsInSpace(filteredSpaceRooms, space.roomId).map((room) => (
                        <RoomItem 
                          key={room.roomId} 
                          room={room} 
                          indent={true} 
                          spaceId={space.roomId}
                          client={client}
                          theme={theme}
                          isOpen={openRooms.some(r => r.roomId === room.roomId)}
                          activeRoomId={activeRoomId}
                          draggedItem={draggedItem}
                          sortMode={sortMode}
                          onAddRoom={addRoom}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          onDragEnd={handleDragEnd}
                        />
                      ))}
                      
                      {/* Space members toggle */}
                      {(() => {
                        const members = space.getJoinedMembers();
                        const isMembersExpanded = expandedSpaceMembers.has(space.roomId);
                        
                        if (members.length > 0) {
                          return (
                            <>
                              <button
                                onClick={(e) => toggleSpaceMembers(space.roomId, e)}
                                className="w-full flex items-center transition"
                                style={{
                                  padding: theme.style.compactMode ? '0.25rem 1rem 0.25rem 2rem' : '0.5rem 1rem 0.5rem 2.5rem',
                                  gap: '0.5rem',
                                  color: 'var(--color-textMuted)',
                                  fontSize: 'var(--sizing-textSm)',
                                  backgroundColor: 'transparent',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'var(--color-hover)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                {isMembersExpanded ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                                <Users className="w-3 h-3" />
                                <span>Members ({members.length})</span>
                              </button>
                              
                              {isMembersExpanded && members.map((member) => {
                                const memberUser = member.user;
                                if (!memberUser) return null;
                                
                                const displayName = memberUser.displayName || member.userId;
                                const avatarUrl = memberUser.avatarUrl 
                                  ? client?.mxcUrlToHttp(memberUser.avatarUrl, 32, 32, 'crop') || undefined
                                  : undefined;
                                
                                return (
                                  <button
                                    key={member.userId}
                                    onClick={async () => {
                                      if (!client) return;
                                      // Find existing DM or create one
                                      const existingDm = rooms.find(r => {
                                        const members = r.getJoinedMembers();
                                        return members.length === 2 && 
                                               members.some(m => m.userId === member.userId);
                                      });
                                      
                                      if (existingDm) {
                                        addRoom(existingDm);
                                      } else {
                                        // Create new DM
                                        try {
                                          const { room_id } = await client.createRoom({
                                            visibility: 'private',
                                            preset: 'trusted_private_chat',
                                            is_direct: true,
                                            invite: [member.userId],
                                          });
                                          
                                          // Wait a moment for the room to sync
                                          setTimeout(() => {
                                            const newRoom = rooms.find(r => r.roomId === room_id);
                                            if (newRoom) {
                                              addRoom(newRoom);
                                            }
                                          }, 500);
                                        } catch (error) {
                                          console.error('Failed to create DM:', error);
                                        }
                                      }
                                    }}
                                    className="w-full flex items-center transition"
                                    style={{
                                      padding: theme.style.compactMode ? '0.25rem 1rem 0.25rem 3rem' : '0.5rem 1rem 0.5rem 3.5rem',
                                      gap: '0.5rem',
                                      color: 'var(--color-text)',
                                      fontSize: 'var(--sizing-textSm)',
                                      backgroundColor: 'transparent',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = 'var(--color-hover)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                    title={`Chat with ${displayName}`}
                                  >
                                    {avatarUrl ? (
                                      <img
                                        src={avatarUrl}
                                        alt={displayName}
                                        className="rounded-full flex-shrink-0 object-cover"
                                        style={{
                                          width: theme.style.compactMode ? '0.875rem' : '1.25rem',
                                          height: theme.style.compactMode ? '0.875rem' : '1.25rem',
                                        }}
                                      />
                                    ) : (
                                      <div 
                                        className="rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center font-semibold flex-shrink-0"
                                        style={{
                                          width: theme.style.compactMode ? '0.875rem' : '1.25rem',
                                          height: theme.style.compactMode ? '0.875rem' : '1.25rem',
                                          fontSize: theme.style.compactMode ? '0.4rem' : '0.5rem',
                                          color: 'var(--color-text)',
                                        }}
                                      >
                                        {displayName.substring(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                    <span className="truncate">{displayName}</span>
                                  </button>
                                );
                              })}
                            </>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Settings Button - Footer */}
      <div className="border-t border-slate-700 flex-shrink-0 mt-auto" style={{ backgroundColor: 'var(--color-bgSecondary)' }}>
        <button
          onClick={() => setShowSettings(true)}
          className="w-full flex items-center gap-3 transition"
          style={{
            padding: theme.style.compactMode ? '0.5rem' : '0.75rem 1rem',
            color: 'var(--color-text)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <SettingsIcon style={{ width: '1.25rem', height: '1.25rem' }} />
          <span className="font-medium">Settings</span>
        </button>
      </div>

      {/* Settings Panel */}
      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        sortMode={sortMode}
        onSortChange={setSortMode}
      />

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            backgroundColor: 'var(--color-bgSecondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--sizing-borderRadius)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            zIndex: 1000,
            minWidth: '200px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setCreateRoomInSpace(contextMenu.spaceId);
              setContextMenu(null);
            }}
            className="w-full text-left transition flex items-center"
            style={{
              padding: '0.75rem 1rem',
              gap: '0.75rem',
              color: 'var(--color-text)',
              fontSize: 'var(--sizing-textSm)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Plus className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
            <span>Create Room in Space</span>
          </button>
        </div>
      )}

      {/* Create Room Modal */}
      {(showCreateRoom || createRoomInSpace) && (
        <CreateRoom
          onClose={() => {
            setShowCreateRoom(false);
            setCreateRoomInSpace(null);
          }}
          onRoomCreated={(roomId) => {
            // Optionally open the newly created room
            const newRoom = rooms.find(r => r.roomId === roomId);
            if (newRoom) {
              addRoom(newRoom);
            }
            setShowCreateRoom(false);
            setCreateRoomInSpace(null);
          }}
          parentSpaceId={createRoomInSpace || undefined}
        />
      )}
    </div>
  );
};

// Memoize to prevent re-renders during window resize
const RoomList = React.memo(RoomListComponent);

export default RoomList;

