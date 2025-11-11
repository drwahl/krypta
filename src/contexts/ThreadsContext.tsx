import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { ThreadManager } from '../services/threadManager';
import { ThreadLinker } from '../services/threadLinker';
import { ThreadSummarizer } from '../services/threadSummarizer';
import { ThreadStorage } from '../services/threadStorage';
import { ThreadSync } from '../services/threadSync';
import { Thread, ThreadMessage, ContextualObject } from '../types/thread';
import { useMatrix } from '../MatrixContext';

/**
 * ThreadsContext - Shared state for all threading operations
 * Provides a single source of truth for threads across all components
 */

interface ThreadsContextType {
  threads: Thread[];
  selectedThread: Thread | null;
  setSelectedThread: (thread: Thread | null) => void;
  isLoading: boolean;
  updateTrigger: number;
  createThread: (roomId: string, title: string, description?: string) => Promise<Thread | null>;
  addMessage: (threadId: string, message: ThreadMessage, branchId?: string) => Promise<boolean>;
  linkMessage: (message: ThreadMessage) => Thread | null;
  linkMessages: (messages: ThreadMessage[]) => Map<string, Thread>;
  createBranch: (threadId: string, branchName: string, description?: string) => string | null;
  mergeBranches: (threadId: string, sourceBranchId: string, targetBranchId: string) => boolean;
  attachContextualObject: (threadId: string, messageId: string, obj: ContextualObject) => boolean;
  summarizeThread: (threadId: string, useAI?: boolean) => Promise<string>;
  getKeyPoints: (threadId: string) => string[];
  getActionItems: (threadId: string) => string[];
  getThreadAnalysis: (threadId: string) => any;
  getRelatedThreads: (threadId: string) => Thread[];
  archiveThread: (threadId: string) => boolean;
  deleteThread: (threadId: string) => Promise<boolean>;
  getThreadsInRoom: (roomId: string) => Thread[];
  threadManager: ThreadManager | null;
  threadLinker: ThreadLinker | null;
  summarizer: ThreadSummarizer | null;
}

const ThreadsContext = createContext<ThreadsContextType | undefined>(undefined);

export const ThreadsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { client, currentRoom } = useMatrix();
  
  const threadManagerRef = useRef<ThreadManager | null>(null);
  const threadLinkerRef = useRef<ThreadLinker | null>(null);
  const summarizerRef = useRef<ThreadSummarizer | null>(null);
  const storageRef = useRef<ThreadStorage | null>(null);
  const threadSyncRef = useRef<ThreadSync | null>(null);
  const hasLoadedRef = useRef(false);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Initialize managers and load persisted threads ONCE
  useEffect(() => {
    const initializeThreading = async () => {
      if (!threadManagerRef.current) {
        console.log(`🔧 Initializing threading system (Context Provider)...`);
        threadManagerRef.current = new ThreadManager({
          similarityThreshold: 0.6,
          contextWindow: 5 * 60 * 1000,
          useLocalLinking: true,
        });
        threadLinkerRef.current = new ThreadLinker(threadManagerRef.current);
        summarizerRef.current = new ThreadSummarizer();
        storageRef.current = new ThreadStorage();
        threadSyncRef.current = new ThreadSync(client);

        if (!hasLoadedRef.current) {
          try {
            await storageRef.current.init();
            const persistedThreads = await storageRef.current.loadAllThreads();
            
            if (persistedThreads.length > 0) {
              console.log(`✅ Loaded ${persistedThreads.length} persisted threads (Context Provider)`);
              setThreads(persistedThreads);
              
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

  const threadManager = threadManagerRef.current;
  const threadLinker = threadLinkerRef.current;
  const summarizer = summarizerRef.current;

  const createThread = useCallback(
    async (roomId: string, title: string, description?: string) => {
      if (!threadManager) return null;
      
      console.log(`🧵 Creating native Matrix thread: ${title}`);
      
      // Step 1: Send root message to Matrix
      let rootEventId: string | null = null;
      if (client && threadSyncRef.current) {
        const rootContent = `📌 ${title}${description ? `\n\n${description}` : ''}`;
        rootEventId = await threadSyncRef.current.createThreadRoot(roomId, rootContent);
        
        if (!rootEventId) {
          console.error('Failed to create Matrix thread root');
          return null;
        }
        
        console.log(`✅ Matrix thread root created: ${rootEventId}`);
        
        // Step 2: Store metadata in room state
        await threadSyncRef.current.storeThreadMetadata(roomId, rootEventId, {
          title,
          description,
          createdBy: client.getUserId() || undefined,
          createdAt: Date.now(),
        });
        
        console.log(`✅ Thread metadata stored in Matrix`);
      }
      
      // Step 3: Create local thread object
      const threadId = rootEventId || `thread-${roomId}-${Date.now()}`;
      const thread = threadManager.createThread(threadId, roomId, title, description);
      
      // Add root event ID to thread
      if (rootEventId) {
        thread.metadata = {
          ...thread.metadata,
          matrixRootEventId: rootEventId,
        };
      }
      
      setThreads((prev) => [...prev, thread]);
      
      // Step 4: Save to local storage
      if (storageRef.current) {
        storageRef.current.saveThread(thread).catch(console.error);
      }
      
      console.log(`✅ Thread created: ${threadId}`);
      return thread;
    },
    [threadManager, client]
  );

  const addMessage = useCallback(
    async (threadId: string, message: ThreadMessage, branchId?: string) => {
      if (!threadManager) return false;
      
      console.log(`📥 Adding message ${message.id} to thread ${threadId} (Context)`);
      const success = threadManager.addMessageToThread(threadId, message, branchId);
      console.log(`📥 addMessageToThread returned: ${success}`);
      
      if (success) {
        const thread = threadManager.getThread(threadId);
        console.log(`📥 Thread after adding: ${thread?.messages.size} messages`);
        
        const clonedThread = thread ? {
          ...thread,
          messages: new Map(thread.messages),
          branches: new Map(thread.branches),
          participants: new Set(thread.participants),
          relatedThreadIds: new Set(thread.relatedThreadIds),
          mainBranch: {
            ...thread.mainBranch,
            messageIds: [...thread.mainBranch.messageIds],
          },
        } : null;
        
        if (clonedThread) {
          console.log(`🔄 Updating threads state (Context): ${clonedThread.messages.size} messages`);
          
          setThreads((prev) =>
            prev.map((t) => (t.id === threadId ? clonedThread : t))
          );
          
          setUpdateTrigger(prev => prev + 1);
          
          if (selectedThread?.id === threadId) {
            console.log(`🔄 Updating selectedThread (Context): ${clonedThread.messages.size} messages`);
            setSelectedThread(clonedThread);
          }
          
          if (storageRef.current && thread) {
            storageRef.current.saveThread(thread).catch(console.error);
          }
        }
      }
      return success;
    },
    [threadManager, selectedThread]
  );

  const linkMessage = useCallback(
    (message: ThreadMessage) => {
      if (!threadLinker) return null;
      const thread = threadLinker.linkMessage(message);
      if (thread) {
        setThreads((prev) =>
          prev.map((t) => (t.id === thread.id ? { ...thread } : t))
        );
      }
      return thread;
    },
    [threadLinker]
  );

  const linkMessages = useCallback(
    (messages: ThreadMessage[]) => {
      if (!threadLinker) return new Map();
      return threadLinker.linkMessages(messages);
    },
    [threadLinker]
  );

  const createBranch = useCallback(
    (threadId: string, branchName: string, description?: string) => {
      if (!threadManager) return null;
      const branchId = threadManager.createBranch(threadId, branchName, description);
      if (branchId) {
        const thread = threadManager.getThread(threadId);
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId && thread ? { ...thread } : t))
        );
      }
      return branchId;
    },
    [threadManager]
  );

  const mergeBranches = useCallback(
    (threadId: string, sourceBranchId: string, targetBranchId: string) => {
      if (!threadManager) return false;
      const success = threadManager.mergeBranches(threadId, sourceBranchId, targetBranchId);
      if (success) {
        const thread = threadManager.getThread(threadId);
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId && thread ? { ...thread } : t))
        );
      }
      return success;
    },
    [threadManager]
  );

  const attachContextualObject = useCallback(
    (threadId: string, messageId: string, obj: ContextualObject) => {
      if (!threadManager) return false;
      const success = threadManager.attachContextualObject(threadId, messageId, obj);
      if (success) {
        const thread = threadManager.getThread(threadId);
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId && thread ? { ...thread } : t))
        );
      }
      return success;
    },
    [threadManager]
  );

  const summarizeThread = useCallback(
    async (threadId: string, useAI = false) => {
      if (!summarizer) return '';
      setIsLoading(true);
      try {
        const thread = threadManager?.getThread(threadId);
        if (!thread) return '';
        return await summarizer.summarizeThread(thread, useAI);
      } finally {
        setIsLoading(false);
      }
    },
    [summarizer, threadManager]
  );

  const getKeyPoints = useCallback(
    (threadId: string) => {
      if (!summarizer) return [];
      const thread = threadManager?.getThread(threadId);
      return thread ? summarizer.extractKeyPoints(thread) : [];
    },
    [summarizer, threadManager]
  );

  const getActionItems = useCallback(
    (threadId: string) => {
      if (!summarizer) return [];
      const thread = threadManager?.getThread(threadId);
      return thread ? summarizer.extractActionItems(thread) : [];
    },
    [summarizer, threadManager]
  );

  const getThreadAnalysis = useCallback(
    (threadId: string) => {
      if (!summarizer) return null;
      const thread = threadManager?.getThread(threadId);
      return thread ? summarizer.analyzeThread(thread) : null;
    },
    [summarizer, threadManager]
  );

  const getRelatedThreads = useCallback(
    (threadId: string) => {
      if (!summarizer || !threadManager) return [];
      const thread = threadManager.getThread(threadId);
      if (!thread) return [];
      const allThreads = Array.from(threadManager.threads.values());
      return summarizer.findRelatedThreads(thread, allThreads);
    },
    [summarizer, threadManager]
  );

  const archiveThread = useCallback(
    (threadId: string) => {
      if (!threadManager) return false;
      const success = threadManager.archiveThread(threadId);
      if (success) {
        const thread = threadManager.getThread(threadId);
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId && thread ? { ...thread } : t))
        );
        if (selectedThread?.id === threadId) {
          setSelectedThread(null);
        }
      }
      return success;
    },
    [threadManager, selectedThread]
  );

  const deleteThread = useCallback(
    async (threadId: string) => {
      if (!threadManager) return false;
      
      console.log(`🗑️ Deleting thread: ${threadId}`);
      const success = threadManager.deleteThread(threadId);
      
      if (success) {
        console.log(`🗑️ Thread deleted from manager`);
        
        // Remove from React state
        setThreads((prev) => prev.filter((t) => t.id !== threadId));
        
        // Clear selection if this was selected
        if (selectedThread?.id === threadId) {
          setSelectedThread(null);
        }
        
        // Delete from IndexedDB storage
        if (storageRef.current) {
          try {
            await storageRef.current.deleteThread(threadId);
            console.log(`🗑️ Thread deleted from storage`);
          } catch (error) {
            console.error('Failed to delete thread from storage:', error);
          }
        }
      }
      
      return success;
    },
    [threadManager, selectedThread]
  );

  const getThreadsInRoom = useCallback(
    (roomId: string) => {
      if (!threadManager) return [];
      return threadManager.getThreadsInRoom(roomId);
    },
    [threadManager]
  );

  const value: ThreadsContextType = {
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

  return (
    <ThreadsContext.Provider value={value}>
      {children}
    </ThreadsContext.Provider>
  );
};

export const useThreads = () => {
  const context = useContext(ThreadsContext);
  if (!context) {
    throw new Error('useThreads must be used within ThreadsProvider');
  }
  return context;
};
