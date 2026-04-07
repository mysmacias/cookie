# Cookie — Run Instructions

## Prerequisites

- **Node.js** 18 or later
- **npm** (comes with Node)
- **Xcode** 15 or later (for iOS builds)
- **CocoaPods** (installed automatically by Capacitor, or `sudo gem install cocoapods`)
- **Apple Developer Account** ($99/year, required only for deploying to a physical device or the App Store)

## 1. Install Dependencies

```bash
cd /Users/marcomacias/Projects/Cookie
npm install
```

## 2. Run in the Browser (Development)

```bash
npm run dev
```

Opens a dev server at **http://localhost:3000** with hot module replacement.
This is the fastest way to develop and test UI changes.

## 3. Type Check

```bash
npm run lint
```

Runs `tsc --noEmit` to catch TypeScript errors without producing output files.

## 4. Production Build

```bash
npm run build
```

Generates an optimized production bundle in the `dist/` folder.

## 5. Preview the Production Build

```bash
npm run preview
```

Serves the `dist/` folder locally so you can verify the production build before deploying.

## 6. Build and Run on iOS Simulator

```bash
npm run build
npx cap sync ios
npx cap open ios
```

This will:
1. Build the web app into `dist/`
2. Copy the build + sync native plugins into the `ios/` Xcode project
3. Open the project in Xcode

Once Xcode is open:
- Select a simulator from the device dropdown (e.g., iPhone 16 Pro)
- Press **Cmd + R** or click the play button to build and run

## 7. Run on a Physical iPhone

1. Connect your iPhone via USB
2. In Xcode, select your phone from the device dropdown
3. Go to **Signing & Capabilities** in the App target settings
4. Select your development team (requires an Apple Developer Account)
5. Press **Cmd + R** to build and install on the device

If this is your first time running on the device, you may need to trust the developer certificate on the phone: **Settings > General > VPN & Device Management**.

## 8. Live Reload on iOS (Development)

For faster iteration while testing on iOS, you can use Capacitor's live reload:

```bash
npm run dev
```

Then in a separate terminal:

```bash
npx cap run ios --livereload --external
```

This runs the app on the simulator but loads from your dev server, so changes appear instantly without rebuilding.

## 9. Clean Build

If you encounter stale build artifacts:

```bash
npm run clean        # removes dist/
npm run build        # fresh build
npx cap sync ios     # re-sync to iOS
```

In Xcode, you can also do **Product > Clean Build Folder** (Cmd + Shift + K).

## 10. Preparing for App Store Submission

1. In Xcode, set the **Bundle Identifier** to `com.cookie.app` (already configured in `capacitor.config.ts`)
2. Set the **Version** and **Build Number** under the General tab
3. Add your app icon to `ios/App/App/Assets.xcassets/AppIcon.appiconset/` (1024x1024 master icon required)
4. Select **Any iOS Device (arm64)** as the build target
5. Go to **Product > Archive**
6. Once the archive completes, click **Distribute App** and follow the prompts to upload to App Store Connect

## Available npm Scripts

| Script           | Command         | Description                        |
|------------------|-----------------|------------------------------------|
| `npm run dev`    | `vite`          | Start dev server on port 3000      |
| `npm run build`  | `vite build`    | Production build to `dist/`        |
| `npm run preview`| `vite preview`  | Serve production build locally     |
| `npm run clean`  | `rm -rf dist`   | Remove build output                |
| `npm run lint`   | `tsc --noEmit`  | TypeScript type checking           |
