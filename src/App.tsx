import React from 'react';
import { MatrixProvider, useMatrix } from './MatrixContext';
import Login from './components/Login';
import RoomList from './components/RoomList';
import MessageTimeline from './components/MessageTimeline';
import MessageInput from './components/MessageInput';
import ErrorBoundary from './components/ErrorBoundary';
import VerificationBanner from './components/VerificationBanner';
import VerificationModal from './components/VerificationModal';
import { Loader2 } from 'lucide-react';

const ChatApp: React.FC = () => {
  const { isLoggedIn, isLoading } = useMatrix();

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
      <RoomList />
      <div className="flex-1 flex flex-col min-w-0">
        <VerificationBanner />
        <MessageTimeline />
        <MessageInput />
      </div>
      <VerificationModal />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <MatrixProvider>
        <ChatApp />
      </MatrixProvider>
    </ErrorBoundary>
  );
};

export default App;

