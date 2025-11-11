import { MatrixEvent } from 'matrix-js-sdk';

/**
 * Represents a message source (Matrix, email, SMS, etc.)
 */
export type MessageSource = 'matrix' | 'email' | 'sms' | 'slack' | 'custom';

/**
 * Contextual object attached to a message (docs, links, notes, tasks)
 */
export interface ContextualObject {
  id: string;
  type: 'document' | 'link' | 'note' | 'task' | 'code' | 'image' | 'file';
  title: string;
  url?: string;
  content?: string;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

/**
 * Represents a single message in a thread
 */
export interface ThreadMessage {
  id: string;
  eventId: string; // Matrix event ID or unique identifier
  source: MessageSource;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  timestamp: number;
  edited?: number;
  reactions?: Record<string, number>; // emoji -> count
  contextualObjects: ContextualObject[];
  matrixEvent?: MatrixEvent; // Original Matrix event if applicable
  metadata?: Record<string, any>;
}

/**
 * Represents a branch in a thread (for subtopics or parallel discussions)
 */
export interface ThreadBranch {
  id: string;
  parentMessageId?: string; // ID of the message this branch stems from
  topic?: string;
  description?: string;
  createdAt: number;
  messageIds: string[]; // Ordered list of message IDs in this branch
}

/**
 * Represents a semantic container for related communication
 */
export interface Thread {
  id: string;
  roomId: string; // Primary room ID
  title: string;
  description?: string;
  
  // Participants and metadata
  participants: Set<string>; // User IDs
  tags: string[];
  topics: string[];
  
  // Message organization
  messages: Map<string, ThreadMessage>; // messageId -> ThreadMessage
  mainBranch: ThreadBranch; // Primary conversation branch
  branches: Map<string, ThreadBranch>; // branchId -> ThreadBranch
  
  // Relationships
  parentThreadId?: string; // For nested threads
  relatedThreadIds: Set<string>;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
  
  // AI/Summary (on-demand)
  summary?: string;
  summaryGeneratedAt?: number;
  keyPoints?: string[];
  actionItems?: string[];
}

/**
 * Configuration for thread linking and detection
 */
export interface ThreadLinkingConfig {
  // Similarity threshold for auto-linking messages (0-1)
  similarityThreshold: number;
  
  // Keywords that trigger branch creation
  branchKeywords: string[];
  
  // Time window for grouping related messages (ms)
  contextWindow: number;
  
  // Enable local AI for linking (vs server-side)
  useLocalLinking: boolean;
}

/**
 * Result of thread linking operation
 */
export interface LinkingResult {
  threadId: string;
  newMessageIds: string[];
  linkedBranchIds: string[];
  suggestedMerges: Array<{
    threadId1: string;
    threadId2: string;
    confidence: number;
  }>;
}
