import { Thread, ThreadMessage } from '../types/thread';

/**
 * ThreadSummarizer provides on-demand summarization and analysis
 * Designed to be called only when needed to control costs
 */
export class ThreadSummarizer {
  private summaryCache: Map<string, { summary: string; timestamp: number }> =
    new Map();

  /**
   * Generate a summary of a thread (on-demand)
   * Uses local extraction first, optionally calls AI for better summaries
   */
  async summarizeThread(
    thread: Thread,
    useAI: boolean = false,
    aiProvider?: (content: string) => Promise<string>
  ): Promise<string> {
    // Check cache
    const cached = this.summaryCache.get(thread.id);
    if (cached && Date.now() - cached.timestamp < 60 * 60 * 1000) {
      // Cache valid for 1 hour
      return cached.summary;
    }

    let summary: string;

    if (useAI && aiProvider) {
      // Use AI for better summarization
      const content = this.prepareContentForAI(thread);
      summary = await aiProvider(content);
    } else {
      // Use local extraction
      summary = this.extractLocalSummary(thread);
    }

    // Cache result
    this.summaryCache.set(thread.id, {
      summary,
      timestamp: Date.now(),
    });

    thread.summary = summary;
    thread.summaryGeneratedAt = Date.now();

    return summary;
  }

  /**
   * Extract key points from a thread (local, no AI needed)
   */
  extractKeyPoints(thread: Thread): string[] {
    const keyPoints: string[] = [];
    const messages = Array.from(thread.messages.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );

    for (const message of messages) {
      // Look for sentences with key indicators
      const sentences = message.content.split(/[.!?]/);

      for (const sentence of sentences) {
        const trimmed = sentence.trim();

        // Check for key indicators
        if (
          trimmed.length > 10 &&
          (trimmed.match(/^(important|note|key|critical|must|should)/i) ||
            trimmed.match(/[A-Z]{2,}/)) // All caps words
        ) {
          keyPoints.push(trimmed);
        }
      }
    }

    // Deduplicate and limit
    const unique = [...new Set(keyPoints)].slice(0, 5);
    thread.keyPoints = unique;

    return unique;
  }

  /**
   * Extract action items from a thread (local)
   */
  extractActionItems(thread: Thread): string[] {
    const actionItems: string[] = [];
    const messages = Array.from(thread.messages.values());

    for (const message of messages) {
      const content = message.content;

      // Look for action indicators
      const actionPatterns = [
        /(?:TODO|FIXME|XXX|HACK):\s*(.+?)(?:\n|$)/gi,
        /(?:need to|must|should|will|going to)\s+(.+?)(?:\n|[.!?])/gi,
        /\[x\]\s+(.+?)(?:\n|$)/gi, // Checked items
        /\[ \]\s+(.+?)(?:\n|$)/gi, // Unchecked items
      ];

      for (const pattern of actionPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const item = match[1].trim();
          if (item.length > 5) {
            actionItems.push(item);
          }
        }
      }
    }

    // Deduplicate and limit
    const unique = [...new Set(actionItems)].slice(0, 5);
    thread.actionItems = unique;

    return unique;
  }

  /**
   * Get thread statistics for display
   */
  getThreadAnalysis(thread: Thread) {
    return {
      messageCount: thread.messages.size,
      participantCount: thread.participants.size,
      branchCount: thread.branches.size,
      topicCount: thread.topics.length,
      topics: thread.topics,
      participants: Array.from(thread.participants),
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      duration: thread.updatedAt - thread.createdAt,
      messagesPerHour:
        (thread.messages.size / ((thread.updatedAt - thread.createdAt) / 3600000))
          .toFixed(2),
    };
  }

  /**
   * Find related threads based on content similarity
   */
  findRelatedThreads(
    thread: Thread,
    allThreads: Thread[],
    threshold: number = 0.5
  ): Array<{ thread: Thread; similarity: number }> {
    const related: Array<{ thread: Thread; similarity: number }> = [];

    for (const otherThread of allThreads) {
      if (otherThread.id === thread.id) continue;

      const similarity = this.calculateThreadSimilarity(thread, otherThread);

      if (similarity >= threshold) {
        related.push({ thread: otherThread, similarity });
      }
    }

    return related.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Calculate similarity between two threads
   */
  private calculateThreadSimilarity(thread1: Thread, thread2: Thread): number {
    let score = 0;

    // Topic overlap
    const commonTopics = thread1.topics.filter((t) =>
      thread2.topics.includes(t)
    ).length;
    const totalTopics = new Set([...thread1.topics, ...thread2.topics]).size;
    score += (commonTopics / Math.max(totalTopics, 1)) * 0.4;

    // Participant overlap
    const commonParticipants = Array.from(thread1.participants).filter((p) =>
      thread2.participants.has(p)
    ).length;
    const totalParticipants = new Set([
      ...thread1.participants,
      ...thread2.participants,
    ]).size;
    score += (commonParticipants / Math.max(totalParticipants, 1)) * 0.3;

    // Temporal proximity
    const timeDiff = Math.abs(thread1.updatedAt - thread2.updatedAt);
    const withinDay = timeDiff < 24 * 60 * 60 * 1000;
    if (withinDay) {
      score += 0.3;
    }

    return score;
  }

  /**
   * Prepare thread content for AI summarization
   */
  private prepareContentForAI(thread: Thread): string {
    const messages = Array.from(thread.messages.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );

    const content = messages
      .map((msg) => `${msg.sender.name}: ${msg.content}`)
      .join('\n\n');

    return `Thread: ${thread.title}\nDescription: ${thread.description || 'N/A'}\n\nMessages:\n${content}`;
  }

  /**
   * Extract local summary without AI
   */
  private extractLocalSummary(thread: Thread): string {
    const stats = this.getThreadAnalysis(thread);
    const keyPoints = this.extractKeyPoints(thread);
    const actionItems = this.extractActionItems(thread);

    let summary = `Thread: ${thread.title}\n`;
    summary += `Participants: ${stats.participantCount}\n`;
    summary += `Messages: ${stats.messageCount}\n`;

    if (thread.topics.length > 0) {
      summary += `Topics: ${thread.topics.join(', ')}\n`;
    }

    if (keyPoints.length > 0) {
      summary += `\nKey Points:\n${keyPoints.map((p) => `- ${p}`).join('\n')}\n`;
    }

    if (actionItems.length > 0) {
      summary += `\nAction Items:\n${actionItems.map((a) => `- ${a}`).join('\n')}\n`;
    }

    return summary;
  }

  /**
   * Clear cache for a thread
   */
  clearCache(threadId: string) {
    this.summaryCache.delete(threadId);
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    this.summaryCache.clear();
  }
}
