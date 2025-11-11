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

    const handleAccept = async () => {
      try {
        console.log('🔐 Accepting verification request...');
        console.log('Request object:', verificationRequest);
        
        // Accept the verification request first
        await verificationRequest.accept();
        console.log('✅ Verification request accepted');
        
        // Get the verifier from the request
        const v = verificationRequest.verifier;
        if (!v) {
          console.error('❌ No verifier available');
          return;
        }
        
        setVerifier(v);

        // Listen for SAS emojis
        v.on('show_sas', (e: any) => {
          console.log('🔐 SAS emojis received:', e.sas.emoji);
          setSasEmojis(e.sas.emoji || []);
          setStep('showing_sas');
        });

        // Start the verification
        await v.verify();
        console.log('✅ Verification started');
      } catch (error) {
        console.error('❌ Verification error:', error);
        console.error('Error details:', error);
      }
    };

    handleAccept();
  }, [verificationRequest]);

  const handleConfirm = async () => {
    if (verifier) {
      try {
        await verifier.confirm();
        setStep('confirmed');
        console.log('✅ Verification confirmed');
        
        // Close modal after a moment
        setTimeout(() => {
          cancelVerification();
        }, 2000);
      } catch (error) {
        console.error('❌ Confirm error:', error);
      }
    }
  };

  const handleCancel = () => {
    if (verifier) {
      verifier.cancel();
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
            <p className="text-slate-300">Starting verification...</p>
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

