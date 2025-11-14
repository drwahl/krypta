import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient, MatrixClient, ClientEvent, RoomEvent, Room, IndexedDBStore, IndexedDBCryptoStore, MatrixEvent } from 'matrix-js-sdk';
import { MatrixContextType, ThemeDefinition, ThemeServerDefault } from './types';
import { Theme } from './themeTypes';

const MatrixContext = createContext<MatrixContextType | undefined>(undefined);

const THEME_DEFAULT_EVENT = 'com.krypta.theme.default';
const THEME_DEFINITION_EVENT = 'com.krypta.theme.definition';

const extractThemeFromContent = (content: any, fallbackName: string): Theme | null => {
  if (!content || typeof content !== 'object') return null;

  const colors = content.colors;
  const fonts = content.fonts;
  const spacing = content.spacing;
  const sizing = content.sizing;
  const style = content.style;

  if (!colors || !fonts || !spacing || !sizing || !style) {
    return null;
  }

  const name = typeof content.name === 'string' ? content.name : fallbackName;
  const displayName = typeof content.displayName === 'string' ? content.displayName : name;

  return {
    name,
    displayName,
    colors: { ...colors },
    fonts: { ...fonts },
    spacing: { ...spacing },
    sizing: { ...sizing },
    style: { ...style },
  };
};

export const MatrixProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<MatrixClient | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentRoom, setCurrentRoomState] = useState<Room | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [spaces, setSpaces] = useState<Room[]>([]);
  const [invites, setInvites] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Start as not loading (auto-restore disabled)
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationRequest, setVerificationRequest] = useState<any | null>(null);
  const [roomThemeDefaults, setRoomThemeDefaults] = useState<Record<string, ThemeServerDefault>>({});
  const [spaceThemeDefaults, setSpaceThemeDefaults] = useState<Record<string, ThemeServerDefault>>({});
  const [themeDefinitions, setThemeDefinitions] = useState<Record<string, Record<string, ThemeDefinition>>>({});
  const isLoggingOutRef = useRef(false); // Track if we're already logging out to prevent duplicate alerts
  
  // Track which rooms are allowed to send to unverified devices
  const [allowUnverifiedDevices, setAllowUnverifiedDevices] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem('krypta_allow_unverified_devices');
    return stored ? JSON.parse(stored) : {};
  });

  // Wrapper for setCurrentRoom that also persists to localStorage
  const setCurrentRoom = useCallback((room: Room | null) => {
    setCurrentRoomState(room);
    if (room) {
      localStorage.setItem('krypta_last_room_id', room.roomId);
      console.log(`💾 Saved last room: ${room.name} (${room.roomId})`);
    } else {
      localStorage.removeItem('krypta_last_room_id');
    }
  }, []);

  // Helper to separate spaces from rooms and invites
  const updateRoomsAndSpaces = useCallback((allRooms: Room[]) => {
    const roomsList: Room[] = [];
    const spacesList: Room[] = [];
    const invitesList: Room[] = [];
    const newRoomDefaults: Record<string, ThemeServerDefault> = {};
    const newSpaceDefaults: Record<string, ThemeServerDefault> = {};
    const newDefinitions: Record<string, Record<string, ThemeDefinition>> = {};
    
    allRooms.forEach((room) => {
      // Check if this is an invite
      const myMembership = room.getMyMembership();
      if (myMembership === 'invite') {
        invitesList.push(room);
        return;
      }
      
      const createEvent = room.currentState.getStateEvents('m.room.create', '');
      const roomType = createEvent?.getContent()?.type;
      const isSpace = roomType === 'm.space';
      
      if (isSpace) {
        spacesList.push(room);
      } else {
        roomsList.push(room);
      }

      const defaultEvent = room.currentState.getStateEvents(THEME_DEFAULT_EVENT as any, '') as MatrixEvent | undefined;
      if (defaultEvent) {
        const content = defaultEvent.getContent();
        if (content && typeof content.themeId === 'string') {
          const entry: ThemeServerDefault = {
            themeId: content.themeId,
            applyToNewUsers: content.applyToNewUsers !== false,
            updatedAt: typeof content.updatedAt === 'number' ? content.updatedAt : defaultEvent.getTs(),
            updatedBy: typeof content.updatedBy === 'string' ? content.updatedBy : defaultEvent.getSender() ?? undefined,
          };
          if (isSpace) {
            newSpaceDefaults[room.roomId] = entry;
          } else {
            newRoomDefaults[room.roomId] = entry;
          }
        }
      }

      const definitionEvents = room.currentState.getStateEvents(THEME_DEFINITION_EVENT as any) as MatrixEvent[] | undefined;
      if (Array.isArray(definitionEvents)) {
        definitionEvents.forEach((event) => {
          const content = event.getContent();
          const stateKey = event.getStateKey() || '';
          const themeId = stateKey || (typeof content?.name === 'string' ? content.name : '');
          if (!themeId) return;
          const theme = extractThemeFromContent(content, themeId);
          if (!theme) return;
          theme.name = themeId;
          const definition: ThemeDefinition = {
            theme,
            description: typeof content?.description === 'string' ? content.description : undefined,
            origin: isSpace ? 'space' : 'room',
            roomId: room.roomId,
            stateKey: themeId,
            updatedAt: typeof content?.updatedAt === 'number' ? content.updatedAt : event.getTs(),
            updatedBy: typeof content?.updatedBy === 'string' ? content.updatedBy : event.getSender() ?? undefined,
          };
          if (!newDefinitions[room.roomId]) {
            newDefinitions[room.roomId] = {};
          }
          newDefinitions[room.roomId][themeId] = definition;
        });
      }
    });
    
    // Only update if arrays actually changed (to prevent unnecessary re-renders)
    setRooms(prev => {
      if (prev.length !== roomsList.length) return roomsList;
      // Check if all rooms are the exact same object references
      if (prev.every((room, i) => room === roomsList[i])) return prev;
      return roomsList;
    });
    setSpaces(prev => {
      if (prev.length !== spacesList.length) return spacesList;
      // Check if all spaces are the exact same object references
      if (prev.every((space, i) => space === spacesList[i])) return prev;
      return spacesList;
    });
    setInvites(prev => {
      if (prev.length !== invitesList.length) return invitesList;
      // Check if all invites are the exact same object references
      if (prev.every((invite, i) => invite === invitesList[i])) return prev;
      return invitesList;
    });
    // Only update theme data if it actually changed
    setRoomThemeDefaults(prev => {
      const prevKeys = Object.keys(prev).sort();
      const newKeys = Object.keys(newRoomDefaults).sort();
      if (prevKeys.length !== newKeys.length || !prevKeys.every((k, i) => k === newKeys[i])) {
        return newRoomDefaults;
      }
      return prev;
    });
    setSpaceThemeDefaults(prev => {
      const prevKeys = Object.keys(prev).sort();
      const newKeys = Object.keys(newSpaceDefaults).sort();
      if (prevKeys.length !== newKeys.length || !prevKeys.every((k, i) => k === newKeys[i])) {
        return newSpaceDefaults;
      }
      return prev;
    });
    setThemeDefinitions(prev => {
      const prevKeys = Object.keys(prev).sort();
      const newKeys = Object.keys(newDefinitions).sort();
      if (prevKeys.length !== newKeys.length || !prevKeys.every((k, i) => k === newKeys[i])) {
        return newDefinitions;
      }
      return prev;
    });
    
      // Restore last open room if no room is currently selected
      if (!currentRoom && roomsList.length > 0) {
        const lastRoomId = localStorage.getItem('krypta_last_room_id');
        if (lastRoomId) {
          const lastRoom = allRooms.find(r => r.roomId === lastRoomId);
          if (lastRoom) {
            console.log(`🔄 Restoring last room: ${lastRoom.name} (${lastRoomId})`);
            setCurrentRoomState(lastRoom);
          } else {
            console.log(`⚠️ Last room ${lastRoomId} not found, clearing saved ID`);
            localStorage.removeItem('krypta_last_room_id');
          }
        }
      }
  }, [currentRoom]);

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
            
            // Allow sending to unverified devices (we'll handle the check manually)
            restoredClient.setGlobalErrorOnUnknownDevices(false);
            console.log('🔐 Configured to allow unverified devices (manual check)');
            
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

          const handleRestoredRoomUpdate = () => {
            const updatedRooms = restoredClient.getRooms();
            updateRoomsAndSpaces(updatedRooms);
          };
          
          restoredClient.on(RoomEvent.Timeline, handleRestoredRoomUpdate);
          restoredClient.on(RoomEvent.State, handleRestoredRoomUpdate);

          clearTimeout(restoreTimeout);
          setIsLoading(false);
          console.log('✅ Session restored successfully');
        } catch (error) {
          console.error('❌ Failed to restore session:', error);
          clearTimeout(restoreTimeout);
          // Clear invalid session (keep homeserver for convenience)
          // localStorage.removeItem('mx_homeserver');
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
  }, []); // Only run once on mount (currently disabled anyway)

  // Helper function to discover sliding sync proxy from .well-known
  const discoverSlidingSyncProxy = async (homeserver: string): Promise<string | null> => {
    try {
      // Try to fetch .well-known/matrix/client
      const wellKnownUrl = new URL('/.well-known/matrix/client', homeserver).toString();
      console.log('🔍 Checking for sliding sync proxy at:', wellKnownUrl);
      
      const response = await fetch(wellKnownUrl);
      if (!response.ok) {
        console.log('ℹ️ No .well-known found, will use homeserver directly');
        return null;
      }
      
      const wellKnown = await response.json();
      console.log('📋 .well-known data:', wellKnown);
      
      // Check for sliding sync proxy URL in .well-known
      // The spec uses org.matrix.msc3575.proxy for sliding sync
      const slidingSyncUrl = wellKnown['org.matrix.msc3575.proxy']?.url;
      
      if (slidingSyncUrl) {
        console.log('✅ Found sliding sync proxy:', slidingSyncUrl);
        return slidingSyncUrl;
      } else {
        console.log('ℹ️ No sliding sync proxy in .well-known');
        return null;
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch .well-known:', error);
      return null;
    }
  };

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
      
      // Auto-discover sliding sync proxy from .well-known
      const discoveredProxy = await discoverSlidingSyncProxy(homeserver);
      const slidingSyncProxy = discoveredProxy || homeserver;
      
      // Store the discovered proxy for session restoration
      if (discoveredProxy) {
        localStorage.setItem('mx_sliding_sync_proxy', discoveredProxy);
      } else {
        localStorage.removeItem('mx_sliding_sync_proxy');
      }

      const clientConfig: any = {
        baseUrl: homeserver,
        accessToken: response.access_token,
        userId: response.user_id,
        deviceId: deviceId,
      };

      // Create IndexedDB stores for caching and crypto (v34 legacy crypto)
      console.log('📦 Creating IndexedDB stores...');
      const indexedDBStore = new IndexedDBStore({
        indexedDB: window.indexedDB,
        dbName: 'matrix-js-sdk:store',
        workerFactory: undefined,
      });
      const cryptoStore = new IndexedDBCryptoStore(window.indexedDB, 'matrix-js-sdk:crypto');
      
      clientConfig.store = indexedDBStore;
      clientConfig.cryptoStore = cryptoStore;

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
      
      // NOW initialize the store after it's been assigned to the client
      try {
        await indexedDBStore.startup();
        console.log('✅ IndexedDB store initialized');
      } catch (storeError) {
        console.warn('⚠️ Failed to initialize IndexedDB store, continuing anyway:', storeError);
        // Crypto should still work even if store initialization fails
      }
      
      // Initialize crypto - this is required for E2EE (v34 legacy crypto)
      try {
        // Check if Olm is already loaded
        const olmExists = (window as any).Olm;
        const olmIsInitialized = olmExists && typeof olmExists.init === 'function';
        
        if (!olmIsInitialized) {
          console.log('📦 Loading Olm library...');
          
          // Load Olm from public directory (copied by postinstall script)
          const loadOlm = () => new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/olm.js';
            script.onload = () => {
              console.log('✅ olm.js script loaded');
              resolve(true);
            };
            script.onerror = () => reject(new Error('Failed to load olm.js'));
            document.head.appendChild(script);
          });
          
          await loadOlm();
          
          // Check if Olm needs to be initialized (it's a function) or is already an object
          const olmAfterLoad = (window as any).Olm;
          
          if (typeof olmAfterLoad === 'function') {
            // Olm is a function, call it to initialize
            console.log('🔧 Initializing Olm...');
            const OlmInstance = await olmAfterLoad();
            (window as any).Olm = OlmInstance;
            console.log('✅ Olm initialized');
          } else if (typeof olmAfterLoad === 'object' && olmAfterLoad?.init) {
            // Olm is already initialized as an object
            console.log('✅ Olm already initialized');
          } else {
            console.error('❌ Unexpected Olm state:', typeof olmAfterLoad);
          }
        } else {
          console.log('✅ Olm already available');
        }
        
        // In matrix-js-sdk v34, we need to explicitly call initCrypto()
        console.log('🔐 Initializing legacy crypto (v34)...');
        await loggedInClient.initCrypto();
        console.log('✅ Legacy crypto initialized');
        
        // Allow sending to unverified devices (we'll handle the check manually)
        loggedInClient.setGlobalErrorOnUnknownDevices(false);
        console.log('🔐 Configured to allow unverified devices (manual check)');
        
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
        if (isLoggingOutRef.current) return; // Already logging out, skip
        isLoggingOutRef.current = true;
        
        console.log('⚠️ Session invalidated by server - logging out');
        
        // Stop the client immediately
        try {
          loggedInClient.stopClient();
        } catch (e) {
          console.warn('Error stopping client:', e);
        }
        
        logout().then(() => {
          isLoggingOutRef.current = false;
        }).catch(() => {
          isLoggingOutRef.current = false;
        });
      });

      // Listen for sync errors that indicate session invalidation
      loggedInClient.on(ClientEvent.Sync, (state, _prevState, data) => {
        if (state === 'ERROR' && data?.error) {
          const error = data.error as any;
          console.error('Sync error:', error);
          
          // Check for authentication errors
          if (error.errcode === 'M_UNKNOWN_TOKEN' || error.httpStatus === 401) {
            if (isLoggingOutRef.current) return; // Already logging out, skip
            isLoggingOutRef.current = true;
            
            console.error('⚠️ Authentication failed - session was invalidated by another client');
            
            // Stop the client immediately to prevent more sync attempts
            try {
              loggedInClient.stopClient();
            } catch (e) {
              console.warn('Error stopping client:', e);
            }
            
            // Perform logout - React will automatically show login screen
            logout().then(() => {
              isLoggingOutRef.current = false;
            }).catch(() => {
              isLoggingOutRef.current = false;
            });
          } else if (error.httpStatus === 403) {
            if (isLoggingOutRef.current) return; // Already logging out, skip
            isLoggingOutRef.current = true;
            
            console.error('⚠️ Access forbidden - session may have been revoked');
            
            // Stop the client immediately to prevent more sync attempts
            try {
              loggedInClient.stopClient();
            } catch (e) {
              console.warn('Error stopping client:', e);
            }
            
            // Perform logout - React will automatically show login screen
            logout().then(() => {
              isLoggingOutRef.current = false;
            }).catch(() => {
              isLoggingOutRef.current = false;
            });
          }
        }
      });

      // Store credentials
      localStorage.setItem('mx_homeserver', homeserver);
      localStorage.setItem('mx_access_token', response.access_token);
      localStorage.setItem('mx_user_id', response.user_id);

      setClient(loggedInClient);
      setIsLoggedIn(true); // Set logged in immediately
      
      // Start the client
      console.log('🚀 Starting Matrix client...');
      await loggedInClient.startClient({ 
        initialSyncLimit: 20, // Load more initial messages
        lazyLoadMembers: true, // Lazy load room members for better performance
      });
      console.log('✅ Matrix client started with crypto enabled');
      
      // Helper to check verification status
      const checkVerificationStatus = async () => {
        const crypto = loggedInClient.getCrypto();
        console.log('Checking verification status - Crypto available?', !!crypto);
        if (crypto) {
          try {
            const crossSigningStatus = await crypto.getCrossSigningStatus();
            console.log('Cross-signing status:', JSON.stringify(crossSigningStatus, null, 2));
            
            // If cross-signing is not set up, we need verification
            if (!crossSigningStatus.publicKeysOnDevice || !crossSigningStatus.privateKeysInSecretStorage) {
              console.warn('Cross-signing not fully set up - verification needed');
              setNeedsVerification(true);
            } else {
              console.log('✅ Cross-signing is fully set up - no verification needed');
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
      };

      // Update rooms when sync completes
      loggedInClient.once(ClientEvent.Sync, async (state) => {
        if (state === 'PREPARED') {
          const allRooms = loggedInClient.getRooms();
          updateRoomsAndSpaces(allRooms);
          console.log('Sync complete - loaded', allRooms.length, 'rooms/spaces');
          
          // Check if we need to set up cross-signing
          await checkVerificationStatus();
        }
      });

      // Listen for crypto events to re-check verification status
      loggedInClient.on('crypto.devicesUpdated' as any, async () => {
        console.log('🔄 Devices updated - rechecking verification status');
        await checkVerificationStatus();
      });

      loggedInClient.on('crypto.userTrustStatusChanged' as any, async () => {
        console.log('🔄 User trust status changed - rechecking verification status');
        await checkVerificationStatus();
      });

      // Listen for room updates
      const handleRoomUpdate = () => {
        const updatedRooms = loggedInClient.getRooms();
        updateRoomsAndSpaces(updatedRooms);
      };

      loggedInClient.on(RoomEvent.Timeline, handleRoomUpdate);
      loggedInClient.on(RoomEvent.State, handleRoomUpdate);

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
          'matrix-js-sdk:store',
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
      setInvites([]);
      setNeedsVerification(false);
      setVerificationRequest(null);
      setRoomThemeDefaults({});
      setSpaceThemeDefaults({});
      setThemeDefinitions({});
      // Keep homeserver saved for convenience
      // localStorage.removeItem('mx_homeserver'); 
      localStorage.removeItem('mx_access_token');
      localStorage.removeItem('mx_user_id');
      localStorage.removeItem('mx_device_id');
      localStorage.removeItem('mx_sliding_sync_proxy');
      // Clear room selection state
      localStorage.removeItem('krypta_last_room_id');
      localStorage.removeItem('krypta_active_room_id');
      localStorage.removeItem('krypta_open_room_ids');
    }
  };

  const setAllowUnverifiedForRoom = useCallback((roomId: string, allow: boolean) => {
    setAllowUnverifiedDevices(prev => {
      const updated = { ...prev, [roomId]: allow };
      localStorage.setItem('krypta_allow_unverified_devices', JSON.stringify(updated));
      console.log(`🔐 ${allow ? 'Allowing' : 'Disallowing'} unverified devices for room: ${roomId}`);
      return updated;
    });
  }, []);

  const sendMessage = async (roomId: string, message: string, threadRootEventId?: string, forceSend?: boolean) => {
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
    
    const content: any = {
      body: processedBody,
      msgtype: 'm.text',
      format: 'org.matrix.custom.html',
      formatted_body: processedHtml,
    };
    
    // Add thread relation if threadRootEventId is provided (MSC3440 format)
    if (threadRootEventId) {
      content['m.relates_to'] = {
        rel_type: 'm.thread',
        event_id: threadRootEventId,
        is_falling_back: true,
        'm.in_reply_to': {
          event_id: threadRootEventId,
        },
      };
      console.log(`📨 Sending message as thread reply to: ${threadRootEventId}`);
    }

    try {
      console.log('📤 Sending message to room:', roomId);
      
      // Check if room is encrypted
      const isEncrypted = client.isRoomEncrypted(roomId);
      console.log('🔐 Room encrypted:', isEncrypted);
      
      // Check if this room is allowed to send to unverified devices, or if forceSend is true
      const allowUnverified = allowUnverifiedDevices[roomId] === true || forceSend === true;
      
      // If encrypted and we don't have permission, check for unverified devices FIRST
      if (isEncrypted && !allowUnverified) {
        console.log('🔐 Checking for unverified devices before sending...');
        
        // Get all members in the room
        const room = client.getRoom(roomId);
        if (room) {
          const members = room.getJoinedMembers();
          let hasUnverifiedDevices = false;
          
          // Check each member's devices
          for (const member of members) {
            const userId = member.userId;
            
            try {
              // Get device verification status from crypto
              const devicesInRoom = await client.getStoredDevicesForUser(userId);
              
              for (const device of devicesInRoom) {
                const verified = client.checkDeviceTrust(userId, device.deviceId);
                
                if (!verified.isVerified()) {
                  console.log(`🔐 Found unverified device: ${userId} / ${device.deviceId}`);
                  hasUnverifiedDevices = true;
                  break;
                }
              }
              
              if (hasUnverifiedDevices) break;
            } catch (err) {
              console.warn(`Could not check devices for ${userId}:`, err);
              // If we can't check, assume there might be unverified devices
              hasUnverifiedDevices = true;
              break;
            }
          }
          
          if (hasUnverifiedDevices) {
            console.log('🔐 Blocking send due to unverified devices');
            const unverifiedError = new Error('UNVERIFIED_DEVICES');
            (unverifiedError as any).roomId = roomId;
            throw unverifiedError;
          }
        }
      }
      
      if (forceSend) {
        console.log('🔓 Force-sending message (one-time bypass)');
      } else if (allowUnverifiedDevices[roomId]) {
        console.log('🔓 Room allows sending to unverified devices (permanent setting)');
      }
      
      // Send the message (encryption happens automatically if room is encrypted)
      const result = await client.sendEvent(roomId, 'm.room.message', content);
      console.log('✅ Message sent successfully:', result.event_id);
    } catch (error: any) {
      console.error('❌ Failed to send message:', error);
      throw error; // Re-throw as-is (including our custom UNVERIFIED_DEVICES error)
    }
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
      alert('Client not available. Please try again.');
      return;
    }

    try {
      console.log('🔐 Starting verification process...');
      console.log('Client state:', {
        isClientStarted: client.clientRunning,
        syncState: client.getSyncState(),
      });

      // Wait for crypto to be available (it might not be ready immediately after client start)
      let crypto = client.getCrypto();
      if (!crypto) {
        console.log('⏳ Waiting for crypto to initialize...');
        
        // Wait up to 5 seconds for crypto to become available
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          crypto = client.getCrypto();
          if (crypto) {
            console.log('✅ Crypto became available');
            break;
          }
        }
        
        if (!crypto) {
          console.error('❌ Crypto not available after waiting');
          alert('Encryption not initialized yet. Please wait a moment and try again, or restart the app.');
          return;
        }
      }

      const userId = client.getUserId();
      const deviceId = client.getDeviceId();
      if (!userId) {
        console.error('❌ No user ID');
        alert('User ID not available');
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
      console.log('📤 Sending verification request...');
      const request = await crypto.requestOwnUserVerification();
      console.log('✅ Verification request sent:', request);
      
      // The verification request will be picked up by the listener we already have
      setVerificationRequest(request);
    } catch (error: any) {
      console.error('❌ Error starting verification:', error);
      console.error('Error stack:', error.stack);
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
          
          // Try to get stored sliding sync proxy, or auto-discover it
          let slidingSyncProxy = localStorage.getItem('mx_sliding_sync_proxy');
          if (!slidingSyncProxy) {
            console.log('🔍 No stored sliding sync proxy, attempting to discover...');
            const discoveredProxy = await discoverSlidingSyncProxy(homeserver);
            slidingSyncProxy = discoveredProxy || homeserver;
            
            // Store it for future use
            if (discoveredProxy) {
              localStorage.setItem('mx_sliding_sync_proxy', discoveredProxy);
            }
          } else {
            console.log('📋 Using stored sliding sync proxy:', slidingSyncProxy);
          }
          
          const clientConfig: any = {
            baseUrl: homeserver,
            accessToken: accessToken,
            userId: userId,
            deviceId: deviceId || undefined,
          };

          // Create IndexedDB stores for caching and crypto (v34 legacy crypto)
          console.log('📦 Creating IndexedDB stores (restored session)...');
          const indexedDBStore = new IndexedDBStore({
            indexedDB: window.indexedDB,
            dbName: 'matrix-js-sdk:store',
            workerFactory: undefined,
          });
          const cryptoStore = new IndexedDBCryptoStore(window.indexedDB, 'matrix-js-sdk:crypto');
          
          clientConfig.store = indexedDBStore;
          clientConfig.cryptoStore = cryptoStore;

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
          
          // NOW initialize the store after it's been assigned to the client
          try {
            await indexedDBStore.startup();
            console.log('✅ IndexedDB store initialized (restored session)');
          } catch (storeError) {
            console.warn('⚠️ Failed to initialize IndexedDB store, continuing anyway (restored session):', storeError);
            // Crypto should still work even if store initialization fails
          }
          
          // Initialize crypto - this is required for E2EE
          try {
            // Check if Olm is already loaded
            const olmExists = (window as any).Olm;
            const olmIsInitialized = olmExists && typeof olmExists.init === 'function';
            
            if (!olmIsInitialized) {
              console.log('📦 Loading Olm library (restored session)...');
              
              // Load Olm from public directory (copied by postinstall script)
              const loadOlm = () => new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = '/olm.js';
                script.onload = () => {
                  console.log('✅ olm.js script loaded (restored session)');
                  resolve(true);
                };
                script.onerror = () => reject(new Error('Failed to load olm.js'));
                document.head.appendChild(script);
              });
              
              await loadOlm();
              
              // Check if Olm needs to be initialized (it's a function) or is already an object
              const olmAfterLoad = (window as any).Olm;
              
              if (typeof olmAfterLoad === 'function') {
                // Olm is a function, call it to initialize
                console.log('🔧 Initializing Olm (restored session)...');
                const OlmInstance = await olmAfterLoad();
                (window as any).Olm = OlmInstance;
                console.log('✅ Olm initialized (restored session)');
              } else if (typeof olmAfterLoad === 'object' && olmAfterLoad?.init) {
                // Olm is already initialized as an object
                console.log('✅ Olm already initialized (restored session)');
              } else {
                console.error('❌ Unexpected Olm state (restored session):', typeof olmAfterLoad);
              }
            } else {
              console.log('✅ Olm already available (restored session)');
            }
            
            // In matrix-js-sdk v34, we need to explicitly call initCrypto()
            console.log('🔐 Initializing legacy crypto (v34, restored session)...');
            await restoredClient.initCrypto();
            console.log('✅ Legacy crypto initialized (restored session)');
            
            // Allow sending to unverified devices (we'll handle the check manually)
            restoredClient.setGlobalErrorOnUnknownDevices(false);
            console.log('🔐 Configured to allow unverified devices (manual check)');
            
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
            if (isLoggingOutRef.current) return; // Already logging out, skip
            isLoggingOutRef.current = true;
            
            console.log('⚠️ Session invalidated by server - logging out');
            
            // Stop the client immediately
            try {
              restoredClient.stopClient();
            } catch (e) {
              console.warn('Error stopping client:', e);
            }
            
            logout().then(() => {
              isLoggingOutRef.current = false;
            }).catch(() => {
              isLoggingOutRef.current = false;
            });
          });

          // Listen for sync errors that indicate session invalidation
          restoredClient.on(ClientEvent.Sync, (state, _prevState, data) => {
            if (state === 'ERROR' && data?.error && mounted) {
              const error = data.error as any;
              console.error('Sync error (restored session):', error);
              
              // Check for authentication errors
              if (error.errcode === 'M_UNKNOWN_TOKEN' || error.httpStatus === 401) {
                if (isLoggingOutRef.current) return; // Already logging out, skip
                isLoggingOutRef.current = true;
                
                console.error('⚠️ Authentication failed - session was invalidated by another client');
                
                // Stop the client immediately to prevent more sync attempts
                try {
                  restoredClient.stopClient();
                } catch (e) {
                  console.warn('Error stopping client:', e);
                }
                
                // Perform logout - React will automatically show login screen
                logout().then(() => {
                  isLoggingOutRef.current = false;
                }).catch(() => {
                  isLoggingOutRef.current = false;
                });
              } else if (error.httpStatus === 403) {
                if (isLoggingOutRef.current) return; // Already logging out, skip
                isLoggingOutRef.current = true;
                
                console.error('⚠️ Access forbidden - session may have been revoked');
                
                // Stop the client immediately to prevent more sync attempts
                try {
                  restoredClient.stopClient();
                } catch (e) {
                  console.warn('Error stopping client:', e);
                }
                
                // Perform logout - React will automatically show login screen
                logout().then(() => {
                  isLoggingOutRef.current = false;
                }).catch(() => {
                  isLoggingOutRef.current = false;
                });
              }
            }
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

          // Helper to check verification status
          const checkVerificationStatusRestored = async () => {
            if (!mounted) return;
            const crypto = restoredClient.getCrypto();
            console.log('Checking verification status (restored) - Crypto available?', !!crypto);
            if (crypto) {
              try {
                const crossSigningStatus = await crypto.getCrossSigningStatus();
                console.log('Cross-signing status (restored):', JSON.stringify(crossSigningStatus, null, 2));
                
                // If cross-signing is not set up, we need verification
                if (!crossSigningStatus.publicKeysOnDevice || !crossSigningStatus.privateKeysInSecretStorage) {
                  console.warn('Cross-signing not fully set up - verification needed');
                  setNeedsVerification(true);
                } else {
                  console.log('✅ Cross-signing is fully set up - no verification needed');
                  setNeedsVerification(false);
                }
              } catch (error) {
                console.error('Error checking cross-signing status:', error);
                setNeedsVerification(true);
              }
            } else {
              console.warn('Crypto not available - assuming verification needed');
              setNeedsVerification(true);
            }
          };

          restoredClient.once(ClientEvent.Sync, async (state) => {
            if (state === 'PREPARED' && mounted) {
              const allRooms = restoredClient.getRooms();
              updateRoomsAndSpaces(allRooms);
              console.log('Session restored - loaded', allRooms.length, 'rooms/spaces');
              
              // Check if we need to set up cross-signing
              await checkVerificationStatusRestored();
            }
          });

          // Listen for crypto events to re-check verification status
          restoredClient.on('crypto.devicesUpdated' as any, async () => {
            console.log('🔄 Devices updated (restored) - rechecking verification status');
            await checkVerificationStatusRestored();
          });

          restoredClient.on('crypto.userTrustStatusChanged' as any, async () => {
            console.log('🔄 User trust status changed (restored) - rechecking verification status');
            await checkVerificationStatusRestored();
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
            // Clear invalid session (keep homeserver and user preferences)
            localStorage.removeItem('mx_access_token');
            localStorage.removeItem('mx_user_id');
            localStorage.removeItem('mx_device_id');
            localStorage.removeItem('mx_sliding_sync_proxy');
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
  }, []); // Only run once on mount!

  // Helper function to find which space a room belongs to
  const getParentSpace = useCallback((roomId: string): string | null => {
    if (!client) return null;
    
    for (const space of spaces) {
      const childEvents = space.currentState.getStateEvents('m.space.child');
      if (childEvents) {
        for (const event of childEvents) {
          if (event.getStateKey() === roomId) {
            return space.roomId;
          }
        }
      }
    }
    
    return null;
  }, [client, spaces]);

  const setRoomServerThemeDefault = useCallback(
    async (roomId: string, themeId: string, options?: { applyToNewUsers?: boolean }) => {
      if (!client) {
        throw new Error('Matrix client is not initialised');
      }
      const content: Record<string, unknown> = {
        themeId,
        applyToNewUsers: options?.applyToNewUsers !== false,
        updatedAt: Date.now(),
      };
      const userId = client.getUserId();
      if (userId) {
        content.updatedBy = userId;
      }
      await client.sendStateEvent(roomId, THEME_DEFAULT_EVENT as any, content, '');
    },
    [client],
  );

  const clearRoomServerThemeDefault = useCallback(
    async (roomId: string) => {
      if (!client) {
        throw new Error('Matrix client is not initialised');
      }
      await client.sendStateEvent(roomId, THEME_DEFAULT_EVENT as any, {}, '');
    },
    [client],
  );

  const setSpaceServerThemeDefault = useCallback(
    async (spaceId: string, themeId: string, options?: { applyToNewUsers?: boolean }) => {
      if (!client) {
        throw new Error('Matrix client is not initialised');
      }
      const content: Record<string, unknown> = {
        themeId,
        applyToNewUsers: options?.applyToNewUsers !== false,
        updatedAt: Date.now(),
      };
      const userId = client.getUserId();
      if (userId) {
        content.updatedBy = userId;
      }
      await client.sendStateEvent(spaceId, THEME_DEFAULT_EVENT as any, content, '');
    },
    [client],
  );

  const clearSpaceServerThemeDefault = useCallback(
    async (spaceId: string) => {
      if (!client) {
        throw new Error('Matrix client is not initialised');
      }
      await client.sendStateEvent(spaceId, THEME_DEFAULT_EVENT as any, {}, '');
    },
    [client],
  );

  const upsertThemeDefinition = useCallback(
    async (targetRoomId: string, themeId: string, theme: Theme, options?: { description?: string }) => {
      if (!client) {
        throw new Error('Matrix client is not initialised');
      }
      const payload: Record<string, unknown> = JSON.parse(JSON.stringify(theme));
      payload.name = themeId;
      if (!payload.displayName || typeof payload.displayName !== 'string') {
        payload.displayName = theme.displayName || themeId;
      }
      if (options?.description) {
        payload.description = options.description;
      }
      payload.updatedAt = Date.now();
      const userId = client.getUserId();
      if (userId) {
        payload.updatedBy = userId;
      }
      await client.sendStateEvent(targetRoomId, THEME_DEFINITION_EVENT as any, payload, themeId);
    },
    [client],
  );

  const deleteThemeDefinition = useCallback(
    async (targetRoomId: string, themeId: string) => {
      if (!client) {
        throw new Error('Matrix client is not initialised');
      }
      await client.sendStateEvent(targetRoomId, THEME_DEFINITION_EVENT as any, {}, themeId);
    },
    [client],
  );

  const acceptInvite = useCallback(
    async (roomId: string) => {
      if (!client) {
        throw new Error('Matrix client is not initialised');
      }
      await client.joinRoom(roomId);
      // The room list will auto-update via the RoomEvent.Timeline listener
    },
    [client],
  );

  const declineInvite = useCallback(
    async (roomId: string) => {
      if (!client) {
        throw new Error('Matrix client is not initialised');
      }
      await client.leave(roomId);
      // The room list will auto-update via the RoomEvent.Timeline listener
    },
    [client],
  );

  const value: MatrixContextType = useMemo(() => ({
    client,
    isLoggedIn,
    login,
    logout,
    currentRoom,
    setCurrentRoom,
    rooms,
    spaces,
    invites,
    sendMessage,
    sendReaction,
    deleteMessage,
    loadMoreHistory,
    getParentSpace,
    needsVerification,
    verificationRequest,
    acceptVerification,
    cancelVerification,
    startVerification,
    isLoading,
    roomThemeDefaults,
    spaceThemeDefaults,
    themeDefinitions,
    setRoomServerThemeDefault,
    clearRoomServerThemeDefault,
    setSpaceServerThemeDefault,
    clearSpaceServerThemeDefault,
    upsertThemeDefinition,
    deleteThemeDefinition,
    acceptInvite,
    declineInvite,
    setAllowUnverifiedForRoom,
  }), [
    client,
    isLoggedIn,
    login,
    logout,
    currentRoom,
    setCurrentRoom,
    rooms,
    spaces,
    invites,
    sendMessage,
    sendReaction,
    deleteMessage,
    loadMoreHistory,
    getParentSpace,
    needsVerification,
    verificationRequest,
    acceptVerification,
    cancelVerification,
    startVerification,
    isLoading,
    roomThemeDefaults,
    spaceThemeDefaults,
    themeDefinitions,
    setRoomServerThemeDefault,
    clearRoomServerThemeDefault,
    setSpaceServerThemeDefault,
    clearSpaceServerThemeDefault,
    upsertThemeDefinition,
    deleteThemeDefinition,
    acceptInvite,
    declineInvite,
    setAllowUnverifiedForRoom,
  ]);

  return <MatrixContext.Provider value={value}>{children}</MatrixContext.Provider>;
};

export const useMatrix = () => {
  const context = useContext(MatrixContext);
  if (context === undefined) {
    throw new Error('useMatrix must be used within a MatrixProvider');
  }
  return context;
};

