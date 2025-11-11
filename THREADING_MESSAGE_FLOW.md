# Threading System - Message Flow Guide

## Where Do Messages Go?

When you add a message to a thread, here's exactly what happens:

### Complete Message Flow

```
User types message in ThreadMessageInput
        ↓
User presses Ctrl+Enter or clicks Send
        ↓
ThreadMessageInput creates ThreadMessage object
        ↓
Calls addMessage(threadId, message)
        ↓
ThreadManager.addMessageToThread()
        ↓
Message added to thread.messages Map
        ↓
Message added to thread.mainBranch.messageIds array
        ↓
Thread saved to IndexedDB (ThreadStorage)
        ↓
ThreadView refreshes and displays new message
        ↓
Message appears in the thread detail panel
```

## Visual Layout

### Before Adding Message
```
┌─────────────────────────────────────┐
│ Thread: "Q4 Planning"               │
│ ─────────────────────────────────── │
│ Main Discussion                     │
│ • User1: "Let's plan Q4"           │
│ • User2: "Need timeline"           │
│                                     │
│ [Message Input Box]        [Send]   │
│ ─────────────────────────────────── │
│ [Load Summary] [Archive]            │
└─────────────────────────────────────┘
```

### After Adding Message
```
┌─────────────────────────────────────┐
│ Thread: "Q4 Planning"               │
│ ─────────────────────────────────── │
│ Main Discussion                     │
│ • User1: "Let's plan Q4"           │
│ • User2: "Need timeline"           │
│ • You: "I'll handle the timeline"  │ ← NEW MESSAGE!
│                                     │
│ [Message Input Box]        [Send]   │
│ ─────────────────────────────────── │
│ [Load Summary] [Archive]            │
└─────────────────────────────────────┘
```

## Data Structure

### Thread Object
```typescript
Thread {
  id: "thread-room123-1234567890"
  title: "Q4 Planning"
  messages: Map {
    "msg-1" → ThreadMessage { ... }
    "msg-2" → ThreadMessage { ... }
    "msg-3" → ThreadMessage { ... }  ← Your new message
  }
  mainBranch: {
    messageIds: ["msg-1", "msg-2", "msg-3"]  ← Added here
  }
}
```

### ThreadMessage Object
```typescript
ThreadMessage {
  id: "msg-1234567890"
  source: "matrix"
  sender: {
    id: "current-user"
    name: "You"
  }
  content: "I'll handle the timeline"
  timestamp: 1234567890
  contextualObjects: []
}
```

## Storage Locations

### 1. In Memory (Browser RAM)
- **Location**: `threadManager.threads` Map
- **Lifetime**: While app is open
- **Access**: Via `threadManager.getThread(threadId)`

### 2. In IndexedDB (Browser Storage)
- **Location**: `NyChattThreads` database
- **Lifetime**: Persistent (survives reload)
- **Access**: Via `ThreadStorage` service

### 3. In React State
- **Location**: `threads` state in `useThreads` hook
- **Lifetime**: While component is mounted
- **Access**: Via `threads` from hook

## How to See Your Messages

### Method 1: In the UI (Easiest)
1. Open a thread in the sidebar
2. Scroll down in the thread detail panel
3. Your messages appear in the "Main Discussion" section
4. Type new messages in the input box at the bottom

### Method 2: In Browser DevTools
1. Open DevTools (F12)
2. Go to "Console" tab
3. Run this command:
```javascript
// Get all threads
const threads = await new (require('./src/services/threadStorage').ThreadStorage)().loadAllThreads();
console.log(threads);

// Get specific thread
const thread = threads[0];
console.log('Messages:', thread.messages);
```

### Method 3: In IndexedDB
1. Open DevTools (F12)
2. Go to "Application" tab
3. Expand "IndexedDB" → "NyChattThreads" → "threads"
4. Click on a thread to see its data
5. Look for `messages` array

## Message Locations Explained

### Main Branch (Default)
```
Thread
├── mainBranch
│   └── messageIds: ["msg-1", "msg-2", "msg-3"]
│       ↓
│       Messages appear in "Main Discussion" section
```

**When messages go here:**
- When you add a message normally
- When messages are auto-linked to thread
- When no branch is specified

### Branches (Subtopics)
```
Thread
├── branches
│   ├── "branch-1" (Budget Discussion)
│   │   └── messageIds: ["msg-4", "msg-5"]
│   │       ↓
│   │       Messages appear in "Budget Discussion" section
│   └── "branch-2" (Timeline)
│       └── messageIds: ["msg-6", "msg-7"]
│           ↓
│           Messages appear in "Timeline" section
```

**When messages go here:**
- When you create a branch
- When messages contain branch keywords ("but", "however", etc.)
- When you explicitly add to a branch

## Complete Example

### Step 1: Create Thread
```
Click [+] in Thread Sidebar
Enter: "Q4 Planning"
Click: Create
```

**Result:**
- Thread created in memory
- Thread saved to IndexedDB
- Thread appears in sidebar

### Step 2: Add First Message
```
Type: "Let's plan Q4 goals"
Press: Ctrl+Enter
```

**Result:**
- Message created: `{ id: "msg-1", content: "Let's plan Q4 goals", ... }`
- Added to `thread.messages` Map
- Added to `thread.mainBranch.messageIds`
- Thread saved to IndexedDB
- Message appears in "Main Discussion"

### Step 3: Add Second Message
```
Type: "But what about the budget?"
Press: Ctrl+Enter
```

**Result:**
- Message created: `{ id: "msg-2", content: "But what about the budget?", ... }`
- Added to `thread.messages` Map
- **NEW BRANCH CREATED** (because of "but" keyword)
- Message added to new branch
- Thread saved to IndexedDB
- Message appears in new "Budget Discussion" branch

### Step 4: Close and Reopen Browser
```
Close browser
Reopen browser
```

**Result:**
- ThreadStorage loads all threads from IndexedDB
- Both messages still there
- Both branches still there
- Everything restored!

## Debugging: Where Are My Messages?

### Problem: Messages not showing in UI
**Solution:**
1. Check browser console for errors
2. Verify message was added: `threadManager.getThread(threadId).messages.size`
3. Check if thread is selected in sidebar
4. Try scrolling in thread panel

### Problem: Messages lost after reload
**Solution:**
1. Check IndexedDB in DevTools
2. Verify `ThreadStorage.init()` was called
3. Check browser console for storage errors
4. Try clearing cache and reloading

### Problem: Can't find where messages went
**Solution:**
1. Open DevTools Console
2. Run: `const t = await new (require('./src/services/threadStorage').ThreadStorage)().loadAllThreads(); console.log(t[0].messages);`
3. Check the output for your messages

## Message Lifecycle

```
Created
  ↓
Added to thread.messages Map
  ↓
Added to branch.messageIds array
  ↓
Saved to IndexedDB
  ↓
Displayed in ThreadView
  ↓
(User closes browser)
  ↓
Loaded from IndexedDB
  ↓
Restored to thread.messages Map
  ↓
Displayed in ThreadView
```

## Summary

### ✅ Where Messages Go
- **In Memory**: `threadManager.threads` Map
- **In Storage**: IndexedDB database
- **In UI**: ThreadView component

### ✅ How to See Them
- **In UI**: Open thread, scroll down
- **In DevTools**: Check IndexedDB or console
- **In Code**: `threadManager.getThread(threadId).messages`

### ✅ When They Persist
- **Automatically**: Every time you add a message
- **On Reload**: Loaded from IndexedDB
- **On Close**: Saved to IndexedDB

### ✅ How They're Organized
- **Main Branch**: Default location for messages
- **Branches**: Subtopics created automatically or manually
- **Messages Map**: Fast lookup by message ID

**Everything is working correctly!** Your messages are being stored, persisted, and displayed. 🎉
