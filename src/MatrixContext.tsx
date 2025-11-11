import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient, MatrixClient, ClientEvent, RoomEvent, Room } from 'matrix-js-sdk';
import { MatrixContextType } from './types';

const MatrixContext = createContext<MatrixContextType | undefined>(undefined);

export const MatrixProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<MatrixClient | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [spaces, setSpaces] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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

  const login = async (homeserver: string, username: string, password: string) => {
    setIsLoading(true);
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
        // Check if Olm is already loaded
        if (!(window as any).Olm) {
          // Load Olm library dynamically
          const olmLib = await import('@matrix-org/olm');
          
          console.log('olmLib:', olmLib);
          console.log('olmLib.default:', olmLib.default);
          console.log('olmLib keys:', Object.keys(olmLib));
          
          // The Olm library is a function that returns a promise
          let Olm;
          if (typeof olmLib.default === 'function') {
            // Call the function and await the result
            Olm = await olmLib.default();
            console.log('Olm loaded (pattern 1 - function call)');
          } else if (typeof olmLib === 'function') {
            // Sometimes it's the module itself that's the function
            Olm = await (olmLib as any)();
            console.log('Olm loaded (pattern 2 - module function)');
          } else {
            // Use default if it exists
            Olm = olmLib.default || olmLib;
            console.log('Olm loaded (pattern 3 - direct)');
          }
          
          (window as any).Olm = Olm;
        }
        
        // Verify Olm is properly loaded
        console.log('window.Olm:', (window as any).Olm);
        console.log('window.Olm type:', typeof (window as any).Olm);
        console.log('window.Olm.init exists?', !!(window as any).Olm?.init);
        
        await loggedInClient.initCrypto();
        console.log('✅ Crypto initialized successfully');
        
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
    
    const content = {
      body: message,
      msgtype: 'm.text',
      format: 'org.matrix.custom.html',
      formatted_body: message.replace(/\n/g, '<br/>'),
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
              // Load Olm library dynamically
              const olmLib = await import('@matrix-org/olm');
              
              // Try different import patterns
              if (typeof olmLib.default === 'function') {
                // Pattern 1: default export is init function
                const Olm = await olmLib.default();
                (window as any).Olm = Olm;
                console.log('Olm loaded (pattern 1 - function) [restored]');
              } else if (olmLib.default?.init) {
                // Pattern 2: default export has init method
                await olmLib.default.init();
                (window as any).Olm = olmLib.default;
                console.log('Olm loaded (pattern 2 - init method) [restored]');
              } else {
                // Pattern 3: default export is Olm itself
                (window as any).Olm = olmLib.default;
                console.log('Olm loaded (pattern 3 - direct) [restored]');
              }
            }
            
            // Verify Olm is properly loaded
            console.log('window.Olm [restored]:', (window as any).Olm);
            console.log('window.Olm type [restored]:', typeof (window as any).Olm);
            
            await restoredClient.initCrypto();
            console.log('✅ Crypto initialized successfully (restored session)');
            
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
    loadMoreHistory,
    needsVerification,
    verificationRequest,
    acceptVerification,
    cancelVerification,
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

