# COOKIE — iOS App Notes

## Implementation Status: COMPLETE

All phases have been implemented. The app is ready for Xcode build and App Store submission prep.

To open the project in Xcode:
```
npx cap open ios
```

### Remaining Manual Steps for App Store
- Configure signing & team in Xcode (requires Apple Developer Account, $99/yr)
- Generate app icon set (1024x1024 master) and add to `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Customize splash screen in `ios/App/App/Assets.xcassets/Splash.imageset/`
- Take App Store screenshots (6.7", 6.5", 5.5" iPhones; optionally iPad)
- Fill out App Store Connect metadata (subtitle, keywords, description)
- Host privacy policy at a public URL (content is already in the Privacy screen)

---

## Original Assessment (Pre-Implementation)

### What Existed
- **Single-page React + Vite + Tailwind v4 web app** with polished editorial UI
- **5 screens:** Library, Recipe Detail, Cooking Mode, About, Add Recipe
- **4 seed recipes** hardcoded in `src/constants.ts` (2 had empty ingredients/steps)
- **Mobile-responsive layout** with hamburger menu, breakpoints, touch-friendly targets
- **Animations** via `motion/react` (AnimatePresence transitions, hover effects)
- **Design system** fully realized: Newsreader + Work Sans fonts, sage/burnt-orange palette, editorial shadows

### What's Incomplete or Non-Functional
| Feature | Status |
|---------|--------|
| Cooking Mode timer | UI only — "Start Timer" button does nothing, no countdown logic |
| Servings toggle | Hardcoded to "4", no scaling logic |
| Add Recipe form | Form shell only — "Continue to Ingredients" is a dead `type="button"` |
| Bookmark / Share buttons | Rendered but no functionality |
| Data persistence | None — all data lives in a static constant array |
| Search | Works (filters by title + category) but resets on screen change |
| 2 of 4 recipes | Artisan Glazed Donuts and Overnight Sourdough have empty `ingredients[]` and `steps[]` |

### Unused Dependencies
- `@google/genai` — imported in `package.json`, never used in `src/`
- `express` + `dotenv` — server-side deps, unused
- `vite.config.ts` defines `process.env.GEMINI_API_KEY` — no consumer in code
- `metadata.json` requests `camera` frame permission — not used by the React app

### Code Structure Concerns
- `package.json` name is still `react-example`
- Entire UI lives in a single 612-line `App.tsx` (5 components, no file splitting)
- No router — screen state managed via `useState<Screen>`
- No error boundaries
- All images are external URLs (Google hosted) — no offline fallback

---

## Recommended Approach: Capacitor

**Why Capacitor over alternatives:**
- The app is already a fully-built React + Vite web app with responsive CSS
- Capacitor wraps web apps in a native WKWebView shell — zero UI rewrite needed
- First-class Vite support, maintained by the Ionic team
- Native API access via plugins (haptics, share, storage, status bar, splash screen)
- React Native / Expo would require a complete rewrite of every component

---

## iOS Conversion Roadmap

### Phase 1: Project Cleanup & Foundation

1. **Rename package** from `react-example` to `cookie-app` in `package.json`
2. **Remove unused deps:** `@google/genai`, `express`, `dotenv`, `@types/express`
3. **Remove dead config:** `GEMINI_API_KEY` define in `vite.config.ts`, `metadata.json`
4. **Split `App.tsx`** into separate files:
   - `components/Header.tsx`
   - `components/RecipeCard.tsx`
   - `screens/LibraryScreen.tsx`
   - `screens/RecipeDetailScreen.tsx`
   - `screens/CookingModeScreen.tsx`
   - `screens/AboutScreen.tsx`
   - `screens/AddRecipeScreen.tsx`
   - `hooks/useNavigation.ts` (screen state + scroll management)
5. **Add a lightweight router or formalize the navigation hook** so deep-linking works later

### Phase 2: Complete Core Features

6. **Implement real countdown timer** in CookingMode
   - `useEffect` + `setInterval` based countdown
   - Play a sound / vibrate when timer finishes (Capacitor Haptics plugin)
   - Show remaining time updating every second in the circular UI
7. **Implement servings scaling**
   - Parse ingredient amounts (e.g., "1 cup" → `{value: 1, unit: "cup"}`)
   - Scale proportionally based on user-selected servings
8. **Wire up Add Recipe form**
   - Multi-step form: title/meta → ingredients → steps → review
   - Save to local storage (Capacitor Preferences or `@capacitor/storage`)
   - Merge user recipes with seed recipes in the library
9. **Implement Bookmark functionality**
   - Persist bookmarked recipe IDs to local storage
   - Add a "Bookmarks" filter/section to the Library screen
10. **Implement Share**
    - Use Capacitor Share plugin for native iOS share sheet
    - Share recipe title + description (and deep link once available)
11. **Fill out incomplete recipes** (Donuts, Sourdough) — or remove them and let the user add their own

### Phase 3: Add Capacitor & iOS Shell

12. **Install Capacitor:**
    ```
    npm install @capacitor/core @capacitor/cli
    npx cap init "Cookie" "com.cookie.app" --web-dir dist
    npm install @capacitor/ios
    npx cap add ios
    ```
13. **Configure `capacitor.config.ts`:**
    - `appId: "com.cookie.app"`
    - `appName: "Cookie"`
    - `webDir: "dist"`
    - Server config for live reload during dev
14. **Install required Capacitor plugins:**
    - `@capacitor/status-bar` — style the status bar to match the app
    - `@capacitor/splash-screen` — branded launch screen
    - `@capacitor/haptics` — tactile feedback on timer completion, button presses
    - `@capacitor/share` — native share sheet
    - `@capacitor/preferences` — key-value local storage for bookmarks + user recipes
    - `@capacitor/keyboard` — handle keyboard appearance in Add Recipe form
    - `@capacitor/app` — handle back button, app lifecycle
15. **Build & sync:**
    ```
    npm run build
    npx cap sync ios
    npx cap open ios
    ```

### Phase 4: iOS-Specific Polish

16. **Safe area handling**
    - Add `viewport-fit=cover` to `<meta viewport>` tag
    - Use `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` in CSS for header, footer, and CookingMode overlay
    - Ensure the sticky header doesn't collide with the notch/Dynamic Island
17. **Status bar**
    - Set to dark content on light background via `StatusBar.setStyle({ style: Style.Light })`
    - Make status bar area part of the app surface (no black bar)
18. **Splash screen**
    - Design a centered COOKIE wordmark on `#fbf9f4` (surface color) background
    - Configure auto-hide after app ready
19. **App icons**
    - Generate all required sizes (20pt through 1024pt) from a single master icon
    - Use the COOKIE branding — could be a stylized "C" or cookie icon on sage background
20. **Haptic feedback**
    - Light tap on recipe card press
    - Medium impact on "Start Cooking"
    - Success notification on timer completion and "Finish Cooking"
21. **Keep screen awake** during Cooking Mode (important for kitchen use)
    - Use `@capacitor-community/keep-awake` plugin
22. **Swipe gestures** in Cooking Mode
    - Swipe left/right to navigate steps (can use `motion/react` drag gestures)
23. **Pull-to-refresh** on Library screen (optional, more relevant if data becomes dynamic)
24. **Font loading**
    - Bundle Newsreader + Work Sans locally instead of loading from Google Fonts CDN
    - Ensures fonts work offline and load instantly

### Phase 5: Data & Offline

25. **Bundle recipe images locally** or implement image caching
    - Current images are all external Google URLs — will fail offline
    - Option A: Download and bundle in `public/images/` at build time
    - Option B: Use a service worker to cache images on first load
26. **Local data layer**
    - Create a `RecipeStore` service wrapping Capacitor Preferences
    - Methods: `getAllRecipes()`, `addRecipe()`, `toggleBookmark()`, `getBookmarks()`
    - Seed data loads on first launch, user additions persist across sessions
27. **Consider SQLite** (`@capacitor-community/sqlite`) if recipe data grows complex

### Phase 6: App Store Preparation

28. **Apple Developer Account** ($99/year) — required to publish
29. **App Store metadata:**
    - App name: "Cookie — The Digital Gastronome"
    - Subtitle: "Beautiful recipes, beautifully told"
    - Category: Food & Drink
    - Keywords: recipes, cooking, heirloom, kitchen, cookbook
    - Privacy policy URL (required) — create a simple privacy policy page
    - Support URL
30. **Screenshots** — Required sizes:
    - 6.7" (iPhone 15 Pro Max): 1290 × 2796
    - 6.5" (iPhone 14 Plus): 1284 × 2778
    - 5.5" (iPhone 8 Plus): 1242 × 2208
    - iPad Pro 12.9": 2048 × 2732 (if targeting iPad)
31. **App Review considerations:**
    - Must have enough content (fill out all 4 recipes or at least 3 complete ones)
    - Add Recipe must actually work (Apple tests all buttons)
    - Timer must actually count down
    - No dead links (Instagram, Newsletter, Events currently link to `#`)
    - Privacy policy must be real and hosted

---

## Priority Order for Implementation

**Must-have for MVP (App Store submission):**
1. Split App.tsx into components (maintainability)
2. Working timer in Cooking Mode
3. Working Add Recipe with local persistence
4. Working Bookmark with local persistence
5. Complete all 4 recipe data sets
6. Capacitor integration + iOS shell
7. Safe areas, status bar, splash screen, app icons
8. Bundle fonts locally
9. Bundle or cache images for offline use
10. Remove dead links or make footer links functional
11. Privacy policy page

**Nice-to-have for v1.0:**
- Servings scaling
- Native share sheet
- Haptic feedback
- Swipe gestures in Cooking Mode
- Keep screen awake in Cooking Mode
- Pull-to-refresh

**Future (v1.1+):**
- User accounts / cloud sync
- Photo upload for user recipes
- AI-powered recipe suggestions (leverage the unused `@google/genai` dep)
- Social features / community
- Meal planning
- Shopping list generation from ingredients

---

## Technical Notes

- **Minimum iOS target:** iOS 16+ (covers ~95% of active devices)
- **Xcode version:** 15+ required for Capacitor iOS builds
- **Node version:** 18+ (required by Vite 6)
- **The `motion` library** (Framer Motion successor) works well in Capacitor WKWebView — no known issues
- **Tailwind v4** generates standard CSS — fully compatible with WKWebView
- **React 19** — compatible with Capacitor, no SSR needed (Capacitor serves static files)
