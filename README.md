# COOKIE — The Digital Gastronome

A curated recipe app for the modern home cook, designed with editorial elegance and built for iOS.

## Tech Stack

- **React 19** + **TypeScript** — UI framework
- **Vite 6** — Build tooling
- **Tailwind CSS v4** — Styling with custom design tokens
- **Motion** — Fluid animations and transitions
- **Capacitor** — Native iOS shell and plugin access
- **localStorage** — Local data persistence (recipes, bookmarks)

## Getting Started

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:3000`.

## Building for iOS

```bash
npm run build
npx cap sync ios
npx cap open ios
```

This opens the Xcode project. From there, select your target device and run.

## Project Structure

```
src/
├── App.tsx                  # Root orchestrator
├── main.tsx                 # Entry point
├── index.css                # Tailwind + design tokens + bundled fonts
├── types.ts                 # Recipe domain types
├── constants.ts             # Seed recipe data
├── capacitor-init.ts        # Native plugin initialization
├── hooks/
│   └── useNavigation.ts     # Screen navigation state
├── components/
│   ├── Header.tsx           # Sticky nav header + mobile menu
│   ├── Footer.tsx           # Site footer with navigation
│   └── RecipeCard.tsx       # Recipe grid card component
├── screens/
│   ├── LibraryScreen.tsx    # Recipe library with search + filters
│   ├── RecipeDetailScreen.tsx
│   ├── CookingModeScreen.tsx # Step-by-step with live timers
│   ├── AddRecipeScreen.tsx  # Multi-step recipe submission
│   ├── AboutScreen.tsx
│   └── PrivacyScreen.tsx
└── services/
    └── recipeStore.ts       # localStorage persistence layer
```

## Features

- Curated recipe library with search and category filters
- Editorial recipe detail pages with chef's notes
- Interactive cooking mode with real countdown timers
- Multi-step recipe submission form
- Bookmark system with filtered view
- Fully offline — bundled fonts, local storage
- iOS-ready via Capacitor with native status bar and safe area support

## License

All rights reserved.
