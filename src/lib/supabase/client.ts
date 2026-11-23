import AsyncStorage from '@react-native-async-storage/async-storage'
import {createClient, type SupabaseClient} from '@supabase/supabase-js'

import {SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL} from '#/env'

export type {SupabaseClient}

/**
 * Whether both Supabase env vars are present. Features that depend on Supabase
 * should check this, or use `useSupabaseMaybe`, so the app still runs in builds
 * and forks that do not configure a project.
 */
export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY,
)

/**
 * Build a Supabase client for the configured project, or `null` when the env
 * vars are unset.
 *
 * Prefer `useSupabase` from `#/lib/supabase` inside components. Call this
 * directly only from non-React code that cannot reach the provider.
 *
 * The publishable key is safe to ship in the client bundle, but it is not an
 * access control boundary: every table it can reach must have RLS enabled.
 */
export function createSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return null
  }

  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      /*
       * Supabase Auth persists its session through this adapter. AsyncStorage
       * is backed by localStorage on web and by the platform database on
       * native, so a single adapter covers every platform.
       */
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      /*
       * The app owns URL handling for deep links and navigation, and does not
       * run Supabase's OAuth redirect flow.
       */
      detectSessionInUrl: false,
    },
  })
}
