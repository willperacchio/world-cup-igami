# Reactivation guide — 2027 FIFA Women's World Cup (Brazil)

**Tournament: June 24 – July 25, 2027.** Site dormant since the 2026 men's
final (Spain 1–0 Argentina, July 19, 2026; the tournament produced exactly one
new scorigami — France 6–4 England, third place).

## What happens automatically (no action needed)

| When | What |
| --- | --- |
| **June 17, 2027** | `.github/workflows/reactivation-reminder.yml` opens a GitHub issue assigned to @willperacchio → email notification. |
| **June 24, 2027 (00:00 UTC)** | `DATA_FREEZE` auto-expires (`scripts/fetch-live-matches.ts`) and the 30-minute tournament crons in `refresh-data.yml` go live. Until the women's fetch is wired, those runs hit the men's 2026 endpoint or fail loudly — by design, so day one is noisy rather than silent. |
| **Every ≤45 idle days** | The daily workflow pushes an empty keepalive commit so GitHub's 60-day inactivity rule never auto-disables the scheduled workflows (which would silently kill both rows above). |

## Before kickoff (work top to bottom)

1. **Data source for WWC 2027: football-data.org, Standard tier (€49/mo).**
   Verified July 2026 against their coverage matrix: the FIFA Women's World
   Cup is included from Tier 2 ("Standard") up — it's just not on the free
   tier, which is why `/v4/competitions` doesn't show it on the current
   token. Plan: upgrade for the tournament window (~June+July 2027 ≈ €98
   total), then `GET /v4/competitions` to find the WWC code/id (invisible
   until upgraded), and reuse `scripts/fetch-live-matches.ts` nearly as-is —
   swap the competition code, write into the women's pipeline
   (`data/womens/*`; `womens-overrides.json` supported), and extend
   `scripts/lib/fd-mapper.ts` with women's team-name normalizations so fd.org
   names match the existing FIFA-sourced history.
   *Fallback if fd.org's WWC data disappoints:* FIFA API, competition id
   **103** (find the 2027 season id — see `scripts/backfill-womens-2023.ts`
   for the request shape). Consider one test month of Standard in May 2027 to
   sanity-check data quality before the tournament.
2. **Re-upgrade accounts:** football-data.org tier (if used), Vercel plan
   (tournament deploy volume), X API tier.
3. **Secrets check** (Settings → Secrets → Actions): `FOOTBALL_ORG_AUTH_TOKEN`,
   `TWITTER_API_KEY` / `TWITTER_API_SECRET` / `TWITTER_ACCESS_TOKEN` /
   `TWITTER_ACCESS_SECRET`, `ANTHROPIC_API_KEY` (translate workflow).
   Rotate anything expired.
4. **Tweet bot women's variant:** filter tournament 2027, W branding/hashtags,
   possibly a separate account; wire into `refresh-data.yml`.
5. **cron-job.org:** re-enable the `workflow_dispatch` trigger every 10 min
   (GitHub's own scheduler throttles to 2–4h; it cannot be primary during the
   tournament).
6. **Venues:** build a `venues-2027` lookup for the Brazil stadiums (FIFA API
   has them; see `scripts/build-venues.ts`).
7. **Celebration:** enable for the women's edition (currently men's-only gate
   in `ScorigamiApp` / `FunFacts` — one-line change).
8. **Root redirect:** consider `/` → `/womens` during the tournament
   (middleware currently sends `/` → `/mens`).
9. **Copy changes** need the `[translate]` commit tag to sync all 34 locales.
10. **Dependencies:** `npm audit` was cleaned July 2026; two moderates remain
    in postcss *bundled inside next* (fix = wait for a Next patch, then
    `npm update next`). Do a fresh audit + `npm update` before the tournament.
11. **DATA_FREEZE:** the variable can stay `"true"` (it self-expires at
    kickoff); delete it once you're actively developing so local/manual runs
    fetch normally.

## After the 2027 final

- Re-point the freeze expiry date in `scripts/fetch-live-matches.ts` at the
  next tournament, confirm `DATA_FREEZE=true`, and let the tournament-window
  crons age out on their own (they only fire June 24–July 25).
- Update `TrendChart` endpoint annotation + `funFacts.frontierNote` with the
  final numbers, `[translate]` tag on the commit.
- Celebration banner/pulse auto-expire 30 days after the last scorigami.

## Local dev gotchas

- This Mac recreates a corrupted ref file `.git/refs/remotes/origin/main 2` —
  `rm -f ".git/refs/remotes/origin/main 2"` before fetch/push.
- Never commit `data/*.json` from a stale local checkout — the cron owns the
  generated data files.
- `public/world-cup-scorigami-1930-2026.mp4` is the crisp 1930→2026 heatmap
  evolution video (true-color H.264, social-ready), served at
  `/world-cup-scorigami-1930-2026.mp4`.
