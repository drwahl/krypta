import { ThreadManager } from './threadManager';
import { Thread, ThreadMessage, MessageSource } from '../types/thread';
import { MatrixEvent } from 'matrix-js-sdk';

/**
 * ThreadLinker handles intelligent linking of messages from multiple sources
 * Detects related communication and organizes them into semantic containers
 */
export class ThreadLinker {
  private threadManager: ThreadManager;
  private sourceHandlers: Map<MessageSource, (event: any) => ThreadMessage> =
    new Map();

  constructor(threadManager: ThreadManager) {
    this.threadManager = threadManager;
    this.registerDefaultHandlers();
  }

  /**
   * Register default handlers for common message sources
   */
  private registerDefaultHandlers() {
    // Matrix event handler
    this.sourceHandlers.set('matrix', (event: MatrixEvent) => {
      const content = event.getContent();
      return {
        id: event.getId() || `matrix-${Date.now()}`,
        eventId: event.getId() || '',
        source: 'matrix' as const,
        sender: {
          id: event.getSender() || 'unknown',
          name: event.getSender()?.split(':')[0] || 'Unknown',
        },
        content: content.body || '',
        timestamp: event.getTs(),
        contextualObjects: [],
        matrixEvent: event,
      };
    });

    // Email handler
    this.sourceHandlers.set('email', (emailData: any) => ({
      id: emailData.messageId || `email-${Date.now()}`,
      eventId: emailData.messageId || '',
      source: 'email' as const,
      sender: {
        id: emailData.from,
        name: emailData.fromName || emailData.from,
        avatar: emailData.avatar,
      },
      content: emailData.body || '',
      timestamp: emailData.date.getTime(),
      contextualObjects: [],
    }));

    // SMS handler
    this.sourceHandlers.set('sms', (smsData: any) => ({
      id: smsData.id || `sms-${Date.now()}`,
      eventId: smsData.id || '',
      source: 'sms' as const,
      sender: {
        id: smsData.from,
        name: smsData.fromName || smsData.from,
      },
      content: smsData.body || '',
      timestamp: smsData.timestamp,
      contextualObjects: [],
    }));
  };

  /**
   * Link a message from any source into threads
   * Automatically creates threads or adds to existing ones based on content
   */
  linkMessage(
    message: ThreadMessage,
    roomId: string,
    existingThreads: Thread[] = []
  ): { threadId: string; isNew: boolean; branchId?: string } {
    // Check if message belongs to existing thread
    const matchingThread = this.findBestMatchingThread(message, existingThreads);

    if (matchingThread) {
      // Determine if should create branch
      const shouldBranch = this.threadManager.shouldCreateBranch(message);
      let branchId: string | undefined;

      if (shouldBranch) {
        // Find parent message (most recent message before this one)
        const parentMessage = this.findParentMessage(message, matchingThread);
        if (parentMessage) {
          const branch = this.threadManager.createBranch(
            matchingThread.id,
            parentMessage.id,
            `Discussion: ${this.extractMainTopic(message.content)}`,
            message.content.substring(0, 100)
          );
          branchId = branch?.id;
        }
      }

      this.threadManager.addMessageToThread(
        matchingThread.id,
        message,
        branchId
      );

      return {
        threadId: matchingThread.id,
        isNew: false,
        branchId,
      };
    }

    // Create new thread
    const threadId = `thread-${roomId}-${Date.now()}`;
    const title = this.extractThreadTitle(message.content);

    this.threadManager.createThread(threadId, roomId, title);
    this.threadManager.addMessageToThread(threadId, message);

    // Extract and add topics
    const topics = this.threadManager.extractTopics(message.content);
    const thread = this.threadManager.getThread(threadId);
    if (thread) {
      thread.topics.push(...topics);
    }

    return {
      threadId,
      isNew: true,
    };
  }

  /**
   * Link multiple messages at once (batch operation)
   */
  linkMessages(
    messages: ThreadMessage[],
    roomId: string
  ): Map<string, string> {
    const messageToThread = new Map<string, string>();
    const existingThreads = this.threadManager.getThreadsInRoom(roomId);

    for (const message of messages) {
      const result = this.linkMessage(message, roomId, existingThreads);
      messageToThread.set(message.id, result.threadId);

      // Add newly created thread to existing threads for next iteration
      const newThread = this.threadManager.getThread(result.threadId);
      if (newThread && !existingThreads.includes(newThread)) {
        existingThreads.push(newThread);
      }
    }

    return messageToThread;
  }

  /**
   * Find the best matching thread for a message
   */
  private findBestMatchingThread(
    message: ThreadMessage,
    threads: Thread[]
  ): Thread | null {
    let bestMatch: Thread | null = null;
    let bestScore = 0;

    for (const thread of threads) {
      if (thread.archivedAt) continue; // Skip archived threads

      let score = 0;

      // Check if sender is already a participant
      if (thread.participants.has(message.sender.id)) {
        score += 0.3;
      }

      // Check topic overlap
      const messageTopics = this.threadManager.extractTopics(message.content);
      const topicOverlap = messageTopics.filter((topic) =>
        thread.topics.includes(topic)
      ).length;
      score += (topicOverlap / Math.max(messageTopics.length, 1)) * 0.4;

      // Check temporal proximity to last message
      const lastMessage = this.getLastMessage(thread);
      if (lastMessage) {
        const timeDiff = message.timestamp - lastMessage.timestamp;
        if (timeDiff < 30 * 60 * 1000) {
          // Within 30 minutes
          score += 0.3;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = thread;
      }
    }

    // Only return match if score is above threshold
    return bestScore > 0.3 ? bestMatch : null;
  }

  /**
   * Find parent message for branching
   */
  private findParentMessage(
    message: ThreadMessage,
    thread: Thread
  ): ThreadMessage | null {
    let parent: ThreadMessage | null = null;

    for (const branch of [thread.mainBranch, ...thread.branches.values()]) {
      for (let i = branch.messageIds.length - 1; i >= 0; i--) {
        const msgId = branch.messageIds[i];
        const msg = thread.messages.get(msgId);
        if (msg && msg.timestamp < message.timestamp) {
          if (!parent || msg.timestamp > parent.timestamp) {
            parent = msg;
          }
        }
      }
    }

    return parent;
  }

  /**
   * Get the last message in a thread
   */
  private getLastMessage(thread: Thread): ThreadMessage | null {
    let lastMessage: ThreadMessage | null = null;
    let lastTimestamp = 0;

    for (const message of thread.messages.values()) {
      if (message.timestamp > lastTimestamp) {
        lastTimestamp = message.timestamp;
        lastMessage = message;
      }
    }

    return lastMessage;
  }

  /**
   * Extract thread title from message content
   */
  private extractThreadTitle(content: string): string {
    // Use first sentence or first 50 chars
    const sentences = content.split(/[.!?]/);
    const firstSentence = sentences[0].trim();

    if (firstSentence.length > 50) {
      return firstSentence.substring(0, 47) + '...';
    }

    return firstSentence || 'Untitled Thread';
  }

  /**
   * Extract main topic from message
   */
  private extractMainTopic(content: string): string {
    const topics = this.threadManager.extractTopics(content);
    return topics[0] || 'Discussion';
  }

  /**
   * Register custom handler for a message source
   */
  registerSourceHandler(
    source: MessageSource,
    handler: (event: any) => ThreadMessage
  ) {
    this.sourceHandlers.set(source, handler);
  }

  /**
   * Convert external event to ThreadMessage
   */
  convertToThreadMessage(source: MessageSource, event: any): ThreadMessage | null {
    const handler = this.sourceHandlers.get(source);
    if (!handler) return null;

    try {
      return handler(event);
    } catch (error) {
      console.error(`Failed to convert ${source} event:`, error);
      return null;
    }
  }
}
