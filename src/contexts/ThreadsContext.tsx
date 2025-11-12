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
  updateThreadTitle: (threadId: string, newTitle: string) => Promise<boolean>;
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
        console.log(`   Client available: ${!!client}`);
        threadManagerRef.current = new ThreadManager({
          similarityThreshold: 0.6,
          contextWindow: 5 * 60 * 1000,
          useLocalLinking: true,
        });
        threadLinkerRef.current = new ThreadLinker(threadManagerRef.current);
        summarizerRef.current = new ThreadSummarizer();
        storageRef.current = new ThreadStorage();
        
        // Only create ThreadSync if client is available
        if (client) {
          console.log(`   Creating ThreadSync with client`);
          threadSyncRef.current = new ThreadSync(client);
        } else {
          console.log(`   ⚠️ Client not available, ThreadSync will be created later`);
          threadSyncRef.current = new ThreadSync(null);
        }

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
        
        // Load custom thread titles from room account data (per-user)
        const threadTitlesEvent = currentRoom.getAccountData('com.nychatt.thread_titles');
        const threadTitles = threadTitlesEvent?.getContent() || {};
        
        console.log(`📊 Found ${matrixThreads.size} Matrix threads`);
        console.log(`📊 Found ${metadata.size} thread metadata state events`);
        console.log(`📊 Found ${Object.keys(threadTitles).length} custom titles in account data`);
        
        // Log custom titles
        if (Object.keys(threadTitles).length > 0) {
          console.log(`📋 Custom thread titles from account data:`);
          Object.entries(threadTitles).forEach(([threadId, data]: [string, any]) => {
            console.log(`   ${threadId}: "${data.title || data}"`);
          });
        }
        
        // Convert Matrix threads to our Thread objects
        const loadedThreads: Thread[] = [];
        for (const [rootEventId, events] of matrixThreads.entries()) {
          // Get metadata from room state
          const meta = metadata.get(rootEventId);
          
          // Check if we already have this thread
          let thread = threadManagerRef.current.getThread(rootEventId);
          
          if (!thread) {
            const rootEvent = threadSyncRef.current.getThreadRoot(currentRoom, rootEventId);
            
            // Priority: custom title from account data > metadata from state > default
            const customTitle = threadTitles[rootEventId];
            const title = (customTitle?.title || customTitle) || meta?.title || 'Untitled Thread';
            const description = meta?.description;
            
            console.log(`   Creating thread ${rootEventId} with title: "${title}"`);
            
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
          } else {
            // Update existing thread with custom titles from account data or metadata
            const customTitle = threadTitles[rootEventId];
            const newTitle = (customTitle?.title || customTitle) || meta?.title;
            
            if (newTitle && newTitle !== thread.title) {
              console.log(`🔄 Updating existing thread ${rootEventId}`);
              console.log(`   Old title: "${thread.title}"`);
              console.log(`   New title: "${newTitle}"`);
              
              thread.title = newTitle;
              thread.description = meta?.description || thread.description;
              if (meta?.updated_at || customTitle?.updated_at) {
                thread.updatedAt = meta?.updated_at || customTitle?.updated_at;
              }
              
              // Trigger state update
              setThreads((prev) => 
                prev.map((t) => (t.id === rootEventId ? { ...thread } : t))
              );
              
              console.log(`   ✅ Thread updated`);
            }
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
  
  // Listen for state events (including thread metadata updates)
  useEffect(() => {
    if (!client || !currentRoom) return;
    
    const handleRoomState = (event: any) => {
      // Check if this is a thread metadata update
      if (event.getType() === 'com.nychatt.thread.metadata') {
        const stateKey = event.getStateKey();
        const content = event.getContent();
        console.log(`🔔 Thread metadata state event received!`);
        console.log(`   Thread ID: ${stateKey}`);
        console.log(`   New title: ${content.title}`);
        console.log(`   Updated by: ${content.updated_by}`);
        console.log(`   Content:`, content);
        
        // Update the thread if we have it
        if (threadManagerRef.current) {
          const thread = threadManagerRef.current.getThread(stateKey);
          if (thread) {
            console.log(`   Updating local thread object...`);
            thread.title = content.title;
            thread.updatedAt = content.updated_at;
            
            // Update React state
            setThreads((prev) => 
              prev.map((t) => (t.id === stateKey ? { ...t, title: content.title, updatedAt: content.updated_at } : t))
            );
            console.log(`   ✅ Thread updated locally`);
          } else {
            console.log(`   ⚠️ Thread not found in manager`);
          }
        }
      }
    };
    
    // Listen for state events
    client.on('RoomState.events' as any, handleRoomState);
    
    return () => {
      client.removeListener('RoomState.events' as any, handleRoomState);
    };
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
      if (!threadManager) {
        console.error('❌ ThreadManager not initialized');
        return null;
      }
      if (!client) {
        console.error('❌ Matrix client not initialized');
        return null;
      }
      if (!threadSyncRef.current) {
        console.error('❌ ThreadSync not initialized, creating now...');
        threadSyncRef.current = new ThreadSync(client);
      } else {
        // Ensure ThreadSync has the current client
        console.log(`🔄 Updating ThreadSync client...`);
        threadSyncRef.current.setClient(client);
      }
      
      console.log(`🧵 Creating native Matrix thread: "${title}"`);
      console.log(`🧵 Room ID: ${roomId}`);
      console.log(`🧵 ThreadSync initialized: ${!!threadSyncRef.current}`);
      console.log(`🧵 Client available: ${!!client}`);
      
      // Step 1: Send root message to Matrix (this is a regular message, NOT threaded)
      const rootContent = `📌 ${title}${description ? `\n\n${description}` : ''}`;
      
      console.log(`📤 Sending thread root message to Matrix...`);
      const rootEventId = await threadSyncRef.current.createThreadRoot(roomId, rootContent);
      
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

  const updateThreadTitle = useCallback(
    async (threadId: string, newTitle: string) => {
      if (!threadManager || !currentRoom) {
        console.error('❌ Missing threadManager or currentRoom');
        return false;
      }
      
      console.log(`✏️ Updating thread title: ${threadId} -> "${newTitle}"`);
      const thread = threadManager.getThread(threadId);
      
      if (!thread) {
        console.error(`❌ Thread not found: ${threadId}`);
        return false;
      }
      
      console.log(`📝 Thread rootEventId: ${thread.rootEventId}`);
      
      // Update the thread title
      thread.title = newTitle.trim();
      thread.updatedAt = Date.now();
      
      // Update in React state
      setThreads((prev) => 
        prev.map((t) => (t.id === threadId ? { ...t, title: newTitle.trim(), updatedAt: Date.now() } : t))
      );
      
      // Update selected thread if it's the one being edited
      if (selectedThread?.id === threadId) {
        setSelectedThread({ ...thread });
      }
      
      // Persist to IndexedDB
      if (storageRef.current) {
        try {
          await storageRef.current.saveThread(thread);
          console.log(`✅ Thread title updated in IndexedDB`);
        } catch (error) {
          console.error('❌ Failed to save to IndexedDB:', error);
          return false;
        }
      }
      
      // Sync to Matrix room account data (per-user, doesn't require elevated permissions)
      if (client && currentRoom) {
        try {
          console.log(`📤 Saving thread title to Matrix room account data...`);
          
          // Get existing thread titles for this room
          const existingEvent = currentRoom.getAccountData('com.nychatt.thread_titles');
          const existingData = existingEvent?.getContent() || {};
          
          console.log(`📋 Existing thread titles:`, existingData);
          
          // Update with new title
          const updatedData = {
            ...existingData,
            [thread.rootEventId]: {
              title: newTitle.trim(),
              updated_at: Date.now()
            }
          };
          
          console.log(`📤 Saving to room account data:`, updatedData);
          
          // Save to room account data - any user can do this for themselves
          await client.setRoomAccountData(
            currentRoom.roomId,
            'com.nychatt.thread_titles',
            updatedData
          );
          
          console.log(`✅ Thread title synced to Matrix room account data (per-user)`);
          
          // Verify it was saved
          setTimeout(() => {
            const verifyEvent = currentRoom.getAccountData('com.nychatt.thread_titles');
            const verifyData = verifyEvent?.getContent();
            console.log(`✔️ Verification - account data:`, verifyData);
          }, 100);
          
        } catch (error) {
          console.error('❌ Failed to sync thread title to Matrix:', error);
          console.error(error);
          // Don't fail - local update still succeeded
        }
      } else {
        console.warn('⚠️ No client or currentRoom available for Matrix sync');
      }
      
      // Trigger update
      setUpdateTrigger((prev) => prev + 1);
      
      return true;
    },
    [threadManager, selectedThread, currentRoom, client]
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
    updateThreadTitle,
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
