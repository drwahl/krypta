import React, { useState } from 'react';
import { useMatrix } from '../MatrixContext';
import { useTheme } from '../ThemeContext';
import { Mail, Check, X, Lock, Globe, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { getRoomAvatarUrl, getRoomInitials } from '../utils/roomIcons';

const Invites: React.FC = () => {
  const { invites, acceptInvite, declineInvite, client } = useMatrix();
  const { theme } = useTheme();
  const [processingInvites, setProcessingInvites] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  if (invites.length === 0) return null;

  const handleAccept = async (roomId: string) => {
    setProcessingInvites(prev => new Set(prev).add(roomId));
    try {
      await acceptInvite(roomId);
    } catch (error: any) {
      console.error('Failed to accept invite:', error);
      alert(`Failed to join room: ${error.message || error}`);
    } finally {
      setProcessingInvites(prev => {
        const next = new Set(prev);
        next.delete(roomId);
        return next;
      });
    }
  };

  const handleDecline = async (roomId: string) => {
    setProcessingInvites(prev => new Set(prev).add(roomId));
    try {
      await declineInvite(roomId);
    } catch (error: any) {
      console.error('Failed to decline invite:', error);
      alert(`Failed to decline invite: ${error.message || error}`);
    } finally {
      setProcessingInvites(prev => {
        const next = new Set(prev);
        next.delete(roomId);
        return next;
      });
    }
  };

  return (
    <div
      className="flex-shrink-0 border-b"
      style={{
        backgroundColor: 'var(--color-bgSecondary)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Collapsible Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between transition"
        style={{
          padding: theme.style.compactMode ? 'var(--spacing-sidebarPadding)' : '0.75rem 1rem',
          color: 'var(--color-text)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
          <span className="font-semibold" style={{ fontSize: theme.style.compactMode ? 'var(--sizing-textSm)' : 'var(--sizing-textBase)' }}>
            Invites
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: theme.name === 'terminal' ? '#000' : '#fff',
            }}
          >
            {invites.length}
          </span>
        </div>
        {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>

      {/* Invite List */}
      {!collapsed && (
        <div
          className="space-y-1"
          style={{
            padding: theme.style.compactMode ? 'var(--spacing-sidebarPadding)' : '0.5rem 1rem 1rem',
          }}
        >
          {invites.map((invite) => {
            const isProcessing = processingInvites.has(invite.roomId);
            const inviter = invite.getDMInviter();
            const isEncrypted = invite.hasEncryptionStateEvent();
            const joinRule = invite.getJoinRule();
            const isPublic = joinRule === 'public';
            const memberCount = invite.getJoinedMemberCount();
            
            // Get avatar
            const avatarUrl = getRoomAvatarUrl(invite, client);
            const initials = getRoomInitials(invite.name);

            return (
              <div
                key={invite.roomId}
                className="rounded border transition"
                style={{
                  backgroundColor: 'var(--color-bgTertiary)',
                  borderColor: 'var(--color-border)',
                  padding: theme.style.compactMode ? 'var(--spacing-sidebarPadding)' : '0.75rem',
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className="flex-shrink-0 rounded flex items-center justify-center overflow-hidden"
                    style={{
                      width: theme.style.compactMode ? 'var(--sizing-avatarSizeSmall)' : 'var(--sizing-avatarSize)',
                      height: theme.style.compactMode ? 'var(--sizing-avatarSizeSmall)' : 'var(--sizing-avatarSize)',
                      backgroundColor: avatarUrl ? 'transparent' : 'var(--color-primary)',
                      fontSize: theme.style.compactMode ? 'var(--sizing-textXs)' : 'var(--sizing-textSm)',
                      fontWeight: 'bold',
                      color: '#fff',
                    }}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={invite.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate" style={{ color: 'var(--color-text)', fontSize: theme.style.compactMode ? 'var(--sizing-textSm)' : 'var(--sizing-textBase)' }}>
                      {invite.name}
                    </div>
                    {inviter && (
                      <div className="text-xs truncate" style={{ color: 'var(--color-textMuted)' }}>
                        Invited by {inviter}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--color-textMuted)' }}>
                      {isPublic ? (
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          <span>Public</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Private</span>
                        </div>
                      )}
                      {memberCount > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{memberCount}</span>
                        </div>
                      )}
                      {isEncrypted && (
                        <div className="flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
                          <Lock className="w-3 h-3" />
                          <span>E2EE</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleAccept(invite.roomId)}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded transition disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--color-success)',
                      color: theme.name === 'terminal' ? '#000' : '#fff',
                      fontSize: 'var(--sizing-textSm)',
                    }}
                  >
                    <Check className="w-4 h-4" />
                    <span>{isProcessing ? 'Joining...' : 'Accept'}</span>
                  </button>
                  <button
                    onClick={() => handleDecline(invite.roomId)}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded transition disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--color-error)',
                      color: '#fff',
                      fontSize: 'var(--sizing-textSm)',
                    }}
                  >
                    <X className="w-4 h-4" />
                    <span>{isProcessing ? 'Declining...' : 'Decline'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Invites;

