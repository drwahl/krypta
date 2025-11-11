import React from 'react';
import { useMatrix } from '../MatrixContext';
import { ShieldAlert, X, Shield } from 'lucide-react';

const VerificationBanner: React.FC = () => {
  const { needsVerification, startVerification } = useMatrix();
  const [dismissed, setDismissed] = React.useState(false);
  const [isStarting, setIsStarting] = React.useState(false);

  console.log('VerificationBanner - needsVerification:', needsVerification);

  if (!needsVerification || dismissed) {
    return null;
  }

  const handleStartVerification = async () => {
    setIsStarting(true);
    try {
      await startVerification();
    } catch (error) {
      console.error('Failed to start verification:', error);
    } finally {
      setIsStarting(false);
    }
  };

  return (
      <div className="bg-blue-900/50 border-b border-blue-700 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <ShieldAlert className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-sm font-semibold text-blue-100">
                Encryption Status
              </p>
              <p className="text-xs text-blue-300">
                ✅ You can send and receive new encrypted messages. ⚠️ Old messages require key backup - set up in Element: Settings → Security & Privacy → Secure Backup.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartVerification}
              disabled={isStarting}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition flex items-center gap-2 disabled:cursor-not-allowed"
              title="Start verification with other devices"
            >
              <Shield className="w-4 h-4" />
              {isStarting ? 'Starting...' : 'Verify with Other Device'}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-2 hover:bg-blue-800 rounded-lg transition text-blue-300 hover:text-white flex-shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
  );
};

export default VerificationBanner;

