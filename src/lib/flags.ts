// Year-specific flag overrides for teams whose flags changed between WC appearances
// { before: year, file: filename } — if match year < before, use that file
// { after: year, file: filename } — if match year >= after, use that file
type Override = { before?: number; after?: number; file: string };
const yearOverrides: Record<string, Override[]> = {
  IRN: [{ before: 1980, file: "IRN_1978" }],
  EGY: [{ before: 1958, file: "EGY_1934" }],
  ESP: [{ before: 1939, file: "ESP_1934" }],
  DEU: [{ before: 1945, file: "DEU_1934" }],
  ROU: [{ before: 1990, file: "ROU_1970" }],
  COD: [{ after: 1997, file: "COD_2026" }],
};

export function getFlagSrc(fifaCode: string, year?: number): string {
  if (year && yearOverrides[fifaCode]) {
    for (const override of yearOverrides[fifaCode]) {
      if (override.before && year < override.before) {
        return `/flags/${override.file}.svg`;
      }
      if (override.after && year >= override.after) {
        return `/flags/${override.file}.svg`;
      }
    }
  }
  return `/flags/${fifaCode}.svg`;
}
