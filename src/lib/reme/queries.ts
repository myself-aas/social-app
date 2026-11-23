import {useQuery, type UseQueryResult} from '@tanstack/react-query'

import {useSupabaseMaybe} from '#/lib/supabase'
import {STALE} from '#/state/queries'

import {
  fetchContribution,
  fetchFeed,
  fetchScholar,
  fetchSources,
  fetchTopics,
  searchContributions,
} from './api'
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
 * Query keys for the reme read API.
 *
 * Everything is namespaced under `reme` so a logout or project switch can clear
 * the whole cache with one prefix invalidation.
 */
export const remeQueryKeys = {
  all: ['reme'] as const,
  feed: (type: ContributionType | null, topic: string | null) =>
    ['reme', 'feed', type ?? 'all', topic ?? 'all'] as const,
  contribution: (slug: string) => ['reme', 'contribution', slug] as const,
  sources: () => ['reme', 'sources'] as const,
  scholar: (slug: string) => ['reme', 'scholar', slug] as const,
  topics: () => ['reme', 'topics'] as const,
  search: (query: string) => ['reme', 'search', query] as const,
}

/**
 * The research feed.
 *
 * Works signed out: the RPC runs as the anonymous role, so RLS restricts it to
 * published public contributions. Signed-in authors additionally see their own
 * drafts through the same call.
 */
export function useRemeFeed(params: {
  type?: ContributionType | null
  topic?: string | null
  limit?: number
}): UseQueryResult<RemeFeedItem[]> {
  const client = useSupabaseMaybe()
  const type = params.type ?? null
  const topic = params.topic ?? null
  const limit = params.limit ?? 20

  return useQuery({
    queryKey: remeQueryKeys.feed(type, topic),
    queryFn: () => fetchFeed(client!, {type, topic, limit}),
    enabled: Boolean(client),
    staleTime: STALE.MINUTES.FIVE,
  })
}

export function useRemeContribution(
  slug: string | undefined,
): UseQueryResult<RemeContribution | null> {
  const client = useSupabaseMaybe()

  return useQuery({
    queryKey: remeQueryKeys.contribution(slug ?? ''),
    queryFn: () => fetchContribution(client!, slug!),
    enabled: Boolean(client && slug),
    staleTime: STALE.MINUTES.FIVE,
  })
}

export function useRemeSources(): UseQueryResult<RemeSourceListItem[]> {
  const client = useSupabaseMaybe()

  return useQuery({
    queryKey: remeQueryKeys.sources(),
    queryFn: () => fetchSources(client!),
    enabled: Boolean(client),
    staleTime: STALE.MINUTES.FIVE,
  })
}

export function useRemeScholar(
  slug: string | undefined,
): UseQueryResult<RemeScholar | null> {
  const client = useSupabaseMaybe()

  return useQuery({
    queryKey: remeQueryKeys.scholar(slug ?? ''),
    queryFn: () => fetchScholar(client!, slug!),
    enabled: Boolean(client && slug),
    staleTime: STALE.MINUTES.FIVE,
  })
}

export function useRemeTopics(): UseQueryResult<RemeTopic[]> {
  const client = useSupabaseMaybe()

  return useQuery({
    queryKey: remeQueryKeys.topics(),
    queryFn: () => fetchTopics(client!),
    enabled: Boolean(client),
    staleTime: STALE.INFINITY,
  })
}

export function useRemeSearch(
  query: string,
): UseQueryResult<RemeSearchResult[]> {
  const client = useSupabaseMaybe()
  const trimmed = query.trim()

  return useQuery({
    queryKey: remeQueryKeys.search(trimmed),
    queryFn: () => searchContributions(client!, trimmed),
    enabled: Boolean(client && trimmed.length > 0),
    staleTime: STALE.SECONDS.THIRTY,
  })
}
