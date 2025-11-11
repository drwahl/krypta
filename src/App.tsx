import React, { useState } from 'react';
import { MatrixProvider, useMatrix } from './MatrixContext';
import { ThreadsProvider } from './contexts/ThreadsContext';
import { ThemeProvider } from './ThemeContext';
import { MultiRoomProvider, useMultiRoom } from './contexts/MultiRoomContext';
import Login from './components/Login';
import RoomList from './components/RoomList';
import RoomPane from './components/RoomPane';
import ErrorBoundary from './components/ErrorBoundary';
import VerificationBanner from './components/VerificationBanner';
import VerificationModal from './components/VerificationModal';
import ThreadSidebar from './components/ThreadSidebar';
import { Loader2, MessageSquare } from 'lucide-react';

const ChatApp: React.FC = () => {
  const { isLoggedIn, isLoading } = useMatrix();
  const { openRooms, activeRoomId } = useMultiRoom();
  const [showThreads, setShowThreads] = useState(true);

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
    <div className="h-screen flex bg-slate-900 overflow-hidden">
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
          <div className="flex-1 flex min-h-0">
            {openRooms.map((room) => (
              <RoomPane
                key={room.roomId}
                room={room}
                isActive={activeRoomId === room.roomId}
              />
            ))}
          </div>
        )}
      </div>

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
      <ThemeProvider>
        <MatrixProvider>
          <MultiRoomProvider>
            <ThreadsProvider>
              <ChatApp />
            </ThreadsProvider>
          </MultiRoomProvider>
        </MatrixProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;

