# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start Metro bundler (uses .env.local automatically via the start script)
npx expo start

# Open on specific platform
npx expo start --ios
npx expo start --android
npx expo start --web

# Build a native development build (required if Expo Go is incompatible)
npx expo run:ios
npx expo run:android
```

## Environment

Supabase credentials are read from `.env.local` (gitignored):

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Both variables must be prefixed `EXPO_PUBLIC_` to be accessible in the React Native bundle.

## Backend

There is no dedicated backend server. All server-side logic lives in **Supabase Edge Functions** (Deno-based, deployed to Supabase's infrastructure). When a feature requires backend logic — API calls to third parties, data processing, anything that shouldn't run on the client — implement it as an edge function, not a separate server.

```bash
# Deploy an edge function
supabase functions deploy <function-name>

# Run edge functions locally
supabase functions serve

# Create a new edge function
supabase functions new <function-name>
```

Edge functions live in `supabase/functions/<function-name>/index.ts`. Call them from the app via the Supabase client:

```js
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { ... },
});
```

Database schema changes go through Supabase migrations (`supabase/migrations/`), not manual edits to the dashboard.

## Architecture

This is an **Expo SDK 55 / React Native** app with Supabase as the backend.

- `index.js` — entry point, registers the root component via `registerRootComponent`
- `App.js` — root React component
- `lib/supabase.js` — Supabase client singleton; uses `expo-secure-store` as the auth session storage adapter so tokens are stored in the device keychain rather than AsyncStorage
- `app.json` — Expo config (name, icons, splash, plugins); `expo-secure-store` is listed as a plugin here, which is required for it to work on native builds

The Supabase client is configured with `detectSessionInUrl: false` (correct for React Native — no URL-based OAuth redirects) and `persistSession: true` with the SecureStore adapter.
