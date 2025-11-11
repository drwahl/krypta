import React, { useState, useEffect, useRef } from 'react';
import { MatrixProvider, useMatrix } from './MatrixContext';
import { ThreadsProvider } from './contexts/ThreadsContext';
import { ThemeProvider } from './ThemeContext';
import { MultiRoomProvider, useMultiRoom } from './contexts/MultiRoomContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Login from './components/Login';
import RoomList from './components/RoomList';
import RoomPane from './components/RoomPane';
import ErrorBoundary from './components/ErrorBoundary';
import VerificationBanner from './components/VerificationBanner';
import VerificationModal from './components/VerificationModal';
import ThreadSidebar from './components/ThreadSidebar';
import { Loader2, MessageSquare, LayoutGrid, LayoutList } from 'lucide-react';

const ChatApp: React.FC = () => {
  const { isLoggedIn, isLoading } = useMatrix();
  const { openRooms, activeRoomId, layoutDirection, setLayoutDirection, roomSizes, setRoomSize } = useMultiRoom();
  const [showThreads, setShowThreads] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Reset room sizes when layout direction changes or room count changes
  // Must be before any conditional returns to follow Rules of Hooks
  useEffect(() => {
    if (isLoggedIn && openRooms.length > 0) {
      // Clear all room sizes to reset to equal distribution
      const defaultSize = 100 / openRooms.length;
      openRooms.forEach(room => {
        setRoomSize(room.roomId, defaultSize);
      });
    }
  }, [layoutDirection, openRooms.length, isLoggedIn, openRooms, setRoomSize]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Connecting to Matrix...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login />;
  }

  return (
    <div 
      className="h-screen flex bg-slate-900 overflow-hidden"
    >
      {/* Room List */}
      <RoomList />

      {/* Main Chat Area - Multi-pane view */}
      <div className="flex-1 flex flex-col min-h-0">
        <VerificationBanner />
        
        {openRooms.length === 0 ? (
          <div 
            className="flex-1 flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-bg)' }}
          >
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <p 
                className="text-lg mb-2"
                style={{ color: 'var(--color-text)' }}
              >
                Select a room to start chatting
              </p>
              <p 
                className="text-sm"
                style={{ color: 'var(--color-textMuted)' }}
              >
                Click on rooms in the sidebar to open them
              </p>
            </div>
          </div>
        ) : (
          <div 
            ref={containerRef}
            className={`flex-1 flex min-h-0 ${layoutDirection === 'vertical' ? 'flex-col' : 'flex-row'}`}
            style={{ position: 'relative' }}
          >
            {openRooms.map((room, index) => {
              const roomId = room.roomId;
              const isLast = index === openRooms.length - 1;
              
              // Get size from state or default to equal distribution
              const defaultSize = 100 / openRooms.length;
              const size = roomSizes[roomId] !== undefined ? roomSizes[roomId] : defaultSize;
              
              return (
                <React.Fragment key={roomId}>
                  <div
                    data-room-id={roomId}
                    data-pane-index={index}
                    style={{
                      [layoutDirection === 'horizontal' ? 'width' : 'height']: `${size}%`,
                      minWidth: layoutDirection === 'horizontal' ? '200px' : undefined,
                      minHeight: layoutDirection === 'vertical' ? '200px' : undefined,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <RoomPane
                      room={room}
                      isActive={activeRoomId === roomId}
                    />
                  </div>
                  
                  {/* Resize handle between panes */}
                  {!isLast && (
                    <div
                      className="resize-handle"
                      style={{
                        [layoutDirection === 'horizontal' ? 'width' : 'height']: '4px',
                        [layoutDirection === 'horizontal' ? 'height' : 'width']: '100%',
                        backgroundColor: 'var(--color-border)',
                        cursor: layoutDirection === 'horizontal' ? 'col-resize' : 'row-resize',
                        flexShrink: 0,
                        transition: 'background-color 0.2s',
                        zIndex: 20,
                      }}
                      onMouseEnter={(e) => {
                        if (!isDraggingRef.current) {
                          e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isDraggingRef.current) {
                          e.currentTarget.style.backgroundColor = 'var(--color-border)';
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        isDraggingRef.current = true;
                        
                        const handle = e.currentTarget as HTMLElement;
                        const container = containerRef.current;
                        if (!container) return;
                        
                        // Find the two panes being resized
                        const pane1 = container.querySelector(`[data-pane-index="${index}"]`) as HTMLElement;
                        const pane2 = container.querySelector(`[data-pane-index="${index + 1}"]`) as HTMLElement;
                        if (!pane1 || !pane2) return;
                        
                        const currentRoom = openRooms[index];
                        const nextRoom = openRooms[index + 1];
                        const startPos = layoutDirection === 'horizontal' ? e.clientX : e.clientY;
                        const containerSize = layoutDirection === 'horizontal' 
                          ? container.clientWidth 
                          : container.clientHeight;
                        
                        const defaultSize = 100 / openRooms.length;
                        const startSize1 = roomSizes[currentRoom.roomId] !== undefined ? roomSizes[currentRoom.roomId] : defaultSize;
                        const startSize2 = roomSizes[nextRoom.roomId] !== undefined ? roomSizes[nextRoom.roomId] : defaultSize;
                        
                        let finalSize1 = startSize1;
                        let finalSize2 = startSize2;
                        
                        // Style updates for visual feedback
                        handle.style.backgroundColor = 'var(--color-primary)';
                        handle.style.transition = 'none';
                        document.body.style.cursor = layoutDirection === 'horizontal' ? 'col-resize' : 'row-resize';
                        document.body.style.userSelect = 'none';
                        
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                          const currentPos = layoutDirection === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
                          const delta = currentPos - startPos;
                          const deltaPercent = (delta / containerSize) * 100;
                          
                          finalSize1 = Math.max(10, Math.min(90, startSize1 + deltaPercent));
                          finalSize2 = Math.max(10, Math.min(90, startSize2 - deltaPercent));
                          
                          // Direct DOM manipulation - no React re-render!
                          if (layoutDirection === 'horizontal') {
                            pane1.style.width = `${finalSize1}%`;
                            pane2.style.width = `${finalSize2}%`;
                          } else {
                            pane1.style.height = `${finalSize1}%`;
                            pane2.style.height = `${finalSize2}%`;
                          }
                        };
                        
                        const handleMouseUp = () => {
                          isDraggingRef.current = false;
                          
                          // Reset visual feedback
                          handle.style.backgroundColor = 'var(--color-border)';
                          handle.style.transition = 'background-color 0.2s';
                          document.body.style.cursor = '';
                          document.body.style.userSelect = '';
                          
                          // Commit final sizes to context (single React update)
                          setRoomSize(currentRoom.roomId, finalSize1);
                          setRoomSize(nextRoom.roomId, finalSize2);
                          
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Layout Toggle Button (only show when multiple rooms are open) */}
      {openRooms.length > 1 && (
        <button
          onClick={() => setLayoutDirection(layoutDirection === 'horizontal' ? 'vertical' : 'horizontal')}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 p-3 text-white rounded-full shadow-lg transition z-30"
          style={{
            backgroundColor: 'var(--color-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-primaryHover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-primary)';
          }}
          title={`Switch to ${layoutDirection === 'horizontal' ? 'vertical' : 'horizontal'} layout`}
        >
          {layoutDirection === 'horizontal' ? (
            <LayoutList className="w-6 h-6" />
          ) : (
            <LayoutGrid className="w-6 h-6" />
          )}
        </button>
      )}

      {/* Thread Sidebar Toggle Button (for responsive design) */}
      {!showThreads && (
        <button
          onClick={() => setShowThreads(true)}
          className="fixed bottom-4 right-4 p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg transition"
          title="Show threads"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* Thread Sidebar */}
      {showThreads && (
        <ThreadSidebar
          isOpen={showThreads}
          onClose={() => setShowThreads(false)}
        />
      )}

      <VerificationModal />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <MatrixProvider>
        <ThemeProvider>
          <NotificationProvider>
            <MultiRoomProvider>
              <ThreadsProvider>
                <ChatApp />
              </ThreadsProvider>
            </MultiRoomProvider>
          </NotificationProvider>
        </ThemeProvider>
      </MatrixProvider>
    </ErrorBoundary>
  );
};

export default App;

