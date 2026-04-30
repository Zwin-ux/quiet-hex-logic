# iOS and Android Release After World App

World App remains the primary release target. Native iOS/Android should follow after the World App flow is accepted and stable.

## Current Mobile Setup

- Expo app entry: `App.native.tsx`
- EAS config: `eas.json`
- Current bundle ids:
  - iOS: `com.zwin.openboard`
  - Android: `com.zwin.openboard`
- The native WebView URL can now be set at build time with `EXPO_PUBLIC_WEB_APP_URL`.
- `eas.json` includes:
  - `preview` for internal mobile QA against the current Railway root build.
  - `worldPreview` for internal QA against the current Railway World surface at `/?surface=world`.
  - `production` with auto-increment enabled.
- The native wrapper default URL now falls back to the current Railway build instead of `hexology.me` so ad hoc preview installs do not silently point at the stale public origin.

## Build Commands

```bash
npx expo-doctor
npx eas build --profile worldPreview --platform ios
npx eas build --profile worldPreview --platform android
```

For store builds after World App approval:

```bash
npx eas build --profile production --platform ios
npx eas build --profile production --platform android
```

## Required Cleanup Before Native Store Submission

- Decide whether native app name is `BOARD` or `Hexology`.
- Update `app.json` name, icon, splash, and store metadata to match that decision.
- Remove or re-scope subscription/IAP code if native v1 does not ship paid features.
- Confirm support, privacy, and terms URLs match the app name and feature set.
- Capture iOS and Android screenshots from physical devices, not browser emulation.
- Run normal web regression after native WebView URL changes.

## Release Rule

Do not submit native iOS/Android until these World App gates are green:

- `npm run check:world-release -- --strict-env`
- `npm run smoke:world -- <staging-url>`
- `npm run qa:world-device -- <staging-url>`
- REF-109 has iOS and Android World App QR evidence attached.
