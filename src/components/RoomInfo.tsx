import React, { useState, useEffect } from 'react';
import { Room, MatrixClient, MatrixEvent, RoomMember } from 'matrix-js-sdk';
import { X, Users, Pin, Lock, Globe, UserPlus, Search, Shield, Crown, MoreVertical, Bell, BellOff } from 'lucide-react';
import { useMatrix } from '../MatrixContext';
import { useTheme } from '../ThemeContext';
import { useNotifications } from '../contexts/NotificationContext';
import { format } from 'date-fns';

interface RoomInfoProps {
  room: Room;
  onClose: () => void;
}

const RoomInfo: React.FC<RoomInfoProps> = ({ room, onClose }) => {
  const { client, getParentSpace } = useMatrix();
  const { theme, availableThemes, getRoomTheme, setRoomTheme, clearRoomTheme, getSpaceTheme, setSpaceTheme, clearSpaceTheme, defaultThemeName, currentSpaceId } = useTheme();
  const { settings, isRoomMuted, toggleRoomMute, toggleRoomAllow } = useNotifications();
  const [activeTab, setActiveTab] = useState<'members' | 'pinned' | 'settings'>('members');
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [pinnedEvents, setPinnedEvents] = useState<MatrixEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  const isEncrypted = room.hasEncryptionStateEvent();
  const joinRule = room.getJoinRule();
  const isPublic = joinRule === 'public';
  const totalMembers = room.getJoinedMemberCount();
  const userId = client?.getUserId();

  // Get current user's power level
  const powerLevels = room.currentState.getStateEvents('m.room.power_levels', '')?.[0]?.getContent();
  const myPowerLevel = powerLevels?.users?.[userId || ''] || powerLevels?.users_default || 0;
  const canPin = myPowerLevel >= (powerLevels?.events?.['m.room.pinned_events'] || 50);
  const canInvite = myPowerLevel >= (powerLevels?.invite || 0);

  // Load members
  useEffect(() => {
    const loadMembers = () => {
      const memberList = room.getJoinedMembers();
      setMembers(memberList);
    };

    loadMembers();

    // Listen for membership changes
    const handleMembership = () => {
      loadMembers();
    };

    client?.on('RoomMember.membership' as any, handleMembership);

    return () => {
      client?.off('RoomMember.membership' as any, handleMembership);
    };
  }, [room, client]);

  // Load pinned messages
  useEffect(() => {
    const loadPinnedMessages = async () => {
      const pinnedEvent = room.currentState.getStateEvents('m.room.pinned_events', '');
      if (!pinnedEvent) {
        setPinnedEvents([]);
        return;
      }

      const pinnedEventIds = pinnedEvent.getContent()?.pinned || [];
      const events: MatrixEvent[] = [];

      for (const eventId of pinnedEventIds) {
        try {
          const event = await client?.fetchRoomEvent(room.roomId, eventId);
          if (event) {
            events.push(new MatrixEvent(event));
          }
        } catch (err) {
          console.error('Failed to fetch pinned event:', eventId, err);
        }
      }

      setPinnedEvents(events);
    };

    loadPinnedMessages();
  }, [room, client]);

  const handleInvite = async () => {
    if (!inviteUsername.trim() || !client) return;

    setIsInviting(true);
    try {
      // Support both @user:server and just username formats
      let userToInvite = inviteUsername.trim();
      if (!userToInvite.startsWith('@')) {
        // Assume same homeserver as current user
        const homeserver = userId?.split(':')[1];
        userToInvite = `@${userToInvite}:${homeserver}`;
      }

      await client.invite(room.roomId, userToInvite);
      alert(`Successfully invited ${userToInvite} to ${room.name}`);
      setInviteUsername('');
      setShowInviteForm(false);
    } catch (error: any) {
      console.error('Failed to invite user:', error);
      alert(`Failed to invite user: ${error.message || error}`);
    } finally {
      setIsInviting(false);
    }
  };

  const handleUnpin = async (eventId: string) => {
    if (!client || !canPin) return;

    try {
      const pinnedEvent = room.currentState.getStateEvents('m.room.pinned_events', '');
      const currentPinned = pinnedEvent?.getContent()?.pinned || [];
      const newPinned = currentPinned.filter((id: string) => id !== eventId);

      await client.sendStateEvent(room.roomId, 'm.room.pinned_events', {
        pinned: newPinned,
      }, '');

      setPinnedEvents(pinnedEvents.filter(e => e.getId() !== eventId));
    } catch (error) {
      console.error('Failed to unpin message:', error);
      alert('Failed to unpin message');
    }
  };

  const getMemberRole = (member: RoomMember): string => {
    const powerLevel = powerLevels?.users?.[member.userId] || powerLevels?.users_default || 0;
    if (powerLevel >= 100) return 'Admin';
    if (powerLevel >= 50) return 'Moderator';
    return 'Member';
  };

  const getMemberRoleIcon = (member: RoomMember) => {
    const role = getMemberRole(member);
    if (role === 'Admin') return <Crown className="w-4 h-4" style={{ color: 'var(--color-warning)' }} />;
    if (role === 'Moderator') return <Shield className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />;
    return null;
  };

  const filteredMembers = members.filter(member => {
    const name = member.name.toLowerCase();
    const userId = member.userId.toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || userId.includes(query);
  });

  return (
    <div 
      className="flex flex-col h-full border-l"
      style={{
        backgroundColor: 'var(--color-bgSecondary)',
        borderColor: 'var(--color-border)',
        width: '350px',
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between flex-shrink-0"
        style={{
          padding: theme.style.compactMode ? 'var(--spacing-sidebarPadding)' : '1rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <h2 
          className="font-bold truncate"
          style={{
            fontSize: theme.style.compactMode ? 'var(--sizing-textLg)' : 'var(--sizing-textXl)',
            color: 'var(--color-text)',
          }}
        >
          Room Info
        </h2>
        <button
          onClick={onClose}
          className="p-1 rounded transition"
          style={{
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
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Room Name and Status */}
      <div 
        className="flex-shrink-0"
        style={{
          padding: theme.style.compactMode ? 'var(--spacing-sidebarPadding)' : '1rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <h3 
          className="font-bold mb-2"
          style={{
            fontSize: 'var(--sizing-textLg)',
            color: 'var(--color-text)',
          }}
        >
          {room.name}
        </h3>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1" style={{ color: 'var(--color-textMuted)' }}>
            <Users className="w-4 h-4" />
            <span>{totalMembers} members</span>
          </div>
          
          <div className="flex items-center gap-1" style={{ color: 'var(--color-textMuted)' }}>
            {isPublic ? (
              <>
                <Globe className="w-4 h-4" />
                <span>Public</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Private</span>
              </>
            )}
          </div>
          
          {isEncrypted && (
            <div className="flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
              <Lock className="w-4 h-4" />
              <span>Encrypted</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div 
        className="flex flex-shrink-0"
        style={{
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <button
          onClick={() => setActiveTab('members')}
          className="flex-1 py-3 px-4 transition"
          style={{
            backgroundColor: activeTab === 'members' ? 'var(--color-hover)' : 'transparent',
            color: activeTab === 'members' ? 'var(--color-text)' : 'var(--color-textMuted)',
            fontSize: 'var(--sizing-textSm)',
            borderBottom: activeTab === 'members' ? '2px solid var(--color-primary)' : 'none',
          }}
        >
          Members ({totalMembers})
        </button>
        <button
          onClick={() => setActiveTab('pinned')}
          className="flex-1 py-3 px-4 transition"
          style={{
            backgroundColor: activeTab === 'pinned' ? 'var(--color-hover)' : 'transparent',
            color: activeTab === 'pinned' ? 'var(--color-text)' : 'var(--color-textMuted)',
            fontSize: 'var(--sizing-textSm)',
            borderBottom: activeTab === 'pinned' ? '2px solid var(--color-primary)' : 'none',
          }}
        >
          Pinned ({pinnedEvents.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className="flex-1 py-3 px-4 transition"
          style={{
            backgroundColor: activeTab === 'settings' ? 'var(--color-hover)' : 'transparent',
            color: activeTab === 'settings' ? 'var(--color-text)' : 'var(--color-textMuted)',
            fontSize: 'var(--sizing-textSm)',
            borderBottom: activeTab === 'settings' ? '2px solid var(--color-primary)' : 'none',
          }}
        >
          Settings
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Members Tab */}
        {activeTab === 'members' && (
          <div>
            {/* Search */}
            <div 
              style={{
                padding: theme.style.compactMode ? 'var(--spacing-sidebarPadding)' : '1rem',
              }}
            >
              <div className="relative">
                <Search 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--color-textMuted)' }}
                />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded"
                  style={{
                    backgroundColor: 'var(--color-bgTertiary)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                    fontSize: 'var(--sizing-textSm)',
                  }}
                />
              </div>

              {/* Invite Button */}
              {canInvite && (
                <button
                  onClick={() => setShowInviteForm(!showInviteForm)}
                  className="w-full mt-2 py-2 px-3 rounded flex items-center justify-center gap-2 transition"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: theme.name === 'terminal' ? '#000' : '#fff',
                    fontSize: 'var(--sizing-textSm)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-primaryHover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                  }}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Invite to Room</span>
                </button>
              )}

              {/* Invite Form */}
              {showInviteForm && (
                <div className="mt-2 p-3 rounded" style={{ backgroundColor: 'var(--color-bgTertiary)' }}>
                  <input
                    type="text"
                    placeholder="@username:server or username"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleInvite();
                      }
                    }}
                    className="w-full px-3 py-2 rounded mb-2"
                    style={{
                      backgroundColor: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text)',
                      fontSize: 'var(--sizing-textSm)',
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleInvite}
                      disabled={isInviting || !inviteUsername.trim()}
                      className="flex-1 py-2 px-3 rounded transition"
                      style={{
                        backgroundColor: 'var(--color-primary)',
                        color: theme.name === 'terminal' ? '#000' : '#fff',
                        fontSize: 'var(--sizing-textSm)',
                        opacity: isInviting || !inviteUsername.trim() ? 0.5 : 1,
                        cursor: isInviting || !inviteUsername.trim() ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isInviting ? 'Inviting...' : 'Send Invite'}
                    </button>
                    <button
                      onClick={() => {
                        setShowInviteForm(false);
                        setInviteUsername('');
                      }}
                      className="py-2 px-3 rounded transition"
                      style={{
                        backgroundColor: 'var(--color-bgSecondary)',
                        color: 'var(--color-text)',
                        fontSize: 'var(--sizing-textSm)',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Member List */}
            <div>
              {filteredMembers.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-opacity-50 transition"
                  style={{
                    fontSize: 'var(--sizing-textSm)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  
                  {/* Name and Role */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate" style={{ color: 'var(--color-text)' }}>
                        {member.name}
                      </p>
                      {getMemberRoleIcon(member)}
                    </div>
                    <p className="text-xs truncate" style={{ color: 'var(--color-textMuted)' }}>
                      {member.userId}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pinned Messages Tab */}
        {activeTab === 'pinned' && (
          <div>
            {pinnedEvents.length === 0 ? (
              <div 
                className="flex flex-col items-center justify-center py-12 px-4"
                style={{ color: 'var(--color-textMuted)' }}
              >
                <Pin className="w-12 h-12 mb-3" />
                <p style={{ fontSize: 'var(--sizing-textSm)' }}>No pinned messages</p>
                <p className="text-xs mt-1">Important messages can be pinned here</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {pinnedEvents.map((event) => {
                  const content = event.getContent();
                  const sender = event.getSender();
                  const timestamp = event.getTs();

                  return (
                    <div
                      key={event.getId()}
                      className="p-4 hover:bg-opacity-50 transition"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                            {sender?.charAt(1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>
                              {sender}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--color-textMuted)' }}>
                              {format(new Date(timestamp), 'MMM d, yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                        {canPin && (
                          <button
                            onClick={() => handleUnpin(event.getId()!)}
                            className="p-1 rounded transition flex-shrink-0"
                            style={{
                              color: 'var(--color-textMuted)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--color-hover)';
                              e.currentTarget.style.color = 'var(--color-error)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = 'var(--color-textMuted)';
                            }}
                            title="Unpin message"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm break-words" style={{ color: 'var(--color-textSecondary)' }}>
                        {content.body || '(No content)'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div 
            className="p-4 space-y-4"
            style={{ fontSize: 'var(--sizing-textSm)' }}
          >
            <div>
              <h4 className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Room ID</h4>
              <p 
                className="px-3 py-2 rounded font-mono text-xs break-all"
                style={{
                  backgroundColor: 'var(--color-bgTertiary)',
                  color: 'var(--color-textMuted)',
                }}
              >
                {room.roomId}
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Access</h4>
              <p style={{ color: 'var(--color-textSecondary)' }}>
                {isPublic ? 'Anyone can join this room' : 'Only invited users can join this room'}
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Encryption</h4>
              <p style={{ color: 'var(--color-textSecondary)' }}>
                {isEncrypted ? 'Messages are end-to-end encrypted' : 'Messages are not encrypted'}
              </p>
            </div>

            {/* Notifications */}
            <div>
              <h4 className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Notifications</h4>
              {settings.mode === 'all' ? (
                <div className="flex items-center gap-2 p-3 rounded" style={{ backgroundColor: 'var(--color-bgTertiary)' }}>
                  <Bell className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
                  <div>
                    <p style={{ color: 'var(--color-text)' }}>All rooms notifying</p>
                    <p className="text-xs" style={{ color: 'var(--color-textMuted)' }}>
                      Change mode in Settings → Notifications to customize
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (settings.mode === 'muted') {
                      toggleRoomMute(room.roomId);
                    } else {
                      toggleRoomAllow(room.roomId);
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 rounded transition hover:bg-[var(--color-hover)]"
                  style={{
                    backgroundColor: isRoomMuted(room.roomId) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                    border: `1px solid ${isRoomMuted(room.roomId) ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    {isRoomMuted(room.roomId) ? (
                      <>
                        <BellOff className="w-5 h-5" style={{ color: '#ef4444' }} />
                        <div className="text-left">
                          <p style={{ color: 'var(--color-text)' }}>
                            {settings.mode === 'muted' ? 'Muted' : 'Not Allowed'}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-textMuted)' }}>
                            Click to {settings.mode === 'muted' ? 'unmute' : 'allow'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Bell className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
                        <div className="text-left">
                          <p style={{ color: 'var(--color-text)' }}>
                            {settings.mode === 'muted' ? 'Notifying' : 'Allowed'}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-textMuted)' }}>
                            Click to {settings.mode === 'muted' ? 'mute' : 'disallow'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </button>
              )}
            </div>

            <div>
              <h4 className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Your Permissions</h4>
              <p style={{ color: 'var(--color-textSecondary)' }}>
                Power Level: {myPowerLevel}
              </p>
              <div className="mt-2 space-y-1 text-xs" style={{ color: 'var(--color-textMuted)' }}>
                <p>• {canPin ? 'Can pin messages' : 'Cannot pin messages'}</p>
                <p>• {canInvite ? 'Can invite users' : 'Cannot invite users'}</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Room Theme</h4>
              <p className="mb-3 text-xs" style={{ color: 'var(--color-textMuted)' }}>
                Room theme → Space theme → Global default (affects only this chat window, not the UI chrome)
              </p>
              
              {/* Show current hierarchy */}
              {(() => {
                const roomOverride = getRoomTheme(room.roomId);
                const spaceId = getParentSpace(room.roomId);
                const spaceOverride = spaceId ? getSpaceTheme(spaceId) : null;
                const effectiveTheme = roomOverride || spaceOverride || defaultThemeName;
                const effectiveThemeDisplay = availableThemes.find(t => t.name === effectiveTheme)?.displayName || 'Unknown';
                
                return (
                  <div className="mb-4 p-3 rounded" style={{ backgroundColor: 'var(--color-bgTertiary)', fontSize: 'var(--sizing-textSm)' }}>
                    <div className="font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                      Current: {effectiveThemeDisplay}
                    </div>
                    <div className="space-y-1 text-xs" style={{ color: 'var(--color-textMuted)' }}>
                      <div>• Global: {availableThemes.find(t => t.name === defaultThemeName)?.displayName}</div>
                      {spaceId && (
                        <div>• Space: {spaceOverride ? availableThemes.find(t => t.name === spaceOverride)?.displayName : '(using global)'}</div>
                      )}
                      <div>• Room: {roomOverride ? availableThemes.find(t => t.name === roomOverride)?.displayName : '(using ' + (spaceOverride ? 'space' : 'global') + ')'}</div>
                    </div>
                  </div>
                );
              })()}
              
              {/* Room Theme Section */}
              <div className="mb-4">
                <h5 className="font-semibold mb-2 text-sm" style={{ color: 'var(--color-text)' }}>Room Theme Override</h5>
                <div className="space-y-2">
                  {/* Default/inherit option */}
                  <button
                    onClick={() => clearRoomTheme(room.roomId)}
                    className="w-full px-3 py-2 rounded text-left transition"
                    style={{
                      backgroundColor: !getRoomTheme(room.roomId) ? 'var(--color-primary)' : 'var(--color-bgTertiary)',
                      color: !getRoomTheme(room.roomId) ? '#fff' : 'var(--color-textSecondary)',
                      fontSize: 'var(--sizing-textSm)',
                    }}
                  >
                    <div className="font-medium">Use Parent Theme</div>
                    <div className="text-xs opacity-75">
                      {(() => {
                        const spaceId = getParentSpace(room.roomId);
                        const spaceOverride = spaceId ? getSpaceTheme(spaceId) : null;
                        return spaceOverride 
                          ? availableThemes.find(t => t.name === spaceOverride)?.displayName 
                          : availableThemes.find(t => t.name === defaultThemeName)?.displayName;
                      })()}
                    </div>
                  </button>

                  {/* Theme options */}
                  {availableThemes.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => setRoomTheme(room.roomId, t.name)}
                      className="w-full px-3 py-2 rounded text-left transition"
                      style={{
                        backgroundColor: getRoomTheme(room.roomId) === t.name ? 'var(--color-primary)' : 'var(--color-bgTertiary)',
                        color: getRoomTheme(room.roomId) === t.name ? '#fff' : 'var(--color-textSecondary)',
                        fontSize: 'var(--sizing-textSm)',
                      }}
                    >
                      {t.displayName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Space Theme Section (if room belongs to a space) */}
              {(() => {
                const spaceId = getParentSpace(room.roomId);
                if (!spaceId) return null;
                
                return (
                  <div>
                    <h5 className="font-semibold mb-2 text-sm" style={{ color: 'var(--color-text)' }}>Space Theme Override</h5>
                    <p className="mb-2 text-xs" style={{ color: 'var(--color-textMuted)' }}>
                      Set the default theme for all rooms in this space
                    </p>
                    <div className="space-y-2">
                      {/* Default option */}
                      <button
                        onClick={() => clearSpaceTheme(spaceId)}
                        className="w-full px-3 py-2 rounded text-left transition"
                        style={{
                          backgroundColor: !getSpaceTheme(spaceId) ? 'var(--color-primary)' : 'var(--color-bgTertiary)',
                          color: !getSpaceTheme(spaceId) ? '#fff' : 'var(--color-textSecondary)',
                          fontSize: 'var(--sizing-textSm)',
                        }}
                      >
                        <div className="font-medium">Use Global Default</div>
                        <div className="text-xs opacity-75">
                          {availableThemes.find(t => t.name === defaultThemeName)?.displayName}
                        </div>
                      </button>

                      {/* Theme options */}
                      {availableThemes.map((t) => (
                        <button
                          key={t.name}
                          onClick={() => setSpaceTheme(spaceId, t.name)}
                          className="w-full px-3 py-2 rounded text-left transition"
                          style={{
                            backgroundColor: getSpaceTheme(spaceId) === t.name ? 'var(--color-primary)' : 'var(--color-bgTertiary)',
                            color: getSpaceTheme(spaceId) === t.name ? '#fff' : 'var(--color-textSecondary)',
                            fontSize: 'var(--sizing-textSm)',
                          }}
                        >
                          {t.displayName}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomInfo;

