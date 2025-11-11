# Threading System - Cheat Sheet

## Quick Reference

### Starting a Thread
```
Click [+] in Thread Sidebar
  ↓
Enter title & description
  ↓
Click "Create"
  ↓
Thread appears in list
```

### Auto-Linking Messages
```
Send message in room
  ↓
ThreadLinker analyzes content
  ↓
Matches to existing thread OR creates new one
  ↓
If branch keyword detected → new branch created
```

### Viewing Thread Details
```
Click thread in sidebar
  ↓
Detail panel opens on right
  ↓
See all messages, branches, metadata
  ↓
Click "Load Summary" for AI analysis
```

### Creating a Branch
```
Right-click message in thread
  ↓
Select "Create Branch"
  ↓
Enter branch name
  ↓
New branch appears in thread
```

### Attaching Context
```
Right-click message
  ↓
Select "Attach Link"
  ↓
Enter title, URL, type
  ↓
Link appears as badge on message
```

## Code Examples

### Access Threads in Component
```typescript
import { useThreads } from './hooks/useThreads';

function MyComponent() {
  const {
    threads,
    selectedThread,
    setSelectedThread,
    createThread,
    linkMessage,
    getKeyPoints,
    getActionItems,
    summarizeThread,
  } = useThreads();
}
```

### Create Thread
```typescript
const thread = createThread(
  roomId,
  'Thread Title',
  'Optional description'
);
setSelectedThread(thread);
```

### Link Message
```typescript
const result = linkMessage(threadMessage, roomId);
console.log(result.threadId);      // Thread ID
console.log(result.isNew);         // New thread?
console.log(result.branchId);      // Branch ID if created
```

### Get Thread Info
```typescript
const keyPoints = getKeyPoints(threadId);
const actionItems = getActionItems(threadId);
const analysis = getThreadAnalysis(threadId);

console.log(analysis.messageCount);
console.log(analysis.participantCount);
console.log(analysis.branchCount);
```

### Get Summary
```typescript
// Local summary (free)
const summary = await summarizeThread(threadId, false);

// AI summary (with cost)
const aiSummary = await summarizeThread(
  threadId,
  true,
  async (content) => {
    // Call your AI provider
    return await openai.summarize(content);
  }
);
```

### Create Branch
```typescript
const branch = createBranch(
  threadId,
  parentMessageId,
  'Branch Topic',
  'Optional description'
);
```

### Attach Context
```typescript
attachContextualObject(threadId, messageId, {
  id: 'obj1',
  type: 'link',
  title: 'Important Document',
  url: 'https://example.com/doc',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
```

## UI Components

### ThreadSidebar
```typescript
import { ThreadSidebar } from './components/ThreadSidebar';

<ThreadSidebar 
  isOpen={true}
  onClose={() => setShowThreads(false)}
/>
```

### ThreadView
```typescript
import { ThreadView } from './components/ThreadView';

<ThreadView
  thread={selectedThread}
  onClose={() => setSelectedThread(null)}
/>
```

### useThreads Hook
```typescript
import { useThreads } from './hooks/useThreads';

const {
  threads,
  selectedThread,
  setSelectedThread,
  isLoading,
  // ... all methods
} = useThreads();
```

## Data Types

### Thread
```typescript
{
  id: string
  roomId: string
  title: string
  description?: string
  participants: Set<string>
  tags: string[]
  topics: string[]
  messages: Map<string, ThreadMessage>
  mainBranch: ThreadBranch
  branches: Map<string, ThreadBranch>
  relatedThreadIds: Set<string>
  summary?: string
  keyPoints?: string[]
  actionItems?: string[]
  createdAt: number
  updatedAt: number
  archivedAt?: number
}
```

### ThreadMessage
```typescript
{
  id: string
  eventId: string
  source: 'matrix' | 'email' | 'sms' | 'slack' | 'custom'
  sender: { id: string; name: string; avatar?: string }
  content: string
  timestamp: number
  edited?: number
  reactions?: Record<string, number>
  contextualObjects: ContextualObject[]
  matrixEvent?: MatrixEvent
  metadata?: Record<string, any>
}
```

### ThreadBranch
```typescript
{
  id: string
  parentMessageId?: string
  topic?: string
  description?: string
  createdAt: number
  messageIds: string[]
}
```

### ContextualObject
```typescript
{
  id: string
  type: 'document' | 'link' | 'note' | 'task' | 'code' | 'image' | 'file'
  title: string
  url?: string
  content?: string
  metadata?: Record<string, any>
  createdAt: number
  updatedAt: number
}
```

## Configuration

### ThreadManager Options
```typescript
new ThreadManager({
  similarityThreshold: 0.6,        // 0-1, lower = more aggressive
  branchKeywords: [                // Words that trigger branches
    'but', 'however', 'alternatively',
    'on the other hand', 'meanwhile'
  ],
  contextWindow: 5 * 60 * 1000,   // 5 minutes
  useLocalLinking: true,           // Use local AI
})
```

### ThreadLinker Config
```typescript
threadLinker.registerSourceHandler('email', (emailData) => ({
  id: emailData.messageId,
  eventId: emailData.messageId,
  source: 'email',
  sender: {
    id: emailData.from,
    name: emailData.fromName,
    avatar: emailData.avatar,
  },
  content: emailData.body,
  timestamp: emailData.date.getTime(),
  contextualObjects: [],
}));
```

## Common Patterns

### Pattern 1: Auto-Link on Message Receive
```typescript
useEffect(() => {
  if (!currentRoom) return;

  const handleNewMessage = (event: MatrixEvent) => {
    const threadMessage = convertToThreadMessage(event);
    linkMessage(threadMessage, currentRoom.roomId);
  };

  client?.on('Room.timeline', handleNewMessage);
  return () => client?.removeListener('Room.timeline', handleNewMessage);
}, [currentRoom, client, linkMessage]);
```

### Pattern 2: Show Thread Badge on Messages
```typescript
function Message({ event, threadId }) {
  return (
    <div>
      {threadId && (
        <span className="badge">Thread</span>
      )}
      <p>{event.getContent().body}</p>
    </div>
  );
}
```

### Pattern 3: Quick Summary on Hover
```typescript
function MessageWithSummary({ threadId }) {
  const { getKeyPoints } = useThreads();
  const [keyPoints, setKeyPoints] = useState<string[]>([]);

  const handleHover = () => {
    if (threadId) {
      setKeyPoints(getKeyPoints(threadId));
    }
  };

  return (
    <div onMouseEnter={handleHover}>
      {keyPoints.length > 0 && (
        <div className="tooltip">
          {keyPoints.map((p) => <div key={p}>• {p}</div>)}
        </div>
      )}
    </div>
  );
}
```

### Pattern 4: Thread Notifications
```typescript
function ThreadNotifications() {
  const { threads } = useThreads();
  const unreadCount = threads.filter(
    (t) => t.messages.size > 0 && !t.archivedAt
  ).length;

  return (
    <span className="badge">{unreadCount}</span>
  );
}
```

## Keyboard Shortcuts (Planned)

| Shortcut | Action |
|----------|--------|
| `Ctrl+T` | Create new thread |
| `Esc` | Close thread detail |
| `Ctrl+F` | Search threads |
| `Ctrl+A` | Archive thread |
| `Ctrl+B` | Create branch |

## Performance Tips

### ✅ Do This
- Archive old threads
- Use batch `linkMessages()`
- Increase `similarityThreshold`
- Cache AI summaries
- Lazy load thread details

### ❌ Don't Do This
- Link every message individually
- Call AI summarization repeatedly
- Keep all threads active
- Store full message content
- Process in real-time without batching

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Sidebar not showing | Click floating button (💬) |
| Messages not linking | Check linkMessage is called |
| No branches created | Message needs branch keywords |
| Performance slow | Archive old threads |
| Summary not working | Configure AI provider |

## File Locations

| File | Purpose |
|------|---------|
| `src/types/thread.ts` | Type definitions |
| `src/services/threadManager.ts` | Thread management |
| `src/services/threadLinker.ts` | Message linking |
| `src/services/threadSummarizer.ts` | Analysis |
| `src/hooks/useThreads.ts` | React hook |
| `src/components/ThreadSidebar.tsx` | Sidebar UI |
| `src/components/ThreadView.tsx` | Detail panel |

## Documentation

| Doc | Content |
|-----|---------|
| `THREADING.md` | Complete API |
| `THREADING_INTEGRATION.md` | Integration guide |
| `THREADING_QUICK_START.md` | Quick reference |
| `THREADING_ARCHITECTURE.md` | System design |
| `THREADING_UI_GUIDE.md` | User guide |
| `THREADING_SUMMARY.md` | Overview |
| `THREADING_CHEATSHEET.md` | This file |

## API Quick Reference

### ThreadManager Methods
```
createThread(id, roomId, title, description?)
addMessageToThread(threadId, message, branchId?)
createBranch(threadId, parentMessageId, topic, description?)
mergeBranches(threadId, sourceBranchId, targetBranchId)
attachContextualObject(threadId, messageId, object)
detectRelatedMessages(messages, referenceMessage)
shouldCreateBranch(message)
extractTopics(content)
getThread(threadId)
getThreadByMessageId(messageId)
getAllThreads()
getThreadsInRoom(roomId)
linkThreads(threadId1, threadId2)
getRelatedThreads(threadId)
archiveThread(threadId)
deleteThread(threadId)
getThreadStats(threadId)
```

### ThreadLinker Methods
```
linkMessage(message, roomId, existingThreads?)
linkMessages(messages, roomId)
registerSourceHandler(source, handler)
convertToThreadMessage(source, event)
```

### ThreadSummarizer Methods
```
summarizeThread(thread, useAI?, aiProvider?)
extractKeyPoints(thread)
extractActionItems(thread)
getThreadAnalysis(thread)
findRelatedThreads(thread, allThreads, threshold?)
clearCache(threadId)
clearAllCache()
```

### useThreads Hook Methods
```
createThread(roomId, title, description?)
addMessage(threadId, message, branchId?)
linkMessage(message, roomId)
linkMessages(messages, roomId)
createBranch(threadId, parentMessageId, topic, description?)
mergeBranches(threadId, sourceBranchId, targetBranchId)
attachContextualObject(threadId, messageId, object)
summarizeThread(threadId, useAI?, aiProvider?)
getKeyPoints(threadId)
getActionItems(threadId)
getThreadAnalysis(threadId)
getRelatedThreads(threadId)
archiveThread(threadId)
deleteThread(threadId)
getThreadsInRoom(roomId)
```

---

**Print this page for quick reference!** 📋
