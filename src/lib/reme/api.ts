import type {SupabaseClient} from '#/lib/supabase'
import type {
  ContributionType,
  RemeContribution,
  RemeFeedItem,
  RemeScholar,
  RemeSearchResult,
  RemeSourceListItem,
  RemeTopic,
} from './types'

/**
 * Thin, typed wrappers over the `reme_*` Postgres functions.
 *
 * Every function is SECURITY INVOKER on the server, so results are already
 * filtered by the caller's RLS policies — including the anonymous case when no
 * Supabase session exists. These helpers therefore never need to filter for
 * visibility themselves; they only shape arguments.
 */

async function callRpc<T>(
  client: SupabaseClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<T> {
  const {data, error} = await client.rpc(fn, args)
  if (error) {
    throw new Error(`${fn} failed: ${error.message}`, {cause: error})
  }
  return data as T
}

export async function fetchFeed(
  client: SupabaseClient,
  params: {
    type?: ContributionType | null
    topic?: string | null
    limit?: number
    offset?: number
  } = {},
): Promise<RemeFeedItem[]> {
  return callRpc<RemeFeedItem[]>(client, 'reme_feed', {
    p_type: params.type ?? null,
    p_topic: params.topic ?? null,
    p_limit: params.limit ?? 20,
    p_offset: params.offset ?? 0,
  })
}

export async function fetchContribution(
  client: SupabaseClient,
  slug: string,
): Promise<RemeContribution | null> {
  return callRpc<RemeContribution | null>(client, 'reme_contribution', {
    p_slug: slug,
  })
}

export async function fetchSources(
  client: SupabaseClient,
  params: {limit?: number; offset?: number} = {},
): Promise<RemeSourceListItem[]> {
  return callRpc<RemeSourceListItem[]>(client, 'reme_sources', {
    p_limit: params.limit ?? 30,
    p_offset: params.offset ?? 0,
  })
}

export async function fetchScholar(
  client: SupabaseClient,
  slug: string,
): Promise<RemeScholar | null> {
  return callRpc<RemeScholar | null>(client, 'reme_scholar', {p_slug: slug})
}

export async function fetchTopics(
  client: SupabaseClient,
): Promise<RemeTopic[]> {
  return callRpc<RemeTopic[]>(client, 'reme_topics', {})
}

export async function searchContributions(
  client: SupabaseClient,
  query: string,
  limit = 20,
): Promise<RemeSearchResult[]> {
  return callRpc<RemeSearchResult[]>(client, 'reme_search', {
    p_query: query,
    p_limit: limit,
  })
}
