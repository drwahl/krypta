import { MatrixClient, Room, MatrixEvent } from 'matrix-js-sdk';
import { Thread, ThreadMessage } from '../types/thread';

/**
 * ThreadSync handles synchronization between our semantic threading system
 * and Matrix's native m.thread relations
 * 
 * This enables multi-user threading while keeping our advanced features
 */
export class ThreadSync {
  private client: MatrixClient | null = null;

  constructor(client: MatrixClient | null = null) {
    this.client = client;
  }

  /**
   * Set the Matrix client (call when client is ready)
   */
  setClient(client: MatrixClient) {
    this.client = client;
  }

  /**
   * Send a message to a thread in Matrix
   * Uses m.relates_to with m.thread relation type
   */
  async sendMessageToThread(
    roomId: string,
    content: string,
    threadRootEventId: string
  ): Promise<string | null> {
    if (!this.client) {
      console.error('Matrix client not initialized');
      return null;
    }

    try {
      const messageContent = {
        body: content,
        msgtype: 'm.text',
        format: 'org.matrix.custom.html',
        formatted_body: content.replace(/\n/g, '<br/>'),
        'm.relates_to': {
          rel_type: 'm.thread',
          event_id: threadRootEventId,
        },
      };

      const eventId = await this.client.sendEvent(
        roomId,
        'm.room.message',
        messageContent
      );

      console.log(`✅ Message sent to thread: ${eventId}`);
      return eventId;
    } catch (error) {
      console.error('Failed to send message to thread:', error);
      return null;
    }
  }

  /**
   * Create a new thread by sending the root message
   * Returns the event ID of the root message
   */
  async createThreadRoot(
    roomId: string,
    content: string
  ): Promise<string | null> {
    if (!this.client) {
      console.error('Matrix client not initialized');
      return null;
    }

    try {
      const messageContent = {
        body: content,
        msgtype: 'm.text',
        format: 'org.matrix.custom.html',
        formatted_body: content.replace(/\n/g, '<br/>'),
      };

      const eventId = await this.client.sendEvent(
        roomId,
        'm.room.message',
        messageContent
      );

      console.log(`✅ Thread root created: ${eventId}`);
      return eventId;
    } catch (error) {
      console.error('Failed to create thread root:', error);
      return null;
    }
  }

  /**
   * Load all threads from a room by finding m.thread relations
   * Returns a map of thread root event IDs to their messages
   */
  loadThreadsFromRoom(room: Room): Map<string, MatrixEvent[]> {
    const threads = new Map<string, MatrixEvent[]>();

    try {
      const timeline = room.getLiveTimeline().getEvents();

      // Find all messages with m.thread relations
      for (const event of timeline) {
        if (event.getType() !== 'm.room.message') continue;

        const content = event.getContent();
        const relatesTo = content['m.relates_to'];

        // Check if this is a threaded message
        if (relatesTo?.rel_type === 'm.thread') {
          const threadRootId = relatesTo.event_id;

          if (!threads.has(threadRootId)) {
            threads.set(threadRootId, []);
          }

          threads.get(threadRootId)!.push(event);
        }
      }

      console.log(`✅ Loaded ${threads.size} threads from room`);
      return threads;
    } catch (error) {
      console.error('Failed to load threads from room:', error);
      return new Map();
    }
  }

  /**
   * Get the root message of a thread
   */
  getThreadRoot(room: Room, threadRootEventId: string): MatrixEvent | null {
    try {
      const timeline = room.getLiveTimeline().getEvents();

      for (const event of timeline) {
        if (event.getId() === threadRootEventId) {
          return event;
        }
      }

      console.warn(`Thread root not found: ${threadRootEventId}`);
      return null;
    } catch (error) {
      console.error('Failed to get thread root:', error);
      return null;
    }
  }

  /**
   * Get all messages in a thread (including root)
   */
  getThreadMessages(
    room: Room,
    threadRootEventId: string
  ): MatrixEvent[] {
    const messages: MatrixEvent[] = [];

    try {
      // Add root message
      const rootEvent = this.getThreadRoot(room, threadRootEventId);
      if (rootEvent) {
        messages.push(rootEvent);
      }

      // Add threaded messages
      const timeline = room.getLiveTimeline().getEvents();

      for (const event of timeline) {
        if (event.getType() !== 'm.room.message') continue;

        const content = event.getContent();
        const relatesTo = content['m.relates_to'];

        if (relatesTo?.rel_type === 'm.thread' && relatesTo.event_id === threadRootEventId) {
          messages.push(event);
        }
      }

      // Sort by timestamp
      messages.sort((a, b) => a.getTs() - b.getTs());

      return messages;
    } catch (error) {
      console.error('Failed to get thread messages:', error);
      return [];
    }
  }

  /**
   * Convert a Matrix event to our ThreadMessage format
   */
  matrixEventToThreadMessage(event: MatrixEvent): ThreadMessage {
    const content = event.getContent();
    const sender = event.getSender() || 'unknown';

    return {
      id: event.getId() || `msg-${Date.now()}`,
      eventId: event.getId() || '',
      source: 'matrix',
      sender: {
        id: sender,
        name: sender.split(':')[0] || 'Unknown',
      },
      content: content.body || '',
      timestamp: event.getTs(),
      contextualObjects: [],
      matrixEvent: event,
    };
  }

  /**
   * Store thread metadata in Matrix room state
   * This allows all users to see custom thread info (title, description, branches, etc.)
   */
  async storeThreadMetadata(
    roomId: string,
    threadRootEventId: string,
    metadata: {
      title: string;
      description?: string;
      tags?: string[];
      branches?: any;
      createdBy?: string;
      createdAt?: number;
    }
  ): Promise<boolean> {
    if (!this.client) {
      console.error('Matrix client not initialized');
      return false;
    }

    try {
      const stateKey = threadRootEventId;
      const content = {
        title: metadata.title,
        description: metadata.description || '',
        tags: metadata.tags || [],
        branches: metadata.branches || {},
        createdBy: metadata.createdBy || this.client.getUserId() || '',
        createdAt: metadata.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      await this.client.sendStateEvent(
        roomId,
        'com.nychatt.thread.metadata',
        content,
        stateKey
      );

      console.log(`✅ Thread metadata stored for: ${threadRootEventId}`);
      return true;
    } catch (error) {
      console.error('Failed to store thread metadata:', error);
      return false;
    }
  }

  /**
   * Load thread metadata from Matrix room state
   */
  async loadThreadMetadata(
    roomId: string,
    threadRootEventId: string
  ): Promise<any | null> {
    if (!this.client) {
      console.error('Matrix client not initialized');
      return null;
    }

    try {
      const room = this.client.getRoom(roomId);
      if (!room) return null;

      const stateEvent = room.currentState.getStateEvents(
        'com.nychatt.thread.metadata',
        threadRootEventId
      );

      if (stateEvent) {
        return stateEvent.getContent();
      }

      return null;
    } catch (error) {
      console.error('Failed to load thread metadata:', error);
      return null;
    }
  }

  /**
   * Load all thread metadata from a room
   */
  loadAllThreadMetadata(room: Room): Map<string, any> {
    const metadata = new Map<string, any>();

    try {
      const stateEvents = room.currentState.getStateEvents('com.nychatt.thread.metadata');

      if (Array.isArray(stateEvents)) {
        for (const event of stateEvents) {
          const stateKey = event.getStateKey();
          if (stateKey) {
            metadata.set(stateKey, event.getContent());
          }
        }
      } else if (stateEvents) {
        // Single event
        const stateKey = stateEvents.getStateKey();
        if (stateKey) {
          metadata.set(stateKey, stateEvents.getContent());
        }
      }

      console.log(`✅ Loaded metadata for ${metadata.size} threads`);
      return metadata;
    } catch (error) {
      console.error('Failed to load thread metadata:', error);
      return new Map();
    }
  }

  /**
   * Update thread metadata (title, description, branches, etc.)
   */
  async updateThreadMetadata(
    roomId: string,
    threadRootEventId: string,
    updates: Partial<{
      title: string;
      description: string;
      tags: string[];
      branches: any;
    }>
  ): Promise<boolean> {
    if (!this.client) return false;

    try {
      // Load existing metadata
      const existing = await this.loadThreadMetadata(roomId, threadRootEventId);
      
      // Merge with updates
      const content = {
        ...existing,
        ...updates,
        updatedAt: Date.now(),
      };

      await this.client.sendStateEvent(
        roomId,
        'com.nychatt.thread.metadata',
        content,
        threadRootEventId
      );

      console.log(`✅ Thread metadata updated for: ${threadRootEventId}`);
      return true;
    } catch (error) {
      console.error('Failed to update thread metadata:', error);
      return false;
    }
  }

  /**
   * Check if a room supports threads (Matrix 1.3+)
   */
  supportsThreads(room: Room): boolean {
    // Most modern Matrix servers support threads
    // This is a basic check - in practice, most rooms will support it
    return true;
  }

  /**
   * Get thread statistics
   */
  getThreadStats(room: Room, threadRootEventId: string) {
    const messages = this.getThreadMessages(room, threadRootEventId);
    const participants = new Set<string>();

    for (const msg of messages) {
      const sender = msg.getSender();
      if (sender) {
        participants.add(sender);
      }
    }

    return {
      messageCount: messages.length,
      participantCount: participants.size,
      participants: Array.from(participants),
      createdAt: messages[0]?.getTs() || Date.now(),
      updatedAt: messages[messages.length - 1]?.getTs() || Date.now(),
    };
  }
}
