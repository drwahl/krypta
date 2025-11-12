import React from 'react';
import { X, Copy, Check } from 'lucide-react';
import { Thread } from '../types/thread';

interface ThreadMetadataModalProps {
  thread: Thread | null;
  analysis: any;
  onClose: () => void;
}

export const ThreadMetadataModal: React.FC<ThreadMetadataModalProps> = ({ thread, analysis, onClose }) => {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  const rawThreadJson = React.useMemo(() => {
    if (!thread) return '';
    const { participants, branches, messages, ...rest } = thread;
    return JSON.stringify(
      {
        ...rest,
        participants: Array.from(participants),
        branches: Array.from(branches.entries()),
        messages: Array.from(messages.entries()),
      },
      null,
      2
    );
  }, [thread]);

  if (!thread) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

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
          <h2 className="text-xl font-bold text-white">Thread Metadata</h2>
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
          {/* Title */}
          <div>
            <label className="text-sm font-semibold text-slate-400 block mb-1">Title</label>
            <div className="bg-slate-900 p-3 rounded text-white">
              {thread.title}
            </div>
          </div>

          {/* Description */}
          {thread.description && (
            <div>
              <label className="text-sm font-semibold text-slate-400 block mb-1">Description</label>
              <div className="bg-slate-900 p-3 rounded text-slate-300 text-sm">
                {thread.description}
              </div>
            </div>
          )}

          {/* Thread ID */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-slate-400">Thread ID</label>
              <button
                onClick={() => copyToClipboard(thread.id, 'threadId')}
                className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
              >
                {copiedField === 'threadId' ? (
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
              {thread.id}
            </div>
          </div>

          {/* Root Event ID */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-slate-400">Root Event ID</label>
              <button
                onClick={() => copyToClipboard(thread.rootEventId, 'rootEventId')}
                className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
              >
                {copiedField === 'rootEventId' ? (
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
              {thread.rootEventId}
            </div>
          </div>

          {/* Room ID */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-slate-400">Room ID</label>
              <button
                onClick={() => copyToClipboard(thread.roomId, 'roomId')}
                className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
              >
                {copiedField === 'roomId' ? (
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
              {thread.roomId}
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-400 block mb-1">Created</label>
              <div className="bg-slate-900 p-2 rounded text-xs text-slate-300">
                {new Date(thread.createdAt).toLocaleString()}
              </div>
            </div>
            {thread.updatedAt && (
              <div>
                <label className="text-sm font-semibold text-slate-400 block mb-1">Updated</label>
                <div className="bg-slate-900 p-2 rounded text-xs text-slate-300">
                  {new Date(thread.updatedAt).toLocaleString()}
                </div>
              </div>
            )}
          </div>

          {/* Created By */}
          {thread.createdBy && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-semibold text-slate-400">Created By</label>
                <button
                  onClick={() => copyToClipboard(thread.createdBy!, 'createdBy')}
                  className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                >
                  {copiedField === 'createdBy' ? (
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
                {thread.createdBy}
              </div>
            </div>
          )}

          {/* Matrix Native */}
          <div>
            <label className="text-sm font-semibold text-slate-400 block mb-1">Matrix Native Threading</label>
            <div className="bg-slate-900 p-3 rounded text-sm">
              {thread.isMatrixNative ? (
                <span className="text-green-400 font-medium">✅ Enabled - Syncs across all Matrix clients</span>
              ) : (
                <span className="text-yellow-400 font-medium">⚠️ Local only - Not synced to Matrix</span>
              )}
            </div>
          </div>

          {/* Topics */}
          {thread.topics.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-slate-400 block mb-2">Topics</label>
              <div className="flex flex-wrap gap-2">
                {thread.topics.map((topic) => (
                  <span
                    key={topic}
                    className="text-xs bg-primary-500/20 text-primary-300 px-2 py-1 rounded-full"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {thread.tags.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-slate-400 block mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {thread.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Statistics */}
          {analysis && (
            <div>
              <label className="text-sm font-semibold text-slate-400 block mb-2">Statistics</label>
              <div className="bg-slate-900 p-3 rounded space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Messages:</span>
                  <span className="text-white font-medium">{analysis.messageCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Participants:</span>
                  <span className="text-white font-medium">{analysis.participantCount}</span>
                </div>
                {analysis.branchCount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Branches:</span>
                    <span className="text-white font-medium">{analysis.branchCount}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Participants */}
          {thread.participants.size > 0 && (
            <div>
              <label className="text-sm font-semibold text-slate-400 block mb-2">Participants</label>
              <div className="bg-slate-900 p-3 rounded space-y-1">
                {Array.from(thread.participants).map((userId) => (
                  <div key={userId} className="text-xs font-mono text-slate-300">
                    {userId}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw JSON */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-slate-400">Raw Thread JSON</label>
              <button
                onClick={() => copyToClipboard(rawThreadJson, 'rawJson')}
                className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
              >
                {copiedField === 'rawJson' ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy JSON
                  </>
                )}
              </button>
            </div>
            <div className="bg-slate-900 p-3 rounded text-xs text-slate-300 overflow-x-auto max-h-60">
              <pre className="whitespace-pre-wrap break-words">{rawThreadJson}</pre>
            </div>
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

export default ThreadMetadataModal;
