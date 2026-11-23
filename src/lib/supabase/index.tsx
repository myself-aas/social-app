import {createContext, useContext, useState} from 'react'

import {createSupabaseClient, type SupabaseClient} from './client'

export * from './client'

/**
 * `undefined` means there is no provider above this component. `null` means
 * there is a provider, but Supabase is not configured for this build.
 */
const Context = createContext<SupabaseClient | null | undefined>(undefined)
Context.displayName = 'SupabaseContext'

/**
 * Owns the app's Supabase client. Mount it once, above anything that calls
 * `useSupabase`.
 */
export function Provider({children}: React.PropsWithChildren<{}>) {
  /*
   * The initializer runs on first mount only, so the client is created at most
   * once per app session and survives re-renders.
   */
  const [client] = useState(createSupabaseClient)

  return <Context.Provider value={client}>{children}</Context.Provider>
}

/**
 * The Supabase client, or `null` when Supabase is not configured for this
 * build. Prefer this in UI that can degrade gracefully.
 *
 * @throws When called outside the `Provider`.
 */
export function useSupabaseMaybe(): SupabaseClient | null {
  const client = useContext(Context)
  if (client === undefined) {
    throw new Error(
      'useSupabaseMaybe must be used within the Supabase Provider',
    )
  }
  return client
}

/**
 * The Supabase client. Call this only from code paths that require a
 * configured project.
 *
 * @throws When Supabase is not configured, or when called outside the
 * `Provider`.
 */
export function useSupabase(): SupabaseClient {
  const client = useSupabaseMaybe()
  if (!client) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    )
  }
  return client
}
