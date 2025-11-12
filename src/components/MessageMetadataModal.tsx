import React from 'react';
import { X, Copy, Check } from 'lucide-react';
import { MatrixEvent } from 'matrix-js-sdk';
import { format } from 'date-fns';

interface MessageMetadataModalProps {
  event: MatrixEvent | null;
  onClose: () => void;
}

export const MessageMetadataModal: React.FC<MessageMetadataModalProps> = ({ event, onClose }) => {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  if (!event) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const content = event.getContent();
  const sender = event.getSender();
  const timestamp = event.getTs();
  const eventId = event.getId();
  const eventType = event.getType();
  const relatesTo = content['m.relates_to'];
  const isEncrypted = event.isEncrypted();
  const isDecryptionFailure = event.isDecryptionFailure();

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Message Metadata</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition"
            title="Close"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Event ID */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-slate-400">Event ID</label>
              <button
                onClick={() => copyToClipboard(eventId || '', 'eventId')}
                className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
              >
                {copiedField === 'eventId' ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="bg-slate-900 p-2 rounded font-mono text-xs text-slate-300 break-all">
              {eventId || 'N/A'}
            </div>
          </div>

          {/* Sender */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-slate-400">Sender</label>
              <button
                onClick={() => copyToClipboard(sender || '', 'sender')}
                className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
              >
                {copiedField === 'sender' ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="bg-slate-900 p-2 rounded font-mono text-xs text-slate-300">
              {sender || 'Unknown'}
            </div>
          </div>

          {/* Timestamp */}
          <div>
            <label className="text-sm font-semibold text-slate-400 block mb-1">Timestamp</label>
            <div className="bg-slate-900 p-2 rounded text-xs text-slate-300">
              <div className="font-mono">{format(timestamp, 'PPpp')}</div>
              <div className="text-slate-500 mt-1">Unix: {timestamp}</div>
            </div>
          </div>

          {/* Event Type */}
          <div>
            <label className="text-sm font-semibold text-slate-400 block mb-1">Event Type</label>
            <div className="bg-slate-900 p-2 rounded font-mono text-xs text-slate-300">
              {eventType}
            </div>
          </div>

          {/* Encryption Status */}
          <div>
            <label className="text-sm font-semibold text-slate-400 block mb-1">Encryption</label>
            <div className="bg-slate-900 p-2 rounded text-xs">
              {isEncrypted ? (
                <span className="text-green-400 font-medium">🔒 Encrypted</span>
              ) : (
                <span className="text-slate-400">Not encrypted</span>
              )}
              {isDecryptionFailure && (
                <span className="text-red-400 ml-2">⚠️ Decryption failed</span>
              )}
            </div>
          </div>

          {/* Relations */}
          {relatesTo && (
            <div>
              <label className="text-sm font-semibold text-slate-400 block mb-1">Relations</label>
              <div className="bg-slate-900 p-2 rounded text-xs text-slate-300 space-y-2">
                {relatesTo.rel_type && (
                  <div>
                    <span className="text-slate-500">Type:</span>{' '}
                    <span className="font-mono">{relatesTo.rel_type}</span>
                  </div>
                )}
                {relatesTo.event_id && (
                  <div>
                    <span className="text-slate-500">Relates to:</span>{' '}
                    <div className="font-mono break-all mt-1">{relatesTo.event_id}</div>
                  </div>
                )}
                {relatesTo['m.in_reply_to']?.event_id && (
                  <div>
                    <span className="text-slate-500">In reply to:</span>{' '}
                    <div className="font-mono break-all mt-1">{relatesTo['m.in_reply_to'].event_id}</div>
                  </div>
                )}
                {relatesTo.key && (
                  <div>
                    <span className="text-slate-500">Reaction key:</span>{' '}
                    <span className="font-mono">{relatesTo.key}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Message Content */}
          <div>
            <label className="text-sm font-semibold text-slate-400 block mb-1">Content</label>
            <div className="bg-slate-900 p-2 rounded text-xs text-slate-300">
              {content.body && (
                <div className="mb-2">
                  <span className="text-slate-500">Body:</span>{' '}
                  <div className="mt-1 whitespace-pre-wrap">{content.body}</div>
                </div>
              )}
              {content.msgtype && (
                <div>
                  <span className="text-slate-500">Message type:</span>{' '}
                  <span className="font-mono">{content.msgtype}</span>
                </div>
              )}
            </div>
          </div>

          {/* Raw Event JSON */}
          <div>
            <label className="text-sm font-semibold text-slate-400 block mb-1">Raw Event JSON</label>
            <div className="bg-slate-900 p-3 rounded font-mono text-xs text-slate-300 overflow-x-auto max-h-64">
              <pre>{JSON.stringify(event.event, null, 2)}</pre>
            </div>
            <button
              onClick={() => copyToClipboard(JSON.stringify(event.event, null, 2), 'json')}
              className="mt-2 text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              {copiedField === 'json' ? (
                <>
                  <Check className="w-3 h-3" />
                  Copied JSON
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy JSON
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageMetadataModal;
