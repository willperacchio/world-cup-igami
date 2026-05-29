/**
 * Validate every locale message file against en.json.
 *
 * Checks performed:
 *   1. JSON syntax (each file parses)
 *   2. Missing keys vs. en.json (logged as warnings — they fall back, not errors)
 *   3. Extra keys not in en.json (likely typos)
 *   4. ICU placeholder names match en.json's placeholders for each key
 *   5. Values are non-empty strings
 *   6. Values don't contain raw literal "{key}" patterns that suggest broken
 *      translation (a value whose only content is its key, e.g. "header.title")
 *
 * Run via: `npx tsx scripts/validate-locales.ts`
 * Exits non-zero if any hard errors (syntax, placeholder mismatch, empty) are
 * found. Missing/extra keys are reported but don't fail the script — those are
 * expected during normal localization drift.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const messagesDir = join(__dirname, "../messages");

interface JsonObject {
  [k: string]: string | JsonObject;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function walk(
  obj: JsonObject,
  prefix = "",
): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.set(path, v);
    else if (v && typeof v === "object") {
      for (const [pp, vv] of walk(v as JsonObject, path)) out.set(pp, vv);
    }
  }
  return out;
}

function extractPlaceholders(s: string): Set<string> {
  const set = new Set<string>();
  const re = /\{(\w+)(?:,\s*[^}]+)?\}/g;
  let m;
  while ((m = re.exec(s)) !== null) set.add(m[1]);
  return set;
}

// ── Main ─────────────────────────────────────────────────────────────────

const enRaw = readFileSync(join(messagesDir, "en.json"), "utf-8");
const en = JSON.parse(enRaw) as JsonObject;
const enFlat = walk(en);

const files = readdirSync(messagesDir).filter((f) => f.endsWith(".json")).sort();

interface FindingsByLocale {
  syntaxError?: string;
  missingKeys: string[];
  extraKeys: string[];
  placeholderMismatches: { key: string; en: string[]; loc: string[] }[];
  emptyValues: string[];
  /** Values that look like the i18n key was never replaced. */
  unresolvedLiterals: string[];
}

const findings = new Map<string, FindingsByLocale>();

let hardErrors = 0;

for (const file of files) {
  const locale = file.replace(/\.json$/, "");
  if (locale === "en") continue;

  const f: FindingsByLocale = {
    missingKeys: [],
    extraKeys: [],
    placeholderMismatches: [],
    emptyValues: [],
    unresolvedLiterals: [],
  };

  const raw = readFileSync(join(messagesDir, file), "utf-8");
  let parsed: JsonObject;
  try {
    parsed = JSON.parse(raw) as JsonObject;
  } catch (err) {
    f.syntaxError = err instanceof Error ? err.message : String(err);
    findings.set(locale, f);
    hardErrors++;
    continue;
  }

  const locFlat = walk(parsed);

  // 2. Missing keys
  for (const k of enFlat.keys()) {
    if (!locFlat.has(k)) f.missingKeys.push(k);
  }

  // 3. Extra keys
  for (const k of locFlat.keys()) {
    if (!enFlat.has(k)) f.extraKeys.push(k);
  }

  // 4. Placeholder mismatches
  for (const [k, enVal] of enFlat) {
    const locVal = locFlat.get(k);
    if (locVal == null) continue;
    const enPh = extractPlaceholders(enVal);
    const locPh = extractPlaceholders(locVal);
    const enList = [...enPh].sort();
    const locList = [...locPh].sort();
    if (enList.length !== locList.length || !enList.every((p, i) => p === locList[i])) {
      f.placeholderMismatches.push({ key: k, en: enList, loc: locList });
      hardErrors++;
    }
  }

  // 5. Empty values
  for (const [k, v] of locFlat) {
    if (v.trim() === "") {
      f.emptyValues.push(k);
      hardErrors++;
    }
  }

  // 6. Unresolved-literal heuristic
  for (const [k, v] of locFlat) {
    if (v.trim() === k) f.unresolvedLiterals.push(k);
  }

  findings.set(locale, f);
}

// ── Report ───────────────────────────────────────────────────────────────

console.log(`\nValidated ${files.length - 1} non-English locale file(s) against en.json.\n`);

let totalIssues = 0;
for (const [locale, f] of findings) {
  const issues =
    (f.syntaxError ? 1 : 0) +
    f.missingKeys.length +
    f.extraKeys.length +
    f.placeholderMismatches.length +
    f.emptyValues.length +
    f.unresolvedLiterals.length;

  if (issues === 0) {
    console.log(`✓ ${locale}: clean`);
    continue;
  }
  totalIssues += issues;
  console.log(`\n— ${locale} (${issues} issue${issues === 1 ? "" : "s"}) —`);
  if (f.syntaxError) console.log(`  SYNTAX ERROR: ${f.syntaxError}`);
  if (f.missingKeys.length) {
    console.log(`  missing keys (${f.missingKeys.length}): ${f.missingKeys.slice(0, 5).join(", ")}${f.missingKeys.length > 5 ? "…" : ""}`);
  }
  if (f.extraKeys.length) {
    console.log(`  extra keys not in en.json (${f.extraKeys.length}): ${f.extraKeys.slice(0, 5).join(", ")}${f.extraKeys.length > 5 ? "…" : ""}`);
  }
  if (f.placeholderMismatches.length) {
    console.log(`  PLACEHOLDER MISMATCHES (${f.placeholderMismatches.length}):`);
    for (const m of f.placeholderMismatches) {
      console.log(`    ${m.key}: en=[${m.en.join(",")}] vs ${locale}=[${m.loc.join(",")}]`);
    }
  }
  if (f.emptyValues.length) {
    console.log(`  EMPTY VALUES (${f.emptyValues.length}): ${f.emptyValues.join(", ")}`);
  }
  if (f.unresolvedLiterals.length) {
    console.log(`  unresolved literals (${f.unresolvedLiterals.length}): ${f.unresolvedLiterals.join(", ")}`);
  }
}

console.log(`\nTotal: ${totalIssues} issue(s) across ${findings.size} non-English locale(s).`);
console.log(`Hard errors (syntax, placeholder, empty): ${hardErrors}\n`);

if (hardErrors > 0) {
  console.error("Hard errors found — these will cause runtime issues. Fix before launch.");
  process.exit(1);
}
