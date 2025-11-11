import React, { useState, useEffect } from 'react';
import { useThreads } from '../contexts/ThreadsContext';
import { useMatrix } from '../MatrixContext';
import { Thread, ThreadMessage, ThreadBranch } from '../types/thread';
import { ChevronDown, ChevronRight, Tag, Users, MessageSquare, Zap, Archive, Trash2 } from 'lucide-react';
import ThreadMessageInput from './ThreadMessageInput';

/**
 * ThreadView Component
 * Displays a thread with its messages, branches, and metadata
 * Demonstrates practical usage of the threading system
 */
interface ThreadViewProps {
  thread: Thread;
  onClose?: () => void;
}

export const ThreadView: React.FC<ThreadViewProps> = ({ thread: initialThread, onClose }) => {
  const {
    getKeyPoints,
    getActionItems,
    getThreadAnalysis,
    summarizeThread,
    archiveThread,
    deleteThread,
    threadManager,
  } = useThreads();
  const { client, currentRoom } = useMatrix();

  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [actionItems, setActionItems] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [localThread, setLocalThread] = useState<Thread>(initialThread);

  // Update local thread when refreshKey changes
  useEffect(() => {
    console.log(`🔍 Looking for thread: ${initialThread.id}`);
    const latestThread = threadManager?.getThread(initialThread.id);
    console.log(`🔍 Found thread:`, latestThread ? 'YES' : 'NO');
    
    if (latestThread) {
      console.log(`🔍 Thread has ${latestThread.messages.size} messages`);
      console.log(`🔍 Main branch has ${latestThread.mainBranch.messageIds.length} message IDs`);
      
      // Deep clone to ensure React detects the change
      const clonedThread = {
        ...latestThread,
        messages: new Map(latestThread.messages),
        branches: new Map(latestThread.branches),
        participants: new Set(latestThread.participants),
        relatedThreadIds: new Set(latestThread.relatedThreadIds),
        // Clone mainBranch with new array reference
        mainBranch: {
          ...latestThread.mainBranch,
          messageIds: [...latestThread.mainBranch.messageIds],
        },
      };
      setLocalThread(clonedThread);
      console.log(`🔄 Thread updated: ${clonedThread.messages.size} messages, ${clonedThread.mainBranch.messageIds.length} in main branch`);
    } else {
      console.error(`❌ Thread not found in manager!`);
    }
  }, [threadManager, initialThread.id, refreshKey]);

  const thread = localThread;

  // Listen for room timeline updates to refresh thread
  useEffect(() => {
    if (!client || !currentRoom) return;

    const handleTimeline = () => {
      // Force refresh when room timeline changes
      setRefreshKey((prev) => prev + 1);
    };

    client.on('Room.timeline' as any, handleTimeline);

    return () => {
      client.removeListener('Room.timeline' as any, handleTimeline);
    };
  }, [client, currentRoom]);

  // Load analysis on mount and when refreshKey changes
  useEffect(() => {
    if (!thread?.id) return;
    
    try {
      const kp = getKeyPoints(thread.id);
      const ai = getActionItems(thread.id);
      const analysis = getThreadAnalysis(thread.id);
      
      setKeyPoints(kp || []);
      setActionItems(ai || []);
      setAnalysis(analysis);
    } catch (error) {
      console.error('Error loading thread analysis:', error);
    }
  }, [thread.id, getKeyPoints, getActionItems, getThreadAnalysis, refreshKey]);

  const toggleBranch = (branchId: string) => {
    const newExpanded = new Set(expandedBranches);
    if (newExpanded.has(branchId)) {
      newExpanded.delete(branchId);
    } else {
      newExpanded.add(branchId);
    }
    setExpandedBranches(newExpanded);
  };

  const handleLoadSummary = async () => {
    setIsLoadingSummary(true);
    try {
      // Use local summary (no AI cost)
      const localSummary = await summarizeThread(thread.id, false);
      setSummary(localSummary);
      setShowSummary(true);
    } catch (error) {
      console.error('Failed to load summary:', error);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleArchive = () => {
    archiveThread(thread.id);
    onClose?.();
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${thread.title}"? This cannot be undone.`)) {
      deleteThread(thread.id);
      onClose?.();
    }
  };

  const renderMessage = (message: ThreadMessage) => (
    <div key={message.id} className="p-2 bg-slate-900/50 rounded-lg mb-1.5 border-l-2 border-primary-500">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-semibold">
            {message.sender.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-medium text-white">{message.sender.name}</p>
            <p className="text-xs text-slate-400">
              {new Date(message.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="flex gap-1">
            {Object.entries(message.reactions).map(([emoji, count]) => (
              <span key={emoji} className="text-xs bg-slate-800 px-2 py-1 rounded">
                {emoji} {count}
              </span>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-slate-200 mb-1">{message.content}</p>
      {message.contextualObjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {message.contextualObjects.map((obj) => (
            <a
              key={obj.id}
              href={obj.url}
              className="text-xs bg-primary-500/20 text-primary-300 px-2 py-1 rounded hover:bg-primary-500/30 transition"
              title={obj.title}
            >
              📎 {obj.title}
            </a>
          ))}
        </div>
      )}
    </div>
  );

  const renderBranch = (branch: ThreadBranch, depth: number = 0) => {
    const isExpanded = expandedBranches.has(branch.id);
    const messages = branch.messageIds
      .map((id) => thread.messages.get(id))
      .filter((msg): msg is ThreadMessage => msg !== undefined);

    return (
      <div key={branch.id} className={`ml-${depth * 4}`}>
        <button
          onClick={() => toggleBranch(branch.id)}
          className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-700/30 transition rounded text-left"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
          <span className="text-sm font-medium text-slate-300">{branch.topic}</span>
          <span className="text-xs text-slate-500">({messages.length})</span>
        </button>
        {isExpanded && (
          <div className="pl-4 mt-2">
            {messages.map((msg) => renderMessage(msg))}
          </div>
        )}
      </div>
    );
  };

  const mainMessages = thread.mainBranch.messageIds
    .map((id) => thread.messages.get(id))
    .filter((msg): msg is ThreadMessage => msg !== undefined);

  console.log(`📊 Rendering: ${mainMessages.length} messages in Main Discussion`);
  console.log(`📊 Message IDs:`, thread.mainBranch.messageIds);
  console.log(`📊 Messages map size:`, thread.messages.size);

  return (
    <div className="flex flex-col h-full w-full bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-2 border-b border-slate-700 flex-shrink-0 overflow-y-auto max-h-20">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white truncate">{thread.title}</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition flex-shrink-0 ml-2"
            >
              ✕
            </button>
          )}
        </div>

        {/* Metadata - Ultra Compact */}
        {analysis && (
          <div className="flex gap-2 text-xs mt-1">
            <span className="text-slate-400">💬 {analysis.messageCount}</span>
            <span className="text-slate-400">👥 {analysis.participantCount}</span>
            {analysis.branchCount > 0 && <span className="text-slate-400">🌿 {analysis.branchCount}</span>}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Topics and Tags - Compact */}
        {thread.topics.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {thread.topics.slice(0, 3).map((topic) => (
              <span
                key={topic}
                className="text-xs bg-primary-500/20 text-primary-300 px-1.5 py-0.5 rounded-full"
              >
                #{topic}
              </span>
            ))}
          </div>
        )}

        {/* Main Branch Messages */}
        <div className="mb-3">
          <h3 className="text-xs font-semibold text-white mb-2">Main Discussion</h3>
          {mainMessages.length > 0 ? (
            mainMessages.map((msg) => renderMessage(msg))
          ) : (
            <p className="text-sm text-slate-400">No messages yet</p>
          )}
        </div>

        {/* Branches */}
        {thread.branches.size > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white mb-3">Subtopics</h3>
            {Array.from(thread.branches.values()).map((branch) =>
              renderBranch(branch)
            )}
          </div>
        )}

        {/* Key Points */}
        {keyPoints.length > 0 && (
          <div className="mb-6 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
            <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              Key Points
            </h4>
            <ul className="space-y-1">
              {keyPoints.map((point, idx) => (
                <li key={idx} className="text-sm text-slate-300">
                  • {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Items */}
        {actionItems.length > 0 && (
          <div className="mb-6 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
            <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              Action Items
            </h4>
            <ul className="space-y-1">
              {actionItems.map((item, idx) => (
                <li key={idx} className="text-sm text-slate-300">
                  ☐ {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Summary Section */}
        {showSummary && summary && (
          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700 mb-6">
            <h4 className="text-sm font-semibold text-white mb-2">Summary</h4>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{summary}</p>
          </div>
        )}
      </div>

      {/* Message Input */}
      <ThreadMessageInput 
        threadId={thread.id}
        onMessageAdded={() => {
          // Trigger re-render to show new message immediately
          setRefreshKey((prev) => prev + 1);
        }}
      />

      {/* Footer */}
      <div className="p-2 border-t border-slate-700 flex-shrink-0 flex gap-2">
        {!showSummary && (
          <button
            onClick={handleLoadSummary}
            disabled={isLoadingSummary}
            className="flex-1 px-2 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-600 text-white text-xs font-medium rounded transition"
          >
            {isLoadingSummary ? 'Loading...' : 'Summary'}
          </button>
        )}
        <button
          onClick={handleArchive}
          className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded transition flex items-center gap-1"
          title="Archive thread"
        >
          <Archive className="w-3 h-3" />
          Archive
        </button>
        <button
          onClick={handleDelete}
          className="px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition flex items-center gap-1"
          title="Delete thread permanently"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>
    </div>
  );
};

export default ThreadView;
