# Threading System - State Management Issue

## Problem Identified

The threading system has a critical state management issue:

### Root Cause
`useThreads` is a **hook**, not a **context**. Each component that calls `useThreads()` gets its own **separate instance** of the state.

```
ThreadSidebar calls useThreads() → State Instance A
ThreadView calls useThreads() → State Instance B  
ThreadMessageInput calls useThreads() → State Instance C
```

When ThreadMessageInput adds a message:
- Updates State Instance C ✅
- State Instance A (ThreadSidebar) doesn't know ❌
- State Instance B (ThreadView) doesn't know ❌

### Evidence
```
📥 Thread after adding: 15 messages  ← In ThreadMessageInput's state
🔍 Thread has 11 messages  ← In ThreadView's state (stale)
```

## Solution: Convert to Context

We need to convert `useThreads` to a Context Provider so all components share the same state.

### Implementation Steps

1. **Create ThreadsContext** (`src/contexts/ThreadsContext.tsx`)
   - Wrap all state in a Context Provider
   - Export `ThreadsProvider` and `useThreads` hook

2. **Wrap App with Provider** (`src/App.tsx`)
   ```tsx
   <ThreadsProvider>
     <App />
   </ThreadsProvider>
   ```

3. **All components use shared state**
   - ThreadSidebar, ThreadView, ThreadMessageInput all see same state
   - Updates propagate automatically

### Quick Fix (Temporary)

For now, the workaround is:
- Refresh the page after sending messages
- Messages are persisted in IndexedDB
- On reload, all components load the same data

### Permanent Fix Required

Convert `useThreads` hook to `ThreadsContext` provider for proper state sharing across all components.

## Files Affected

- `src/hooks/useThreads.ts` → Move to `src/contexts/ThreadsContext.tsx`
- `src/App.tsx` → Wrap with `<ThreadsProvider>`
- All components using `useThreads` → No changes needed (same API)

## Priority

**HIGH** - This blocks real-time message updates in threads.
