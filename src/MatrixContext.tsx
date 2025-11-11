import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient, MatrixClient, ClientEvent, RoomEvent, Room, IndexedDBStore, IndexedDBCryptoStore } from 'matrix-js-sdk';
import { MatrixContextType } from './types';

const MatrixContext = createContext<MatrixContextType | undefined>(undefined);

export const MatrixProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<MatrixClient | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [spaces, setSpaces] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Start as not loading (auto-restore disabled)
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationRequest, setVerificationRequest] = useState<any | null>(null);

  // Helper to separate spaces from rooms
  const updateRoomsAndSpaces = useCallback((allRooms: Room[]) => {
    const roomsList: Room[] = [];
    const spacesList: Room[] = [];
    
    allRooms.forEach((room) => {
      const createEvent = room.currentState.getStateEvents('m.room.create', '');
      const roomType = createEvent?.getContent()?.type;
      
      if (roomType === 'm.space') {
        spacesList.push(room);
      } else {
        roomsList.push(room);
      }
    });
    
    setRooms(roomsList);
    setSpaces(spacesList);
  }, []);

  // Restore session from stored credentials on mount
  useEffect(() => {
    const restoreSession = async () => {
      // TEMPORARILY DISABLED - will re-enable once stable
      console.log('Session auto-restore temporarily disabled');
      setIsLoading(false);
      return;
      
      /* DISABLED FOR NOW
      const storedHomeserver = localStorage.getItem('mx_homeserver');
      const storedAccessToken = localStorage.getItem('mx_access_token');
      const storedUserId = localStorage.getItem('mx_user_id');
      const storedDeviceId = localStorage.getItem('mx_device_id');

      if (storedHomeserver && storedAccessToken && storedUserId) {
        console.log('🔄 Restoring session from stored credentials...');
        
        // Set a timeout for session restoration
        const restoreTimeout = setTimeout(() => {
          console.warn('⏱️ Session restoration timed out, clearing loading state');
          setIsLoading(false);
        }, 15000); // 15 second timeout
        
        try {
          const slidingSyncProxy = localStorage.getItem('mx_sliding_sync_proxy') || storedHomeserver;

          // Initialize IndexedDB store
          console.log('📦 Initializing IndexedDB store...');
          const indexedDBStore = new IndexedDBStore({
            indexedDB: window.indexedDB,
            dbName: 'matrix-js-sdk:store',
            workerFactory: undefined,
          });

          await indexedDBStore.startup();
          console.log('✅ IndexedDB store ready');

          const clientConfig: any = {
            baseUrl: storedHomeserver,
            accessToken: storedAccessToken,
            userId: storedUserId,
            deviceId: storedDeviceId,
            store: indexedDBStore,
            cryptoStore: new IndexedDBCryptoStore(window.indexedDB, 'matrix-js-sdk:crypto'),
          };

          // Try sliding sync
          let restoredClient: MatrixClient;
          try {
            clientConfig.slidingSync = {
              proxyUrl: slidingSyncProxy,
            };
            restoredClient = createClient(clientConfig);
          } catch (error) {
            delete clientConfig.slidingSync;
            restoredClient = createClient(clientConfig);
          }

          // Initialize crypto
          try {
            if (!(window as any).Olm || typeof (window as any).Olm?.init !== 'function') {
              const loadOlm = () => new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = '/olm.js';
                script.onload = () => resolve(true);
                script.onerror = () => reject(new Error('Failed to load olm.js'));
                document.head.appendChild(script);
              });
              
              await loadOlm();
              
              if (typeof (window as any).Olm === 'function') {
                const OlmInstance = await (window as any).Olm();
                (window as any).Olm = OlmInstance;
              }
            }
            
            await restoredClient.initCrypto();
            console.log('✅ Crypto initialized from cache');
            
            // Allow sending to unverified devices (like Element does)
            restoredClient.setGlobalErrorOnUnknownDevices(false);
            console.log('✅ Crypto configured to allow unverified devices');
            
            restoredClient.on('crypto.verification.request' as any, (request: any) => {
              setVerificationRequest(request);
            });
          } catch (error) {
            console.error('❌ Failed to initialize crypto on restore:', error);
          }

          restoredClient.on('Session.logged_out' as any, () => {
            logout();
          });

          setClient(restoredClient);
          setIsLoggedIn(true);

          // Start client - it will load from cache first
          await restoredClient.startClient({ 
            initialSyncLimit: 20,
            lazyLoadMembers: true,
          });

          // Show cached data immediately
          const cachedRooms = restoredClient.getRooms();
          if (cachedRooms.length > 0) {
            console.log('📂 Loaded', cachedRooms.length, 'rooms from cache');
            updateRoomsAndSpaces(cachedRooms);
          }

          // Update when sync completes
          restoredClient.once(ClientEvent.Sync, async (state) => {
            if (state === 'PREPARED') {
              const allRooms = restoredClient.getRooms();
              updateRoomsAndSpaces(allRooms);
              console.log('🔄 Sync complete -', allRooms.length, 'rooms/spaces');
              
              const crypto = restoredClient.getCrypto();
              if (crypto) {
                try {
                  const crossSigningStatus = await crypto.getCrossSigningStatus();
                  if (!crossSigningStatus.publicKeysOnDevice || !crossSigningStatus.privateKeysInSecretStorage) {
                    setNeedsVerification(true);
                  } else {
                    setNeedsVerification(false);
                  }
                } catch (error) {
                  setNeedsVerification(true);
                }
              }
            }
          });

          restoredClient.on(RoomEvent.Timeline, () => {
            const updatedRooms = restoredClient.getRooms();
            updateRoomsAndSpaces(updatedRooms);
          });

          clearTimeout(restoreTimeout);
          setIsLoading(false);
          console.log('✅ Session restored successfully');
        } catch (error) {
          console.error('❌ Failed to restore session:', error);
          clearTimeout(restoreTimeout);
          // Clear invalid session
          localStorage.removeItem('mx_homeserver');
          localStorage.removeItem('mx_access_token');
          localStorage.removeItem('mx_user_id');
          localStorage.removeItem('mx_device_id');
          setIsLoading(false);
        }
      } else {
        console.log('No stored session found');
        setIsLoading(false);
      }
      */
    };

    restoreSession();
  }, [updateRoomsAndSpaces]);

  const login = async (homeserver: string, username: string, password: string) => {
    console.log('🔑 Starting login process...');
    setIsLoading(true);
    
    // If there's an existing client, stop it first
    if (client) {
      console.log('🛑 Stopping existing client before new login...');
      try {
        client.stopClient();
      } catch (e) {
        console.warn('Error stopping existing client:', e);
      }
      setClient(null);
      setIsLoggedIn(false);
    }
    
    try {
      const matrixClient = createClient({ baseUrl: homeserver });
      
      // Prepare username - Matrix accepts different formats
      let identifier;
      if (username.startsWith('@')) {
        // Full Matrix ID format: @user:homeserver.com
        identifier = {
          type: 'm.id.user',
          user: username
        };
      } else {
        // Just username - let the server figure it out
        identifier = {
          type: 'm.id.user',
          user: username
        };
      }

      const response = await matrixClient.login('m.login.password', {
        identifier: identifier,
        password: password,
      });

      // Generate or retrieve device ID for this session
      let deviceId = localStorage.getItem('mx_device_id');
      if (!deviceId && response.device_id) {
        deviceId = response.device_id;
        localStorage.setItem('mx_device_id', deviceId);
      }
      
      // Try sliding sync proxy from storage, or default to homeserver
      const slidingSyncProxy = localStorage.getItem('mx_sliding_sync_proxy') || homeserver;

      const clientConfig: any = {
        baseUrl: homeserver,
        accessToken: response.access_token,
        userId: response.user_id,
        deviceId: deviceId,
      };

      // Try to initialize IndexedDB store for caching (optional - will work without it)
      try {
        console.log('📦 Initializing IndexedDB store for caching...');
        const indexedDBStore = new IndexedDBStore({
          indexedDB: window.indexedDB,
          dbName: 'matrix-js-sdk:store',
          workerFactory: undefined,
        });

        await indexedDBStore.startup();
        console.log('✅ IndexedDB store initialized');
        
        clientConfig.store = indexedDBStore;
        clientConfig.cryptoStore = new IndexedDBCryptoStore(window.indexedDB, 'matrix-js-sdk:crypto');
      } catch (storeError) {
        console.warn('⚠️ Failed to initialize IndexedDB store, continuing without caching:', storeError);
        // Login will still work without the store
      }

      // Try sliding sync first
      let loggedInClient: MatrixClient;
      try {
        console.log('Attempting Sliding Sync with:', slidingSyncProxy);
        clientConfig.slidingSync = {
          proxyUrl: slidingSyncProxy,
        };
        loggedInClient = createClient(clientConfig);
      } catch (error) {
        console.log('Sliding Sync not available, falling back to traditional sync');
        delete clientConfig.slidingSync;
        loggedInClient = createClient(clientConfig);
      }
      
      // Initialize crypto - this is required for E2EE
      try {
        // Check if Olm is already loaded and properly initialized
        if (!(window as any).Olm || typeof (window as any).Olm?.init !== 'function') {
          // Load Olm from public directory (copied by postinstall script)
          const loadOlm = () => new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/olm.js';
            script.onload = () => {
              console.log('olm.js script loaded');
              console.log('window.Olm after load:', (window as any).Olm);
              console.log('typeof window.Olm:', typeof (window as any).Olm);
              resolve(true);
            };
            script.onerror = () => reject(new Error('Failed to load olm.js'));
            document.head.appendChild(script);
          });
          
          await loadOlm();
          
          // olm.js defines a global Olm function, call it to initialize
          if (typeof (window as any).Olm === 'function') {
            console.log('Calling Olm() to initialize...');
            const OlmInstance = await (window as any).Olm();
            console.log('OlmInstance:', OlmInstance);
            (window as any).Olm = OlmInstance;
            console.log('Olm loaded and initialized from /olm.js');
          } else {
            console.error('Olm script loaded but window.Olm is not a function');
            console.error('typeof window.Olm:', typeof (window as any).Olm);
            console.error('window.Olm value:', (window as any).Olm);
          }
        }
        
        // Verify Olm is properly loaded
        console.log('Final window.Olm:', (window as any).Olm);
        console.log('Final window.Olm.init:', (window as any).Olm?.init);
        
        await loggedInClient.initCrypto();
        console.log('✅ Crypto initialized successfully');
        
        // Allow sending to unverified devices (like Element does)
        loggedInClient.setGlobalErrorOnUnknownDevices(false);
        console.log('✅ Crypto configured to allow unverified devices');
        
        // Listen for verification requests
        loggedInClient.on('crypto.verification.request' as any, (request: any) => {
          console.log('🔐 Verification request received:', request);
          setVerificationRequest(request);
        });
      } catch (error) {
        console.error('❌ Failed to initialize crypto:', error);
        console.error('Error details:', error);
      }
      
      // Listen for session invalidation (e.g., force logout from another client)
      loggedInClient.on('Session.logged_out' as any, () => {
        console.log('⚠️ Session invalidated - logging out');
        logout();
      });

      // Store credentials
      localStorage.setItem('mx_homeserver', homeserver);
      localStorage.setItem('mx_access_token', response.access_token);
      localStorage.setItem('mx_user_id', response.user_id);

      setClient(loggedInClient);
      setIsLoggedIn(true); // Set logged in immediately
      
      // Start the client with enhanced sync options
      await loggedInClient.startClient({ 
        initialSyncLimit: 20, // Load more initial messages
        lazyLoadMembers: true, // Lazy load room members for better performance
      });
      
      // Update rooms when sync completes
      loggedInClient.once(ClientEvent.Sync, async (state) => {
        if (state === 'PREPARED') {
          const allRooms = loggedInClient.getRooms();
          updateRoomsAndSpaces(allRooms);
          console.log('Sync complete - loaded', allRooms.length, 'rooms/spaces');
          
          // Check if we need to set up cross-signing
          const crypto = loggedInClient.getCrypto();
          console.log('Crypto object available?', !!crypto);
          if (crypto) {
            try {
              const crossSigningStatus = await crypto.getCrossSigningStatus();
              console.log('Cross-signing status:', JSON.stringify(crossSigningStatus, null, 2));
              
              // If cross-signing is not set up, we need verification
              if (!crossSigningStatus.publicKeysOnDevice || !crossSigningStatus.privateKeysInSecretStorage) {
                console.warn('Cross-signing not fully set up - verification needed');
                setNeedsVerification(true);
              } else {
                console.log('Cross-signing is fully set up');
                setNeedsVerification(false);
              }
            } catch (error) {
              console.error('Error checking cross-signing status:', error);
              // Assume we need verification if we can't check
              setNeedsVerification(true);
            }
          } else {
            console.warn('Crypto not available - assuming verification needed');
            setNeedsVerification(true);
          }
        }
      });

      // Listen for room updates
      loggedInClient.on(RoomEvent.Timeline, () => {
        const updatedRooms = loggedInClient.getRooms();
        updateRoomsAndSpaces(updatedRooms);
      });

    } catch (error: any) {
      console.error('Login failed:', error);
      // Provide more detailed error information
      if (error.data) {
        console.error('Error details:', error.data);
      }
      if (error.httpStatus) {
        console.error('HTTP Status:', error.httpStatus);
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (client) {
      try {
        // Try to logout from the server, but don't fail if it doesn't work
        await client.logout();
      } catch (error: any) {
        // If logout fails (e.g., session already invalidated), that's okay
        console.log('Logout API call failed (session may already be invalidated):', error.message);
      }
      
      // Always clean up local state regardless of API success
      try {
        client.stopClient();
      } catch (error) {
        console.log('Error stopping client:', error);
      }
      
      // Clear crypto stores from IndexedDB
      try {
        const userId = client.getUserId();
        console.log('Clearing crypto stores for user:', userId);
        
        // Delete all Matrix-related IndexedDB databases
        const dbNames = [
          'matrix-js-sdk:crypto',
          'matrix-js-sdk:riot-web-sync',
          `matrix-js-sdk:crypto:${userId}`,
        ];
        
        for (const dbName of dbNames) {
          try {
            await new Promise<void>((resolve, reject) => {
              const deleteRequest = indexedDB.deleteDatabase(dbName);
              deleteRequest.onsuccess = () => {
                console.log(`✅ Deleted IndexedDB: ${dbName}`);
                resolve();
              };
              deleteRequest.onerror = () => {
                console.warn(`⚠️ Could not delete IndexedDB: ${dbName}`);
                resolve(); // Don't fail logout if DB deletion fails
              };
              deleteRequest.onblocked = () => {
                console.warn(`⚠️ IndexedDB deletion blocked: ${dbName}`);
                resolve(); // Don't fail logout if DB deletion is blocked
              };
            });
          } catch (error) {
            console.warn(`Error deleting ${dbName}:`, error);
          }
        }
      } catch (error) {
        console.warn('Error clearing crypto stores:', error);
      }
      
      setClient(null);
      setIsLoggedIn(false);
      setCurrentRoom(null);
      setRooms([]);
      setSpaces([]);
      setNeedsVerification(false);
      setVerificationRequest(null);
      localStorage.removeItem('mx_homeserver');
      localStorage.removeItem('mx_access_token');
      localStorage.removeItem('mx_user_id');
      localStorage.removeItem('mx_device_id');
      localStorage.removeItem('mx_sliding_sync_proxy');
    }
  };

  const sendMessage = async (roomId: string, message: string) => {
    if (!client) return;
    
    // Convert @mentions to Matrix.to links for proper protocol support
    const room = client.getRoom(roomId);
    let processedBody = message;
    let processedHtml = message.replace(/\n/g, '<br/>');
    
    if (room) {
      const members = room.getJoinedMembers();
      
      // Match @username patterns
      const mentionRegex = /@([a-zA-Z0-9.\-_\s]+?)(?=\s|$|[.,!?;:])/g;
      let match;
      const replacements: Array<{ original: string; userId: string; displayName: string }> = [];
      
      while ((match = mentionRegex.exec(message)) !== null) {
        const mentionedName = match[1];
        
        // Find the user in the room
        const mentionedUser = members.find(member => 
          member.name === mentionedName || 
          member.userId === `@${mentionedName}` ||
          member.userId.toLowerCase().includes(mentionedName.toLowerCase())
        );
        
        if (mentionedUser) {
          replacements.push({
            original: match[0],
            userId: mentionedUser.userId,
            displayName: mentionedName
          });
        }
      }
      
      // Replace in body with Matrix.to links
      for (const replacement of replacements) {
        const matrixToLink = `https://matrix.to/#/${replacement.userId}`;
        processedBody = processedBody.replace(
          replacement.original,
          matrixToLink
        );
      }
      
      // Replace in HTML with proper links
      for (const replacement of replacements) {
        const htmlLink = `<a href="https://matrix.to/#/${replacement.userId}">@${replacement.displayName}</a>`;
        const escapedOriginal = replacement.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        processedHtml = processedHtml.replace(
          new RegExp(escapedOriginal, 'g'),
          htmlLink
        );
      }
    }
    
    const content = {
      body: processedBody,
      msgtype: 'm.text',
      format: 'org.matrix.custom.html',
      formatted_body: processedHtml,
    };

    await client.sendEvent(roomId, 'm.room.message', content);
  };

  const sendReaction = async (roomId: string, eventId: string, emoji: string) => {
    if (!client) return;
    
    await client.sendEvent(roomId, 'm.reaction', {
      'm.relates_to': {
        rel_type: 'm.annotation',
        event_id: eventId,
        key: emoji,
      },
    });
  };

  const deleteMessage = async (roomId: string, eventId: string) => {
    if (!client) return;
    
    try {
      console.log('🗑️ Deleting message:', eventId);
      await client.redactEvent(roomId, eventId);
      console.log('✅ Message deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete message:', error);
      throw error;
    }
  };

  const loadMoreHistory = async (room: Room): Promise<boolean> => {
    if (!client) return false;
    
    try {
      // Paginate the timeline to load older messages
      const result = await client.scrollback(room, 50);
      return result; // Returns true if there are more messages to load
    } catch (error) {
      console.error('Failed to load more history:', error);
      return false;
    }
  };

  const acceptVerification = async () => {
    if (!verificationRequest) {
      console.error('❌ No verification request to accept');
      return;
    }
    
    try {
      console.log('🔐 Accepting verification request...');
      const verifier = verificationRequest.beginKeyVerification('m.sas.v1');
      
      // Wait for the verification to start
      verifier.on('show_sas' as any, (e: any) => {
        console.log('🔐 SAS emojis:', e.sas.emoji);
        // The emojis are shown in the modal component
      });
      
      await verifier.verify();
      console.log('✅ Verification accepted');
    } catch (error: any) {
      console.error('❌ Error accepting verification:', error);
      alert(`Verification failed: ${error.message || 'Unknown error'}`);
    }
  };

  const cancelVerification = () => {
    if (verificationRequest) {
      verificationRequest.cancel();
      setVerificationRequest(null);
      console.log('❌ Verification cancelled');
    }
  };

  const startVerification = async () => {
    if (!client) {
      console.error('❌ No client available');
      return;
    }

    try {
      const crypto = client.getCrypto();
      if (!crypto) {
        console.error('❌ Crypto not available');
        alert('Encryption not initialized');
        return;
      }

      const userId = client.getUserId();
      const deviceId = client.getDeviceId();
      if (!userId) {
        console.error('❌ No user ID');
        return;
      }

      console.log('🔐 Current device:', deviceId);
      console.log('🔐 Requesting verification with other devices...');
      
      // Get list of other devices to verify we have more than just this one
      const devices = await crypto.getUserDeviceInfo([userId]);
      const userDevices = devices.get(userId);
      const otherDevices = Array.from(userDevices?.keys() || []).filter(id => id !== deviceId);
      
      console.log('📱 Other devices:', otherDevices);
      
      if (otherDevices.length === 0) {
        alert('No other devices found to verify with. Please log in with another client (like Element) first.');
        return;
      }
      
      // Request verification with the user (SDK will automatically exclude this device)
      const request = await crypto.requestOwnUserVerification();
      console.log('✅ Verification request sent:', request);
      
      // The verification request will be picked up by the listener we already have
      setVerificationRequest(request);
    } catch (error: any) {
      console.error('❌ Error starting verification:', error);
      alert(`Failed to start verification: ${error.message || 'Unknown error'}`);
    }
  };

  // Try to restore session on mount
  useEffect(() => {
    let mounted = true;
    
    const restoreSession = async () => {
      const homeserver = localStorage.getItem('mx_homeserver');
      const accessToken = localStorage.getItem('mx_access_token');
      const userId = localStorage.getItem('mx_user_id');

      if (homeserver && accessToken && userId && mounted) {
        setIsLoading(true);
        try {
          // Get device ID from storage
          const deviceId = localStorage.getItem('mx_device_id');
          
          // Try sliding sync proxy from storage, or default to homeserver
          const slidingSyncProxy = localStorage.getItem('mx_sliding_sync_proxy') || homeserver;
          
          const clientConfig: any = {
            baseUrl: homeserver,
            accessToken: accessToken,
            userId: userId,
            deviceId: deviceId || undefined,
          };

          // Try sliding sync first
          let restoredClient: MatrixClient;
          try {
            console.log('Attempting Sliding Sync with:', slidingSyncProxy);
            clientConfig.slidingSync = {
              proxyUrl: slidingSyncProxy,
            };
            restoredClient = createClient(clientConfig);
          } catch (error) {
            console.log('Sliding Sync not available, falling back to traditional sync');
            delete clientConfig.slidingSync;
            restoredClient = createClient(clientConfig);
          }
          
          // Initialize crypto - this is required for E2EE
          try {
            // Check if Olm is already loaded
            if (!(window as any).Olm) {
              // Load Olm from public directory (copied by postinstall script)
              const loadOlm = () => new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = '/olm.js';
                script.onload = () => resolve(true);
                script.onerror = () => reject(new Error('Failed to load olm.js'));
                document.head.appendChild(script);
              });
              
              await loadOlm();
              
              // olm.js defines a global Olm function, call it to initialize
              if (typeof (window as any).Olm === 'function') {
                const OlmInstance = await (window as any).Olm();
                (window as any).Olm = OlmInstance;
                console.log('Olm loaded and initialized from /olm.js [restored]');
              } else {
                console.error('Olm script loaded but Olm function not found [restored]');
              }
            }
            
            // Verify Olm is properly loaded
            console.log('window.Olm [restored]:', (window as any).Olm);
            console.log('window.Olm.init [restored]:', (window as any).Olm?.init);
            
            await restoredClient.initCrypto();
            console.log('✅ Crypto initialized successfully (restored session)');
            
            // Allow sending to unverified devices (like Element does)
            restoredClient.setGlobalErrorOnUnknownDevices(false);
            console.log('✅ Crypto configured to allow unverified devices');
            
            // Listen for verification requests
            restoredClient.on('crypto.verification.request' as any, (request: any) => {
              console.log('🔐 Verification request received:', request);
              setVerificationRequest(request);
            });
          } catch (error) {
            console.error('❌ Failed to initialize crypto (restored session):', error);
            console.error('Error details:', error);
          }
          
          // Listen for session invalidation (e.g., force logout from another client)
          restoredClient.on('Session.logged_out' as any, () => {
            console.log('⚠️ Session invalidated - logging out');
            logout();
          });

          if (!mounted) return;

          setClient(restoredClient);
          setIsLoggedIn(true); // Set logged in immediately
          await restoredClient.startClient({ 
            initialSyncLimit: 20, // Load more initial messages
            lazyLoadMembers: true, // Lazy load room members for better performance
          });

          if (!mounted) {
            restoredClient.stopClient();
            return;
          }

          restoredClient.once(ClientEvent.Sync, async (state) => {
            if (state === 'PREPARED' && mounted) {
              const allRooms = restoredClient.getRooms();
              updateRoomsAndSpaces(allRooms);
              console.log('Session restored - loaded', allRooms.length, 'rooms/spaces');
              
              // Check if we need to set up cross-signing
              const crypto = restoredClient.getCrypto();
              console.log('Restored - Crypto object available?', !!crypto);
              if (crypto && mounted) {
                try {
                  const crossSigningStatus = await crypto.getCrossSigningStatus();
                  console.log('Restored - Cross-signing status:', JSON.stringify(crossSigningStatus, null, 2));
                  
                  // If cross-signing is not set up, we need verification
                  if (!crossSigningStatus.publicKeysOnDevice || !crossSigningStatus.privateKeysInSecretStorage) {
                    console.warn('Restored - Cross-signing not fully set up - verification needed');
                    setNeedsVerification(true);
                  } else {
                    console.log('Restored - Cross-signing is fully set up');
                    setNeedsVerification(false);
                  }
                } catch (error) {
                  console.error('Restored - Error checking cross-signing status:', error);
                  // Assume we need verification if we can't check
                  setNeedsVerification(true);
                }
              } else if (!crypto && mounted) {
                console.warn('Restored - Crypto not available - assuming verification needed');
                setNeedsVerification(true);
              }
            }
          });

          restoredClient.on(RoomEvent.Timeline, () => {
            if (mounted) {
              const updatedRooms = restoredClient.getRooms();
              updateRoomsAndSpaces(updatedRooms);
            }
          });

        } catch (error) {
          console.error('Failed to restore session:', error);
          if (mounted) {
            localStorage.clear();
          }
        } finally {
          if (mounted) {
            setIsLoading(false);
          }
        }
      }
    };

    restoreSession();
    
    return () => {
      mounted = false;
    };
  }, [updateRoomsAndSpaces]);

  const value: MatrixContextType = {
    client,
    isLoggedIn,
    login,
    logout,
    currentRoom,
    setCurrentRoom,
    rooms,
    spaces,
    sendMessage,
    sendReaction,
    deleteMessage,
    loadMoreHistory,
    needsVerification,
    verificationRequest,
    acceptVerification,
    cancelVerification,
    startVerification,
    isLoading,
  };

  return <MatrixContext.Provider value={value}>{children}</MatrixContext.Provider>;
};

export const useMatrix = () => {
  const context = useContext(MatrixContext);
  if (context === undefined) {
    throw new Error('useMatrix must be used within a MatrixProvider');
  }
  return context;
};

