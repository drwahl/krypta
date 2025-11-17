import React, { useState, useMemo } from 'react';
import { X, MessageCircle, Users, Search, UserPlus } from 'lucide-react';
import { useMatrix } from '../MatrixContext';

interface StartDMProps {
  onClose: () => void;
  onRoomCreated: (roomId: string) => void;
}

const StartDM: React.FC<StartDMProps> = ({ onClose, onRoomCreated }) => {
  const { client, rooms } = useMatrix();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [manualUserId, setManualUserId] = useState('');

  // Get all known users from rooms
  const knownUsers = useMemo(() => {
    if (!client) return [];

    const userMap = new Map<string, { userId: string; displayName: string; avatar?: string }>();
    const myUserId = client.getUserId();

    rooms.forEach((room) => {
      const members = room.getJoinedMembers();
      members.forEach((member) => {
        const userId = member.userId;
        if (userId !== myUserId && !userMap.has(userId)) {
          userMap.set(userId, {
            userId,
            displayName: member.name || userId,
            avatar: member.getAvatarUrl(client.baseUrl, 32, 32, 'crop', false) || undefined,
          });
        }
      });
    });

    return Array.from(userMap.values()).sort((a, b) => 
      a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase())
    );
  }, [client, rooms]);

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return knownUsers;
    const query = searchQuery.toLowerCase();
    return knownUsers.filter(
      (user) =>
        user.displayName.toLowerCase().includes(query) ||
        user.userId.toLowerCase().includes(query)
    );
  }, [knownUsers, searchQuery]);

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
    setError('');
  };

  const addManualUser = () => {
    let userId = manualUserId.trim();
    if (!userId) return;

    // Add @ prefix if not present
    if (!userId.startsWith('@')) {
      userId = '@' + userId;
    }

    // Validate basic Matrix ID format
    if (!userId.includes(':')) {
      setError('Invalid Matrix ID. Format: @username:server.com');
      return;
    }

    if (selectedUsers.includes(userId)) {
      setError('User already selected');
      return;
    }

    setSelectedUsers((prev) => [...prev, userId]);
    setManualUserId('');
    setError('');
  };

  const createDM = async () => {
    if (!client || selectedUsers.length === 0) return;

    setIsCreating(true);
    setError('');

    try {
      const isDirect = true;
      const isGroupDM = selectedUsers.length > 1;

      // Create room options
      const roomOptions: any = {
        is_direct: isDirect,
        invite: selectedUsers,
        preset: 'trusted_private_chat' as any,
        visibility: 'private' as any,
      };

      // Set room name for group DMs
      if (isGroupDM) {
        const names = selectedUsers.map((userId) => {
          const user = knownUsers.find((u) => u.userId === userId);
          return user?.displayName || userId.split(':')[0].substring(1);
        });
        roomOptions.name = names.join(', ');
      }

      console.log('Creating DM/Group DM with options:', roomOptions);
      const result = await client.createRoom(roomOptions);
      const roomId = result.room_id;

      // Mark as direct message in account data
      const mDirectEvent = client.getAccountData('m.direct')?.getContent() || {};
      
      if (isGroupDM) {
        // For group DMs, add all participants
        selectedUsers.forEach((userId) => {
          if (!mDirectEvent[userId]) {
            mDirectEvent[userId] = [];
          }
          if (!mDirectEvent[userId].includes(roomId)) {
            mDirectEvent[userId].push(roomId);
          }
        });
      } else {
        // For 1-on-1 DM
        const otherUserId = selectedUsers[0];
        if (!mDirectEvent[otherUserId]) {
          mDirectEvent[otherUserId] = [];
        }
        if (!mDirectEvent[otherUserId].includes(roomId)) {
          mDirectEvent[otherUserId].push(roomId);
        }
      }

      await client.setAccountData('m.direct', mDirectEvent);

      console.log('✅ DM created:', roomId);
      onRoomCreated(roomId);
      onClose();
    } catch (err: any) {
      console.error('Failed to create DM:', err);
      setError(err.message || 'Failed to create conversation');
      setIsCreating(false);
    }
  };

  const selectedUserNames = selectedUsers.map((userId) => {
    const user = knownUsers.find((u) => u.userId === userId);
    return user?.displayName || userId.split(':')[0].substring(1);
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/20 rounded-lg">
              <MessageCircle className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Start a Conversation</h2>
              <p className="text-sm text-slate-400">
                Send a message to one or more people
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary-400" />
                <span className="text-sm font-medium text-slate-300">
                  Selected ({selectedUsers.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((userId) => {
                  const user = knownUsers.find((u) => u.userId === userId);
                  return (
                    <div
                      key={userId}
                      className="flex items-center gap-2 bg-primary-500/20 text-primary-300 px-3 py-1.5 rounded-full text-sm"
                    >
                      <span>{user?.displayName || userId.split(':')[0].substring(1)}</span>
                      <button
                        onClick={() => toggleUser(userId)}
                        className="hover:text-primary-100 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Manual User ID Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Add by Matrix ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualUserId}
                onChange={(e) => setManualUserId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addManualUser()}
                placeholder="@username:server.com"
                className="flex-1 px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={addManualUser}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Search known users
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or ID..."
                className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* User List */}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No users found</p>
                <p className="text-sm">Add someone by their Matrix ID above</p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedUsers.includes(user.userId);
                return (
                  <button
                    key={user.userId}
                    onClick={() => toggleUser(user.userId)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${
                      isSelected
                        ? 'bg-primary-500/20 border border-primary-500/50'
                        : 'hover:bg-slate-700/50 border border-transparent'
                    }`}
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.displayName}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                        <span className="text-primary-300 text-sm font-medium">
                          {user.displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <div className="font-medium text-white">{user.displayName}</div>
                      <div className="text-xs text-slate-400">{user.userId}</div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {selectedUsers.length === 0 ? (
              'Select at least one person'
            ) : selectedUsers.length === 1 ? (
              <>Direct message with <strong>{selectedUserNames[0]}</strong></>
            ) : (
              <>Group conversation with <strong>{selectedUserNames.join(', ')}</strong></>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-300 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={createDM}
              disabled={selectedUsers.length === 0 || isCreating}
              className="px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg transition font-medium flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4" />
                  Start Conversation
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartDM;

