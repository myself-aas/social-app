# Deploying reme web to Cloudflare

The ResearchWithME repo ships a **Next.js** app on Cloudflare Workers via OpenNext.
This fork is **Expo** — it produces a static SPA, not a server renderer — so it deploys as a
**Workers Static Assets** project. Same platform, same account, different pipeline. No
`open-next.config.ts`, no KV incremental cache, no worker runtime code.

## What gets deployed

```
expo export --platform web   →   ./dist
                                   ├── index.html          SPA shell
                                   ├── _expo/static/…      hashed JS + CSS
                                   ├── assets/…            fonts, images
                                   └── _headers            copied from public/
wrangler deploy              →   Worker "reme-web" + asset manifest
```

`wrangler.jsonc` sets `not_found_handling: "single-page-application"`, so a hard refresh on
`/contribution/foo` serves the shell and React Navigation resolves the route client-side.

## Commands

| Command | Effect |
| --- | --- |
| `pnpm build:web:cf` | Export the SPA into `./dist` (no source maps, no Go-server post-processing) |
| `pnpm preview:web` | `wrangler dev` — serve `./dist` locally with the real asset routing |
| `pnpm deploy:web` | Build, then `wrangler deploy` to the edge |

`pnpm build-web` still exists for the Bluesky Go-server pipeline (`bskyweb/`); it runs
`scripts/post-web-build.js` and uploads source maps. Don't use it for Cloudflare.

## Environment

`EXPO_PUBLIC_*` variables are **inlined at build time** — they are not secrets, and not runtime
config. Changing one requires a rebuild and redeploy.

```
EXPO_PUBLIC_SUPABASE_URL=https://bxyjjbclaklzjxeumeat.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
```

Put them in GitHub repository variables and the workflow injects them. The publishable key is
safe in a public bundle **because RLS is the boundary** — every table behind it must have RLS
enabled, and `reme_*` functions are `SECURITY INVOKER` precisely so they cannot bypass it.

Never put a `service_role` key or `sb_secret_…` here.

## CI

`.github/workflows/deploy-web.yml` runs on push to `main` and on manual dispatch:

1. `pnpm install --frozen-lockfile`
2. `pnpm build:web:cf` with the env above
3. `cloudflare/wrangler-action@v3` → `wrangler deploy`

Secrets: `CLOUDFLARE_API_TOKEN` (Workers Scripts: Edit), `CLOUDFLARE_ACCOUNT_ID`.

## Previews and rollback

- **Per-branch previews:** add `--env` or run `wrangler versions upload` in CI; each version gets
  a preview URL without touching production traffic.
- **Rollback:** Cloudflare keeps previous versions — `wrangler rollback` reverts instantly,
  which matters because a bad bundle is a blank SPA with no server-side fallback.
- **Custom domain:** attach `researchwith.me` (or `app.researchwith.me`) in the dashboard or via
  `routes` in `wrangler.jsonc` once the account owns the zone.

## Caching

`public/_headers` marks `/_expo/static/*` and `/assets/*` as `immutable, max-age=31536000`
(they are content-hashed), and `index.html` as `max-age=0, must-revalidate` so a deploy is
visible immediately. Workers Static Assets also sends ETags automatically.

## Gotchas

- **Empty `dist` fails silently.** If the export writes nothing, `wrangler deploy` publishes an
  empty manifest and the site 404s into the SPA shell. The workflow builds before deploying for
  this reason; keep it that way.
- **No server routes.** Anything that needs a secret (Resend, Gemini, LinkedIn) cannot live in
  this bundle. Those belong in Supabase Edge Functions or a separate Worker, called with the
  user's Supabase JWT.
- **`compatibility_date` is pinned** in `wrangler.jsonc`; bump it deliberately, not per deploy.
- **Large bundles:** the dev bundle is ~47 MB; the production export is minified and split.
  Check `dist` size after build — Workers has a 25 MiB compressed limit per asset upload set.
- **Fonts** live under `assets/`; the Bluesky build rewrote font paths for the Go server, which
  the Cloudflare export does not need.

## Verified locally (2026-11-23)

```
expo export --platform web        → dist/ 35 MB, 386 files, 86 JS chunks, 14.7 MB gzipped
wrangler deploy --dry-run         → read 409 files from ./dist, no bindings, config valid
wrangler dev --port 8788          → GET /                    200, 6 980 B
                                    GET /contribution/foo   200, same shell (SPA fallback)
                                    GET /_expo/static/…     Cache-Control: immutable
```

`wrangler` is deliberately **not** a project dependency. `pnpm-workspace.yaml` sets
`trustPolicy: 'no-downgrade'` with a 7-day window, so a freshly published wrangler release fails
`pnpm install --frozen-lockfile` in CI before any code is checked. Wrangler is supplied out of
band instead: `pnpm dlx wrangler@4` locally, and `cloudflare/wrangler-action` (which installs its
own pinned copy) in CI. If you ever pin it in `package.json`, choose a release older than the
trust window and expect to bump it on a delay.

## What you must supply to actually deploy

Nothing in this repo can authenticate to your Cloudflare account. Add these to the GitHub
repository and the workflow will publish on the next push to `main`:

- secret `CLOUDFLARE_API_TOKEN` — scoped to **Workers Scripts: Edit**
- secret `CLOUDFLARE_ACCOUNT_ID`
- variable `EXPO_PUBLIC_SUPABASE_URL`
- variable `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Alternatively run `pnpm deploy:web` locally after `wrangler login`.

## Watch out: two Cloudflare pipelines can collide

The Cloudflare account also has a **Workers Builds** integration named `researchwithme` that
builds on GitHub events. On PR #1 it ran against this Expo repo, tried the Next.js build, and
failed (`Workers Builds: researchwithme`). It is not the pipeline described above.

Decide one owner per repo:

- keep Workers Builds bound to `myself-aas/ResearchWithME` (the Next.js app), and let this repo
  deploy only through `.github/workflows/deploy-web.yml`; or
- point Workers Builds at this repo and give it `build:web:cf` + `dist` instead of `npm run build`.

Having both active means every push produces a red check that has nothing to do with the code.

## Using the dashboard's Workers Builds integration

The account also has a **Workers Builds** Git integration bound to the service `researchwithme`.
It cannot read `wrangler.jsonc` reliably for a non-Next.js app, so it needs explicit commands.
Those settings live in the dashboard (Build settings) and need `Workers CI Write` on the API token
if you want them changed programmatically.

| Field | Value | Why |
| --- | --- | --- |
| Build command | `pnpm build:web:cf` | Uses the repo's package manager + Metro flags. Do **not** use `npx expo export` — `npx`/`npm` refuse this repo because `devEngines.packageManager` is pnpm (`EBADDEVENGINES`). |
| Deploy command | `npx wrangler deploy --name reme-web` | `--name` overrides the build service's own name so it does not deploy onto `researchwithme`. |
| Build variables | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Both are inlined at build time. |
| Build variables | `NODE_VERSION=24.22.1` | The repo pins Node `^24.22.1` in `devEngines`; the default build image is older. |

### Do not deploy onto the `researchwithme` Worker

That Worker serves the live Next.js editorial site. `--name researchwithme` would replace
`researchwith.me` with this SPA, which currently has no published content — every surface would be
an empty state. Keep this app on `reme-web` and attach a separate hostname such as
`app.researchwith.me`. Rollback exists (Worker → Deployments → the previous Next.js deployment),
but there is no reason to take the outage.

### Variable names

The app reads `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Supabase's older name for the same key is
the **anon key**; `src/env/common.ts` accepts `EXPO_PUBLIC_SUPABASE_ANON_KEY` as an alias so a
dashboard configured with the old name still builds a working data layer. If neither is set, the
app compiles fine and silently ships with Supabase disabled — that is the failure mode to watch
for after the first build.

### If the deploy step fails

Almost always `assets.directory`. `expo export --platform web` writes `./dist`, which is what
`wrangler.jsonc` declares; override with `--assets ./dist` if a different build root is in use.
