## Quick orientation for AI coding agents

This repository (mana-xc) is a hybrid Next.js frontend + Django backend platform for cross-country race analytics and import tooling. The goal of these instructions is to make an AI coding agent immediately productive: understand the architecture, follow project conventions, and run the right dev commands.

High-level architecture
- Frontend: Next.js (app/ using App Router). Key admin UI lives under `app/admin/*` (import wizard, scraper, course-ratings).
- Backend: Django project in `backend_config/` with core business logic in `core/` and `core/services/` (e.g. `F6_import_service.py`).
- Data & runtime: Local dev uses SQLite (`db.sqlite3`); production uses Supabase/Postgres. Import/bulk flows talk to Supabase via RPCs in `/app/api/*` and `/lib/supabase`.

Immediate developer workflows (what to run)
- Frontend dev: `npm run dev` (Next.js on port 3000). See `package.json` scripts.
- Backend dev: create/activate Python venv, then `python manage.py runserver` (Django on port 8000).
- Scraper: `node scripts/athletic-net-scraper-v2.js <schoolId> <season>` (uses Puppeteer). Output CSV/JSON files in repo root.

Project-specific conventions you must follow
- Time units: ALL race/workout times are stored in CENTISECONDS (integer), field name `time_cs`. Never use floats for time storage. See `core/models.py` and `CLAUDE.md`.
- Normalization: Use `races.xc_time_rating` (decimal) to normalize times. Normalized time = `time_cs * xc_time_rating`.
- Materialized view: `athlete_xc_times_v3` is authoritative for PRs and must be refreshed after imports. SQL in `CLAUDE.md` and in DB migration scripts.
- Path aliases: TypeScript alias `@/` maps to the project root (configured in `tsconfig.json`); import `@/lib/supabase` or `@/components/*` in frontend code.

Patterns and files to reference for common tasks
- CSV import UI & parser: `app/admin/import/*`, `components/admin/import-steps/*`, `lib/admin/import-parser.ts` and `lib/admin/import-utils.ts`.
- Scraper + batch import flow: `scripts/athletic-net-scraper-v2.js`, `app/admin/scraper/*`, and API routes under `app/api/admin/` such as `scrape-athletic-net` and `batch-import`.
- Backend import execution: `core/services/F6_import_service.py` is the central server-side import implementation; `core/api_views.py` shows how the view calls it.

Edge cases and gotchas (from repo history)
- Next.js resolver issue: `next.config.js` sets `experimental.esmExternals = false` to avoid picking a corrupted global package.json — don't remove this without testing.
- Typo directory: `app/trainnig/` (note spelling) — be careful when searching for workout logging code.
- Gender formats: codebase accepts multiple formats ("Boys/Girls", "M/F"); normalized canonical value expected by DB may be different (see `CLAUDE.md` known issues).

How to validate work quickly
- Run frontend + backend locally and exercise the import wizard at `http://localhost:3000/admin/import` using sample CSVs in `data/imports/2024-test/`.
- After imports, verify results in local DB (`db.sqlite3`) or Supabase via SQL and refresh `athlete_xc_times_v3`.
- Use `SELECT COUNT(*) FROM results;` and `REFRESH MATERIALIZED VIEW athlete_xc_times_v3;` to validate ingestion.

When editing code, follow these rules
- Preserve CENTISECONDS rule in any time-parsing helpers. When adding JS/TS helpers, include unit tests (small) that assert conversions like "17:51.2" -> 107120.
- When changing Next.js APIs (`app/api/*`), respect the Supabase RPC usage pattern (use `@/lib/supabase/server` client). Keep API responses JSON-serializable and include an error field when failing.

Where to look for more context
- `CLAUDE.md` — in-repo assistant guide and detailed conventions (used as source for this file).
- `COURSE_RATING_METHODOLOGY.md`, `IMPORT_FIXES_NEEDED.md`, and `NEXT_SESSION_PRIORITY.md` for prioritized work and statistical rules.

If something is ambiguous
- Make conservative changes: add feature flags, small unit tests, and a short PR description that documents why the change was needed and how to verify it.
- If a DB schema change is required, include a SQL migration script and a verification query; prefer small incremental migrations.

Questions for the human reviewer
- Which dev environment is preferred for new work: local SQLite (fast) or Supabase Postgres (closer to prod)?
- Any preferred linting/format rules for JS/TS beyond `npm run lint`?
