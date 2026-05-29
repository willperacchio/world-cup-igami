# World Cupigami

Every unique final score in Men's FIFA World Cup history — a "scorigami" heatmap inspired by Jon Bois's NFL scorigami work, applied to the World Cup ahead of the 2026 tournament.

Built on Next.js 16 (App Router), Tailwind v4, next-intl (32 locales), and the Fjelstul World Cup Database. Live results for the 2026 tournament come from [football-data.org](https://www.football-data.org).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest watch mode |

## Data pipeline

Three files in `data/` feed the app:

1. **`matches.csv`** — historical matches (1930–2022) from the Fjelstul World Cup Database. The canonical source of truth for everything before the 2026 cup.
2. **`live-matches.json`** — finished matches from football-data.org, written by `scripts/fetch-live-matches.ts`. Refreshed every 15 minutes by the GitHub Action during the tournament.
3. **`overrides.json`** *(optional)* — hand-curated corrections. See "Overrides" below.

`scripts/process-data.ts` reads all three, merges them with **overrides > live > historical** precedence (dedup key: `date|homeTeam|awayTeam`), and writes the three JSONs the app actually reads from:

- `data/matches.json`
- `data/scorigami.json`
- `data/summary.json`

The app imports those JSONs at build time, so a fresh `data/matches.json` requires a Vercel rebuild to surface. The refresh-data GitHub Action commits to `main`, which triggers the rebuild automatically.

To regenerate by hand:

```bash
npx tsx scripts/process-data.ts
```

## Live data

`scripts/fetch-live-matches.ts` hits `GET https://api.football-data.org/v4/competitions/WC/matches`, filters to `FINISHED`, maps onto our internal `Match` shape, and writes `data/live-matches.json`. It needs `FOOTBALL_ORG_AUTH_TOKEN` in the environment.

Kill switch: set the repo variable `DATA_FREEZE` to `"true"` in GitHub Settings → Variables → Actions to pause the cron without disabling the workflow.

To dry-run locally:

```bash
FOOTBALL_ORG_AUTH_TOKEN=your-key-here npx tsx scripts/fetch-live-matches.ts
npx tsx scripts/process-data.ts
```

## Overrides

`data/overrides.json` is the hand-fix path for when football-data.org gets a match wrong, or you need to apply a correction that the live feed hasn't picked up yet. Overrides win against both the live feed and the historical CSV — they're the last writer in the merge.

**Schema** — either a bare array of `Match` objects, or an object with a `matches` key. Both shapes are accepted:

```json
{
  "matches": [
    {
      "date": "2026-06-18",
      "tournament": "2026 FIFA Men's World Cup",
      "stage": "group stage",
      "homeTeam": "Argentina",
      "awayTeam": "Switzerland",
      "homeCode": "ARG",
      "awayCode": "SUI",
      "homeScore": 7,
      "awayScore": 2,
      "extraTime": false,
      "penaltyShootout": false,
      "penaltyScore": "",
      "stadium": "MetLife Stadium",
      "city": "East Rutherford",
      "country": "United States"
    }
  ]
}
```

The dedup key is `date|homeTeam|awayTeam` — the override row replaces any existing match with the same key. To delete an override, remove the entry and rerun `process-data.ts`. To add a brand-new match the live feed missed, just add a new entry with a previously unused key.

After editing, regenerate the JSONs and commit:

```bash
npx tsx scripts/process-data.ts
git add data/overrides.json data/matches.json data/scorigami.json data/summary.json
git commit -m "fix(data): correct ARG-SUI scoreline"
git push
```

Vercel will rebuild on push.

## Tests

```bash
npm test
```

Coverage includes the `lib/` utilities (rarity, stats, data, flags, match-utils), the live-data pipeline (`mapMatch` and `mergeMatches`), the `useTimelinePlayer` hook, and smoke tests for the major components (heatmap, match table, match detail, fun facts, footer, locale switcher). The vitest config uses jsdom; `next-intl` and `next/navigation` are globally mocked in `src/test/setup.ts`.

## Translations

Run the translation script via the `translate.yml` GitHub Action, or commit with `[translate]` in the message. Translations cover 32 locales; the script uses Anthropic's API and reads `ANTHROPIC_API_KEY` from the workflow secrets.

To translate locally:

```bash
ANTHROPIC_API_KEY=your-key npx tsx scripts/translate.ts
```

## Deploy

Vercel. The project is wired up via `.vercel/project.json`. Pushes to `main` deploy automatically — including the data-refresh commits from the cron action.

## Attribution

See [`data/DATA_ATTRIBUTION.md`](data/DATA_ATTRIBUTION.md) for the full attribution. In short:

- Historical match data: [The Fjelstul World Cup Database](https://github.com/jfjelstul/worldcup) by Joshua C. Fjelstul, Ph.D. (CC-BY-SA 4.0)
- Live 2026 match data: [football-data.org](https://www.football-data.org)
- "Scorigami" concept: [Jon Bois](https://www.youtube.com/watch?v=9l5C8cGMueY)

FIFA World Cup™ is a trademark of FIFA. This site is not affiliated with, endorsed by, or connected to FIFA.
