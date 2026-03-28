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

## Design System

The app follows a **japanese kawaii pixel** aesthetic. All UI must adhere to these rules:

| Element | Rule |
|---|---|
| **Font** | `PressStart2P_400Regular` from `@expo-google-fonts/press-start-2p` — loaded in `App.js` via `useFonts`. Use for headings and button labels only; system font for body/descriptions. |
| **Colors** | Pastel palette defined in `constants/theme.js`. Primary: `#FF6BA8` (sakura pink), dark: `#1E1238` (deep purple-black for borders/text). |
| **Shadows** | Pixel offset shadow only — a dark `View` positioned 4-5px down and right behind the element. `shadowRadius: 0`. Never use soft shadows. |
| **Borders** | `borderWidth: 2, borderColor: COLORS.dark`. No border-radius (or ≤2px). Sharp corners everywhere. |
| **Buttons** | Use `components/PixelButton.js`. On press, the button translates 4px down/right to "fill" the shadow — giving a satisfying physical press feel. |
| **Backgrounds** | `LinearGradient` (from `expo-linear-gradient`) with pastel gradient per screen. Each onboarding screen has a distinct color mood. |
| **Tone** | Cute, minimal, delightful. Prefer a single interaction/button per screen. Decorate with `✦ ♡ ★` characters using the pixel font. |

Design tokens: `constants/theme.js` (primary source). Legacy token file also exists at `lib/theme.js` (not used by onboarding screens).

## Architecture

This is an **Expo SDK 55 / React Native** app with Supabase as the backend.

- `index.js` — entry point
- `App.js` — root component; handles font loading, auth state, and navigation. Shows onboarding if no session or if `onboarding_complete` (SecureStore) is not set.
- `lib/supabase.js` — Supabase client singleton with `expo-secure-store` as auth session storage
- `constants/theme.js` — design tokens (colors, font names)
- `components/PixelButton.js` — reusable pixel-style button with press animation
- `screens/onboarding/` — 5-step onboarding flow (Welcome → Features → Location → Photo → Invite)
- `screens/Home.js` — main app placeholder
- `app.json` — Expo config; `scheme: "regtracker"` is set for OAuth redirect URIs

### Onboarding flow
1. **Welcome** — Google OAuth via `expo-web-browser` + `supabase.auth.signInWithOAuth`. Validates `@uchicago.edu` email after sign-in.
2. **Features** — 3 swipeable cards using horizontal paginated `ScrollView`. Animated dot indicators driven by `scrollX`.
3. **Location** — Requests `expo-location` foreground permission.
4. **Photo** — `expo-image-picker` → upload to Supabase `avatars` storage bucket → upsert to `profiles` table.
5. **Invite** — Native `Share` API. Writes `onboarding_complete = 'true'` to SecureStore on finish.

### Google OAuth setup (required before auth works)
In the Supabase dashboard → Authentication → Providers → Google:
- Add redirect URL: `regtracker://auth-callback` (production) and `exp://127.0.0.1:8081/--/auth-callback` (Expo Go dev)
- The `hd: 'uchicago.edu'` query param hints Google to surface only UChicago accounts, but the app also hard-validates the email post-sign-in.

The Supabase client is configured with `detectSessionInUrl: false` and `persistSession: true` with the SecureStore adapter.
