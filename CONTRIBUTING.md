# Contributing to Krypta

Thank you for considering contributing to Krypta! This document provides guidelines and information to help you contribute effectively.

## 🎯 Ways to Contribute

- **Bug Reports**: Found a bug? Open an issue with details
- **Feature Requests**: Have an idea? Share it in the issues
- **Code Contributions**: Fix bugs or implement features
- **Documentation**: Improve README, comments, or add examples
- **Testing**: Test on different browsers and setups
- **Design**: Improve UI/UX or create themes

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git
- A Matrix account for testing

### Setting Up Development Environment

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/krypta.git
   cd krypta
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Open Browser**
   - Navigate to `http://localhost:5173`
   - For desktop notifications, use HTTPS or `http://localhost:5173`

## 📝 Development Guidelines

### Code Style

- **TypeScript**: All new code should be TypeScript
- **Functional Components**: Use React hooks, avoid class components
- **Type Safety**: Avoid `any` types when possible
- **Naming Conventions**:
  - Components: PascalCase (`MessageTimeline.tsx`)
  - Hooks: camelCase with `use` prefix (`useMatrix.ts`)
  - Utilities: camelCase (`formatDate.ts`)
  - Constants: UPPER_SNAKE_CASE

### File Organization

```
src/
├── components/       # React components
├── contexts/        # React contexts (providers)
├── hooks/           # Custom React hooks
├── services/        # Business logic, API calls
├── types.ts         # Shared TypeScript types
├── utils/           # Utility functions
└── MatrixContext.tsx  # Main Matrix client context
```

### Styling

- **Tailwind CSS**: Primary styling method
- **CSS Variables**: For theme colors (see `ThemeContext.tsx`)
- **Inline Styles**: Only when using theme CSS variables
- **Avoid**: Global CSS unless absolutely necessary

### State Management

- **React Context**: For global state (Matrix client, theme, notifications)
- **Local State**: Use `useState` for component-specific state
- **Refs**: Use `useRef` for DOM references and mutable values
- **Memoization**: Use `useMemo`/`useCallback` to prevent unnecessary re-renders

## 🔧 Working with Matrix

### Key Concepts

- **Matrix Client**: The main SDK client (`matrix-js-sdk`)
- **Rooms**: Chat rooms and spaces
- **Events**: Messages, reactions, state changes
- **E2EE**: End-to-end encryption using Olm/Megolm

### Important Files

- `src/MatrixContext.tsx`: Main Matrix client setup and management
- `src/components/MessageTimeline.tsx`: Message display logic
- `src/components/MessageInput.tsx`: Message sending logic
- `src/contexts/ThreadsContext.tsx`: Threading system

### Matrix SDK Version

Krypta uses **matrix-js-sdk v34** (stable). This is important because:
- v39+ uses new Rust crypto (not stable yet)
- v34 uses legacy crypto with `initCrypto()` calls
- Don't upgrade SDK version without testing crypto thoroughly

## 🧪 Testing

### Manual Testing Checklist

Before submitting a PR, test these scenarios:

- [ ] Login with username/password
- [ ] Send messages in encrypted and unencrypted rooms
- [ ] Handle unverified devices dialog
- [ ] Emoji reactions work
- [ ] Room navigation (spaces, rooms, multi-window)
- [ ] Threads create and reply
- [ ] Notifications (audio/desktop) work
- [ ] Theme changes apply correctly
- [ ] Session persists across page reloads
- [ ] Works on different browsers (Chrome, Firefox, Safari)

### Console Logs

- Use emoji prefixes for clarity: `🔐`, `📤`, `✅`, `❌`, `🔄`
- Keep logs concise and informative
- Remove debug logs before committing (unless useful for troubleshooting)

## 📬 Submitting Changes

### Pull Request Process

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write clean, documented code
   - Follow existing patterns
   - Test thoroughly

3. **Lint Your Code**
   ```bash
   npm run lint
   ```

4. **Commit with Clear Messages**
   ```bash
   git commit -m "Add feature: brief description"
   ```
   
   Good commit messages:
   - `Fix: Resolve double-send issue in encrypted rooms`
   - `Feature: Add per-room theme customization`
   - `Refactor: Optimize message timeline rendering`
   - `Docs: Update README with encryption details`

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   
   Then create a Pull Request on GitHub with:
   - Clear title and description
   - Screenshots/GIFs if UI changes
   - Testing steps
   - Related issue numbers

### PR Requirements

- Code follows style guidelines
- No linting errors
- Changes are tested
- Documentation updated if needed
- Commit messages are clear

## 🐛 Reporting Bugs

### Before Reporting

1. Check existing issues
2. Test on latest version
3. Try to reproduce in a clean browser profile

### Bug Report Template

```markdown
**Description**
Clear description of the bug

**Steps to Reproduce**
1. Go to...
2. Click on...
3. See error...

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- Browser: Chrome 120
- OS: macOS 14
- Krypta Version: 1.0.0
- Homeserver: matrix.org

**Console Errors**
```
Paste any console errors here
```

**Screenshots**
If applicable
```

## 💡 Feature Requests

We love new ideas! When suggesting features:

- Explain the use case
- Describe the expected behavior
- Consider Matrix protocol limitations
- Check if it's already planned (see Upcoming Features in README)

## 🎨 Design Contributions

- Follow the existing design language
- Consider accessibility
- Test in light and dark modes
- Ensure responsive design
- Use theme CSS variables for colors

## ⚖️ Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Accept constructive criticism
- Focus on what's best for the community
- Show empathy

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Political/religious debates
- Spam or self-promotion

## 📞 Questions?

- Open a discussion issue
- Check existing documentation
- Look at code comments

## 🏆 Recognition

Contributors will be:
- Listed in the project contributors
- Mentioned in release notes for significant contributions
- Celebrated in the community

Thank you for making Krypta better! 🎉

