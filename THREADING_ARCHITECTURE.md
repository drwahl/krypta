# Threading System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     NyChatt Threading System                     │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                          React Components                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │  ThreadSidebar  │  │   ThreadView     │  │  MessageTimeline │ │
│  │                 │  │                  │  │                  │ │
│  │ • List threads  │  │ • Show messages  │  │ • Display msgs   │ │
│  │ • Create new    │  │ • Key points     │  │ • Auto-link      │ │
│  │ • Select thread │  │ • Action items   │  │ • Show threads   │ │
│  │ • Archive       │  │ • Summary        │  │                  │ │
│  └─────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────┐
│                      useThreads React Hook                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  • createThread()          • summarizeThread()                   │
│  • addMessage()            • getKeyPoints()                      │
│  • linkMessage()           • getActionItems()                    │
│  • createBranch()          • getThreadAnalysis()                 │
│  • mergeBranches()         • getRelatedThreads()                 │
│  • attachContextualObject()• archiveThread()                     │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────┐
│                     Core Services Layer                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────┐  ┌────────────────────┐                 │
│  │  ThreadManager     │  │  ThreadLinker      │                 │
│  │                    │  │                    │                 │
│  │ • Create threads   │  │ • Link messages    │                 │
│  │ • Add messages     │  │ • Auto-create      │                 │
│  │ • Create branches  │  │ • Detect branches  │                 │
│  │ • Merge branches   │  │ • Multi-source     │                 │
│  │ • Extract topics   │  │ • Scoring algo     │                 │
│  │ • Attach objects   │  │ • Custom handlers  │                 │
│  │ • Manage lifecycle │  │                    │                 │
│  └────────────────────┘  └────────────────────┘                 │
│                                                                   │
│  ┌────────────────────┐                                          │
│  │  ThreadSummarizer  │                                          │
│  │                    │                                          │
│  │ • Local summary    │                                          │
│  │ • AI summary       │                                          │
│  │ • Key points       │                                          │
│  │ • Action items     │                                          │
│  │ • Analysis         │                                          │
│  │ • Related threads  │                                          │
│  │ • Caching          │                                          │
│  └────────────────────┘                                          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────┐
│                      Data Model Layer                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Thread                                                   │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ • id, roomId, title, description                        │   │
│  │ • participants: Set<string>                             │   │
│  │ • tags: string[]                                        │   │
│  │ • topics: string[]                                      │   │
│  │ • messages: Map<id, ThreadMessage>                      │   │
│  │ • mainBranch: ThreadBranch                              │   │
│  │ • branches: Map<id, ThreadBranch>                       │   │
│  │ • relatedThreadIds: Set<string>                         │   │
│  │ • summary?, keyPoints?, actionItems?                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ThreadMessage                                            │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ • id, eventId, source (matrix|email|sms|slack|custom)  │   │
│  │ • sender: { id, name, avatar? }                         │   │
│  │ • content, timestamp, edited?                           │   │
│  │ • reactions: Record<emoji, count>                       │   │
│  │ • contextualObjects: ContextualObject[]                 │   │
│  │ • matrixEvent?: MatrixEvent                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ThreadBranch                                             │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ • id, parentMessageId?, topic, description              │   │
│  │ • messageIds: string[]                                  │   │
│  │ • createdAt: number                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ContextualObject                                         │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ • id, type (document|link|note|task|code|image|file)   │   │
│  │ • title, url?, content?, metadata?                      │   │
│  │ • createdAt, updatedAt                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Message Linking Flow

```
New Message Arrives
        ↓
    linkMessage()
        ↓
    ┌─────────────────────────────────┐
    │ Find Best Matching Thread       │
    │ • Check participants (30%)      │
    │ • Check topics (40%)            │
    │ • Check temporal proximity (30%)│
    │ • Threshold: 0.3                │
    └─────────────────────────────────┘
        ↓
    ┌─────────────────────────────────┐
    │ Match Found?                    │
    └─────────────────────────────────┘
        ↙                   ↘
    YES                     NO
        ↓                   ↓
    Add to Thread      Create New Thread
        ↓                   ↓
    Check for Branch   Extract Topics
    Keywords?              ↓
        ↓              Add to Threads
    YES → Create       List
    Branch              ↓
        ↓              Return
    Add to Branch
        ↓
    Return Result
```

### Thread Organization

```
Thread: "Q4 Planning"
├── Main Branch
│   ├── Message 1: "Let's plan Q4"
│   ├── Message 2: "We need timeline"
│   └── Message 3: "Also need budget"
│
├── Branch 1: "Budget Discussion"
│   ├── Message 4: "But what about budget?"
│   ├── Message 5: "Need approval"
│   └── Message 6: "Timeline for approval?"
│
└── Branch 2: "Timeline"
    ├── Message 7: "However, timeline is tight"
    ├── Message 8: "Q4 ends in 3 months"
    └── Message 9: "Need to start now"
```

## Processing Pipeline

### Local Processing (Always Free)

```
Message Input
    ↓
┌─────────────────────────────┐
│ 1. Parse Content            │
│    • Extract text           │
│    • Identify source        │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ 2. Extract Metadata         │
│    • Topics (#hashtags)     │
│    • Capitalized phrases    │
│    • Branch keywords        │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ 3. Link to Thread           │
│    • Find best match        │
│    • Create if needed       │
│    • Detect branches        │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ 4. Extract Insights         │
│    • Key points             │
│    • Action items           │
│    • Statistics             │
└─────────────────────────────┘
    ↓
Thread Updated
(All free, instant)
```

### On-Demand AI Processing (Cost-Controlled)

```
User Clicks "Load Summary"
    ↓
┌─────────────────────────────┐
│ Check Cache                 │
│ (1 hour TTL)                │
└─────────────────────────────┘
    ↓
    ┌─────────────────────────────┐
    │ Cache Hit?                  │
    └─────────────────────────────┘
        ↙                   ↘
    YES                     NO
        ↓                   ↓
    Return Cached      Prepare Content
    Summary                 ↓
        ↓              Call AI Provider
    Done                   ↓
                       Cache Result
                           ↓
                       Return Summary
```

## Component Interaction Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        App.tsx                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ChatApp                                                │  │
│  │  ├─ RoomList                                          │  │
│  │  ├─ MessageTimeline ──→ useThreads() ──→ linkMessage()│  │
│  │  ├─ MessageInput                                      │  │
│  │  └─ ThreadSidebar                                     │  │
│  │      ├─ useThreads() ──→ getThreadsInRoom()          │  │
│  │      ├─ ThreadView                                    │  │
│  │      │   ├─ useThreads() ──→ getKeyPoints()          │  │
│  │      │   ├─ useThreads() ──→ getActionItems()        │  │
│  │      │   ├─ useThreads() ──→ getThreadAnalysis()     │  │
│  │      │   └─ useThreads() ──→ summarizeThread()       │  │
│  │      └─ ThreadList                                    │  │
│  │          └─ useThreads() ──→ createThread()          │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## State Management

```
useThreads Hook
    ↓
┌─────────────────────────────────────────────┐
│ Internal State                              │
├─────────────────────────────────────────────┤
│ • threadManagerRef                          │
│ • threadLinkerRef                           │
│ • summarizerRef                             │
│ • threads: Thread[]                         │
│ • selectedThread: Thread | null             │
│ • isLoading: boolean                        │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ Exposed Methods (useCallback)               │
├─────────────────────────────────────────────┤
│ • createThread()                            │
│ • addMessage()                              │
│ • linkMessage()                             │
│ • linkMessages()                            │
│ • createBranch()                            │
│ • mergeBranches()                           │
│ • attachContextualObject()                  │
│ • summarizeThread()                         │
│ • getKeyPoints()                            │
│ • getActionItems()                          │
│ • getThreadAnalysis()                       │
│ • getRelatedThreads()                       │
│ • archiveThread()                           │
│ • deleteThread()                            │
│ • getThreadsInRoom()                        │
└─────────────────────────────────────────────┘
```

## Performance Characteristics

### Time Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Create thread | O(1) | Constant time |
| Add message | O(1) | Map insertion |
| Link message | O(n*m) | n=threads, m=messages per thread |
| Create branch | O(1) | Constant time |
| Extract topics | O(k) | k=words in message |
| Similarity calc | O(k) | k=unique words |
| Get thread | O(1) | Map lookup |
| Archive thread | O(1) | Constant time |

### Space Complexity

| Data Structure | Size | Notes |
|---|---|---|
| Thread | ~1KB | Metadata only |
| Message | ~500B | Content + metadata |
| Branch | ~100B | IDs and metadata |
| Contextual Object | ~200B | Link/note data |

**Example**: 1000 threads × 50 messages = ~50MB (uncompressed)

## Scaling Considerations

### Horizontal Scaling
- Thread manager is stateless (can be replicated)
- Each room can have independent thread manager
- Messages can be sharded by room

### Vertical Scaling
- Archive old threads to reduce active set
- Use IndexedDB for local persistence
- Implement pagination for large thread lists

### Optimization Strategies
1. **Lazy Loading**: Load thread details on demand
2. **Caching**: Cache summaries and analysis results
3. **Batching**: Link multiple messages at once
4. **Deduplication**: Prevent duplicate linking
5. **Pruning**: Archive threads after inactivity

## Integration Points

### Matrix Integration
- `MatrixEvent` → `ThreadMessage` conversion
- Room timeline listening
- Message reactions support
- Encryption awareness

### External Sources
- Email handler (IMAP/SMTP)
- SMS handler (Twilio/etc)
- Slack handler (Slack API)
- Custom handlers (extensible)

### AI Integration
- OpenAI API for summarization
- Claude API for analysis
- Local models (optional)
- Cost tracking and caching

## Error Handling

```
Operation
    ↓
Try
    ├─ Execute
    ├─ Validate
    └─ Update State
    ↓
Catch
    ├─ Log Error
    ├─ Return null/false
    └─ Notify User
    ↓
Finally
    └─ Cleanup
```

## Security Considerations

- **Local Processing**: No data sent to servers (unless AI enabled)
- **Encryption**: Works with Matrix E2EE
- **Privacy**: Messages stored in browser memory
- **AI Opt-in**: Summarization only on explicit request
- **API Keys**: Should be stored securely (env vars, not in code)
