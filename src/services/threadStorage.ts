import { Thread, ThreadMessage } from '../types/thread';

/**
 * ThreadStorage handles persistence of threads to IndexedDB
 * Allows threads to survive page reloads
 */
export class ThreadStorage {
  private dbName = 'NyChattThreads';
  private storeName = 'threads';
  private version = 1;
  private db: IDBDatabase | null = null;

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ ThreadStorage initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('roomId', 'roomId', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          console.log('✅ ThreadStorage schema created');
        }
      };
    });
  }

  /**
   * Save a thread to IndexedDB
   */
  async saveThread(thread: Thread): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      // Convert Sets to Arrays for storage
      const threadData = {
        ...thread,
        participants: Array.from(thread.participants),
        relatedThreadIds: Array.from(thread.relatedThreadIds),
        messages: Array.from(thread.messages.entries()),
        branches: Array.from(thread.branches.entries()),
      };

      const request = store.put(threadData);

      request.onerror = () => {
        console.error('Failed to save thread:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log(`✅ Thread saved: ${thread.id}`);
        resolve();
      };
    });
  }

  /**
   * Load a thread from IndexedDB
   */
  async loadThread(threadId: string): Promise<Thread | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(threadId);

      request.onerror = () => {
        console.error('Failed to load thread:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const threadData = request.result;
        if (!threadData) {
          resolve(null);
          return;
        }

        // Convert Arrays back to Sets
        const thread: Thread = {
          ...threadData,
          participants: new Set(threadData.participants),
          relatedThreadIds: new Set(threadData.relatedThreadIds),
          messages: new Map(threadData.messages),
          branches: new Map(threadData.branches),
        };

        console.log(`✅ Thread loaded: ${threadId}`);
        resolve(thread);
      };
    });
  }

  /**
   * Load all threads for a room
   */
  async loadThreadsForRoom(roomId: string): Promise<Thread[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('roomId');
      const request = index.getAll(roomId);

      request.onerror = () => {
        console.error('Failed to load threads:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const threadsData = request.result;
        const threads: Thread[] = threadsData.map((threadData) => ({
          ...threadData,
          participants: new Set(threadData.participants),
          relatedThreadIds: new Set(threadData.relatedThreadIds),
          messages: new Map(threadData.messages),
          branches: new Map(threadData.branches),
        }));

        console.log(`✅ Loaded ${threads.length} threads for room ${roomId}`);
        resolve(threads);
      };
    });
  }

  /**
   * Load all threads
   */
  async loadAllThreads(): Promise<Thread[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => {
        console.error('Failed to load all threads:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const threadsData = request.result;
        const threads: Thread[] = threadsData.map((threadData) => ({
          ...threadData,
          participants: new Set(threadData.participants),
          relatedThreadIds: new Set(threadData.relatedThreadIds),
          messages: new Map(threadData.messages),
          branches: new Map(threadData.branches),
        }));

        console.log(`✅ Loaded ${threads.length} total threads`);
        resolve(threads);
      };
    });
  }

  /**
   * Delete a thread
   */
  async deleteThread(threadId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(threadId);

      request.onerror = () => {
        console.error('Failed to delete thread:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log(`✅ Thread deleted: ${threadId}`);
        resolve();
      };
    });
  }

  /**
   * Clear all threads
   */
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => {
        console.error('Failed to clear threads:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log('✅ All threads cleared');
        resolve();
      };
    });
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{ threadCount: number; totalMessages: number }> {
    if (!this.db) await this.init();

    const threads = await this.loadAllThreads();
    const totalMessages = threads.reduce((sum, t) => sum + t.messages.size, 0);

    return {
      threadCount: threads.length,
      totalMessages,
    };
  }
}
