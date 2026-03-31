<p align="center">
  <img src="https://img.shields.io/badge/expo-%7E52-black" alt="Expo">
  <img src="https://img.shields.io/badge/react--native-0.81-61dafb" alt="React Native">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
  <img src="https://img.shields.io/badge/lang-TypeScript-3178c6" alt="TypeScript">
</p>

<h1 align="center">友人 Yuujin App</h1>

<p align="center">
  <strong>Cross-platform client for Yuujin — your AI Japanese friend.</strong><br>
  Built with Expo Router + React Native. Runs on iOS, Android, and Web (PWA).
</p>

---

## What is Yuujin?

Yuujin (友人, "friend" in Japanese) is an AI-powered Japanese conversation partner. Instead of grammar drills and flashcards, you chat with AI friends who adapt to your level. When you're curious about why something is said a certain way, just ask in Chinese — your friend explains naturally, then flows back into Japanese.

This repository contains the **client application**. See also:

| Repo | Description |
|------|-------------|
| [yuujin-server](https://github.com/yuu-takigawa/yuujin-server) | Backend API (Egg.js + MySQL + Redis) |
| yuujin-prompts | AI prompt definitions (private) |

## Features

- **AI Conversations** — Chat with diverse AI characters via SSE streaming, each with unique personality and speaking style
- **Character System** — 5 preset characters + create your own with AI-assisted generation (dice randomizer per field)
- **Friend System** — Add characters as friends, auto-generated welcome message with streaming display
- **Text-to-Speech** — Listen to Japanese messages with sentence-level concurrent TTS
- **News Reading** — Japanese news articles with paragraph-level annotations (translation & explanation)
- **News Comments** — Comment on articles and get AI character replies
- **Topic Cards** — AI-generated conversation starters to break the ice
- **Message Tools** — Long-press any message for translation, grammar analysis, correction, or copy
- **Suggest Reply** — AI suggests what you could say next (free, no credits)
- **Dark/Light Theme** — Auto, light, or dark mode with full design system
- **i18n** — Chinese, English, Japanese UI
- **Onboarding** — JP level selection → meet your first friend → start chatting
- **PWA Support** — Installable on iOS/Android home screen via Safari/Chrome

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 52 + Expo Router v6 |
| UI | React Native 0.81 + React 19 |
| Language | TypeScript 5.8 |
| State | Zustand 5 + AsyncStorage |
| Animation | React Native Reanimated 4 |
| i18n | Expo Localization |
| E2E Testing | Playwright |

## Project Structure

```
yuujin-app/
├── app/                        # Expo Router pages (file-based routing)
│   ├── (auth)/                 # Login, register, forgot password, onboarding
│   ├── (main)/                 # Tab navigation
│   │   ├── (chat)/             # Conversation list & chat
│   │   ├── (friends)/          # Character gallery & create
│   │   ├── (news)/             # News feed
│   │   └── (profile)/          # User settings
│   ├── article/                # News article detail
│   └── add-friend.tsx          # Add friend page
├── components/                 # UI component library
│   ├── common/                 # Avatar, SwipeableRow, StaggerItem, etc.
│   ├── chat/                   # MessageBubble, ChatInput, StreamingText, etc.
│   ├── character/              # CharacterCard, CharacterForm, DiceButton
│   └── news/                   # News components
├── services/                   # API layer
│   ├── http.ts                 # HTTP client + token injection + SSE
│   ├── mock/                   # Mock data for development
│   └── real/                   # Real API integration (auth, chat, news, voice, etc.)
├── stores/                     # Zustand state management
│   ├── authStore.ts            # Authentication + token persistence
│   ├── friendStore.ts          # Friends + conversation list
│   ├── chatStore.ts            # Current conversation messages
│   ├── characterStore.ts       # Character gallery
│   ├── settingsStore.ts        # Theme, language, JP level
│   └── creditStore.ts          # Credits balance
├── hooks/                      # useTheme, useLocale, useTTS
├── constants/                  # Theme, i18n strings, config, voices
├── web/                        # PWA entry (index.html + manifest.json)
├── assets/                     # App icons, splash, avatars
├── DESIGN_SYSTEM.md            # UI design specification
└── deploy-web.sh               # Web deployment script
```

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- Expo CLI (`npx expo`)
- A running [yuujin-server](https://github.com/yuu-takigawa/yuujin-server) instance

### Setup

```bash
# Install dependencies
npm install

# Configure API endpoint
# Edit services/http.ts and set the backend URL

# Start development server
npm start

# Run on specific platform
npm run web        # Web browser
npm run ios        # iOS simulator
npm run android    # Android emulator
```

### API Mode

Toggle between mock data and real API in `services/api.ts`:

```typescript
export const USE_REAL_API = true;   // Connect to yuujin-server
export const USE_REAL_API = false;  // Use mock data (no backend needed)
```

## License

MIT

---

<p align="center">
  <strong>友人</strong> — Learn Japanese the way it's meant to be learned.
</p>
