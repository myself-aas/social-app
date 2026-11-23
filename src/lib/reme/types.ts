/**
 * Types for the reme read API.
 *
 * These mirror the JSON shapes returned by the `reme_*` Postgres functions in
 * `supabase/migrations/20261123000100_reme_read_api.sql`. Keep them in sync with
 * that file — the database is the source of truth, not the other way around.
 */

export type ContributionType =
  | 'paper-review'
  | 'tool-review'
  | 'perspective'
  | 'research-note'
  | 'dataset-review'
  | 'replication-report'
  | 'research-question'
  | 'literature-summary'
  | 'method-review'
  | 'implementation-note'

export type LifecycleState =
  | 'draft'
  | 'active'
  | 'under-review'
  | 'validated'
  | 'published'
  | 'superseded'
  | 'withdrawn'
  | 'archived'

export type IntegrityStatus =
  'active' | 'corrected' | 'expression-of-concern' | 'retracted' | 'withdrawn'

export type ReviewStatus =
  'OPEN' | 'IN_PROGRESS' | 'SUBMITTED' | 'RESOLVED' | 'WITHDRAWN'

export type ReviewOutcome =
  'ACCEPT' | 'MINOR_REVISION' | 'MAJOR_REVISION' | 'REJECT'

export interface RemeAuthorRef {
  id: string | null
  /** Scholar slug, used for `/scholar/:slug` style routes. */
  slug: string | null
  name: string
  handle: string | null
  avatar: string | null
  role: string | null
  domain: string | null
  institution: string | null
}

export interface RemeSourceRef {
  id: string
  title: string
  venue: string | null
  scheme: string | null
  identifier: string | null
  integrity: IntegrityStatus
  url: string | null
}

/** One row of the research feed. */
export interface RemeFeedItem {
  id: string
  slug: string
  title: string
  subtitle: string | null
  summary: string | null
  type: ContributionType
  lifecycle: LifecycleState
  publishedAt: string | null
  version: number
  topics: string[]
  tags: string[]
  trust: Record<string, unknown> | null
  author: RemeAuthorRef
  source: RemeSourceRef | null
  citationCount: number
  reviewCount: number
}

export interface RemeCitation {
  id: string
  locator: string | null
  quote: string | null
  verified: boolean
  sourceId: string
  sourceTitle: string
  scheme: string | null
  identifier: string | null
}

export interface RemeReviewItem {
  id: string
  type: string | null
  scope: string | null
  body: string | null
  status: string
  anonymous: boolean
}

export interface RemeReview {
  id: string
  status: ReviewStatus
  scope: string | null
  anonymous: boolean
  recommendation: ReviewOutcome | null
  dueAt: string | null
  reviewerName: string
  items: RemeReviewItem[]
}

export interface RemeRecognition {
  referenced: number
  helpful: number
  evidenceUsed: number
}

/** A contribution with its body and attached evidence. */
export interface RemeContribution extends Omit<
  RemeFeedItem,
  'author' | 'source'
> {
  mdx: string | null
  limitations: string[]
  aiProvenance: Record<string, unknown> | null
  author: RemeAuthorRef & {
    bio: string | null
    orcid: string | null
    github: string | null
  }
  source:
    | (RemeSourceRef & {
        authors: string[]
        publishedDate: string | null
        type: string
      })
    | null
  citations: RemeCitation[]
  reviews: RemeReview[]
  recognition: RemeRecognition
}

export interface RemeSourceListItem {
  id: string
  title: string
  type: string
  authors: string[]
  publishedDate: string | null
  venue: string | null
  scheme: string | null
  identifier: string | null
  integrity: IntegrityStatus
  url: string | null
  versionCount: number
  contributionCount: number
  evidenceCount: number
}

export interface RemeScholar {
  id: string
  slug: string
  name: string
  bio: string | null
  role: string | null
  domain: string | null
  institution: string | null
  avatar: string | null
  orcid: string | null
  github: string | null
  website: string | null
  metrics: {
    published: number
    reviewsCompleted: number
    evidence: number
    sources: number
    replications: number
  }
  expertise: {topic: string; label: string | null}[]
  contributions: {
    slug: string
    title: string
    type: ContributionType
    publishedAt: string | null
    topics: string[]
    summary: string | null
  }[]
  reviewsCompleted: {
    contributionSlug: string
    contributionTitle: string
    status: ReviewStatus
    recommendation: ReviewOutcome | null
    scope: string | null
  }[]
}

export interface RemeTopic {
  id: string
  slug: string
  name: string
  description: string | null
  count: number
}

export interface RemeSearchResult {
  id: string
  slug: string
  title: string
  type: ContributionType
  summary: string | null
  publishedAt: string | null
  topics: string[]
}
