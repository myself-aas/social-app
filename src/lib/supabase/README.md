# `#/lib/supabase`

Supabase client for the app, kept separate from the AT Protocol data layer. It
is optional: when the env vars below are unset, the provider still mounts and
the client is `null`.

## Configuration

Set both variables in `.env.local` (or the build environment):

```sh
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`EXPO_PUBLIC_*` values are inlined by Expo at bundle time, so restart the dev
server after changing them. Only a publishable key belongs here - a secret or
`service_role` key must never be shipped to the client.

## Usage

```tsx
import {useSupabase} from '#/lib/supabase'

function MyComponent() {
  const supabase = useSupabase()

  const load = async () => {
    const {data, error} = await supabase.from('my_table').select()
    // ...
  }
  // ...
}
```

- `useSupabase()` throws when Supabase is not configured, so it suits code that
  genuinely needs the backend.
- `useSupabaseMaybe()` returns `null` instead, for UI that can hide itself.
- `isSupabaseConfigured` is exported for non-React call sites.

The `Provider` is mounted once in `src/App.tsx` and `src/App.web.tsx`.

## Security

The publishable key is public. Access is decided entirely by row level security
on each table, so enable RLS and write policies before exposing data, including
for `select`.

Supabase Auth is independent of the app's atproto session. Nothing here signs a
user in; anything that needs an identity must do so explicitly. The client is
configured to persist an auth session in AsyncStorage but does not run an OAuth
redirect flow (`detectSessionInUrl: false`), because the app owns URL handling.

## Types

The client is currently untyped. Once tables exist, generate types and pass them
to `createClient` in `client.ts`:

```sh
supabase gen types typescript --project-id <project-ref> \
  > src/lib/supabase/database.types.ts
```

## Caveat: Realtime on native

Realtime needs a complete `URL`/`URLSearchParams`, which Hermes does not fully
provide. Add `react-native-url-polyfill/auto` to `src/platform/polyfills.ts`
before the first Realtime feature.
