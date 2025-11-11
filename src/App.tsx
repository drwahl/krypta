import React, { useState } from 'react';
import { MatrixProvider, useMatrix } from './MatrixContext';
import { ThreadsProvider } from './contexts/ThreadsContext';
import Login from './components/Login';
import RoomList from './components/RoomList';
import MessageTimeline from './components/MessageTimeline';
import MessageInput from './components/MessageInput';
import ErrorBoundary from './components/ErrorBoundary';
import VerificationBanner from './components/VerificationBanner';
import VerificationModal from './components/VerificationModal';
import ThreadSidebar from './components/ThreadSidebar';
import { Loader2, MessageSquare } from 'lucide-react';

const ChatApp: React.FC = () => {
  const { isLoggedIn, isLoading } = useMatrix();
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

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <VerificationBanner />
        <MessageTimeline />
        <MessageInput />
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
      <MatrixProvider>
        <ThreadsProvider>
          <ChatApp />
        </ThreadsProvider>
      </MatrixProvider>
    </ErrorBoundary>
  );
};

export default App;

