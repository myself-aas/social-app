-- reme read API
--
-- Six SECURITY INVOKER functions that give the reme client a stable read
-- surface. Because they are invoker-rights, every call is still filtered by the
-- caller's RLS policies: an anonymous reader sees published public content, a
-- signed-in author also sees their drafts. Nothing here widens access.
--
-- Applied to project bxyjjbclaklzjxeumeat on 2026-11-23.

create or replace function public.reme_feed(
  p_type text default null,
  p_topic text default null,
  p_limit int default 20,
  p_offset int default 0
) returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(jsonb_agg(row order by sort_at desc nulls last), '[]'::jsonb)
  from (
    select jsonb_build_object(
        'id', c.id, 'slug', c.slug, 'title', c.title, 'subtitle', c.subtitle,
        'summary', c.summary, 'type', c.contribution_type, 'lifecycle', c.lifecycle,
        'publishedAt', c.published_at, 'version', c.version,
        'topics', c.topics, 'tags', c.tags, 'trust', c.trust_assessment,
        'author', jsonb_build_object(
          'id', p.user_id, 'slug', p.slug,
          'name', coalesce(p.display_name, c.author_name),
          'handle', coalesce(p.slug, c.author_handle), 'avatar', p.avatar_url,
          'role', p.role, 'domain', p.domain, 'institution', p.institution),
        'source', case when s.id is null then null else jsonb_build_object(
          'id', s.id, 'title', s.title, 'venue', s.venue,
          'scheme', s.identifier_scheme, 'identifier', s.identifier_value,
          'integrity', s.integrity_status, 'url', s.canonical_url) end,
        'citationCount', (select count(*) from v34_citations ci
          join v34_contribution_versions cv on cv.id = ci.contribution_version_id
          where cv.contribution_id = c.id),
        'reviewCount', (select count(*) from v34_reviews r where r.contribution_id = c.id)
      ) as row,
      c.published_at as sort_at
    from v34_contributions c
    left join profiles p on p.user_id = c.author_id
    left join v34_sources s on s.id = c.primary_source_id
    where c.lifecycle = 'published' and c.classification = 'public'
      and (p_type is null or c.contribution_type::text = p_type)
      and (p_topic is null or p_topic = any(c.topics))
    order by c.published_at desc nulls last
    limit greatest(1, least(coalesce(p_limit, 20), 50))
    offset greatest(0, coalesce(p_offset, 0))
  ) t;
$$;

create or replace function public.reme_contribution(p_slug text)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with c as (
    select * from v34_contributions
    where slug = p_slug and lifecycle = 'published' and classification = 'public'
    limit 1
  ), v as (
    select cv.id, cv.version_number from v34_contribution_versions cv
    join c on c.id = cv.contribution_id
    order by cv.version_number desc
    limit 1
  )
  select jsonb_build_object(
    'id', c.id, 'slug', c.slug, 'title', c.title, 'subtitle', c.subtitle,
    'summary', c.summary,
    'mdx', coalesce(c.mdx, (select cv.mdx from v34_contribution_versions cv where cv.id = v.id)),
    'type', c.contribution_type, 'lifecycle', c.lifecycle,
    'publishedAt', c.published_at, 'version', c.version,
    'topics', c.topics, 'tags', c.tags, 'limitations', c.limitations,
    'trust', c.trust_assessment, 'aiProvenance', c.ai_provenance,
    'author', jsonb_build_object(
      'id', p.user_id, 'slug', p.slug, 'name', coalesce(p.display_name, c.author_name),
      'handle', coalesce(p.slug, c.author_handle), 'avatar', p.avatar_url,
      'role', p.role, 'domain', p.domain, 'institution', p.institution,
      'bio', p.bio, 'orcid', p.orcid, 'github', p.github),
    'source', case when s.id is null then null else jsonb_build_object(
      'id', s.id, 'title', s.title, 'venue', s.venue, 'authors', s.authors,
      'publishedDate', s.published_date, 'scheme', s.identifier_scheme,
      'identifier', s.identifier_value, 'integrity', s.integrity_status,
      'url', s.canonical_url, 'type', s.source_type) end,
    'citations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ci.id, 'locator', ci.locator, 'quote', ci.quote_excerpt,
        'verified', ci.verified, 'sourceId', sv.source_id, 'sourceTitle', src.title,
        'scheme', src.identifier_scheme, 'identifier', src.identifier_value)
        order by ci.created_at)
      from v34_citations ci
      join v34_source_versions sv on sv.id = ci.source_version_id
      join v34_sources src on src.id = sv.source_id
      where ci.contribution_version_id = v.id), '[]'::jsonb),
    'reviews', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'status', r.status, 'scope', r.scope, 'anonymous', r.anonymous,
        'recommendation', r.recommendation, 'dueAt', r.due_at,
        'reviewerName', case when r.anonymous then 'Anonymous reviewer'
                        else coalesce(r.reviewer_name, r.reviewer_handle) end,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', ri.id, 'type', ri.item_type, 'scope', ri.scope,
            'body', ri.body, 'status', ri.status, 'anonymous', ri.anonymous)
            order by ri.created_at)
          from v34_review_items ri where ri.review_id = r.id), '[]'::jsonb))
        order by r.created_at desc)
      from v34_reviews r where r.contribution_id = c.id), '[]'::jsonb),
    'recognition', jsonb_build_object(
      'referenced', (select count(*) from v34_recognition_signals g where g.contribution_id = c.id and g.kind = 'referenced'),
      'helpful', (select count(*) from v34_recognition_signals g where g.contribution_id = c.id and g.kind = 'helpful_review'),
      'evidenceUsed', (select count(*) from v34_recognition_signals g where g.contribution_id = c.id and g.kind = 'evidence_used'))
  )
  from c
  left join profiles p on p.user_id = c.author_id
  left join v34_sources s on s.id = c.primary_source_id
  left join v v on true;
$$;

create or replace function public.reme_sources(p_limit int default 30, p_offset int default 0)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(jsonb_agg(row order by row->>'title'), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', s.id, 'title', s.title, 'type', s.source_type, 'authors', s.authors,
      'publishedDate', s.published_date, 'venue', s.venue,
      'scheme', s.identifier_scheme, 'identifier', s.identifier_value,
      'integrity', s.integrity_status, 'url', s.canonical_url,
      'versionCount', (select count(*) from v34_source_versions sv where sv.source_id = s.id),
      'contributionCount', (select count(*) from v34_contributions c
        where c.primary_source_id = s.id and c.lifecycle = 'published'),
      'evidenceCount', (select count(*) from v34_evidence e where e.source_id = s.id)
    ) as row
    from v34_sources s
    where s.classification = 'public'
    order by s.title
    limit greatest(1, least(coalesce(p_limit, 30), 100))
    offset greatest(0, coalesce(p_offset, 0))
  ) t;
$$;

create or replace function public.reme_scholar(p_slug text)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with p as (select * from profiles where slug = p_slug and published limit 1)
  select jsonb_build_object(
    'id', p.user_id, 'slug', p.slug, 'name', p.display_name, 'bio', p.bio,
    'role', p.role, 'domain', p.domain, 'institution', p.institution,
    'avatar', p.avatar_url, 'orcid', p.orcid, 'github', p.github, 'website', p.website,
    'metrics', coalesce((
      select jsonb_build_object(
        'published', m.published_contributions,
        'reviewsCompleted', m.completed_reviews_count,
        'evidence', m.verified_evidence_count,
        'sources', m.curated_sources_count,
        'replications', m.replications_count)
      from v34_profile_metrics m where m.user_id = p.user_id),
      '{"published":0,"reviewsCompleted":0,"evidence":0,"sources":0,"replications":0}'::jsonb),
    'expertise', coalesce((
      select jsonb_agg(jsonb_build_object('topic', x.topic_slug, 'label', x.label) order by x.created_at)
      from v34_user_expertise x where x.user_id = p.user_id), '[]'::jsonb),
    'contributions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', c.slug, 'title', c.title, 'type', c.contribution_type,
        'publishedAt', c.published_at, 'topics', c.topics, 'summary', c.summary)
        order by c.published_at desc)
      from v34_contributions c
      where c.author_id = p.user_id and c.lifecycle = 'published' and c.classification = 'public'), '[]'::jsonb),
    'reviewsCompleted', coalesce((
      select jsonb_agg(jsonb_build_object(
        'contributionSlug', c.slug, 'contributionTitle', c.title,
        'status', r.status, 'recommendation', r.recommendation, 'scope', r.scope)
        order by r.updated_at desc)
      from v34_reviews r join v34_contributions c on c.id = r.contribution_id
      where r.reviewer_id = p.user_id and r.status in ('SUBMITTED','RESOLVED')), '[]'::jsonb)
  )
  from p;
$$;

create or replace function public.reme_topics()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id, 'slug', t.slug, 'name', t.name, 'description', t.description,
    'count', (select count(*) from v34_contribution_topics ct
              join v34_contributions c on c.id = ct.contribution_id
              where ct.topic_id = t.id and c.lifecycle = 'published'))
    order by t.name), '[]'::jsonb)
  from v34_topics t;
$$;

create or replace function public.reme_search(p_query text, p_limit int default 20)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'slug', c.slug, 'title', c.title, 'type', c.contribution_type,
    'summary', c.summary, 'publishedAt', c.published_at, 'topics', c.topics)
    order by c.published_at desc), '[]'::jsonb)
  from v34_contributions c
  where c.lifecycle = 'published' and c.classification = 'public'
    and (p_query is null or p_query = ''
         or c.title ilike '%' || p_query || '%'
         or coalesce(c.summary, '') ilike '%' || p_query || '%')
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

revoke all on function public.reme_feed(text, text, int, int) from public;
revoke all on function public.reme_contribution(text) from public;
revoke all on function public.reme_sources(int, int) from public;
revoke all on function public.reme_scholar(text) from public;
revoke all on function public.reme_topics() from public;
revoke all on function public.reme_search(text, int) from public;

grant execute on function public.reme_feed(text, text, int, int) to anon, authenticated;
grant execute on function public.reme_contribution(text) to anon, authenticated;
grant execute on function public.reme_sources(int, int) to anon, authenticated;
grant execute on function public.reme_scholar(text) to anon, authenticated;
grant execute on function public.reme_topics() to anon, authenticated;
grant execute on function public.reme_search(text, int) to anon, authenticated;
