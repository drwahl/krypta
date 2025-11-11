import { MatrixClient, Room, MatrixEvent } from 'matrix-js-sdk';
import { Theme } from './themeTypes';
export type { Thread, ThreadMessage, ThreadBranch, ContextualObject, MessageSource, ThreadLinkingConfig } from './types/thread';

export interface ThemeServerDefault {
  themeId: string;
  applyToNewUsers: boolean;
  updatedAt?: number;
  updatedBy?: string;
}

export interface ThemeDefinition {
  theme: Theme;
  description?: string;
  origin: 'room' | 'space';
  roomId: string;
  stateKey: string;
  updatedAt?: number;
  updatedBy?: string;
}

export interface ThemeServerDefaultMaps {
  rooms: Record<string, ThemeServerDefault>;
  spaces: Record<string, ThemeServerDefault>;
}

export interface MatrixContextType {
  client: MatrixClient | null;
  isLoggedIn: boolean;
  login: (homeserver: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  currentRoom: Room | null;
  setCurrentRoom: (room: Room | null) => void;
  rooms: Room[];
  spaces: Room[];
  sendMessage: (roomId: string, message: string, threadRootEventId?: string) => Promise<void>;
  invites: Room[];
  sendReaction: (roomId: string, eventId: string, emoji: string) => Promise<void>;
  deleteMessage: (roomId: string, eventId: string) => Promise<void>;
  loadMoreHistory: (room: Room) => Promise<boolean>;
  getParentSpace: (roomId: string) => string | null;
  needsVerification: boolean;
  verificationRequest: any | null;
  acceptVerification: () => Promise<void>;
  cancelVerification: () => void;
  startVerification: () => Promise<void>;
  isLoading: boolean;
  roomThemeDefaults: Record<string, ThemeServerDefault>;
  spaceThemeDefaults: Record<string, ThemeServerDefault>;
  themeDefinitions: Record<string, Record<string, ThemeDefinition>>;
  setRoomServerThemeDefault: (roomId: string, themeId: string, options?: { applyToNewUsers?: boolean }) => Promise<void>;
  clearRoomServerThemeDefault: (roomId: string) => Promise<void>;
  setSpaceServerThemeDefault: (spaceId: string, themeId: string, options?: { applyToNewUsers?: boolean }) => Promise<void>;
  clearSpaceServerThemeDefault: (spaceId: string) => Promise<void>;
  upsertThemeDefinition: (
    targetRoomId: string,
    themeId: string,
    theme: Theme,
    options?: { description?: string }
  ) => Promise<void>;
  deleteThemeDefinition: (targetRoomId: string, themeId: string) => Promise<void>;
  acceptInvite: (roomId: string) => Promise<void>;
  declineInvite: (roomId: string) => Promise<void>;
}

export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
  event: MatrixEvent;
}

