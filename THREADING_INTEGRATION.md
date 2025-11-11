# Threading System Integration Guide

## Quick Start: How to Use Threads in the UI

### 1. Basic Setup in Your Component

```typescript
import { useThreads } from './hooks/useThreads';

function MyComponent() {
  const {
    threads,
    selectedThread,
    setSelectedThread,
    createThread,
    linkMessage,
    getThreadsInRoom,
  } = useThreads();

  // Now you have access to all threading functionality!
  return (
    // ... your component
  );
}
```

### 2. Starting a Thread

#### Option A: Manual Thread Creation
```typescript
const handleCreateThread = () => {
  const thread = createThread(
    currentRoom.roomId,
    'Q4 Planning Discussion',
    'Discussing Q4 goals and timeline'
  );
  setSelectedThread(thread);
};

return (
  <button onClick={handleCreateThread} className="btn">
    + New Thread
  </button>
);
```

#### Option B: Auto-Link Messages to Threads
When a new message arrives, automatically link it:

```typescript
// In your message handler
const handleNewMessage = (matrixEvent: MatrixEvent) => {
  // Convert Matrix event to ThreadMessage
  const threadMessage: ThreadMessage = {
    id: matrixEvent.getId() || `msg-${Date.now()}`,
    eventId: matrixEvent.getId() || '',
    source: 'matrix',
    sender: {
      id: matrixEvent.getSender() || 'unknown',
      name: matrixEvent.getSender()?.split(':')[0] || 'Unknown',
    },
    content: matrixEvent.getContent().body || '',
    timestamp: matrixEvent.getTs(),
    contextualObjects: [],
    matrixEvent: matrixEvent,
  };

  // Auto-link to thread
  const result = linkMessage(threadMessage, currentRoom.roomId);
  
  console.log(`Message linked to thread: ${result.threadId}`);
  if (result.branchId) {
    console.log(`New branch created: ${result.branchId}`);
  }
};
```

### 3. Displaying Threads in UI

#### Show Thread List for Current Room
```typescript
function ThreadList() {
  const { getThreadsInRoom, setSelectedThread } = useThreads();
  const { currentRoom } = useMatrix();

  if (!currentRoom) return null;

  const roomThreads = getThreadsInRoom(currentRoom.roomId);

  return (
    <div className="thread-list">
      <h3>Threads ({roomThreads.length})</h3>
      {roomThreads.map((thread) => (
        <button
          key={thread.id}
          onClick={() => setSelectedThread(thread)}
          className="thread-item"
        >
          <div className="font-semibold">{thread.title}</div>
          <div className="text-sm text-gray-500">
            {thread.messages.size} messages • {thread.participants.size} people
          </div>
        </button>
      ))}
    </div>
  );
}
```

#### Display Selected Thread
```typescript
import { ThreadView } from './components/ThreadView';

function ChatView() {
  const { selectedThread, setSelectedThread } = useThreads();

  return (
    <div className="flex gap-4">
      {/* Main chat area */}
      <div className="flex-1">
        <MessageTimeline />
      </div>

      {/* Thread panel */}
      {selectedThread && (
        <div className="w-96 border-l">
          <ThreadView
            thread={selectedThread}
            onClose={() => setSelectedThread(null)}
          />
        </div>
      )}
    </div>
  );
}
```

### 4. Context Menu: Thread Actions

Add a context menu to messages for thread operations:

```typescript
function MessageContextMenu({ message, threadId }) {
  const {
    createBranch,
    attachContextualObject,
    getThreadAnalysis,
  } = useThreads();

  const handleCreateBranch = () => {
    const branch = createBranch(
      threadId,
      message.id,
      'New Discussion',
      'Starting a new subtopic'
    );
    console.log('Branch created:', branch?.id);
  };

  const handleAttachLink = () => {
    attachContextualObject(threadId, message.id, {
      id: `link-${Date.now()}`,
      type: 'link',
      title: 'Relevant Article',
      url: 'https://example.com',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  return (
    <div className="context-menu">
      <button onClick={handleCreateBranch}>
        🌿 Create Branch
      </button>
      <button onClick={handleAttachLink}>
        📎 Attach Link
      </button>
    </div>
  );
}
```

### 5. Thread Sidebar Component

Here's a complete sidebar component:

```typescript
import React from 'react';
import { useThreads } from '../hooks/useThreads';
import { useMatrix } from '../MatrixContext';
import { MessageSquare, Plus, Archive } from 'lucide-react';

export const ThreadSidebar: React.FC = () => {
  const { currentRoom } = useMatrix();
  const {
    getThreadsInRoom,
    selectedThread,
    setSelectedThread,
    createThread,
    archiveThread,
  } = useThreads();

  if (!currentRoom) return null;

  const threads = getThreadsInRoom(currentRoom.roomId);
  const activeThreads = threads.filter((t) => !t.archivedAt);

  const handleNewThread = () => {
    const title = prompt('Thread title:');
    if (title) {
      const thread = createThread(currentRoom.roomId, title);
      setSelectedThread(thread);
    }
  };

  return (
    <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Threads
        </h2>
        <button
          onClick={handleNewThread}
          className="p-1 hover:bg-slate-700 rounded transition"
          title="New thread"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {activeThreads.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-sm">
            No threads yet. Create one to get started!
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {activeThreads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => setSelectedThread(thread)}
                className={`w-full text-left p-3 rounded-lg transition ${
                  selectedThread?.id === thread.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <div className="font-medium truncate">{thread.title}</div>
                <div className="text-xs opacity-75 mt-1">
                  {thread.messages.size} messages
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {selectedThread && (
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={() => {
              archiveThread(selectedThread.id);
              setSelectedThread(null);
            }}
            className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition flex items-center justify-center gap-2"
          >
            <Archive className="w-4 h-4" />
            Archive Thread
          </button>
        </div>
      )}
    </div>
  );
};
```

### 6. Integrating into Main App Layout

Update your `App.tsx`:

```typescript
import { ThreadSidebar } from './components/ThreadSidebar';
import { ThreadView } from './components/ThreadView';

const ChatApp: React.FC = () => {
  const { isLoggedIn, isLoading } = useMatrix();
  const { selectedThread } = useThreads();

  if (!isLoggedIn) return <Login />;

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

      {/* Thread Sidebar */}
      <ThreadSidebar />

      {/* Thread Detail Panel (optional, can be modal or side panel) */}
      {selectedThread && (
        <div className="w-96 border-l border-slate-700">
          <ThreadView thread={selectedThread} />
        </div>
      )}
    </div>
  );
};
```

### 7. Auto-Linking Messages on Receive

Update `MessageTimeline.tsx` to auto-link messages:

```typescript
import { useThreads } from '../hooks/useThreads';

const MessageTimeline: React.FC = () => {
  const { currentRoom, client } = useMatrix();
  const { linkMessage } = useThreads();
  const [messages, setMessages] = useState<MatrixEvent[]>([]);

  useEffect(() => {
    if (!currentRoom) return;

    const updateMessages = () => {
      const timelineEvents = currentRoom.getLiveTimeline().getEvents();
      const messageEvents = timelineEvents.filter(
        (event) => event.getType() === 'm.room.message'
      );
      setMessages(messageEvents);

      // Auto-link new messages to threads
      messageEvents.forEach((event) => {
        const threadMessage: ThreadMessage = {
          id: event.getId() || `msg-${Date.now()}`,
          eventId: event.getId() || '',
          source: 'matrix',
          sender: {
            id: event.getSender() || 'unknown',
            name: event.getSender()?.split(':')[0] || 'Unknown',
          },
          content: event.getContent().body || '',
          timestamp: event.getTs(),
          contextualObjects: [],
          matrixEvent: event,
        };

        linkMessage(threadMessage, currentRoom.roomId);
      });
    };

    updateMessages();

    const handleTimeline = () => updateMessages();
    client?.on('Room.timeline' as any, handleTimeline);

    return () => {
      client?.removeListener('Room.timeline' as any, handleTimeline);
    };
  }, [currentRoom, client, linkMessage]);

  // ... rest of component
};
```

## UI Patterns

### Pattern 1: Side Panel (Recommended)
```
┌─────────────────────────────────────────┐
│ Rooms │ Messages │ Threads │ Thread Detail │
└─────────────────────────────────────────┘
```

### Pattern 2: Modal
```
┌─────────────────────────────────────────┐
│ Rooms │ Messages │ Threads              │
│       │          │ ┌──────────────────┐ │
│       │          │ │ Thread Detail    │ │
│       │          │ │ (Modal)          │ │
│       │          │ └──────────────────┘ │
└─────────────────────────────────────────┘
```

### Pattern 3: Inline (Compact)
```
┌─────────────────────────────────────────┐
│ Rooms │ Messages (with thread indicators)│
│       │ [Thread 1] Message 1            │
│       │ [Thread 2] Message 2            │
│       │ [Thread 1] Message 3            │
└─────────────────────────────────────────┘
```

## Common Tasks

### Task 1: Show Thread Badge on Messages
```typescript
function Message({ event, threadId }) {
  return (
    <div className="message">
      {threadId && (
        <span className="badge bg-primary-500 text-white text-xs px-2 py-1 rounded">
          Thread
        </span>
      )}
      <p>{event.getContent().body}</p>
    </div>
  );
}
```

### Task 2: Quick Summary on Hover
```typescript
function MessageWithSummary({ event, threadId }) {
  const { getKeyPoints } = useThreads();
  const [keyPoints, setKeyPoints] = useState<string[]>([]);

  const handleHover = () => {
    if (threadId) {
      setKeyPoints(getKeyPoints(threadId));
    }
  };

  return (
    <div onMouseEnter={handleHover} className="message">
      <p>{event.getContent().body}</p>
      {keyPoints.length > 0 && (
        <div className="tooltip">
          {keyPoints.map((point) => (
            <div key={point} className="text-sm">• {point}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Task 3: Thread Notifications
```typescript
function ThreadNotifications() {
  const { threads } = useThreads();

  const unreadThreads = threads.filter(
    (t) => t.messages.size > 0 && !t.archivedAt
  );

  return (
    <div className="notification-badge">
      {unreadThreads.length > 0 && (
        <span className="badge">{unreadThreads.length}</span>
      )}
    </div>
  );
}
```

## Next Steps

1. **Add ThreadSidebar to your App.tsx** - Shows all threads for current room
2. **Update MessageTimeline** - Auto-link messages as they arrive
3. **Add context menu** - Right-click on messages to create branches
4. **Customize ThreadView** - Adjust styling to match your design
5. **Add persistence** - Store threads in IndexedDB for persistence across sessions

## Troubleshooting

### Messages not linking to threads?
- Check that `linkMessage` is being called with correct `roomId`
- Verify `ThreadMessage` object has all required fields
- Check browser console for linking algorithm debug info

### Branches not being created?
- Ensure message content includes branch keywords (but, however, alternatively, etc.)
- Check `shouldCreateBranch()` logic in ThreadManager
- Manually create branch with `createBranch()` if auto-detection fails

### Performance issues?
- Archive old threads to reduce active set
- Increase `similarityThreshold` to reduce linking
- Use batch `linkMessages()` instead of individual calls

