<p align="center">
  <img src="https://img.shields.io/badge/React_Native-Expo-000020?logo=expo" alt="Expo">
  <img src="https://img.shields.io/badge/platform-iOS%20%7C%20Android-lightgrey" alt="Platform">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
  <img src="https://img.shields.io/badge/lang-TypeScript-3178c6" alt="TypeScript">
</p>

<h1 align="center">友人 Yuujin App</h1>

<p align="center">
  <strong>Native mobile client for Yuujin — your AI Japanese friend.</strong><br>
  No grammar drills. No flashcards. Just conversations.
</p>

---

## What is this

This is the native mobile client for [Yuujin](https://github.com/yuu-takigawa/yuujin-server), built with React Native and Expo. Runs on both iOS and Android.

The entire app is designed around one idea: **chatting is learning**. No course trees, no XP bars, no streak anxiety. Open the app, chat with your Japanese friend, that's it.

## Features

- **Chat Interface** — Clean messaging UI that feels like texting a friend
- **Streaming Responses** — Real-time AI replies via SSE with typing animation
- **Bilingual Flow** — Automatically detects Japanese and Chinese messages with distinct visual styles
- **Conversation History** — Browse and continue past conversations
- **Session Review** — Post-chat cards showing new expressions and grammar progress
- **Memory** — Your AI friend remembers what you talked about last time

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo (SDK 52+) |
| Language | TypeScript |
| Navigation | Expo Router (file-based routing) |
| State | Zustand |
| Streaming | Server-Sent Events (SSE) |
| Storage | AsyncStorage |
| Backend | [yuujin-server](https://github.com/yuu-takigawa/yuujin-server) |

## Project Structure

```
yuujin-app/
├── app/                          # Expo Router (file-based)
│   ├── _layout.tsx               # Root layout
│   ├── index.tsx                 # Welcome screen
│   ├── (auth)/
│   │   ├── login.tsx             # Login
│   │   └── register.tsx          # Register
│   └── (main)/
│       ├── _layout.tsx           # Tab Navigator
│       ├── chat.tsx              # Core chat screen
│       ├── history.tsx           # Conversation history
│       ├── review/[id].tsx       # Post-conversation review
│       └── profile.tsx           # Settings & learning progress
├── components/
│   ├── chat/
│   │   ├── MessageBubble.tsx     # Message bubble (ja/zh styles)
│   │   ├── ChatInput.tsx         # Input bar + send button
│   │   ├── TypingIndicator.tsx   # AI typing animation
│   │   └── StreamingText.tsx     # Streaming text renderer
│   ├── review/
│   │   ├── ExpressionCard.tsx    # New expression card
│   │   └── ProgressChart.tsx     # Grammar progress chart
│   └── common/
│       ├── Avatar.tsx            # AI friend avatar
│       └── LevelBadge.tsx        # JLPT level indicator
├── services/
│   ├── api.ts                    # API client (fetch wrapper)
│   ├── sse.ts                    # SSE stream handler
│   ├── auth.ts                   # JWT storage & refresh
│   └── storage.ts                # AsyncStorage wrapper
├── stores/
│   ├── chatStore.ts              # Chat state (Zustand)
│   ├── authStore.ts              # Auth state
│   └── settingsStore.ts          # User preferences
├── hooks/
│   ├── useChat.ts                # Chat logic hook
│   ├── useStreaming.ts           # SSE streaming hook
│   └── useAuth.ts                # Auth hook
├── constants/
│   └── config.ts                 # API URL, etc.
├── assets/
│   └── images/
├── app.json                      # Expo config
├── package.json
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js >= 18
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Expo Go app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- A running instance of [yuujin-server](https://github.com/yuu-takigawa/yuujin-server)

### Setup

```bash
# Clone
git clone https://github.com/yuu-takigawa/yuujin-app.git
cd yuujin-app

# Install
npm install

# Configure
cp constants/config.example.ts constants/config.ts
# Edit config.ts — set your yuujin-server URL

# Run
npx expo start
```

Scan the QR code with Expo Go and you're in.

### Configuration

```typescript
// constants/config.ts
export const API_URL = 'https://your-yuujin-server.com';
```

## Design Principles

1. **Chat-first** — The conversation IS the product. Everything else is secondary.
2. **Zero friction** — Open → chat. No onboarding quiz, no level test, no tutorial.
3. **Mobile-native** — Designed for one-handed use, thumb-friendly interactions.
4. **Calm UI** — No streak counters, no XP bars, no guilt-tripping notifications. A friendly space to practice.

## Screenshots

> Coming soon

## Related

| Repo | Description |
|------|------------|
| [yuujin-server](https://github.com/yuu-takigawa/yuujin-server) | Backend API service |

## Contributing

Contributions welcome! Especially:

- UI/UX improvements
- Accessibility
- Performance optimizations
- i18n (Japanese UI, English UI)

## License

MIT © [yuu-takigawa](https://github.com/yuu-takigawa)

---

<p align="center">
  <strong>友人</strong> — Your pocket Japanese friend.<br>
  Built with ❤️ by <a href="https://github.com/yuu-takigawa">Takigawa Yuu</a>
</p>
