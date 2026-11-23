# reme × ResearchWithMe — refactor context

**Status:** source of truth for "what reme is" and "how this fork becomes reme".
Sections 1–7 were reconstructed from the Supabase schema (`bxyjjbclaklzjxeumeat`) and the live
site while the repo was unreadable. `myself-aas/ResearchWithME` is now public and cloned, so
**section 8 supersedes any guess in sections 1–7** where the two disagree.

- Repo: <https://github.com/myself-aas/ResearchWithME> (cloned to `/tmp/rwm`, 21 MB)
- Backend: `https://bxyjjbclaklzjxeumeat.supabase.co` (publishable key in `.env.local`)
- Live: <https://researchwith.me>

---

## 1. What reme is

> **reme.** = **ResearchWithMe** — *"Research you can read, check, and reuse."*

Open-access, independently reviewed long-form teardowns of published papers and open-source
repositories, written by ORCID- and GitHub-attested domain specialists. Every claim carries a
verifiable citation; nothing is paywalled.

Two halves, one account:

| Half | What it is | Surface |
| --- | --- | --- |
| **Editorial column** | Curated published reviews/teardowns across 6 columns, 5 manuscript formats | `/`, `/category/*`, `/author/*`, `/contribution/*` |
| **Research Contribution Network v3.4** | Structured, evidence-linked contributions + workspaces, reviews, provenance graph, Research OS | `/contribute`, `/feed`, `/sources`, `/evidence`, `/tools`, `/editor`, `/research-os`, `/reviews`, `/library`, `/graph`, `/workspaces/*` |

**Columns:** Research Reviews · GitHub Repo Teardowns · STEM & Tech · Health & Medicine ·
Sociology & Culture · Data & Policy.

**Formats (site):** Paper Review · Repo Teardown · Deep-Dive Essay · Field Notes · Case Study.
**Contribution types (DB, authoritative):** `paper-review`, `tool-review`, `perspective`,
`research-note`, `dataset-review`, `replication-report`, `research-question`,
`literature-summary`, `method-review`, `implementation-note`.

**Explicit product stance (worth preserving in UI copy):** recognition is derived only from
verified non-self events — no streaks, no vanity score, no opaque reputation rank. AI suggestions
never become mandatory; a human must promote them. Notifications record acknowledgement without
silently resolving attention items.

---

## 2. Domain model (authoritative: Supabase `bxyjjbclaklzjxeumeat`)

Text ids (Prisma-style), `object_version` for optimistic concurrency, `classification` on
user-generated records, RLS enabled on **all** `v34_*` tables.

### Core scholarly objects

| Table | Meaning | Key fields |
| --- | --- | --- |
| `v34_sources` | canonical paper / dataset / repo record | `source_type`, `title`, `authors jsonb`, `venue`, `identifier_scheme`+`identifier_value` (DOI/arXiv), `access_state`, `integrity_status`, `language` |
| `v34_source_versions` | immutable snapshots of a source | versioned by migration waves; citations point here, never at the source |
| `v34_claims` | atomic assertion extracted from literature | `claim_type`, `statement`, `lifecycle`, `assessment jsonb` |
| `v34_evidence` | locator-grounded observation | `statement`, `quote`, `locator jsonb`, `extraction_type`, `limitation`, `ai_provenance` |
| `v34_claim_evidence` | typed link claim↔evidence | `SUPPORTS` / `CONTRADICTS` / `QUALIFIES` |
| `v34_citations` | contribution text → source version | `locator`, `quote_excerpt`, `verified` |
| `v34_contributions` | the publishable unit (the "post") | `contribution_type`, `title`, `subtitle`, `summary`, `document jsonb`, `mdx`, `topics text[]`, `tags text[]`, `limitations text[]`, `trust_assessment jsonb`, `ai_provenance jsonb`, `lifecycle`, `version` |
| `v34_contribution_versions` | immutable revision history | `version_number`, `mdx`, `checksum_sha256` |
| `v34_reviews` | formal review of a contribution version | `status`, `recommendation`, `scope`, `anonymous`, `due_at` |
| `v34_review_items` / `_decisions` / `_rebuttals` | review thread, decision, author response | item `status`, decision outcome |
| `v34_discussions` + `v34_discussion_comments` | open discussion attached to any object | `object_type` + `object_id`, `locked` |
| `v34_annotations` | inline notes | — |
| `v34_topics` / `_relationships` / `_assignments` / `_follows` / `v34_claim_topics` | SKOS-ish taxonomy | relations `BROADER_THAN`, `NARROWER_THAN`, `RELATED_TO`, `EQUIVALENT_TO` |

### Collaboration

| Table | Meaning |
| --- | --- |
| `v34_workspaces` | collaboration container: `visibility`, `default_classification` |
| `v34_workspace_members` | role `OWNER/ADMIN/EDITOR/CONTRIBUTOR/REVIEWER/VIEWER`, `status` |
| `v34_workspace_invitations`, `_access_requests`, `_tools` | membership lifecycle, tool registry |
| `v34_projects` | research project inside a workspace: `stage`, `visibility`, `topics[]`, `owner_id` |
| `v34_project_members/_milestones/_tasks/_notes/_objects/_follows` | plan + object graph |
| `v34_tool_repositories` / `v34_tool_source_links` | deduped OSS repos ↔ papers (`/tools`) |

### Recognition & Research OS

| Table | Meaning |
| --- | --- |
| `v34_recognition_signals` | `helpful_review`, `referenced`, `saved`, `evidence_used`, `validated_insight`, `replication_documented` |
| `v34_recognition_events` | `CONTRIBUTION_REFERENCED`, `REVIEW_HELPFUL`, `EVIDENCE_REUSED`, `CORRECTION_ACCEPTED`, `REPLICATION_REPORTED`, `REVIEW_COMPLETED` |
| `v34_contribution_impact_daily`, `v34_profile_metrics`, `v34_research_activity_days` | rollups |
| `v34_attention_items` | `attention_kind` (`DRAFT_CONFLICT`, `RETRACTION_IMPACT`, `REVIEW_DEADLINE`, `PERMISSION_ISSUE`, `UNRESOLVED_CITATION`, `ASSISTANT`), `severity`, `status` |
| `v34_assistant_sessions/_messages/_tasks` | AI: task status `SUGGESTED → ACCEPTED → COMPLETED / DISMISSED` — **never auto-promoted** |
| `v34_research_goals` + `v34_goal_progress_events` | metric ∈ `SOURCES_REVIEWED, CONTRIBUTIONS_PUBLISHED, REVIEWS_COMPLETED, EVIDENCE_ATTACHED, CITATIONS_RESOLVED, MILESTONES_COMPLETED, REPLICATIONS_DOCUMENTED, CUSTOM`; period ∈ `ONE_TIME…QUARTERLY` |
| `v34_dashboard_preferences`, `v34_mobile_*_preferences` | `default_landing` ∈ `DASHBOARD / FEED / LIBRARY / PROJECTS`, module order |
| `v34_library_items`, `v34_library_collections`, `v34_citation_collections`, `v34_saved_searches`, `v34_search_alerts`, `v34_scholarly_exports` | library + CSL/BibTeX export |
| `v34_integrity_events`, `v34_integrity_impact_records` | retraction / expression-of-concern propagation |
| `v34_graph_nodes` / `v34_graph_edges` / `v34_quarantined_relationships` | provenance graph (`/graph`) |

### Platform / ops

`v34_notifications`, `v34_notification_deliveries`, `v34_push_subscriptions`, `v34_user_devices`,
`v34_device_sync_cursors`, `v34_pending_mutations` (offline queue → matters for RN),
`v34_outbox_events` + `_consumer_receipts`, `v34_webhook_deliveries`, `v34_idempotency_keys`,
`v34_render_jobs`, `v34_background_jobs`, `v34_audit_events`,
`v34_ai_provenance_records`, `v34_user_follows`, `v34_user_expertise`, `v34_user_affiliations`,
`api_keys`/`api_requests`/`api_usage_periods`, `billing_*`, `linkedin_*`, legacy `posts`/`comments`/`profiles`/`editors`.

### Enums that shape the UI

`v34_lifecycle_state` `{draft, active, under-review, validated, published, superseded, withdrawn, archived}` ·
`v34_data_classification` `{public, workspace, confidential, restricted, embargoed}` ·
`v34_source_integrity_status` `{active, corrected, expression-of-concern, retracted, withdrawn}` ·
`v34_review_status` `{OPEN, IN_PROGRESS, SUBMITTED, RESOLVED, WITHDRAWN}` ·
`v34_review_decision_outcome` `{ACCEPT, MINOR_REVISION, MAJOR_REVISION, REJECT}` ·
`v34_project_stage` `{SCOPING, LITERATURE_REVIEW, EXPERIMENTATION, SYNTHESIS, UNDER_REVIEW, PUBLISHED, ARCHIVED}` ·
`v34_workspace_role` `{OWNER, ADMIN, EDITOR, CONTRIBUTOR, REVIEWER, VIEWER}` ·
`v34_attention_severity` `{INFO, WARNING, CRITICAL}`.

### Backend facts that constrain the app

- **Auth = Supabase Auth**, site `https://researchwith.me`, providers enabled: email, **GitHub, Google, Discord, LinkedIn OIDC**; MFA TOTP on; refresh-token rotation on; Next.js callback (`/auth/callback`, `localhost:3000`).
- **No edge functions** — business logic lives in SQL functions (`v34_unified_search`, `v34_autosave_draft_atomic`, `v34_profile_social_counts`, `v34_reconcile_integrity_report`, `v34_claim_outbox_batch`, `v34_idempotency_lookup/store`, `v34_is_workspace_member`, …) and the Next.js app.
- Search is `v34_unified_search` over trigram + unaccent — the mobile app should call it rather than re-implement filtering.
- Offline story already exists server-side (`pending_mutations`, `device_sync_cursors`, `draft_snapshots`) — mirror it rather than invent one.
- Email sender displays as **`πeme`** (Greek pi, not "r") — see open question 4.

---

## 3. Surface inventory (live site → app screens)

| Route | Purpose | Primary tables |
| --- | --- | --- |
| `/` | editorial home, 6 columns, latest reviews, authors | `v34_contributions`, `v34_topics` |
| `/feed` | research network feed, filterable | `v34_contributions` (+ follows) |
| `/sources`, `/source/*` | canonical source records | `v34_sources`, `_source_versions`, `_source_topics` |
| `/evidence` | evidence & claims explorer | `v34_evidence`, `_claims`, `_claim_evidence` |
| `/tools` | deduped OSS repos + license metadata | `v34_tool_repositories`, `_tool_source_links` |
| `/contribute`, `/editor` | 13-block scholarly MDX editor, offline autosave | `v34_drafts`, `_draft_snapshots`, `_render_jobs` |
| `/contribution/*` | read surface + review thread + citations | `v34_contributions`, `_citations`, `_reviews` |
| `/reviews` | review queue, pipeline states | `v34_reviews`, `_review_items` |
| `/library` | saved items, collections, goals | `v34_library_*`, `v34_research_goals` |
| `/workspaces/*` | workspace + project detail | `v34_workspaces`, `_projects` |
| `/graph` | provenance graph curation | `v34_graph_*` |
| `/research-os` | Continue Working · Attention Queue · Assistant Tasks · Goals · Recognition · Pipeline · Private Activity · Export | `v34_attention_items`, `_assistant_*`, `_recognition_*`, `v34_profile_metrics` |
| `/author/*`, `/authors` | scholar profile + everything reviewed | `profiles`, `v34_user_expertise` |

---

## 4. Fork → reme mapping

Today's tab bar: **Home · Search · Messages · Notifications · Profile**.

**Proposed tabs:** `Feed · Search · Contribute · Library · Profile`
(Research OS becomes the *Home* destination when `default_landing = DASHBOARD`; Messages demotes
to a header action — reme's conversation primitive is `discussions` + `reviews`, not DMs).

| Existing screen | Verdict | Becomes |
| --- | --- | --- |
| `Home` feed (feeds/custom feeds) | **repurpose** | `Feed` — `v34_contributions` cards (type, title, topics, trust badge, lifecycle) |
| `PostThread` | **repurpose** | `Contribution` detail: MDX body blocks, citation list, claim/evidence panel, review thread, discussion |
| `Profile` | **repurpose** | Scholar profile: ORCID/GitHub attestations, expertise, recognition counts, contributions, reviews completed |
| `Notifications` | **repurpose** | Event history (ack ≠ resolve) + Attention Queue entry |
| `Search` | **repurpose** | `v34_unified_search` across contributions/sources/topics/tools |
| `Feeds` / `SavedFeeds` / `CustomFeed` | **retire** | replaced by topic/column filters |
| `List` / `ProfileList` | **repurpose** | workspace/project member lists |
| `StarterPack` | **retire** | — |
| `Messages` (chat) | **retire or defer** | discussions/reviews in P4 |
| `Bookmarks` | **repurpose** | `Library` |
| `Moderation*` | **retire** | reme has `integrity_events` / quarantine, not labelers |
| `VideoFeed`, `Video` composer | **retire** | — |
| `Hashtag`, `Topic` | **repurpose** | `v34_topics` + topic graph |
| `Settings` | **repurpose** | account, classification defaults, dashboard modules, push, export |
| `Login` / `Signup` / `Onboarding` | **replace** | Supabase Auth (email OTP + GitHub/Google/Discord/LinkedIn), ORCID/GitHub attestation step |
| `Splash` | **done** | reme mark |
| — | **new** | `Contribute` (37-file composer → 13-block MDX), `Source`, `Evidence`, `Research OS`, `Graph`, `Workspace/Project` |

---

## 5. Codebase seams (measured)

| Seam | Size | Consequence |
| --- | --- | --- |
| Brand skin | `src/alf/brand.ts`, `themes.ts`, `tokens.ts`, `Logotype`, `Logo`, `Splash`, favicon | **done** — palette + mark shipped, contrast-checked |
| Session | `#/state/session` in **379 files**, `useSession` in **266** | deepest coupling; atproto session is ambient in nearly every query/hook |
| atproto record model | `app.bsky` referenced in **652 files** | post/follow/like/repost shapes must become `v34_contributions` / `v34_user_follows` / `v34_recognition_signals` |
| Composer | **37** tsx files under `src/view/com/composer` | highest-leverage reuse → contribution editor |
| Moderation/labels | `Threadgate` 34, labelers, modals | delete, not port |
| Supabase client | `src/lib/supabase/{client,index}.tsx` | wired to the **empty `reme`** project, provider mounted in `App.tsx`/`App.web.tsx` |

**Implication:** the session layer, not the theme, is the real refactor. Every "keep atproto
underneath" shortcut re-infects 379 files with a second identity model. The clean seam is
`#/state/session` → a reme session backed by Supabase Auth, with atproto kept only as an optional
*attestation* (handle/DID stored on `profiles.github`/`orcid`-style fields).

---

## 6. Recommended phase order

0. **Brand skin** — *shipped* (azure ramp, warm neutrals, organic mark, wordmark, splash, favicon).
1. **Identity + data spine** — Supabase Auth session replacing atproto session; `profiles` row as the app's actor; typed query layer over the `v34_*` schema (TanStack Query, `supabase-js`), generated types from the DB.
2. **Read surfaces** — Feed · Contribution · Source · Profile · Search. This is where the fork starts to look like reme.
3. **Contribute** — MDX 13-block editor reusing the composer shell, draft autosave via `v34_autosave_draft_atomic`, citations with locators.
4. **Library · Workspaces · Projects · Reviews**.
5. **Research OS** — attention queue, assistant tasks (suggest-only), goals, recognition rollups, dashboard modules.

---

## 7. Blockers & decisions

1. **Repo access** — *resolved.* Repo is public and cloned; section 8 records what it contains.
2. **Auth model** — open. The real product signs in with Supabase Auth (email/password, Google); the fork keeps atproto. Delegated decision: **keep atproto sign-in, bridge to Supabase** — implementation still needs a token-exchange seam.
3. **Target project** — *resolved by user.* The app now points at the real project (`bxyjjbclaklzjxeumeat`) with its publishable key in `.env.local`. Note: that database currently holds **1 profile and zero contributions/sources/topics**, so read surfaces will show empty states until content exists. The throwaway demo project `gakquxtpdgfxrxlvpcgh` still holds the seeded read model + 7 demo contributions, usable as a dev fixture by swapping `EXPO_PUBLIC_SUPABASE_URL`.
4. **Brand rendering** — wordmark shipped as `reme.`; the transactional sender is `πeme`. Keeping the r (decided).
5. **Visual direction** — the fork uses azure `#0077CD` + warm neutrals (decided earlier), while the repo's normative system is cobalt `#005BBF` + archival grey `#F8F9FA`. Both are one constant in `src/alf/brand.ts`; the domain colour families (trust/provenance/knowledge) are still missing from the fork entirely and are the real win available here.

---

## 8. Repo facts (verified from the clone, 2026-11-23)

`myself-aas/ResearchWithME` — `researchwithme@0.2.2`, **web-only Next.js App Router**:
**81** `page.tsx` routes, **153** components, **264** lib modules, 83 Prisma models,
`DESIGN.md` v3.1 (normative), plus `PRODUCT.md`, `PAGE_TREE.md`, `INTEGRATION_PLAN.md`,
`MIGRATION-RECONCILE-2026-11-13.md`.

### Stack

Next.js + React, Tailwind (+ typography plugin), Radix primitives, Plate (the 13-block MDX
editor), Framer Motion + GSAP + Lenis (motion), `@supabase/ssr` + `supabase-js`, Resend,
Gemini (`@google/genai`), Zod, Zustand, Recharts, cmdk, lucide.

Deployment is **Cloudflare Workers via OpenNext** (`open-next.config.ts`: KV incremental cache,
KV tag cache, memory queue, `WORKER_SELF_REFERENCE`), built with **npm**:
`npm run build:worker` → `opennextjs-cloudflare deploy`.

### Design system (this is the real token source)

`tokens/src/{primitive,semantic-light,semantic-dark,component,motion}.json` compiled by
`npm run tokens:build`. Light primitives:

| Role | Value |
| --- | --- |
| canvas / surface / subtle | `#F8F9FA` / `#FFFFFF` / `#F1F3F4` |
| ink primary / secondary | `#202124` / `#5F6368` |
| border subtle / strong | `#DADCE0` / `#80868B` |
| **primary (action, focus, link, brand mark)** | **`#005BBF`** (hover `#174EA6`, pressed `#004493`) |
| selection | `#D8E2FF` |
| dark canvas / surface / subtle | `#0A0D14` / `#131823` / `#1D1F27` |
| dark focus / brand mark | `#ADC7FF` |

Domain colour families the app should reuse verbatim — they encode meaning, not decoration:

- `knowledge.*` source `#1D4ED8`, evidence `#047857`, insight `#0E7490`, discussion `#B45309`, contradiction `#B91C1C`, publication `#1E40AF`, archive `#5C5C63`
- `trust.*` verified/peer-reviewed `#1D4ED8`, replicated `#047857`, emerging `#0E7490`, uncertain `#B45309`, contested `#B91C1C`, unknown `#5C5C63`
- `provenance.*` direct-source `#047857`, cited-source `#1D4ED8`, derived `#0E7490`, inferred `#B45309`, ai-assisted `#1E40AF`, unresolved `#5C5C63`
- `workflow.*` discovered `#0E7490`, extracted `#0F766E`, validated `#047857`, synthesized `#1D4ED8`

Typography: **Plus Jakarta Sans** (self-hosted WOFF2, OFL) for display + reading + chrome;
Newsreader/Inter fallbacks; **Aptos Mono / JetBrains Mono** for code, DOIs, tables.
Display is `clamp(2.5rem, 5vw, 4.5rem)` at weight 450, `-0.025em` tracking.

### Product constraints worth enforcing in the fork

WCAG 2.1 AA everywhere (≥4.5:1 body, ≥3:1 large); no disruptive modals during reading; no
behavioural tracking; free, no storefront; GitHub/ORCID are **identity links on an account**,
not sign-in methods; publishing requires an approved editor application; drafts are private.

### Divergences from this fork — decide explicitly

| Area | ResearchWithME | Bluesky fork (now) |
| --- | --- | --- |
| Framework | Next.js App Router (web only) | Expo / React Native (iOS, Android, web) |
| Brand primary | `#005BBF` cobalt | `#0077CD` azure |
| Surfaces | `#F8F9FA` archival grey | warm neutrals `#FFFDFB…` |
| Display type | Plus Jakarta Sans | app default (System) |
| Auth | Supabase Auth (email/password, Google) | atproto OAuth/app-password |
| Deploy | Cloudflare Workers (OpenNext) | Expo build / static web |
| Locale copy | US-English scholarly | 189 files say "Bluesky" |

The port is therefore a **product port, not a code merge**: tokens and domain vocabulary come
across nearly 1:1; components do not. The single highest-value port is `tokens/src/*.json` →
`src/alf/brand.ts`, because it makes every existing ALF screen inherit reme's real colour
semantics (trust, provenance, knowledge) instead of a generic blue.

---

## 9. Read API + Cloudflare deploy (shipped 2026-11-23)

**Supabase read API** — six `SECURITY INVOKER` functions applied to `bxyjjbclaklzjxeumeat`, source
of truth in `supabase/migrations/20261123000100_reme_read_api.sql`:

| Function | Returns |
| --- | --- |
| `reme_feed(p_type, p_topic, p_limit, p_offset)` | published public contributions + author + primary source + citation/review counts |
| `reme_contribution(p_slug)` | full body (`mdx`), citations with locators, review thread, recognition counts |
| `reme_sources(p_limit, p_offset)` | canonical sources + version/contribution/evidence counts |
| `reme_scholar(p_slug)` | profile, metrics, expertise, contributions, completed reviews |
| `reme_topics()` | taxonomy with published counts |
| `reme_search(p_query, p_limit)` | title/summary search over published public work |

Invoker rights mean the caller's RLS decides visibility: anonymous readers get published public
content only, signed-in authors additionally see their own drafts through the same call. Grants
exist for `anon` and `authenticated`; nothing is granted to `public`.

Client layer: `src/lib/reme/{types,api,queries,index}.ts` — typed wrappers plus TanStack Query
hooks (`useRemeFeed`, `useRemeContribution`, `useRemeSources`, `useRemeScholar`, `useRemeTopics`,
`useRemeSearch`) namespaced under the `reme` query key for one-shot cache invalidation.

**Cloudflare** — `wrangler.jsonc` (Workers Static Assets, SPA fallback), `public/_headers`
(immutable hashed assets), `pnpm build:web:cf` / `deploy:web` / `preview:web`, and
`.github/workflows/deploy-web.yml`. Details and verified output in `deployment-cloudflare.md`.

**Still empty:** the production database holds no contributions, so every read surface returns
`[]` until content exists. The seeded fixture project `gakquxtpdgfxrxlvpcgh` is now schema-stale
(it predates the RPCs and uses different `v34_source_versions` / `v34_profile_metrics` columns);
either realign it or seed a few real drafts in production before judging the UI.
