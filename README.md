# NyChatt - A Modern Matrix Client

A blazingly fast, beautiful, and feature-rich Matrix chat client that's 1000x better than Element.

## 🚀 Features

- **Lightning Fast**: Built with Vite and optimized for performance
- **Beautiful UI**: Modern, sleek design with Tailwind CSS
- **Full Matrix Support**: Complete Matrix protocol implementation
- **End-to-End Encryption**: Full E2EE support with visual indicators
- **Tree Navigation**: Collapsible spaces and room organization
- **Rich Messaging**: Markdown support, reactions, and more
- **Room History**: Load older messages on demand
- **Real-time Updates**: Instant message delivery and typing indicators
- **Session Persistence**: Stay logged in across browser sessions
- **Sliding Sync**: Optional support for faster syncing
- **Responsive Design**: Works perfectly on all screen sizes

## 🎯 Why NyChatt is Better

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
- **Matrix JS SDK** - Official Matrix protocol implementation
- **Lucide React** - Beautiful icons
- **React Markdown** - Rich text rendering
- **date-fns** - Modern date utilities

## 📦 Installation

```bash
npm install
```

## 🏃 Development

```bash
npm run dev
```

Open your browser to `http://localhost:5173`

## 🏗️ Build

```bash
npm run build
```

## 🎮 Usage

1. **Login**: Enter your Matrix homeserver URL and credentials
2. **Browse Rooms**: Search and select from your joined rooms
3. **Chat**: Send messages with markdown support
4. **React**: Add emoji reactions to messages
5. **Stay Connected**: Sessions persist across browser restarts

## 🔑 Keyboard Shortcuts

- `Enter` - Send message
- `Shift + Enter` - New line
- Type `/` for quick commands (coming soon)

## 🔒 Security & Encryption

### End-to-End Encryption (E2EE)

NyChatt supports full end-to-end encryption for Matrix rooms. Here's what you need to know:

**First Time Setup:**
1. Log in to your account
2. You'll see a yellow banner: "Encryption Not Fully Set Up"
3. Click "Set Up Encryption" to bootstrap cross-signing
4. This sets up the encryption keys needed to send and receive encrypted messages

**What You Get:**
- **Encryption Indicators**: Green lock icons on encrypted rooms and messages
- **Secure Storage**: Encryption keys stored in IndexedDB (browser secure storage)
- **Cross-Signing**: Automatic setup for device verification
- **Error Handling**: Clear UI when messages can't be decrypted

**Important Notes:**
- **New Login?** You'll need to set up encryption again or verify with another device
- **Lost Keys?** Without verification or backup, you may lose access to old encrypted messages
- **Multiple Devices?** Each device needs to be verified to access encrypted rooms
- For **maximum security**, verify your session with another logged-in device in Element or another Matrix client

## 🌟 Upcoming Features

- Device verification UI
- Key backup and recovery
- File uploads and media preview
- Voice and video calls
- Custom themes
- Emoji picker
- Message search
- Thread support
- Push notifications

## 📝 License

MIT License - Feel free to use this in your own projects!

## 🤝 Contributing

Contributions are welcome! This is a modern, clean codebase that's easy to work with.

---

Built with ❤️ to make Matrix chatting actually enjoyable.

