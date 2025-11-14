# Krypta - A Modern Matrix Client

A blazingly fast, beautiful, and feature-rich Matrix chat client that's 1000x better than Element.

## 🚀 Features

- **Lightning Fast**: Built with Vite and optimized for performance
- **Beautiful UI**: Modern, sleek design with Tailwind CSS and custom theming
- **Full Matrix Support**: Complete Matrix protocol implementation
- **End-to-End Encryption**: Full E2EE support with visual indicators and per-room device verification controls
- **Multi-Window Chat**: Open multiple rooms side-by-side with configurable limits
- **Tree Navigation**: Collapsible spaces and room organization with drag-and-drop reordering
- **Rich Messaging**: Markdown support with strict size controls, emoji shortcodes, @mentions, URL previews
- **Emoji Reactions**: Add and remove reactions with a beautiful emoji picker
- **Threading System**: Create and manage message threads with AI-powered summaries
- **Room History**: Load older messages on demand with infinite scroll
- **Real-time Updates**: Instant message delivery, typing indicators, and read receipts
- **Session Persistence**: Stay logged in across browser sessions with IndexedDB caching
- **Sliding Sync**: Optional support for faster syncing
- **Smart Notifications**: Audio and desktop notifications with debouncing and initial sync filtering
- **Element Call Integration**: Embedded video calls via Element Call widget
- **Theme System**: Per-room and per-space custom themes with server-side storage
- **Responsive Design**: Works on all screen sizes with compact mode support

## 🎯 Why Krypta is Better

- **Faster Loading**: Vite-powered development and production builds
- **Modern Design**: Clean, intuitive interface inspired by the best chat apps
- **Better UX**: Smooth animations, instant feedback, keyboard shortcuts
- **Lightweight**: Smaller bundle size, faster performance
- **Developer Friendly**: Clean codebase with TypeScript

## 🛠️ Tech Stack

- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **Matrix JS SDK v34** - Official Matrix protocol implementation (stable release)
- **Lucide React** - Beautiful icons
- **Emoji Mart** - Emoji picker component
- **React Markdown** - Rich text rendering
- **date-fns** - Modern date utilities
- **IndexedDB** - Client-side storage for caching and threads

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/krypta.git
cd krypta

# Install dependencies
npm install

# Start development server
npm run dev
```

Open your browser to `http://localhost:5173` (or `https://` if you need desktop notifications)

## 🏗️ Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## 🎮 Usage

1. **Login**: Enter your Matrix homeserver URL and credentials (sliding sync proxy is auto-detected from `.well-known`)
2. **Browse Rooms**: Navigate through spaces and rooms with the tree view on the left
3. **Multi-Window Chat**: Open multiple rooms at once (configurable in settings)
4. **Send Messages**: 
   - Use `@username` to mention people
   - Use `:emoji:` shortcodes (e.g., `:smile:`, `:heart:`)
   - Markdown is supported (but currently disabled due to rendering issues)
5. **React**: Click the smile icon on messages to add emoji reactions
6. **Threads**: Click the thread icon to view/reply in threads
7. **Customize**: Set per-room or per-space themes in settings
8. **Notifications**: Configure audio/desktop notifications in settings

## 🔑 Keyboard Shortcuts

- `Enter` - Send message
- `Shift + Enter` - New line
- `@` + start typing - Autocomplete mentions
- `Tab` - Accept autocomplete suggestion

## 🔒 Security & Encryption

### End-to-End Encryption (E2EE)

Krypta supports full end-to-end encryption for Matrix rooms with per-room device verification controls.

**First Time Setup:**
1. Log in to your account
2. You'll see a yellow banner: "Encryption Not Fully Set Up"
3. Click "Verify with Other Device" to verify cross-signing
4. This sets up the encryption keys needed to send and receive encrypted messages

**Unverified Device Handling:**
- When sending to a room with unverified devices, you'll get a dialog with options:
  - **Send Anyway (Once)**: Send this message without verification
  - **Always Send to Unverified Devices in this Room**: Remember choice for this room
  - **Cancel**: Don't send the message
- This gives you control over your security on a per-room basis

**What You Get:**
- **Encryption Indicators**: Lock icons on encrypted rooms and messages
- **Secure Storage**: Encryption keys stored in IndexedDB (browser secure storage)
- **Cross-Signing**: Device verification support
- **Error Handling**: Clear UI when messages can't be decrypted
- **Per-Room Controls**: Configure unverified device handling per room

**Important Notes:**
- **New Login?** You'll need to verify with another device
- **Lost Keys?** Without verification or backup, you may lose access to old encrypted messages
- **Multiple Devices?** Each device needs to be verified to access encrypted rooms
- For **maximum security**, verify your session with another logged-in device in Element or another Matrix client

## 🌟 Upcoming Features

- [ ] Full device verification UI
- [ ] Key backup and recovery
- [ ] File uploads and media preview
- [ ] Direct voice/video calls (Element Call integration is already working for rooms)
- [ ] Message search
- [ ] Push notifications (web push)
- [ ] Message editing
- [ ] Rich text editor
- [ ] Improved markdown rendering
- [ ] Space management UI
- [ ] Room directory/discovery
- [ ] Multiple account support

## 🐛 Known Issues

- Markdown rendering is currently disabled due to size control issues (messages with large headers can overflow)
- Reddit rich previews are disabled due to CORS issues with Reddit's API
- Some console warnings about unused variables in development mode

## 📝 License

MIT License - See [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run linting: `npm run lint`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style

- TypeScript for type safety
- React hooks and functional components
- Tailwind CSS for styling
- Follow existing code patterns
- Add comments for complex logic

## 🙏 Acknowledgments

- Built with the [Matrix JS SDK](https://github.com/matrix-org/matrix-js-sdk)
- Inspired by Element and other Matrix clients
- Icons from [Lucide React](https://lucide.dev)

---

Built with ❤️ to make Matrix chatting actually enjoyable.

