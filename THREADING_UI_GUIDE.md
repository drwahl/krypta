# Threading System - UI User Guide

## What You See When You Open the App

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                       │
│  Rooms List    │    Messages                    │  Threads Sidebar   │
│  ──────────    │    ────────                    │  ────────────────  │
│  • #dev        │    User: "Let's plan Q4"      │  ┌──────────────┐  │
│  • #general    │    User: "Need timeline"      │  │ Threads      │  │
│  • #random     │    User: "But budget?"        │  │ ┌──────────┐ │  │
│                │    User: "Need approval"      │  │ │ Q4 Plan  │ │  │
│                │    User: "Timeline is tight"  │  │ │ 15 msgs  │ │  │
│                │                                │  │ │ 4 people │ │  │
│                │    [Type message...]          │  │ │ #budget  │ │  │
│                │                                │  │ └──────────┘ │  │
│                │                                │  │              │  │
│                │                                │  │ ┌──────────┐ │  │
│                │                                │  │ │ Budget   │ │  │
│                │                                │  │ │ Disc     │ │  │
│                │                                │  │ │ 5 msgs   │ │  │
│                │                                │  │ │ 3 people │ │  │
│                │                                │  │ └──────────┘ │  │
│                │                                │  │              │  │
│                │                                │  │ [+] New      │  │
│                │                                │  └──────────────┘  │
│                │                                │                    │
└──────────────────────────────────────────────────────────────────────┘
```

## Thread Sidebar (Right Panel)

### Header
- **Threads** label with icon
- **[+]** button to create new thread
- **[X]** button to close sidebar

### Thread List
Each thread shows:
- **Title** - Thread name
- **💬 N messages** - Message count
- **👥 N people** - Participant count
- **#tags** - Topics (up to 2 shown)

### Creating a New Thread

**Step 1: Click the [+] button**
```
┌────────────────────────────────────┐
│ Threads                    [+] [X] │
└────────────────────────────────────┘
                ↓
```

**Step 2: Fill in the form**
```
┌────────────────────────────────────┐
│ Thread title...                    │
│ ────────────────────────────────── │
│ Description (optional)...          │
│ ────────────────────────────────── │
│ ────────────────────────────────── │
│                                    │
│ [Create]      [Cancel]             │
└────────────────────────────────────┘
```

**Step 3: Thread appears in list**
```
┌────────────────────────────────────┐
│ ┌──────────────────────────────┐   │
│ │ Q4 Planning                  │   │
│ │ 💬 1 message                 │   │
│ │ 👥 1 person                  │   │
│ └──────────────────────────────┘   │
└────────────────────────────────────┘
```

## Thread Detail Panel

When you click a thread, the detail panel opens:

```
┌──────────────────────────────────────────┐
│ Q4 Planning                         [X]  │
│ Discussing Q4 goals and timeline         │
│                                          │
│ Stats:                                   │
│ ┌──────┬──────┬──────┬──────┐           │
│ │ 15   │ 4    │ 2    │ 45m  │           │
│ │ msgs │ ppl  │ brch │ ago  │           │
│ └──────┴──────┴──────┴──────┘           │
│                                          │
│ Topics: #budget #timeline               │
│                                          │
│ ─────────────────────────────────────── │
│ Main Discussion                          │
│                                          │
│ ┌─ User1: Let's plan Q4                │
│ │ ┌─ User2: Need timeline              │
│ │ └─ User3: Also need budget           │
│                                          │
│ Subtopics                                │
│ ┌─ 🌿 Budget Discussion (5 msgs)       │
│ │  ├─ User3: But what about budget?    │
│ │  ├─ User1: Need approval             │
│ │  └─ User2: Timeline for approval?    │
│ │                                       │
│ └─ 🌿 Timeline (3 msgs)                │
│    ├─ User2: However, timeline tight   │
│    ├─ User1: Q4 ends in 3 months       │
│    └─ User3: Need to start now         │
│                                          │
│ Key Points                               │
│ ⚡ • Need approval for budget           │
│    • Q4 deadline is critical            │
│    • Timeline is tight                  │
│                                          │
│ Action Items                             │
│ ☐ • Review budget proposal              │
│   • Get approval by Friday              │
│   • Schedule kickoff meeting            │
│                                          │
│ [Load Summary]  [Archive]               │
└──────────────────────────────────────────┘
```

## Message Context Menu (Right-Click)

When you right-click on a message in a thread:

```
┌─────────────────────────┐
│ 🌿 Create Branch        │
│ 📎 Attach Link          │
│ 😊 Add Reaction         │
│ ↪️  Reply                │
└─────────────────────────┘
```

### Create Branch
- Opens dialog to name the branch
- Starts a new subtopic
- Messages after this point go to the branch

### Attach Link
- Opens dialog to add document/link
- Types: document, link, note, task, code, image, file
- Appears as badge on message

## Thread Sidebar Toggle

### When Sidebar is Open
```
┌────────────────────────────────────┐
│ Rooms │ Messages │ Threads │ Detail │
│       │          │ [X]     │        │
│       │          │ Close   │        │
└────────────────────────────────────┘
```

### When Sidebar is Closed
```
┌────────────────────────────────────┐
│ Rooms │ Messages                    │
│       │                             │
│       │                             │
│       │                    [💬]     │ ← Floating button
│       │                             │
└────────────────────────────────────┘
```

Click the floating button to show sidebar again.

## Common Actions

### Action 1: Start a Discussion in a Thread

1. Click thread in sidebar
2. See all messages in detail panel
3. Type in message input (bottom of main chat area)
4. Message auto-links to thread
5. If you mention "but" or "however" → new branch created

### Action 2: View Key Points Without AI

1. Click thread in sidebar
2. Scroll down in detail panel
3. See "Key Points" section
4. No AI needed - extracted automatically

### Action 3: Get AI Summary

1. Click thread in sidebar
2. Scroll to bottom of detail panel
3. Click "Load Summary" button
4. Wait for AI to process
5. Summary appears in panel
6. Cached for 1 hour (no re-processing)

### Action 4: Organize Subtopic

1. Right-click message in thread
2. Select "Create Branch"
3. Enter branch name (e.g., "Budget Discussion")
4. New branch appears in thread
5. Messages after this point go to branch

### Action 5: Attach Document to Message

1. Right-click message
2. Select "Attach Link"
3. Enter document title and URL
4. Link appears as badge on message
5. Click to open document

### Action 6: Archive Thread

1. Click thread in sidebar
2. Scroll to bottom of detail panel
3. Click "Archive" button
4. Thread disappears from list
5. Can be restored from archived threads

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Create new thread | `Ctrl+T` (planned) |
| Close thread detail | `Esc` |
| Search threads | `Ctrl+F` (planned) |
| Archive thread | `Ctrl+A` (planned) |

## Tips & Tricks

### Tip 1: Auto-Linking
Messages automatically link to threads based on:
- Who's talking (participants)
- What they're talking about (topics)
- When they're talking (timing)

You don't need to manually organize!

### Tip 2: Branch Keywords
These words trigger automatic branch creation:
- "but"
- "however"
- "alternatively"
- "on the other hand"
- "meanwhile"

Example: "But what about the budget?" → new branch

### Tip 3: Topic Extraction
Topics are extracted from:
- Hashtags: `#budget` → topic "budget"
- Capitalized phrases: "Q4 Planning" → topic "Q4 Planning"

Use these to organize threads!

### Tip 4: Action Items
Automatically extracted from:
- `TODO:` comments
- `FIXME:` comments
- `[ ]` checkboxes
- `[x]` checked items

Example: `TODO: Review budget by Friday` → action item

### Tip 5: Key Points
Automatically extracted from:
- Sentences starting with "Important:", "Note:", etc.
- ALL CAPS phrases
- Critical information

No AI needed!

## Troubleshooting

### Q: I don't see the thread sidebar
**A:** Click the floating message button (💬) in the bottom right

### Q: Messages aren't linking to threads
**A:** 
- Make sure you're in a room with threads
- Try creating a thread manually first
- Check that messages have content

### Q: No branches being created
**A:**
- Message needs to contain branch keywords
- Try typing "but" or "however" in a message
- Or create branch manually via right-click

### Q: Summary button is grayed out
**A:**
- Need to configure AI provider (OpenAI, Claude, etc.)
- Or use local summary (no AI)
- Check documentation for setup

### Q: Thread disappeared
**A:**
- It might be archived
- Check archived threads list (planned feature)
- Or search for it (planned feature)

## Performance Tips

### Keep Sidebar Open
- Easier to see all threads
- Quick access to details
- Responsive performance

### Archive Old Threads
- Reduces clutter
- Improves performance
- Can be restored later

### Use Branches
- Keeps related discussions together
- Easier to follow parallel topics
- Can merge branches later

## Accessibility

### Keyboard Navigation
- Tab through threads
- Enter to select
- Escape to close

### Screen Readers
- Thread titles are descriptive
- Stats are labeled
- Buttons have titles

### High Contrast
- Uses Tailwind CSS dark theme
- Good contrast ratios
- Readable on all displays

## Mobile/Responsive

### On Mobile
- Sidebar can be toggled
- Use floating button to show/hide
- Touch-friendly buttons
- Responsive layout

### On Tablet
- Sidebar visible by default
- Good use of space
- Touch and mouse support

### On Desktop
- Full sidebar visible
- Optimal layout
- Keyboard shortcuts work

## Next Steps

1. **Try it out!**
   - Create a thread
   - Send messages
   - Watch them auto-link

2. **Explore features**
   - Create branches
   - Attach links
   - View summaries

3. **Customize**
   - Adjust colors in Tailwind config
   - Add keyboard shortcuts
   - Modify branch keywords

4. **Integrate**
   - Add to your workflow
   - Export threads
   - Share summaries

Enjoy organizing your conversations! 🎉
