import { Room, MatrixClient } from 'matrix-js-sdk';

/**
 * Get the full avatar URL for a room
 * @param room - The Matrix room
 * @param client - The Matrix client (needed for homeserver URL)
 * @param size - Optional size for the avatar (default 32)
 * @returns The full URL to the room avatar, or null if no avatar exists
 */
export const getRoomAvatarUrl = (
  room: Room,
  client: MatrixClient | null,
  size: number = 32
): string | null => {
  if (!client) return null;

  const avatarUrl = room.getAvatarUrl(client.getHomeserverUrl(), size, size, 'crop');
  return avatarUrl;
};

/**
 * Get the initials for a room (fallback when no avatar exists)
 * @param roomName - The room name
 * @returns Two-character initials
 */
export const getRoomInitials = (roomName: string): string => {
  const words = roomName.trim().split(/\s+/);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};
