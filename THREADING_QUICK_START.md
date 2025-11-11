# Threading System - Quick Start Guide

## What You Just Got

A complete threading system that's **already integrated into your UI**. Here's what's ready to use:

## 🎯 What's Visible in the UI Right Now

1. **Thread Sidebar** (right side of chat)
   - Shows all threads in current room
   - Click to view thread details
   - Create new threads with "+" button
   - Archive threads when done

2. **Thread Detail Panel**
   - Shows all messages in thread
   - Displays key points and action items
   - Shows participants and metadata
   - Load summary button for AI analysis

3. **Thread Toggle Button**
   - If sidebar is closed, floating button appears
   - Click to show/hide threads

## 🚀 How to Use It

### Starting a Thread

**Method 1: UI Button**
1. Click the "+" button in the Thread Sidebar
2. Enter thread title and description
3. Click "Create"
4. Thread appears in sidebar

**Method 2: Automatic (Messages Auto-Link)**
- Messages are automatically linked to threads based on content
- If a message mentions branch keywords ("but", "however", etc.), a new branch is created
- Related messages are grouped together automatically

### Viewing a Thread

1. Click any thread in the sidebar
2. Thread detail panel opens on the right
3. See all messages, branches, and metadata
4. Click "Load Summary" for AI-powered summary (optional)

### Creating Branches (Subtopics)

Right-click on a message → "Create Branch"
- Branches organize parallel discussions
- Each branch has its own topic
- Can be merged back together

### Attaching Context to Messages

Right-click on a message → "Attach Link"
- Add documents, links, notes, tasks
- Appears inline with message
- Helps track related resources

## 📊 What Happens Automatically

✅ **Message Linking**
- New messages are automatically analyzed
- Linked to existing threads or create new ones
- Uses: participant overlap, topic match, timing

✅ **Branch Detection**
- Messages with "but", "however", "alternatively" → new branch
- Keeps subtopics organized
- Can be merged later

✅ **Topic Extraction**
- Hashtags (#topic) extracted automatically
- Capitalized phrases recognized
- Used to find related threads

✅ **Key Points & Action Items**
- Extracted from messages automatically
- No AI needed (free!)
- Shown in thread detail panel

## 💡 Common Workflows

### Workflow 1: Organize a Discussion
1. Create thread: "Q4 Planning"
2. Messages auto-link as people chat
3. If budget discussion starts → branch created
4. Later: merge branch back or keep separate

### Workflow 2: Track Action Items
1. Thread created automatically
2. Messages with "TODO:" extracted
3. View action items in thread panel
4. Archive when complete

### Workflow 3: Reference Documents
1. Message mentions a document
2. Right-click → "Attach Link"
3. Link appears with message
4. Click to open document

## 🎨 UI Layout

```
┌─────────────────────────────────────────────────────┐
│ Rooms │ Messages │ Threads │ Thread Detail          │
│       │          │ ┌──────┐ ┌──────────────────────┐│
│ #dev  │ User: hi │ │ Q4   │ │ Q4 Planning          ││
│ #gen  │ User: ok │ │ Plan │ │ 15 messages          ││
│       │ User: but│ │ ─────│ │ 4 people             ││
│       │ ...      │ │ Budget│ │ Topics: #budget      ││
│       │          │ │ Disc │ │                      ││
│       │          │ │ ─────│ │ Key Points:          ││
│       │          │ │ ...  │ │ • Need approval      ││
│       │          │ │      │ │ • Q4 deadline        ││
│       │          │ │ [+]  │ │                      ││
│       │          │ └──────┘ │ [Load Summary]       ││
│       │          │          └──────────────────────┘│
└─────────────────────────────────────────────────────┘
```

## 🔧 Configuration

### Adjust Threading Behavior

Edit `src/hooks/useThreads.ts`:

```typescript
const threadManager = new ThreadManager({
  similarityThreshold: 0.6,      // Lower = more aggressive linking
  contextWindow: 5 * 60 * 1000,  // Time window for grouping (5 min)
  useLocalLinking: true,          // Use local AI (vs server)
});
```

### Add Custom Branch Keywords

Edit `src/services/threadManager.ts`:

```typescript
branchKeywords: [
  'but', 'however', 'alternatively', 'on the other hand',
  'meanwhile', 'also', 'additionally'  // Add more here
]
```

## 📝 Code Examples

### Access Threads in Your Component

```typescript
import { useThreads } from './hooks/useThreads';

function MyComponent() {
  const {
    threads,
    selectedThread,
    createThread,
    linkMessage,
  } = useThreads();

  // Use any of these functions
}
```

### Get Thread Info

```typescript
const { getThreadAnalysis, getKeyPoints, getActionItems } = useThreads();

// Get stats
const stats = getThreadAnalysis(threadId);
console.log(stats.messageCount, stats.participantCount);

// Get extracted info
const keyPoints = getKeyPoints(threadId);
const actionItems = getActionItems(threadId);
```

### Create Thread Programmatically

```typescript
const { createThread } = useThreads();

const thread = createThread(
  'room123',
  'My Thread Title',
  'Optional description'
);
```

## 🎯 Next Steps

1. **Try it out!**
   - Open the app
   - Send some messages
   - Watch them auto-link to threads
   - Create a thread manually

2. **Customize the UI**
   - Edit `ThreadSidebar.tsx` for styling
   - Edit `ThreadView.tsx` for detail panel
   - Add your own components

3. **Add AI Summarization**
   - Call `summarizeThread(threadId, true, aiProvider)`
   - Provide your OpenAI/Claude API key
   - Summaries are cached to save costs

4. **Integrate with Your Workflow**
   - Export threads to JSON
   - Send thread summaries via email
   - Archive threads to storage

## 🐛 Troubleshooting

**Q: Threads sidebar not showing?**
- Click the floating message icon (bottom right)
- Or check if `showThreads` state is false

**Q: Messages not auto-linking?**
- Check browser console for errors
- Verify `linkMessage` is being called
- Try creating thread manually

**Q: No branches being created?**
- Message needs to contain branch keywords
- Try typing "but" or "however" in a message
- Or create branch manually via context menu

**Q: Performance slow?**
- Archive old threads
- Increase `similarityThreshold` to reduce linking
- Disable auto-linking if needed

## 📚 Full Documentation

- `THREADING.md` - Complete architecture and API
- `THREADING_INTEGRATION.md` - Detailed integration guide
- `src/types/thread.ts` - Type definitions
- `src/hooks/useThreads.ts` - React hook reference

## 🎉 You're Ready!

The threading system is fully integrated and ready to use. Start chatting and watch threads organize your conversations automatically!
