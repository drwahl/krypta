import React, { useState, useMemo } from 'react';
import { useMatrix } from '../MatrixContext';
import { useTheme } from '../ThemeContext';
import { useMultiRoom } from '../contexts/MultiRoomContext';
import { Search, Hash, Users, LogOut, MessageCircle, ChevronDown, ChevronRight, Home, Lock } from 'lucide-react';
import { Room } from 'matrix-js-sdk';
import { getRoomAvatarUrl, getRoomInitials } from '../utils/roomIcons';
import ThemeSelector from './ThemeSelector';

const RoomList: React.FC = () => {
  const { rooms, spaces, logout, client } = useMatrix();
  const { theme } = useTheme();
  const { openRooms, addRoom, activeRoomId } = useMultiRoom();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());
  const [isOrphanRoomsExpanded, setIsOrphanRoomsExpanded] = useState(true);

  const toggleSpace = (spaceId: string) => {
    const newExpanded = new Set(expandedSpaces);
    if (newExpanded.has(spaceId)) {
      newExpanded.delete(spaceId);
    } else {
      newExpanded.add(spaceId);
    }
    setExpandedSpaces(newExpanded);
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

    // Sort spaces by name
    const sortedSpacesList = [...spaces].sort((a, b) => a.name.localeCompare(b.name));

    return {
      roomsInSpaces: spaceToRooms,
      roomsWithoutSpace: orphanRooms,
      sortedSpaces: sortedSpacesList
    };
  }, [rooms, spaces]);

  // Filter rooms based on search
  const filterRooms = (roomList: Room[]) => {
    if (!searchQuery) return roomList;
    
    return roomList.filter((room) => {
      const name = room.name.toLowerCase();
      const query = searchQuery.toLowerCase();
      return name.includes(query);
    });
  };

  const sortRoomsByActivity = (roomList: Room[]) => {
    return [...roomList].sort((a, b) => {
      const aTimeline = a.timeline;
      const bTimeline = b.timeline;
      const aLastTs = aTimeline.length > 0 ? aTimeline[aTimeline.length - 1].getTs() : 0;
      const bLastTs = bTimeline.length > 0 ? bTimeline[bTimeline.length - 1].getTs() : 0;
      return bLastTs - aLastTs;
    });
  };

  const getUnreadCount = (room: Room) => {
    const notificationCount = room.getUnreadNotificationCount();
    return notificationCount > 0 ? notificationCount : null;
  };

  const getUserDisplayName = () => {
    return client?.getUserId() || 'User';
  };

  const RoomItem: React.FC<{ room: Room; indent?: boolean }> = ({ room, indent = false }) => {
    const isOpen = openRooms.some(r => r.roomId === room.roomId);
    const isActive = activeRoomId === room.roomId;
    const unreadCount = getUnreadCount(room);
    const members = room.getJoinedMemberCount();
    const isEncrypted = room.hasEncryptionStateEvent();
    const avatarUrl = getRoomAvatarUrl(room, client, 32);
    const initials = getRoomInitials(room.name);

    const displayName = theme.style.showRoomPrefix 
      ? `${theme.style.roomPrefix}${room.name}`
      : room.name;

    return (
      <button
        onClick={() => addRoom(room)}
        className={`w-full flex items-center transition ${
          isActive ? 'border-l-2' : ''
        } ${indent ? 'pl-8' : ''}`}
        style={{
          padding: theme.style.compactMode ? 'var(--spacing-roomItemPadding)' : '0.75rem 1rem',
          gap: theme.style.compactMode ? 'var(--spacing-roomItemGap)' : '0.5rem',
          backgroundColor: isActive ? 'var(--color-hover)' : (isOpen ? 'var(--color-bgTertiary)' : 'transparent'),
          borderLeftColor: isActive ? 'var(--color-primary)' : (isOpen ? 'var(--color-accent)' : 'transparent'),
          borderRadius: 'var(--sizing-borderRadius)',
          fontSize: 'var(--sizing-textBase)',
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
        {/* Room Avatar or Initials - Hide in compact mode */}
        {!theme.style.compactMode && (
          <>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={room.name}
                className="flex-shrink-0 object-cover"
                style={{
                  width: 'var(--sizing-avatarSizeSmall)',
                  height: 'var(--sizing-avatarSizeSmall)',
                  borderRadius: 'var(--sizing-borderRadius)',
                }}
              />
            ) : (
              <div 
                className="bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center font-semibold flex-shrink-0"
                style={{
                  width: 'var(--sizing-avatarSizeSmall)',
                  height: 'var(--sizing-avatarSizeSmall)',
                  borderRadius: 'var(--sizing-borderRadius)',
                  fontSize: 'var(--sizing-textXs)',
                  color: 'var(--color-text)',
                }}
              >
                {initials}
              </div>
            )}
          </>
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
  };

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
            {theme.style.compactMode ? '> NyChatt' : 'NyChatt'}
          </h2>
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
                      <p className="text-sm font-medium text-slate-300">Direct Messages & Other</p>
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
                      {sortRoomsByActivity(filteredOrphanRooms).map((room) => (
                        <RoomItem key={room.roomId} room={room} indent={true} />
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
              const totalUnread = spaceRooms.reduce((sum, room) => sum + (getUnreadCount(room) || 0), 0);

              // Hide space if no rooms match search
              if (searchQuery && filteredSpaceRooms.length === 0) {
                return null;
              }

              return (
                <div key={space.roomId}>
                  {/* Space header */}
                  <button
                    onClick={() => toggleSpace(space.roomId)}
                    className="w-full px-4 py-2 flex items-center gap-2 hover:bg-slate-700/30 transition group"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                    {(() => {
                      const spaceAvatarUrl = getRoomAvatarUrl(space, client, 32);
                      const spaceInitials = getRoomInitials(space.name);
                      return spaceAvatarUrl ? (
                        <img
                          src={spaceAvatarUrl}
                          alt={space.name}
                          className="w-6 h-6 rounded-md flex-shrink-0 object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-md bg-primary-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {spaceInitials}
                        </div>
                      );
                    })()}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-white truncate">
                        {space.name}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">({filteredSpaceRooms.length})</span>
                    {totalUnread > 0 && (
                      <div className="bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {totalUnread > 9 ? '9+' : totalUnread}
                      </div>
                    )}
                  </button>

                  {/* Space rooms (when expanded) */}
                  {isExpanded && (
                    <div>
                      {sortRoomsByActivity(filteredSpaceRooms).map((room) => (
                        <RoomItem key={room.roomId} room={room} indent={true} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Theme Selector - Footer */}
      <div className="border-t border-slate-700 p-3 flex-shrink-0 mt-auto" style={{ backgroundColor: 'var(--color-bgSecondary)' }}>
        <ThemeSelector />
      </div>
    </div>
  );
};

export default RoomList;

