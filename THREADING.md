# NyChatt Threading System

A sophisticated semantic conversation model that organizes messages into intelligent containers with support for multiple sources, branching, and on-demand AI analysis.

## Overview

The threading system treats conversations as **semantic containers** rather than simple message lists. Each thread:

- Contains messages from multiple sources (Matrix, email, SMS, Slack, etc.)
- Maintains rich metadata (participants, tags, topics)
- Supports branching and merging for subtopics and parallel discussions
- Attaches contextual objects (documents, links, notes, tasks) to messages
- Provides on-demand AI summarization to control costs

## Architecture

### Core Components

#### 1. **ThreadManager** (`src/services/threadManager.ts`)
Handles creation, linking, and lifecycle management of threads.

**Key Methods:**
- `createThread()` - Create a new thread
- `addMessageToThread()` - Add message to thread
- `createBranch()` - Create a branch for subtopics
- `mergeBranches()` - Merge branches back together
- `attachContextualObject()` - Attach docs/links/notes to messages
- `detectRelatedMessages()` - Find related messages using local similarity
- `shouldCreateBranch()` - Detect if message should start a branch
- `extractTopics()` - Extract hashtags and topics from content

**Example:**
```typescript
const manager = new ThreadManager({
  similarityThreshold: 0.6,
  contextWindow: 5 * 60 * 1000, // 5 minutes
  useLocalLinking: true,
});

// Create thread
const thread = manager.createThread('t1', 'room123', 'Project Planning');

// Add message
manager.addMessageToThread('t1', message);

// Create branch for subtopic
const branch = manager.createBranch('t1', 'msg1', 'Budget Discussion');
```

#### 2. **ThreadLinker** (`src/services/threadLinker.ts`)
Intelligently links messages from multiple sources into threads.

**Key Methods:**
- `linkMessage()` - Link single message to threads (auto-creates or adds to existing)
- `linkMessages()` - Batch link multiple messages
- `findBestMatchingThread()` - Find optimal thread for a message
- `convertToThreadMessage()` - Convert external events to ThreadMessage format

**Linking Algorithm:**
- Checks if sender is already a participant (30% weight)
- Analyzes topic overlap (40% weight)
- Considers temporal proximity (30% weight)
- Threshold: 0.3 minimum score to link

**Example:**
```typescript
const linker = new ThreadLinker(manager);

// Link a Matrix message
const result = linker.linkMessage(matrixMessage, 'room123');
console.log(result.threadId); // Thread ID (new or existing)
console.log(result.isNew); // Whether thread was created
console.log(result.branchId); // Branch ID if subtopic detected
```

#### 3. **ThreadSummarizer** (`src/services/threadSummarizer.ts`)
Provides on-demand analysis and summarization (local or AI-powered).

**Key Methods:**
- `summarizeThread()` - Generate thread summary (local or with AI)
- `extractKeyPoints()` - Extract key points without AI
- `extractActionItems()` - Extract TODO items and action items
- `getThreadAnalysis()` - Get statistics and metadata
- `findRelatedThreads()` - Find similar threads

**Local Extraction (No AI Cost):**
- Identifies sentences with key indicators (IMPORTANT, NOTE, ALL CAPS)
- Extracts TODO/FIXME comments
- Finds checkbox items
- Generates statistics

**Example:**
```typescript
const summarizer = new ThreadSummarizer();

// Local summary (free)
const summary = await summarizer.summarizeThread(thread, false);

// AI summary (with cost control)
const aiSummary = await summarizer.summarizeThread(
  thread,
  true,
  async (content) => {
    // Call your AI provider (OpenAI, Claude, etc.)
    return await aiProvider.summarize(content);
  }
);

// Extract without summarizing
const keyPoints = summarizer.extractKeyPoints(thread);
const actionItems = summarizer.extractActionItems(thread);
```

### Data Types

#### Thread
```typescript
interface Thread {
  id: string;
  roomId: string;
  title: string;
  description?: string;
  
  // Participants and metadata
  participants: Set<string>;
  tags: string[];
  topics: string[];
  
  // Message organization
  messages: Map<string, ThreadMessage>;
  mainBranch: ThreadBranch;
  branches: Map<string, ThreadBranch>;
  
  // Relationships
  parentThreadId?: string;
  relatedThreadIds: Set<string>;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
  
  // On-demand AI
  summary?: string;
  summaryGeneratedAt?: number;
  keyPoints?: string[];
  actionItems?: string[];
}
```

#### ThreadMessage
```typescript
interface ThreadMessage {
  id: string;
  eventId: string;
  source: MessageSource; // 'matrix' | 'email' | 'sms' | 'slack' | 'custom'
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  timestamp: number;
  edited?: number;
  reactions?: Record<string, number>;
  contextualObjects: ContextualObject[];
  matrixEvent?: MatrixEvent;
  metadata?: Record<string, any>;
}
```

#### ContextualObject
```typescript
interface ContextualObject {
  id: string;
  type: 'document' | 'link' | 'note' | 'task' | 'code' | 'image' | 'file';
  title: string;
  url?: string;
  content?: string;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}
```

#### ThreadBranch
```typescript
interface ThreadBranch {
  id: string;
  parentMessageId?: string;
  topic?: string;
  description?: string;
  createdAt: number;
  messageIds: string[];
}
```

## Usage Examples

### Basic Thread Creation and Messaging

```typescript
import { useThreads } from './hooks/useThreads';

function ChatComponent() {
  const {
    threads,
    selectedThread,
    createThread,
    linkMessage,
    getThreadsInRoom,
  } = useThreads();

  // Create a thread
  const handleCreateThread = () => {
    const thread = createThread('room123', 'Q4 Planning');
    setSelectedThread(thread);
  };

  // Link incoming message
  const handleNewMessage = (matrixMessage: ThreadMessage) => {
    const result = linkMessage(matrixMessage, 'room123');
    console.log(`Message linked to thread: ${result.threadId}`);
  };

  return (
    <div>
      <button onClick={handleCreateThread}>New Thread</button>
      {threads.map((thread) => (
        <div key={thread.id}>{thread.title}</div>
      ))}
    </div>
  );
}
```

### Branching for Subtopics

```typescript
// User mentions "but what about the budget?"
const result = linkMessage(budgetMessage, 'room123');

// If branch was detected:
if (result.branchId) {
  console.log(`New branch created: ${result.branchId}`);
  // UI can show branch indicator
}

// Manually create branch
const branch = createBranch(
  threadId,
  parentMessageId,
  'Budget Discussion',
  'Discussing Q4 budget allocation'
);
```

### Attaching Contextual Objects

```typescript
// Attach a document to a message
attachContextualObject(threadId, messageId, {
  id: 'doc1',
  type: 'document',
  title: 'Q4 Budget Proposal',
  url: 'https://docs.example.com/q4-budget',
  metadata: { author: 'finance@example.com', version: '2' },
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// Attach a task
attachContextualObject(threadId, messageId, {
  id: 'task1',
  type: 'task',
  title: 'Review budget proposal',
  content: 'Need to review by Friday',
  metadata: { assignee: 'user123', dueDate: '2024-01-12' },
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
```

### On-Demand Summarization

```typescript
// Get local summary (no cost)
const keyPoints = getKeyPoints(threadId);
const actionItems = getActionItems(threadId);
const analysis = getThreadAnalysis(threadId);

console.log(analysis);
// {
//   messageCount: 15,
//   participantCount: 4,
//   branchCount: 2,
//   topics: ['budget', 'timeline'],
//   messagesPerHour: '2.5',
//   ...
// }

// Get AI summary (on-demand, with cost control)
const summary = await summarizeThread(
  threadId,
  true,
  async (content) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Summarize this conversation concisely.',
          },
          {
            role: 'user',
            content: content,
          },
        ],
      }),
    });
    const data = await response.json();
    return data.choices[0].message.content;
  }
);
```

### Multi-Source Threading

```typescript
// Register custom handler for email
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

// Link email into same thread as Matrix messages
const emailMessage = threadLinker.convertToThreadMessage('email', emailData);
const result = linkMessage(emailMessage, 'room123');
// Email is now part of the same thread as Matrix messages!
```

## Local vs. Server Processing

### Local Processing (Always Free)
- Message linking and thread creation
- Branch detection
- Topic extraction
- Temporal analysis
- Participant tracking
- Key point extraction
- Action item extraction
- Thread statistics

### On-Demand AI Processing (Cost-Controlled)
- Thread summarization
- Related thread detection
- Content analysis
- Sentiment analysis (optional)

**Cost Control Strategy:**
1. All local operations are free and instant
2. AI is only called when user explicitly requests summary
3. Results are cached for 1 hour
4. Batch operations can be optimized

## Performance Considerations

### Memory Usage
- Threads store message references, not copies
- Branches use message ID arrays (lightweight)
- Topics and tags are deduplicated

### Scaling
- Efficient Map-based lookups (O(1) for message access)
- Lazy loading of related threads
- Caching of summaries and analysis

### Optimization Tips
1. Archive old threads to reduce active set
2. Use similarity threshold to control linking aggressiveness
3. Batch link messages when possible
4. Cache AI summaries

## Integration with Matrix

### Converting Matrix Events

```typescript
// Matrix event is automatically converted
const matrixEvent: MatrixEvent = room.timeline[0];

// ThreadLinker handles conversion
const threadMessage = threadLinker.convertToThreadMessage('matrix', matrixEvent);

// Or use the hook
linkMessage(threadMessage, room.roomId);
```

### Thread Metadata in Matrix

Threads can optionally store metadata in Matrix room state:
- Thread title and description
- Branch information
- Participant list
- Tags and topics

This allows threads to persist across client restarts and sync across devices.

## API Reference

See `src/types/thread.ts` for complete type definitions.

### ThreadManager
- `createThread(id, roomId, title, description?): Thread`
- `addMessageToThread(threadId, message, branchId?): boolean`
- `createBranch(threadId, parentMessageId, topic, description?): ThreadBranch | null`
- `mergeBranches(threadId, sourceBranchId, targetBranchId): boolean`
- `attachContextualObject(threadId, messageId, object): boolean`
- `detectRelatedMessages(messages, referenceMessage): string[]`
- `shouldCreateBranch(message): boolean`
- `extractTopics(content): string[]`
- `getThread(threadId): Thread | undefined`
- `getThreadByMessageId(messageId): Thread | undefined`
- `getAllThreads(): Thread[]`
- `getThreadsInRoom(roomId): Thread[]`
- `linkThreads(threadId1, threadId2): boolean`
- `getRelatedThreads(threadId): Thread[]`
- `archiveThread(threadId): boolean`
- `deleteThread(threadId): boolean`
- `getThreadStats(threadId): ThreadStats | null`

### ThreadLinker
- `linkMessage(message, roomId, existingThreads?): LinkingResult`
- `linkMessages(messages, roomId): Map<string, string>`
- `registerSourceHandler(source, handler): void`
- `convertToThreadMessage(source, event): ThreadMessage | null`

### ThreadSummarizer
- `summarizeThread(thread, useAI?, aiProvider?): Promise<string>`
- `extractKeyPoints(thread): string[]`
- `extractActionItems(thread): string[]`
- `getThreadAnalysis(thread): ThreadAnalysis`
- `findRelatedThreads(thread, allThreads, threshold?): RelatedThread[]`
- `clearCache(threadId): void`
- `clearAllCache(): void`

## Future Enhancements

- [ ] Persistent storage (IndexedDB)
- [ ] Thread search and filtering
- [ ] Mention detection and notifications
- [ ] Thread templates
- [ ] Collaborative editing of thread metadata
- [ ] Thread permissions and sharing
- [ ] Integration with external AI providers
- [ ] Thread analytics dashboard
- [ ] Automatic thread archival based on inactivity
- [ ] Thread merging UI
