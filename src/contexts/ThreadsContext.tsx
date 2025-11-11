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

  // Initialize managers and load threads
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
            }
            hasLoadedRef.current = true;
          } catch (error) {
            console.error('Failed to load persisted threads:', error);
          }
        }
      }
      
      // Load Matrix threads from current room
      if (currentRoom && threadSyncRef.current && threadManagerRef.current && client) {
        console.log(`🔄 Loading Matrix threads from room: ${currentRoom.name}`);
        const matrixThreads = threadSyncRef.current.loadThreadsFromRoom(currentRoom);
        const metadata = threadSyncRef.current.loadAllThreadMetadata(currentRoom);
        
        console.log(`📊 Found ${matrixThreads.size} Matrix threads, ${metadata.size} with metadata`);
        
        // Convert Matrix threads to our Thread objects
        const loadedThreads: Thread[] = [];
        for (const [rootEventId, events] of matrixThreads.entries()) {
          // Check if we already have this thread
          let thread = threadManagerRef.current.getThread(rootEventId);
          
          if (!thread) {
            // Get metadata from room state
            const meta = metadata.get(rootEventId);
            const rootEvent = threadSyncRef.current.getThreadRoot(currentRoom, rootEventId);
            
            const title = meta?.title || 'Untitled Thread';
            const description = meta?.description;
            
            // Create thread with Matrix event ID
            thread = threadManagerRef.current.createThread(
              rootEventId,
              currentRoom.roomId,
              title,
              description,
              true,
              meta?.createdBy
            );
            
            // Add root message
            if (rootEvent) {
              const rootMessage = threadSyncRef.current.matrixEventToThreadMessage(rootEvent);
              threadManagerRef.current.addMessageToThread(rootEventId, rootMessage);
            }
            
            // Add threaded messages
            for (const event of events) {
              const message = threadSyncRef.current.matrixEventToThreadMessage(event);
              threadManagerRef.current.addMessageToThread(rootEventId, message);
            }
            
            loadedThreads.push(thread);
          }
        }
        
        if (loadedThreads.length > 0) {
          console.log(`✅ Loaded ${loadedThreads.length} Matrix threads`);
          setThreads((prev) => [...prev, ...loadedThreads]);
        }
      }
    };

    initializeThreading();
  }, [client, currentRoom]);
  
  // Listen for new messages in Matrix and auto-add to threads
  useEffect(() => {
    if (!client || !threadManagerRef.current || !threadSyncRef.current) return;
    
    const handleTimelineEvent = (
      event: any,
      room: any,
      toStartOfTimeline: boolean
    ) => {
      // Only process new messages, not historical ones
      if (toStartOfTimeline) return;
      
      // Only process room messages
      if (event.getType() !== 'm.room.message') return;
      
      const content = event.getContent();
      const relatesTo = content['m.relates_to'];
      
      // Check if this is a threaded message (MSC3440 format)
      if (relatesTo?.rel_type === 'm.thread' && relatesTo.event_id) {
        const threadRootEventId = relatesTo.event_id;
        const eventId = event.getId();
        
        console.log(`📨 Received threaded message ${eventId} for thread: ${threadRootEventId}`);
        console.log(`📨 Event content:`, content);
        console.log(`📨 Relates to:`, relatesTo);
        
        // Get or create thread
        let thread = threadManagerRef.current?.getThread(threadRootEventId);
        
        if (!thread) {
          console.warn(`⚠️ Thread ${threadRootEventId} not found in local state, skipping auto-add`);
          console.warn(`⚠️ Available threads:`, Array.from(threadManagerRef.current?.threads.keys() || []));
          return;
        }
        
        if (thread && threadSyncRef.current) {
          // Convert Matrix event to ThreadMessage
          const message = threadSyncRef.current.matrixEventToThreadMessage(event);
          
          console.log(`📥 Converting event to ThreadMessage:`, message);
          
          // Check if message already exists in thread
          if (thread.messages.has(message.id)) {
            console.log(`ℹ️ Message ${message.id} already in thread, skipping`);
            return;
          }
          
          // Add message to thread
          const success = threadManagerRef.current?.addMessageToThread(
            threadRootEventId,
            message
          );
          
          if (success) {
            console.log(`✅ Auto-added message ${message.id} to thread ${threadRootEventId}`);
            
            // Update React state
            const updatedThread = threadManagerRef.current?.getThread(threadRootEventId);
            if (updatedThread) {
              setThreads((prev) =>
                prev.map((t) => (t.id === threadRootEventId ? { ...updatedThread } : t))
              );
              
              // Update selected thread if it matches
              setSelectedThread((prev) =>
                prev?.id === threadRootEventId ? { ...updatedThread } : prev
              );
              
              // Persist to storage
              if (storageRef.current) {
                storageRef.current.saveThread(updatedThread).catch(console.error);
              }
            }
          } else {
            console.error(`❌ Failed to add message to thread ${threadRootEventId}`);
          }
        }
      }
    };
    
    client.on('Room.timeline' as any, handleTimelineEvent);
    
    return () => {
      client.removeListener('Room.timeline' as any, handleTimelineEvent);
    };
  }, [client]);

  const threadManager = threadManagerRef.current;
  const threadLinker = threadLinkerRef.current;
  const summarizer = summarizerRef.current;

  const createThread = useCallback(
    async (roomId: string, title: string, description?: string) => {
      if (!threadManager) return null;
      if (!client) {
        console.error('Matrix client not initialized');
        return null;
      }
      
      console.log(`🧵 Creating native Matrix thread: "${title}"`);
      console.log(`🧵 Room ID: ${roomId}`);
      
      // Step 1: Send root message to Matrix (this is a regular message, NOT threaded)
      const rootContent = `📌 ${title}${description ? `\n\n${description}` : ''}`;
      const rootEventId = await threadSyncRef.current?.createThreadRoot(roomId, rootContent);
      
      if (!rootEventId) {
        console.error('❌ Failed to create Matrix thread root - no event ID returned');
        return null;
      }
      
      console.log(`✅ Matrix thread root created with event ID: ${rootEventId}`);
      console.log(`📋 Root event ID format check: ${rootEventId.startsWith('$') ? 'VALID' : 'INVALID'}`);
      
      // Step 2: Store metadata in room state
      await threadSyncRef.current?.storeThreadMetadata(roomId, rootEventId, {
        title,
        description,
        createdBy: client.getUserId() || undefined,
        createdAt: Date.now(),
      });
      
      console.log(`✅ Thread metadata stored in Matrix`);
      
      // Step 3: Create local thread object (use rootEventId as thread ID)
      const thread = threadManager.createThread(
        rootEventId,
        roomId,
        title,
        description,
        true, // isMatrixNative
        client.getUserId() || undefined
      );
      
      // Step 3.5: Add root message to thread
      const rootMessage = {
        id: rootEventId,
        eventId: rootEventId,
        source: 'matrix' as const,
        sender: {
          id: client.getUserId() || 'unknown',
          name: client.getUserId()?.split(':')[0].substring(1) || 'Unknown',
        },
        content: rootContent,
        timestamp: Date.now(),
        contextualObjects: [],
      };
      threadManager.addMessageToThread(rootEventId, rootMessage);
      
      console.log(`📊 Thread object created:`, {
        id: thread.id,
        rootEventId: thread.rootEventId,
        title: thread.title,
        isMatrixNative: thread.isMatrixNative,
        messageCount: thread.messages.size,
      });
      
      setThreads((prev) => [...prev, thread]);
      
      // Step 4: Save to local storage
      if (storageRef.current) {
        storageRef.current.saveThread(thread).catch(console.error);
      }
      
      console.log(`✅ Thread created successfully with ID: ${rootEventId}`);
      console.log(`📋 Thread is now in threadManager, total threads: ${threadManager.threads.size}`);
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
    (threadId: string, branchName: string, description?: string, parentMessageId?: string) => {
      if (!threadManager) return null;
      const branchId = threadManager.createBranch(threadId, branchName, description, parentMessageId);
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
