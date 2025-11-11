import {
  Thread,
  ThreadMessage,
  ThreadBranch,
  ContextualObject,
  LinkingResult,
  ThreadLinkingConfig,
  MessageSource,
} from '../types/thread';
import { MatrixEvent } from 'matrix-js-sdk';

/**
 * ThreadManager handles creation, linking, and management of threads
 * Performs most contextual linking logic locally to minimize server/AI calls
 */
export class ThreadManager {
  private threads: Map<string, Thread> = new Map();
  private messageToThread: Map<string, string> = new Map(); // messageId -> threadId
  private config: ThreadLinkingConfig;

  constructor(config: Partial<ThreadLinkingConfig> = {}) {
    this.config = {
      similarityThreshold: 0.6,
      branchKeywords: ['but', 'however', 'alternatively', 'on the other hand', 'meanwhile'],
      contextWindow: 5 * 60 * 1000, // 5 minutes
      useLocalLinking: true,
      ...config,
    };
  }

  /**
   * Create a new thread
   */
  createThread(
    id: string,
    roomId: string,
    title: string,
    description?: string
  ): Thread {
    const thread: Thread = {
      id,
      roomId,
      title,
      description,
      participants: new Set(),
      tags: [],
      topics: [],
      messages: new Map(),
      mainBranch: {
        id: `${id}-main`,
        topic: 'Main Discussion',
        createdAt: Date.now(),
        messageIds: [],
      },
      branches: new Map(),
      relatedThreadIds: new Set(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.threads.set(id, thread);
    return thread;
  }

  /**
   * Add a message to a thread
   */
  addMessageToThread(
    threadId: string,
    message: ThreadMessage,
    branchId?: string
  ): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) return false;

    // Add message to thread
    thread.messages.set(message.id, message);
    thread.participants.add(message.sender.id);
    thread.updatedAt = Date.now();

    // Add to appropriate branch
    const targetBranch = branchId ? thread.branches.get(branchId) : thread.mainBranch;
    if (targetBranch) {
      targetBranch.messageIds.push(message.id);
    } else {
      thread.mainBranch.messageIds.push(message.id);
    }

    // Track message to thread mapping
    this.messageToThread.set(message.id, threadId);

    return true;
  }

  /**
   * Create a branch in a thread (for subtopics)
   */
  createBranch(
    threadId: string,
    parentMessageId: string,
    topic: string,
    description?: string
  ): ThreadBranch | null {
    const thread = this.threads.get(threadId);
    if (!thread) return null;

    const branchId = `${threadId}-branch-${Date.now()}`;
    const branch: ThreadBranch = {
      id: branchId,
      parentMessageId,
      topic,
      description,
      createdAt: Date.now(),
      messageIds: [],
    };

    thread.branches.set(branchId, branch);
    thread.updatedAt = Date.now();

    return branch;
  }

  /**
   * Merge two branches or threads
   */
  mergeBranches(
    threadId: string,
    sourceBranchId: string,
    targetBranchId: string
  ): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) return false;

    const sourceBranch = thread.branches.get(sourceBranchId);
    const targetBranch = thread.branches.get(targetBranchId) || thread.mainBranch;

    if (!sourceBranch) return false;

    // Merge messages
    targetBranch.messageIds.push(...sourceBranch.messageIds);

    // Remove source branch
    thread.branches.delete(sourceBranchId);
    thread.updatedAt = Date.now();

    return true;
  }

  /**
   * Attach a contextual object to a message
   */
  attachContextualObject(
    threadId: string,
    messageId: string,
    object: ContextualObject
  ): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) return false;

    const message = thread.messages.get(messageId);
    if (!message) return false;

    message.contextualObjects.push(object);
    thread.updatedAt = Date.now();

    return true;
  }

  /**
   * Detect related messages using local similarity analysis
   * Returns message IDs that should be linked together
   */
  detectRelatedMessages(
    messages: ThreadMessage[],
    referenceMessage: ThreadMessage
  ): string[] {
    const related: string[] = [];

    for (const msg of messages) {
      if (msg.id === referenceMessage.id) continue;

      // Check temporal proximity
      const timeDiff = Math.abs(msg.timestamp - referenceMessage.timestamp);
      if (timeDiff > this.config.contextWindow) continue;

      // Check semantic similarity (simple keyword matching)
      const similarity = this.calculateSimilarity(
        referenceMessage.content,
        msg.content
      );

      if (similarity >= this.config.similarityThreshold) {
        related.push(msg.id);
      }
    }

    return related;
  }

  /**
   * Detect if a message should start a new branch
   */
  shouldCreateBranch(message: ThreadMessage): boolean {
    const content = message.content.toLowerCase();
    return this.config.branchKeywords.some((keyword) =>
      content.includes(keyword)
    );
  }

  /**
   * Extract topics/tags from message content
   */
  extractTopics(content: string): string[] {
    // Simple extraction: look for hashtags and capitalized phrases
    const hashtags = (content.match(/#\w+/g) || []).map((tag) =>
      tag.substring(1)
    );

    // Extract capitalized phrases (potential topics)
    const phrases = (content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [])
      .filter((phrase) => phrase.length > 3)
      .slice(0, 3); // Limit to 3

    return [...new Set([...hashtags, ...phrases])];
  }

  /**
   * Get thread by ID
   */
  getThread(threadId: string): Thread | undefined {
    return this.threads.get(threadId);
  }

  /**
   * Get thread containing a message
   */
  getThreadByMessageId(messageId: string): Thread | undefined {
    const threadId = this.messageToThread.get(messageId);
    return threadId ? this.threads.get(threadId) : undefined;
  }

  /**
   * Get all threads
   */
  getAllThreads(): Thread[] {
    return Array.from(this.threads.values());
  }

  /**
   * Get threads in a room
   */
  getThreadsInRoom(roomId: string): Thread[] {
    return Array.from(this.threads.values()).filter(
      (thread) => thread.roomId === roomId
    );
  }

  /**
   * Link related threads
   */
  linkThreads(threadId1: string, threadId2: string): boolean {
    const thread1 = this.threads.get(threadId1);
    const thread2 = this.threads.get(threadId2);

    if (!thread1 || !thread2) return false;

    thread1.relatedThreadIds.add(threadId2);
    thread2.relatedThreadIds.add(threadId1);

    return true;
  }

  /**
   * Get related threads
   */
  getRelatedThreads(threadId: string): Thread[] {
    const thread = this.threads.get(threadId);
    if (!thread) return [];

    return Array.from(thread.relatedThreadIds)
      .map((id) => this.threads.get(id))
      .filter((t): t is Thread => t !== undefined);
  }

  /**
   * Simple cosine similarity calculation for message content
   * Returns value between 0 and 1
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set(
      [...words1].filter((word) => words2.has(word))
    );
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  /**
   * Archive a thread
   */
  archiveThread(threadId: string): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) return false;

    thread.archivedAt = Date.now();
    thread.updatedAt = Date.now();

    return true;
  }

  /**
   * Delete a thread
   */
  deleteThread(threadId: string): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) return false;

    // Clean up message mappings
    for (const messageId of thread.messages.keys()) {
      this.messageToThread.delete(messageId);
    }

    this.threads.delete(threadId);
    return true;
  }

  /**
   * Get thread statistics
   */
  getThreadStats(threadId: string) {
    const thread = this.threads.get(threadId);
    if (!thread) return null;

    return {
      messageCount: thread.messages.size,
      participantCount: thread.participants.size,
      branchCount: thread.branches.size,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      isArchived: !!thread.archivedAt,
    };
  }
}
