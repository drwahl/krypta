import { useState, useCallback, useRef, useEffect } from 'react';
import { ThreadManager } from '../services/threadManager';
import { ThreadLinker } from '../services/threadLinker';
import { ThreadSummarizer } from '../services/threadSummarizer';
import { ThreadStorage } from '../services/threadStorage';
import { Thread, ThreadMessage, ContextualObject } from '../types/thread';

/**
 * Hook for managing threads in a component
 */
export const useThreads = () => {
  const threadManagerRef = useRef<ThreadManager | null>(null);
  const threadLinkerRef = useRef<ThreadLinker | null>(null);
  const summarizerRef = useRef<ThreadSummarizer | null>(null);
  const storageRef = useRef<ThreadStorage | null>(null);
  const hasLoadedRef = useRef(false); // Flag to prevent reloading

  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Initialize managers and load persisted threads ONCE
  useEffect(() => {
    const initializeThreading = async () => {
      if (!threadManagerRef.current) {
        console.log(`🔧 Initializing threading system...`);
        threadManagerRef.current = new ThreadManager({
          similarityThreshold: 0.6,
          contextWindow: 5 * 60 * 1000,
          useLocalLinking: true,
        });
        threadLinkerRef.current = new ThreadLinker(threadManagerRef.current);
        summarizerRef.current = new ThreadSummarizer();
        storageRef.current = new ThreadStorage();

        // Initialize storage and load persisted threads ONLY ONCE
        if (!hasLoadedRef.current) {
          try {
            await storageRef.current.init();
            const persistedThreads = await storageRef.current.loadAllThreads();
            
            if (persistedThreads.length > 0) {
              console.log(`✅ Loaded ${persistedThreads.length} persisted threads (INITIAL LOAD)`);
              setThreads(persistedThreads);
              
              // Re-add threads to manager
              persistedThreads.forEach((thread) => {
                threadManagerRef.current?.threads.set(thread.id, thread);
              });
              hasLoadedRef.current = true;
            }
          } catch (error) {
            console.error('Failed to load persisted threads:', error);
          }
        }
      }
    };

    initializeThreading();
  }, []);

  const threadManager = threadManagerRef.current!;
  const threadLinker = threadLinkerRef.current!;
  const summarizer = summarizerRef.current!;

  /**
   * Create a new thread
   */
  const createThread = useCallback(
    async (roomId: string, title: string, description?: string) => {
      if (!threadManager) return null;
      const threadId = `thread-${roomId}-${Date.now()}`;
      const thread = threadManager.createThread(threadId, roomId, title, description);
      setThreads((prev) => [...prev, thread]);
      
      // Persist to storage
      if (storageRef.current) {
        try {
          await storageRef.current.saveThread(thread);
        } catch (error) {
          console.error('Failed to persist thread:', error);
        }
      }
      
      return thread;
    },
    [threadManager]
  );

  /**
   * Add a message to a thread
   */
  const addMessage = useCallback(
    async (threadId: string, message: ThreadMessage, branchId?: string) => {
      if (!threadManager) return false;
      
      console.log(`📥 Adding message ${message.id} to thread ${threadId}`);
      const success = threadManager.addMessageToThread(threadId, message, branchId);
      console.log(`📥 addMessageToThread returned: ${success}`);
      
      if (success) {
        const thread = threadManager.getThread(threadId);
        console.log(`📥 Thread after adding: ${thread?.messages.size} messages, ${thread?.mainBranch.messageIds.length} in main branch`);
        console.log(`📥 Main branch message IDs:`, thread?.mainBranch.messageIds);
        
        // Deep clone to force React update - create completely new object
        const clonedThread = {
          ...thread,
          messages: new Map(thread.messages),
          branches: new Map(thread.branches),
          participants: new Set(thread.participants),
          relatedThreadIds: new Set(thread.relatedThreadIds),
          mainBranch: {
            ...thread.mainBranch,
            messageIds: [...thread.mainBranch.messageIds],
          },
        };
        
        console.log(`🔄 Setting threads state with cloned thread: ${clonedThread.messages.size} messages`);
        
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? clonedThread : t))
        );
        
        // Trigger update for components watching
        setUpdateTrigger(prev => prev + 1);
        console.log(`🔔 Update trigger incremented`);
        
        // Also update selectedThread if it's the same thread
        if (selectedThread?.id === threadId) {
          console.log(`🔄 Updating selectedThread directly: ${clonedThread.messages.size} messages`);
          setSelectedThread(clonedThread);
        }
        
        // Persist to storage AFTER updating React state
        if (thread && storageRef.current) {
          try {
            console.log(`💾 Saving thread to storage: ${thread.messages.size} messages`);
            await storageRef.current.saveThread(thread);
            console.log(`💾 Thread saved successfully`);
          } catch (error) {
            console.error('Failed to persist thread:', error);
          }
        }
      }
      return success;
    },
    [threadManager]
  );

  /**
   * Link a message to threads (auto-creates or adds to existing)
   */
  const linkMessage = useCallback(
    (message: ThreadMessage, roomId: string) => {
      if (!threadLinker || !threadManager) return { threadId: '', isNew: false };
      const result = threadLinker.linkMessage(
        message,
        roomId,
        threads.filter((t) => t.roomId === roomId)
      );

      // Update threads list
      const thread = threadManager.getThread(result.threadId);
      if (thread) {
        setThreads((prev) => {
          const existing = prev.find((t) => t.id === result.threadId);
          if (existing) {
            return prev.map((t) => (t.id === result.threadId ? { ...t } : t));
          }
          return [...prev, thread];
        });
      }

      return result;
    },
    [threadLinker, threadManager, threads]
  );

  /**
   * Link multiple messages at once
   */
  const linkMessages = useCallback(
    (messages: ThreadMessage[], roomId: string) => {
      if (!threadLinker || !threadManager) return new Map();
      setIsLoading(true);
      try {
        const mapping = threadLinker.linkMessages(messages, roomId);

        // Update threads
        const updatedThreads = threadManager.getThreadsInRoom(roomId);
        setThreads((prev) => {
          const existing = prev.filter((t) => t.roomId !== roomId);
          return [...existing, ...updatedThreads];
        });

        return mapping;
      } finally {
        setIsLoading(false);
      }
    },
    [threadLinker, threadManager]
  );

  /**
   * Create a branch in a thread
   */
  const createBranch = useCallback(
    (threadId: string, parentMessageId: string, topic: string, description?: string) => {
      if (!threadManager) return null;
      const branch = threadManager.createBranch(
        threadId,
        parentMessageId,
        topic,
        description
      );
      if (branch) {
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t } : t))
        );
      }
      return branch;
    },
    [threadManager]
  );

  /**
   * Merge branches
   */
  const mergeBranches = useCallback(
    (threadId: string, sourceBranchId: string, targetBranchId: string) => {
      if (!threadManager) return false;
      const success = threadManager.mergeBranches(
        threadId,
        sourceBranchId,
        targetBranchId
      );
      if (success) {
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t } : t))
        );
      }
      return success;
    },
    [threadManager]
  );

  /**
   * Attach contextual object to a message
   */
  const attachContextualObject = useCallback(
    (threadId: string, messageId: string, object: ContextualObject) => {
      if (!threadManager) return false;
      const success = threadManager.attachContextualObject(
        threadId,
        messageId,
        object
      );
      if (success) {
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t } : t))
        );
      }
      return success;
    },
    [threadManager]
  );

  /**
   * Get thread summary (on-demand)
   */
  const summarizeThread = useCallback(
    async (threadId: string, useAI: boolean = false, aiProvider?: (content: string) => Promise<string>) => {
      if (!threadManager || !summarizer) return null;
      const thread = threadManager.getThread(threadId);
      if (!thread) return null;

      return summarizer.summarizeThread(thread, useAI, aiProvider);
    },
    [threadManager, summarizer]
  );

  /**
   * Extract key points from thread
   */
  const getKeyPoints = useCallback(
    (threadId: string) => {
      if (!threadManager || !summarizer) return [];
      const thread = threadManager.getThread(threadId);
      if (!thread) return [];

      return summarizer.extractKeyPoints(thread);
    },
    [threadManager, summarizer]
  );

  /**
   * Extract action items from thread
   */
  const getActionItems = useCallback(
    (threadId: string) => {
      if (!threadManager || !summarizer) return [];
      const thread = threadManager.getThread(threadId);
      if (!thread) return [];

      return summarizer.extractActionItems(thread);
    },
    [threadManager, summarizer]
  );

  /**
   * Get thread analysis
   */
  const getThreadAnalysis = useCallback(
    (threadId: string) => {
      if (!threadManager || !summarizer) return null;
      const thread = threadManager.getThread(threadId);
      if (!thread) return null;

      return summarizer.getThreadAnalysis(thread);
    },
    [threadManager, summarizer]
  );

  /**
   * Get related threads
   */
  const getRelatedThreads = useCallback(
    (threadId: string) => {
      if (!threadManager) return [];
      return threadManager.getRelatedThreads(threadId);
    },
    [threadManager]
  );

  /**
   * Archive thread
   */
  const archiveThread = useCallback(
    (threadId: string) => {
      if (!threadManager) return false;
      const success = threadManager.archiveThread(threadId);
      if (success) {
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t } : t))
        );
      }
      return success;
    },
    [threadManager]
  );

  /**
   * Delete thread
   */
  const deleteThread = useCallback(
    (threadId: string) => {
      if (!threadManager) return false;
      const success = threadManager.deleteThread(threadId);
      if (success) {
        setThreads((prev) => prev.filter((t) => t.id !== threadId));
        if (selectedThread?.id === threadId) {
          setSelectedThread(null);
        }
      }
      return success;
    },
    [threadManager, selectedThread]
  );

  /**
   * Get threads in a room
   */
  const getThreadsInRoom = useCallback(
    (roomId: string) => {
      if (!threadManager) return [];
      return threadManager.getThreadsInRoom(roomId);
    },
    [threadManager]
  );

  return {
    threads,
    selectedThread,
    setSelectedThread,
    isLoading,
    updateTrigger,
    createThread,
    addMessage,
    linkMessage,
    linkMessages,
    createBranch,
    mergeBranches,
    attachContextualObject,
    summarizeThread,
    getKeyPoints,
    getActionItems,
    getThreadAnalysis,
    getRelatedThreads,
    archiveThread,
    deleteThread,
    getThreadsInRoom,
    threadManager,
    threadLinker,
    summarizer,
  };
};
