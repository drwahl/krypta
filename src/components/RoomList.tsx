import React, { useState, useMemo } from 'react';
import { useMatrix } from '../MatrixContext';
import { Search, Hash, Users, LogOut, MessageCircle, ChevronDown, ChevronRight, Home, Lock } from 'lucide-react';
import { Room } from 'matrix-js-sdk';
import { getRoomAvatarUrl, getRoomInitials } from '../utils/roomIcons';

const RoomList: React.FC = () => {
  const { rooms, spaces, currentRoom, setCurrentRoom, logout, client } = useMatrix();
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
    const isActive = currentRoom?.roomId === room.roomId;
    const unreadCount = getUnreadCount(room);
    const members = room.getJoinedMemberCount();
    const isEncrypted = room.hasEncryptionStateEvent();
    const avatarUrl = getRoomAvatarUrl(room, client, 32);
    const initials = getRoomInitials(room.name);

    return (
      <button
        onClick={() => setCurrentRoom(room)}
        className={`w-full px-4 py-2 flex items-center gap-2 hover:bg-slate-700/50 transition ${
          isActive ? 'bg-slate-700 border-l-4 border-primary-500' : ''
        } ${indent ? 'pl-12' : ''}`}
      >
        {/* Room Avatar or Initials */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={room.name}
            className="w-6 h-6 rounded-md flex-shrink-0 object-cover"
          />
        ) : (
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0 text-left flex items-center gap-1">
          <p className={`text-sm font-medium truncate ${
            isActive ? 'text-white' : 'text-slate-300'
          }`}>
            {room.name}
          </p>
          {isEncrypted && (
            <Lock className="w-3 h-3 text-green-400 flex-shrink-0" title="Encrypted room" />
          )}
        </div>
        {unreadCount && (
          <div className="bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="w-80 bg-slate-800 flex flex-col border-r border-slate-700 h-full flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">NyChatt</h2>
          <button
            onClick={logout}
            className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-sm"
          />
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 bg-slate-900/30 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white font-semibold">
            {getUserDisplayName().charAt(1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{getUserDisplayName()}</p>
            <p className="text-xs text-slate-400">Online</p>
          </div>
        </div>
      </div>

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
    </div>
  );
};

export default RoomList;

