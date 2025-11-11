import React, { useEffect, useState } from 'react';
import { useMatrix } from '../MatrixContext';
import { Shield, X, Check } from 'lucide-react';

const VerificationModal: React.FC = () => {
  const { verificationRequest, acceptVerification, cancelVerification } = useMatrix();
  const [sasEmojis, setSasEmojis] = useState<any[]>([]);
  const [verifier, setVerifier] = useState<any>(null);
  const [step, setStep] = useState<'pending' | 'showing_sas' | 'confirmed' | 'done'>('pending');

  useEffect(() => {
    if (!verificationRequest) return;

    let v: any = null;
    let mounted = true;

    const handleVerification = async () => {
      try {
        console.log('🔐 Verification request received');
        console.log('Request phase:', verificationRequest.phase);
        console.log('Request methods:', verificationRequest.methods);
        console.log('Request initiatedByMe:', verificationRequest.initiatedByMe);
        
        // If we initiated this request, we need to wait for the other side to accept
        if (verificationRequest.initiatedByMe && verificationRequest.phase < 2) {
          console.log('⏳ Waiting for other device to accept...');
          
          // Listen for phase changes
          const onPhaseChange = () => {
            if (!mounted) return;
            console.log('Phase changed to:', verificationRequest.phase);
            if (verificationRequest.phase >= 2) {
              // They accepted, now we can proceed
              handleVerification();
            }
          };
          
          verificationRequest.on('change', onPhaseChange);
          return; // Exit and wait for phase change
        }
        
        // Check if there's already a verifier (Element started it or they accepted our request)
        v = verificationRequest.verifier;
        
        if (!v) {
          // We need to accept and start the verification
          console.log('🔐 Accepting verification request...');
          await verificationRequest.accept();
          console.log('✅ Verification request accepted');
          
          // Wait a moment for the request to transition
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Start the verification with SAS method
          console.log('🔐 Starting SAS verification...');
          v = verificationRequest.beginKeyVerification('m.sas.v1');
        } else {
          console.log('🔐 Using existing verifier from request');
        }
        
        if (!mounted) return;
        
        console.log('Verifier:', v);
        console.log('Verifier methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(v)));
        setVerifier(v);

        // Listen for SAS emojis BEFORE starting verification
        v.on('show_sas', (e: any) => {
          if (!mounted) return;
          console.log('🔐 SAS emojis received:', e.sas.emoji);
          setSasEmojis(e.sas.emoji || []);
          setStep('showing_sas');
        });

        // Listen for verification completion
        v.on('show_reciprocal_sas', () => {
          console.log('🔐 Reciprocal SAS shown');
        });

        // Listen for cancel events
        v.on('cancel', () => {
          if (!mounted) return;
          console.log('🔐 Verification cancelled');
          cancelVerification();
        });

        // Always call verify() to participate in the verification
        console.log('✅ Starting/continuing verification...');
        await v.verify();
        console.log('✅ Verification in progress, waiting for emojis...');
      } catch (error) {
        if (!mounted) return;
        console.error('❌ Verification error:', error);
        console.error('Error type:', typeof error);
        console.error('Error constructor:', error?.constructor?.name);
      }
    };

    handleVerification();

    // Cleanup function
    return () => {
      mounted = false;
      if (v && typeof v.removeAllListeners === 'function') {
        v.removeAllListeners();
      }
    };
  }, [verificationRequest, cancelVerification]);

  const handleConfirm = async () => {
    if (verifier) {
      try {
        console.log('✅ User confirmed emojis match - sending confirmation to Matrix');
        
        // Get the SAS callbacks and call confirm
        const callbacks = verifier.getShowSasCallbacks();
        console.log('SAS callbacks:', callbacks);
        
        if (callbacks && typeof callbacks.confirm === 'function') {
          await callbacks.confirm();
          console.log('✅ SAS confirmation sent to Matrix protocol');
          setStep('confirmed');
          
          // Close modal after a moment
          setTimeout(() => {
            cancelVerification();
          }, 2000);
        } else {
          console.error('❌ No confirm callback available');
          alert('Unable to confirm verification - no confirm method available');
        }
      } catch (error) {
        console.error('❌ Confirm error:', error);
        alert(`Verification failed: ${error}`);
      }
    }
  };

  const handleCancel = () => {
    try {
      if (verifier && typeof verifier.cancel === 'function') {
        verifier.cancel();
      }
    } catch (error) {
      console.error('Error canceling verifier:', error);
    }
    
    try {
      if (verificationRequest && typeof verificationRequest.cancel === 'function') {
        verificationRequest.cancel();
      }
    } catch (error) {
      console.error('Error canceling verification request:', error);
    }
    
    cancelVerification();
  };

  if (!verificationRequest) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-green-400" />
            <h2 className="text-xl font-bold text-white">Verify Session</h2>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'pending' && (
          <div className="text-center py-8">
            <div className="animate-spin w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-300">
              {verificationRequest.initiatedByMe && verificationRequest.phase < 2
                ? 'Waiting for other device to accept...'
                : 'Starting verification...'}
            </p>
            {verificationRequest.initiatedByMe && verificationRequest.phase < 2 && (
              <p className="text-slate-400 text-sm mt-2">
                Check Element and click "Verify Session" or "Accept"
              </p>
            )}
          </div>
        )}

        {step === 'showing_sas' && sasEmojis.length > 0 && (
          <div>
            <p className="text-slate-300 mb-4 text-center">
              Compare these emojis with the ones shown in Element:
            </p>
            
            <div className="grid grid-cols-7 gap-3 mb-6 bg-slate-900/50 p-4 rounded-lg">
              {sasEmojis.map((emoji, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="text-4xl mb-1">{emoji[0]}</div>
                  <div className="text-xs text-slate-400 text-center">{emoji[1]}</div>
                </div>
              ))}
            </div>

            <p className="text-sm text-slate-400 mb-6 text-center">
              If they match, click "They Match" below. Otherwise, click "Cancel".
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                They Match
              </button>
            </div>
          </div>
        )}

        {step === 'confirmed' && (
          <div className="text-center py-8">
            <Check className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <p className="text-lg font-semibold text-white mb-2">Verification Complete!</p>
            <p className="text-slate-400">You can now access encrypted messages.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerificationModal;

