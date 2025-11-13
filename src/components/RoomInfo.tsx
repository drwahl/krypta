import React, { useState, useEffect, useMemo } from 'react';
import { Room, MatrixEvent, RoomMember } from 'matrix-js-sdk';
import { X, Users, Pin, Lock, Globe, UserPlus, Search, Shield, Crown, Bell, BellOff, Palette, PlusCircle, UploadCloud, Loader2 } from 'lucide-react';
import { useMatrix } from '../MatrixContext';
import { useTheme } from '../ThemeContext';
import { useNotifications } from '../contexts/NotificationContext';
import { format } from 'date-fns';
import { Theme } from '../themeTypes';

const THEME_DEFAULT_EVENT_TYPE = 'com.krypta.theme.default';

const parseThemeFromJson = (value: any, fallbackName: string): Theme | null => {
  if (!value || typeof value !== 'object') return null;

  const { colors, fonts, spacing, sizing, style } = value;
  if (!colors || !fonts || !spacing || !sizing || !style) {
    return null;
  }

  const name = typeof value.name === 'string' ? value.name : fallbackName;
  const displayName = typeof value.displayName === 'string' ? value.displayName : name;

  return {
    name,
    displayName,
    colors,
    fonts,
    spacing,
    sizing,
    style,
  };
};

interface RoomInfoProps {
  room: Room;
  onClose: () => void;
}

const RoomInfo: React.FC<RoomInfoProps> = ({ room, onClose }) => {
  const {
    client,
    getParentSpace,
    roomThemeDefaults,
    themeDefinitions,
    setRoomServerThemeDefault,
    clearRoomServerThemeDefault,
    upsertThemeDefinition,
    deleteThemeDefinition,
  } = useMatrix();
  const {
    theme,
    availableThemes,
    getRoomTheme,
    setRoomTheme,
    clearRoomTheme,
    getSpaceTheme,
    setSpaceTheme,
    clearSpaceTheme,
    defaultThemeName,
    getRoomThemeObject,
    resolveTheme,
    allThemes,
  } = useTheme();
  const { settings, isRoomMuted, toggleRoomMute, toggleRoomAllow } = useNotifications();
  const [activeTab, setActiveTab] = useState<'members' | 'pinned' | 'settings'>('members');
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [pinnedEvents, setPinnedEvents] = useState<MatrixEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const parentSpaceId = getParentSpace(room.roomId);
  const sortedThemes = useMemo(
    () => [...availableThemes].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [availableThemes]
  );
  const serverRoomDefault = roomThemeDefaults[room.roomId];
  const roomDefinitions = themeDefinitions[room.roomId] || {};
  const definitionEntries = useMemo(
    () => Object.values(roomDefinitions).sort((a, b) => a.theme.displayName.localeCompare(b.theme.displayName)),
    [roomDefinitions]
  );
  const [defaultThemeSelection, setDefaultThemeSelection] = useState<string>('');
  const [defaultApply, setDefaultApply] = useState(true);
  const [defaultStatus, setDefaultStatus] = useState<string | null>(null);
  const [defaultSaving, setDefaultSaving] = useState(false);
  const [definitionThemeId, setDefinitionThemeId] = useState('');
  const [definitionDisplayName, setDefinitionDisplayName] = useState('');
  const [definitionDescription, setDefinitionDescription] = useState('');
  const [definitionBaseTheme, setDefinitionBaseTheme] = useState('terminal');
  const [definitionJson, setDefinitionJson] = useState('');
  const [definitionStatus, setDefinitionStatus] = useState<string | null>(null);
  const [definitionSaving, setDefinitionSaving] = useState(false);

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
  const themeEventThreshold = powerLevels?.events?.[THEME_DEFAULT_EVENT_TYPE] ?? powerLevels?.state_default ?? 50;
  const canManageThemes = myPowerLevel >= themeEventThreshold;
  const roomOverride = getRoomTheme(room.roomId);
  const spaceOverride = parentSpaceId ? getSpaceTheme(parentSpaceId) : null;
  const effectiveTheme = useMemo(
    () => getRoomThemeObject(room.roomId, parentSpaceId),
    [getRoomThemeObject, room.roomId, parentSpaceId]
  );
  const globalThemeDisplay = resolveTheme(defaultThemeName).displayName;

  useEffect(() => {
    if (serverRoomDefault) {
      setDefaultThemeSelection(serverRoomDefault.themeId);
      setDefaultApply(serverRoomDefault.applyToNewUsers !== false);
    } else {
      setDefaultThemeSelection('');
      setDefaultApply(true);
    }
    setDefaultStatus(null);
  }, [serverRoomDefault]);

  const handleBaseThemeSelect = (value: string) => {
    setDefinitionBaseTheme(value);
    const baseTheme = allThemes[value];
    if (baseTheme) {
      setDefinitionJson(JSON.stringify(baseTheme, null, 2));
      setDefinitionDisplayName(baseTheme.displayName);
      setDefinitionThemeId((prev) => (prev ? prev : `${value}-custom`));
    }
    setDefinitionStatus(null);
  };

  const handleSaveRoomDefault = async () => {
    if (!canManageThemes || !defaultThemeSelection) return;
    setDefaultSaving(true);
    setDefaultStatus(null);
    try {
      await setRoomServerThemeDefault(room.roomId, defaultThemeSelection, { applyToNewUsers: defaultApply });
      setDefaultStatus('Server default updated.');
    } catch (error: any) {
      setDefaultStatus(`Failed to update default: ${error?.message || String(error)}`);
    } finally {
      setDefaultSaving(false);
    }
  };

  const handleClearRoomDefault = async () => {
    if (!canManageThemes) return;
    setDefaultSaving(true);
    setDefaultStatus(null);
    try {
      await clearRoomServerThemeDefault(room.roomId);
      setDefaultStatus('Server default cleared.');
    } catch (error: any) {
      setDefaultStatus(`Failed to clear default: ${error?.message || String(error)}`);
    } finally {
      setDefaultSaving(false);
    }
  };

  const handlePublishTheme = async () => {
    if (!canManageThemes) return;
    setDefinitionSaving(true);
    setDefinitionStatus(null);
    try {
      const trimmedId = definitionThemeId.trim();
      if (!trimmedId) {
        setDefinitionStatus('Theme ID is required.');
        setDefinitionSaving(false);
        return;
      }
      let parsed: any;
      try {
        parsed = JSON.parse(definitionJson);
      } catch (error: any) {
        setDefinitionStatus(`Invalid JSON: ${error?.message || String(error)}`);
        setDefinitionSaving(false);
        return;
      }
      const themeFromJson = parseThemeFromJson(parsed, trimmedId);
      if (!themeFromJson) {
        setDefinitionStatus('Theme JSON is missing required fields.');
        setDefinitionSaving(false);
        return;
      }
      const normalizedTheme: Theme = {
        ...themeFromJson,
        name: trimmedId,
        displayName: definitionDisplayName.trim() || themeFromJson.displayName || trimmedId,
      };
      await upsertThemeDefinition(
        room.roomId,
        normalizedTheme.name,
        normalizedTheme,
        definitionDescription.trim()
          ? { description: definitionDescription.trim() }
          : undefined
      );
      setDefinitionStatus('Theme published successfully.');
    } catch (error: any) {
      setDefinitionStatus(`Failed to publish theme: ${error?.message || String(error)}`);
    } finally {
      setDefinitionSaving(false);
    }
  };

  const handleApplyDefinition = (themeName: string) => {
    setRoomTheme(room.roomId, themeName);
    setDefinitionStatus(`Applied ${resolveTheme(themeName).displayName} locally.`);
  };

  const handleSetDefinitionAsDefault = async (themeName: string) => {
    if (!canManageThemes) return;
    setDefaultSaving(true);
    setDefaultStatus(null);
    try {
      await setRoomServerThemeDefault(room.roomId, themeName, { applyToNewUsers: true });
      setDefaultThemeSelection(themeName);
      setDefaultApply(true);
      setDefaultStatus('Server default updated.');
    } catch (error: any) {
      setDefaultStatus(`Failed to update default: ${error?.message || String(error)}`);
    } finally {
      setDefaultSaving(false);
    }
  };

  const handleDeleteDefinition = async (stateKey: string) => {
    if (!canManageThemes) return;
    setDefinitionSaving(true);
    setDefinitionStatus(null);
    try {
      await deleteThemeDefinition(room.roomId, stateKey);
      setDefinitionStatus('Theme removed.');
    } catch (error: any) {
      setDefinitionStatus(`Failed to remove theme: ${error?.message || String(error)}`);
    } finally {
      setDefinitionSaving(false);
    }
  };

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
                Resolution order: your room override → room server default → space override → global default.
              </p>
              <div className="mb-4 p-3 rounded" style={{ backgroundColor: 'var(--color-bgTertiary)' }}>
                <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--color-text)' }}>
                  <Palette className="w-4 h-4" />
                  <span className="font-medium text-sm">Effective theme: {effectiveTheme.displayName}</span>
                </div>
                <ul className="space-y-1 text-xs" style={{ color: 'var(--color-textMuted)' }}>
                  <li>• Global default: {globalThemeDisplay}</li>
                  {spaceOverride && (
                    <li>• Space override (you): {resolveTheme(spaceOverride).displayName}</li>
                  )}
                  {serverRoomDefault ? (
                    <li>
                      • Server default: {resolveTheme(serverRoomDefault.themeId).displayName}
                      {serverRoomDefault.applyToNewUsers !== false ? ' (auto-apply)' : ' (suggestion)'}
                    </li>
                  ) : (
                    <li>• Server default: not set</li>
                  )}
                  {roomOverride && (
                    <li>• Your override: {resolveTheme(roomOverride).displayName}</li>
                  )}
                </ul>
              </div>

              <div className="space-y-6">
                <section>
                  <h5 className="font-semibold mb-2 text-sm" style={{ color: 'var(--color-text)' }}>Your local preference</h5>
                  <div className="space-y-2">
                    <button
                      onClick={() => clearRoomTheme(room.roomId)}
                      className="w-full px-3 py-2 rounded text-left transition"
                      style={{
                        backgroundColor: !roomOverride ? 'var(--color-primary)' : 'var(--color-bgTertiary)',
                        color: !roomOverride ? '#fff' : 'var(--color-textSecondary)',
                        fontSize: 'var(--sizing-textSm)',
                      }}
                    >
                      Use server/global theme
                    </button>
                    {sortedThemes.map((t) => (
                      <button
                        key={t.name}
                        onClick={() => setRoomTheme(room.roomId, t.name)}
                        className="w-full px-3 py-2 rounded text-left transition"
                        style={{
                          backgroundColor: roomOverride === t.name ? 'var(--color-primary)' : 'var(--color-bgTertiary)',
                          color: roomOverride === t.name ? '#fff' : 'var(--color-textSecondary)',
                          fontSize: 'var(--sizing-textSm)',
                        }}
                      >
                        {t.displayName}
                      </button>
                    ))}
                  </div>
                </section>

                {parentSpaceId && (
                  <section>
                    <h5 className="font-semibold mb-2 text-sm" style={{ color: 'var(--color-text)' }}>Space theme override</h5>
                    <p className="mb-2 text-xs" style={{ color: 'var(--color-textMuted)' }}>
                      Set your preference for every room inside this space.
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={() => clearSpaceTheme(parentSpaceId)}
                        className="w-full px-3 py-2 rounded text-left transition"
                        style={{
                          backgroundColor: !spaceOverride ? 'var(--color-primary)' : 'var(--color-bgTertiary)',
                          color: !spaceOverride ? '#fff' : 'var(--color-textSecondary)',
                          fontSize: 'var(--sizing-textSm)',
                        }}
                      >
                        Use global default
                      </button>
                      {sortedThemes.map((t) => (
                        <button
                          key={t.name}
                          onClick={() => setSpaceTheme(parentSpaceId, t.name)}
                          className="w-full px-3 py-2 rounded text-left transition"
                          style={{
                            backgroundColor: spaceOverride === t.name ? 'var(--color-primary)' : 'var(--color-bgTertiary)',
                            color: spaceOverride === t.name ? '#fff' : 'var(--color-textSecondary)',
                            fontSize: 'var(--sizing-textSm)',
                          }}
                        >
                          {t.displayName}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {canManageThemes && (
                  <section className="border border-[var(--color-border)] rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--color-text)' }}>
                      <Palette className="w-4 h-4" />
                      <span className="font-semibold text-sm">Server default for new members</span>
                    </div>
                    <p className="text-xs mb-3" style={{ color: 'var(--color-textMuted)' }}>
                      Publish a default theme that new participants will see when they join. Disable auto-apply to offer it as a suggestion instead.
                    </p>
                    <div className="space-y-2">
                      <select
                        value={defaultThemeSelection}
                        onChange={(e) => {
                          setDefaultThemeSelection(e.target.value);
                          setDefaultStatus(null);
                        }}
                        className="w-full px-3 py-2 rounded bg-[var(--color-bgSecondary)] border border-[var(--color-border)] text-sm"
                        style={{ color: 'var(--color-text)' }}
                      >
                        <option value="">Select a theme…</option>
                        {sortedThemes.map((t) => (
                          <option key={t.name} value={t.name}>
                            {t.displayName}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-textMuted)' }}>
                        <input
                          type="checkbox"
                          checked={defaultApply}
                          onChange={(e) => {
                            setDefaultApply(e.target.checked);
                            setDefaultStatus(null);
                          }}
                        />
                        Auto-apply to new participants
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveRoomDefault}
                          disabled={defaultSaving || !defaultThemeSelection}
                          className="px-3 py-2 rounded bg-[var(--color-primary)] text-white text-sm disabled:opacity-60"
                        >
                          {defaultSaving ? 'Saving…' : 'Save default'}
                        </button>
                        <button
                          onClick={handleClearRoomDefault}
                          disabled={defaultSaving}
                          className="px-3 py-2 rounded border border-[var(--color-border)] text-sm"
                          style={{ color: 'var(--color-textSecondary)' }}
                        >
                          Clear
                        </button>
                        {defaultStatus && (
                          <span
                            className="text-xs"
                            style={{ color: defaultStatus.startsWith('Failed') ? '#f87171' : '#34d399' }}
                          >
                            {defaultStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                <section className="border border-[var(--color-border)] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--color-text)' }}>
                    <UploadCloud className="w-4 h-4" />
                    <span className="font-semibold text-sm">Shared theme library</span>
                  </div>
                  {definitionEntries.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--color-textMuted)' }}>
                      No shared themes published for this room yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {definitionEntries.map((definition) => (
                        <div
                          key={definition.stateKey}
                          className="flex items-start justify-between rounded border border-[var(--color-border)] px-3 py-2"
                          style={{ backgroundColor: 'var(--color-bgSecondary)' }}
                        >
                          <div>
                            <div className="font-medium" style={{ color: 'var(--color-text)' }}>
                              {definition.theme.displayName}
                            </div>
                            <div className="text-xs" style={{ color: 'var(--color-textMuted)' }}>
                              ID: {definition.stateKey}
                            </div>
                            {definition.description && (
                              <div className="text-xs" style={{ color: 'var(--color-textMuted)' }}>
                                {definition.description}
                              </div>
                            )}
                            {definition.updatedBy && (
                              <div className="text-[10px]" style={{ color: 'var(--color-textMuted)' }}>
                                Last updated by {definition.updatedBy}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => handleApplyDefinition(definition.theme.name)}
                              className="px-2 py-1 text-xs rounded bg-[var(--color-primary)] text-white"
                            >
                              Apply locally
                            </button>
                            {canManageThemes && (
                              <>
                                <button
                                  onClick={() => handleSetDefinitionAsDefault(definition.theme.name)}
                                  disabled={defaultSaving}
                                  className="px-2 py-1 text-xs rounded border border-[var(--color-border)]"
                                  style={{ color: 'var(--color-textSecondary)' }}
                                >
                                  Set as default
                                </button>
                                <button
                                  onClick={() => handleDeleteDefinition(definition.stateKey)}
                                  disabled={definitionSaving}
                                  className="px-2 py-1 text-xs rounded border border-[var(--color-border)] text-red-400"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {canManageThemes && (
                    <div className="mt-4 border-t border-[var(--color-border)] pt-3 space-y-2">
                      <div className="flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                        <PlusCircle className="w-4 h-4" />
                        <span className="font-semibold text-sm">Publish a new theme</span>
                      </div>
                      <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--color-textMuted)' }}>
                        Base theme
                        <select
                          value={definitionBaseTheme}
                          onChange={(e) => handleBaseThemeSelect(e.target.value)}
                          className="w-full px-3 py-2 rounded bg-[var(--color-bgSecondary)] border border-[var(--color-border)]"
                          style={{ color: 'var(--color-text)' }}
                        >
                          {sortedThemes.map((t) => (
                            <option key={t.name} value={t.name}>
                              {t.displayName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--color-textMuted)' }}>
                        Theme ID
                        <input
                          type="text"
                          value={definitionThemeId}
                          onChange={(e) => {
                            setDefinitionThemeId(e.target.value);
                            setDefinitionStatus(null);
                          }}
                          className="px-3 py-2 rounded bg-[var(--color-bgSecondary)] border border-[var(--color-border)]"
                          style={{ color: 'var(--color-text)' }}
                          placeholder="e.g. terminal-amber"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--color-textMuted)' }}>
                        Display name
                        <input
                          type="text"
                          value={definitionDisplayName}
                          onChange={(e) => {
                            setDefinitionDisplayName(e.target.value);
                            setDefinitionStatus(null);
                          }}
                          className="px-3 py-2 rounded bg-[var(--color-bgSecondary)] border border-[var(--color-border)]"
                          style={{ color: 'var(--color-text)' }}
                          placeholder="Terminal (Amber)"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--color-textMuted)' }}>
                        Description (optional)
                        <input
                          type="text"
                          value={definitionDescription}
                          onChange={(e) => {
                            setDefinitionDescription(e.target.value);
                            setDefinitionStatus(null);
                          }}
                          className="px-3 py-2 rounded bg-[var(--color-bgSecondary)] border border-[var(--color-border)]"
                          style={{ color: 'var(--color-text)' }}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--color-textMuted)' }}>
                        Theme JSON
                        <textarea
                          value={definitionJson}
                          onChange={(e) => {
                            setDefinitionJson(e.target.value);
                            setDefinitionStatus(null);
                          }}
                          rows={8}
                          className="px-3 py-2 rounded bg-[var(--color-bgSecondary)] border border-[var(--color-border)] font-mono text-xs"
                          style={{ color: 'var(--color-text)', lineHeight: 1.4 }}
                        />
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handlePublishTheme}
                          disabled={definitionSaving}
                          className="px-3 py-2 rounded bg-[var(--color-primary)] text-white text-sm disabled:opacity-60 flex items-center gap-2"
                        >
                          {definitionSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                          Publish theme
                        </button>
                        {definitionStatus && (
                          <span
                            className="text-xs"
                            style={{ color: definitionStatus.startsWith('Failed') ? '#f87171' : '#34d399' }}
                          >
                            {definitionStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomInfo;

