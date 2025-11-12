import React, { useState } from 'react';
import { useMatrix } from '../MatrixContext';
import { useTheme } from '../ThemeContext';
import { X } from 'lucide-react';

interface CreateRoomProps {
  onClose: () => void;
  onRoomCreated?: (roomId: string) => void;
  parentSpaceId?: string; // Optional: create room in this space
}

const CreateRoom: React.FC<CreateRoomProps> = ({ onClose, onRoomCreated, parentSpaceId }) => {
  const { client, spaces } = useMatrix();
  const { theme } = useTheme();
  const [roomName, setRoomName] = useState('');
  const [topic, setTopic] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get space name if creating in a specific space
  const parentSpace = parentSpaceId ? spaces.find(s => s.roomId === parentSpaceId) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!client || !roomName.trim()) {
      setError('Please enter a room name');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const roomOptions: any = {
        name: roomName.trim(),
        visibility: isPublic ? 'public' : 'private',
        preset: isPublic ? 'public_chat' : 'private_chat',
      };

      if (topic.trim()) {
        roomOptions.topic = topic.trim();
      }

      if (isEncrypted) {
        roomOptions.initial_state = [
          {
            type: 'm.room.encryption',
            state_key: '',
            content: {
              algorithm: 'm.megolm.v1.aes-sha2',
            },
          },
        ];
      }

      const { room_id } = await client.createRoom(roomOptions);
      
      // If creating in a space, add the room to that space
      if (parentSpaceId) {
        try {
          await client.sendStateEvent(
            parentSpaceId,
            'm.space.child',
            {
              via: [client.getDomain() || 'matrix.org'],
              suggested: false,
            },
            room_id
          );
        } catch (spaceErr) {
          console.error('Failed to add room to space:', spaceErr);
          // Don't fail the whole operation if this fails
        }
      }
      
      if (onRoomCreated) {
        onRoomCreated(room_id);
      }
      
      onClose();
    } catch (err: any) {
      console.error('Failed to create room:', err);
      setError(err.message || 'Failed to create room');
      setIsCreating(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md mx-4"
        style={{
          backgroundColor: 'var(--color-bg)',
          borderRadius: 'var(--sizing-borderRadius)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between"
          style={{
            padding: '1rem',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <h2 
            className="text-xl font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            {parentSpace ? `Create Room in ${parentSpace.name}` : 'Create New Room'}
          </h2>
          <button
            onClick={onClose}
            className="transition"
            style={{
              color: 'var(--color-textMuted)',
              padding: '0.5rem',
              borderRadius: 'var(--sizing-borderRadius)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-hover)';
              e.currentTarget.style.color = 'var(--color-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--color-textMuted)';
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Room Name */}
            <div>
              <label 
                htmlFor="roomName"
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--color-text)' }}
              >
                Room Name *
              </label>
              <input
                id="roomName"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g., General Chat"
                className="w-full focus:outline-none"
                style={{
                  backgroundColor: 'var(--color-bgSecondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--sizing-borderRadius)',
                  padding: '0.75rem',
                  color: 'var(--color-text)',
                  fontSize: 'var(--sizing-textBase)',
                }}
                autoFocus
              />
            </div>

            {/* Topic */}
            <div>
              <label 
                htmlFor="topic"
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--color-text)' }}
              >
                Topic (optional)
              </label>
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What's this room about?"
                className="w-full focus:outline-none"
                style={{
                  backgroundColor: 'var(--color-bgSecondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--sizing-borderRadius)',
                  padding: '0.75rem',
                  color: 'var(--color-text)',
                  fontSize: 'var(--sizing-textBase)',
                }}
              />
            </div>

            {/* Encryption Toggle */}
            <label 
              className="flex items-center cursor-pointer"
              style={{ gap: '0.75rem' }}
            >
              <input
                type="checkbox"
                checked={isEncrypted}
                onChange={(e) => setIsEncrypted(e.target.checked)}
                className="cursor-pointer"
                style={{
                  width: '1.25rem',
                  height: '1.25rem',
                  accentColor: 'var(--color-primary)',
                }}
              />
              <div>
                <div 
                  className="font-medium"
                  style={{ color: 'var(--color-text)' }}
                >
                  Enable End-to-End Encryption
                </div>
                <div 
                  className="text-xs"
                  style={{ color: 'var(--color-textMuted)' }}
                >
                  Recommended for private conversations
                </div>
              </div>
            </label>

            {/* Public Room Toggle */}
            <label 
              className="flex items-center cursor-pointer"
              style={{ gap: '0.75rem' }}
            >
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="cursor-pointer"
                style={{
                  width: '1.25rem',
                  height: '1.25rem',
                  accentColor: 'var(--color-primary)',
                }}
              />
              <div>
                <div 
                  className="font-medium"
                  style={{ color: 'var(--color-text)' }}
                >
                  Make this room public
                </div>
                <div 
                  className="text-xs"
                  style={{ color: 'var(--color-textMuted)' }}
                >
                  Anyone can find and join this room
                </div>
              </div>
            </label>

            {/* Error Message */}
            {error && (
              <div 
                className="text-sm"
                style={{
                  color: '#ef4444',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  padding: '0.75rem',
                  borderRadius: 'var(--sizing-borderRadius)',
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div 
            className="flex items-center justify-end"
            style={{
              padding: '1rem',
              gap: '0.75rem',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="transition"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 'var(--sizing-borderRadius)',
                backgroundColor: 'var(--color-bgTertiary)',
                color: 'var(--color-text)',
                fontSize: 'var(--sizing-textBase)',
                cursor: isCreating ? 'not-allowed' : 'pointer',
                opacity: isCreating ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isCreating) {
                  e.currentTarget.style.backgroundColor = 'var(--color-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isCreating) {
                  e.currentTarget.style.backgroundColor = 'var(--color-bgTertiary)';
                }
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !roomName.trim()}
              className="transition"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 'var(--sizing-borderRadius)',
                backgroundColor: (isCreating || !roomName.trim()) ? 'var(--color-bgTertiary)' : 'var(--color-primary)',
                color: (isCreating || !roomName.trim()) ? 'var(--color-textMuted)' : (theme.name === 'terminal' ? '#000' : '#fff'),
                fontSize: 'var(--sizing-textBase)',
                fontWeight: '600',
                cursor: (isCreating || !roomName.trim()) ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!isCreating && roomName.trim()) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primaryHover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isCreating && roomName.trim()) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                }
              }}
            >
              {isCreating ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoom;

