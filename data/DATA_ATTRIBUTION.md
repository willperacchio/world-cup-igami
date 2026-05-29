# Data Attribution

## Historical Match Data — The Fjelstul World Cup Database

The historical match data (1930–2022) used in this project comes from **The Fjelstul World Cup Database**.

> Fjelstul, Joshua C. "The Fjelstul World Cup Database v.1.2.0." July 19, 2023.

- **Author:** Joshua C. Fjelstul, Ph.D.
- **Copyright:** © 2023 Joshua C. Fjelstul, Ph.D.
- **License:** [CC-BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- **Repository:** https://github.com/jfjelstul/worldcup

### Modifications

- Filtered to Men's World Cup matches only
- Extracted subset of fields (date, teams, scores, tournament, stage) for scorigami analysis
- Converted from CSV to JSON format

## Live Match Data — football-data.org

Match results for the ongoing 2026 FIFA World Cup are fetched from **football-data.org**, who provide free, structured football data via a public API.

- **Provider:** football-data.org
- **Website:** https://www.football-data.org
- **Terms of use:** https://www.football-data.org/terms
- **Endpoint used:** `GET /v4/competitions/WC/matches`

We fetch finished matches on a ~15-minute cron during the tournament window, map them onto the same `Match` schema as the historical data, and rebuild the heatmap and stats on every push.

## Scorigami Concept — Jon Bois

The concept of "scorigami" — a final score that has never occurred before in a sport's history — was popularized by **Jon Bois** through his work on NFL scorigami at SB Nation. This project applies the idea to the Men's FIFA World Cup; full credit for the concept belongs to him.

- **Original NFL scorigami video:** https://www.youtube.com/watch?v=9l5C8cGMueY
