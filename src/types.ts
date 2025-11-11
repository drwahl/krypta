import { MatrixClient, Room, MatrixEvent } from 'matrix-js-sdk';

export interface MatrixContextType {
  client: MatrixClient | null;
  isLoggedIn: boolean;
  login: (homeserver: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  currentRoom: Room | null;
  setCurrentRoom: (room: Room | null) => void;
  rooms: Room[];
  spaces: Room[];
  sendMessage: (roomId: string, message: string) => Promise<void>;
  sendReaction: (roomId: string, eventId: string, emoji: string) => Promise<void>;
  loadMoreHistory: (room: Room) => Promise<boolean>;
  needsVerification: boolean;
  verificationRequest: any | null;
  acceptVerification: () => Promise<void>;
  cancelVerification: () => void;
  isLoading: boolean;
}

export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
  event: MatrixEvent;
}

