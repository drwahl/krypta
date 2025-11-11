import React, { useState, useEffect } from 'react';
import { useThreads } from '../contexts/ThreadsContext';
import { useMatrix } from '../MatrixContext';
import { MessageSquare, Plus, Archive, X, ChevronDown, ChevronRight } from 'lucide-react';
import { ThreadView } from './ThreadView';

/**
 * ThreadSidebar Component
 * Displays threads for the current room and allows thread management
 * Can be toggled on/off for responsive design
 */
export const ThreadSidebar: React.FC<{ isOpen?: boolean; onClose?: () => void }> = ({
  isOpen = true,
  onClose,
}) => {
  const { currentRoom } = useMatrix();
  const {
    getThreadsInRoom,
    selectedThread,
    setSelectedThread,
    createThread,
    updateTrigger,
  } = useThreads();

  const [showNewThreadForm, setShowNewThreadForm] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadDescription, setNewThreadDescription] = useState('');
  const [isThreadListExpanded, setIsThreadListExpanded] = useState(true);

  const threads = currentRoom ? getThreadsInRoom(currentRoom.roomId) : [];
  const activeThreads = threads.filter((t) => !t.archivedAt);

  // Update selectedThread when threads change
  useEffect(() => {
    console.log(`🔍 ThreadSidebar useEffect triggered`);
    if (selectedThread && currentRoom) {
      console.log(`🔍 Looking for updated thread: ${selectedThread.id}`);
      console.log(`🔍 Current selectedThread has ${selectedThread.messages.size} messages`);
      
      const updatedThread = threads.find(t => t.id === selectedThread.id);
      console.log(`🔍 Found updated thread:`, updatedThread ? 'YES' : 'NO');
      
      if (updatedThread) {
        console.log(`🔍 Updated thread has ${updatedThread.messages.size} messages`);
        console.log(`🔍 Are they the same object?`, updatedThread === selectedThread);
        
        if (updatedThread !== selectedThread) {
          console.log(`🔄 Updating selected thread in sidebar: ${updatedThread.messages.size} messages`);
          setSelectedThread(updatedThread);
        }
      }
    }
  }, [threads, selectedThread, setSelectedThread, currentRoom, updateTrigger]);

  if (!currentRoom) return null;

  const handleCreateThread = () => {
    if (newThreadTitle.trim()) {
      const thread = createThread(
        currentRoom.roomId,
        newThreadTitle,
        newThreadDescription || undefined
      );
      setSelectedThread(thread);
      setNewThreadTitle('');
      setNewThreadDescription('');
      setShowNewThreadForm(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-72 bg-slate-800 border-l border-slate-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-2.5 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
        <h2 className="font-bold text-white flex items-center gap-1.5 text-sm">
          <MessageSquare className="w-4 h-4 text-primary-400" />
          Threads
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowNewThreadForm(true)}
            className="p-1 hover:bg-slate-700 rounded transition text-slate-400 hover:text-white"
            title="New thread"
          >
            <Plus className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-700 rounded transition text-slate-400 hover:text-white"
              title="Close threads"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* New Thread Form */}
      {showNewThreadForm && (
        <div className="p-2 border-b border-slate-700 bg-slate-900/50 flex-shrink-0">
          <input
            type="text"
            placeholder="Title..."
            value={newThreadTitle}
            onChange={(e) => setNewThreadTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateThread();
              if (e.key === 'Escape') setShowNewThreadForm(false);
            }}
            className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 mb-1.5 text-xs"
            autoFocus
          />
          <textarea
            placeholder="Description (optional)..."
            value={newThreadDescription}
            onChange={(e) => setNewThreadDescription(e.target.value)}
            className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 mb-1.5 text-xs resize-none h-12"
          />
          <div className="flex gap-1.5">
            <button
              onClick={handleCreateThread}
              className="flex-1 px-2 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded transition"
            >
              Create
            </button>
            <button
              onClick={() => setShowNewThreadForm(false)}
              className="flex-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Thread List - Collapsible */}
      <div className={`border-b border-slate-700 flex-shrink-0 overflow-hidden transition-all ${
        isThreadListExpanded ? 'max-h-64' : 'max-h-10'
      }`}>
        <button
          onClick={() => setIsThreadListExpanded(!isThreadListExpanded)}
          className="w-full p-2 flex items-center gap-2 hover:bg-slate-700/30 transition text-left"
        >
          {isThreadListExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
          )}
          <span className="text-xs font-medium text-slate-300">
            Threads ({activeThreads.length})
          </span>
        </button>

        {isThreadListExpanded && (
          <div className="overflow-y-auto max-h-56">
            {activeThreads.length === 0 ? (
              <div className="p-3 text-center text-slate-400 text-xs">
                {threads.length === 0 ? (
                  <>
                    <p>No threads yet</p>
                    <p className="text-xs mt-1">Create one to organize conversations</p>
                  </>
                ) : (
                  <p>All threads archived</p>
                )}
              </div>
            ) : (
              <div className="p-1.5 space-y-1.5">
                {activeThreads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThread(thread)}
                    className={`w-full text-left p-2 rounded-lg transition ${
                      selectedThread?.id === thread.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <div className="font-medium truncate text-xs">{thread.title}</div>
                    <div className="text-xs opacity-75 mt-0.5 space-y-0">
                      <div>💬 {thread.messages.size} • 👥 {thread.participants.size}</div>
                      {thread.topics.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-0.5">
                          {thread.topics.slice(0, 1).map((topic) => (
                            <span
                              key={topic}
                              className="bg-slate-600/50 px-1 py-0 rounded text-xs"
                            >
                              #{topic}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Thread Detail Panel - Full Height */}
      {selectedThread && (
        <div className="flex-1 overflow-hidden">
          <ThreadView
            thread={selectedThread}
            onClose={() => setSelectedThread(null)}
          />
        </div>
      )}
    </div>
  );
};

export default ThreadSidebar;
