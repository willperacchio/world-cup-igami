import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

const MESSAGES_DIR = join(import.meta.dirname, "..", "messages");
const HASH_FILE = join(MESSAGES_DIR, ".translation-hashes.json");

const localeNames: Record<string, string> = {
  fr: "French", id: "Indonesian", bs: "Bosnian", cs: "Czech",
  de: "German", hr: "Croatian", it: "Italian", sw: "Swahili",
  hu: "Hungarian", nl: "Dutch", no: "Norwegian", uz: "Uzbek",
  pl: "Polish", pt: "Brazilian Portuguese", ro: "Romanian",
  sv: "Swedish", vi: "Vietnamese", tr: "Turkish", el: "Greek",
  ru: "Russian", uk: "Ukrainian", ar: "Arabic", fa: "Persian",
  hi: "Hindi", th: "Thai", zh: "Simplified Chinese",
  "zh-HK": "Traditional Chinese (Hong Kong)", ja: "Japanese", ko: "Korean",
  es: "Spanish",
};

const SKIP = new Set(["en"]);

// ---------------------------------------------------------------------------
// Per-key hashing: we flatten the source JSON into dot-paths and hash each
// value individually. On subsequent runs we only re-translate the keys whose
// hash changed, then merge the new translations into the existing locale file.
// ---------------------------------------------------------------------------

type FlatMap = Record<string, string>;

/** Flatten nested JSON into dot-path keys. */
function flatten(obj: Record<string, unknown>, prefix = ""): FlatMap {
  const result: FlatMap = {};
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      Object.assign(result, flatten(v as Record<string, unknown>, path));
    } else {
      result[path] = String(v);
    }
  }
  return result;
}

/** Unflatten dot-path keys back into nested JSON. */
function unflatten(flat: FlatMap): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split(".");
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current) || typeof current[parts[i]] !== "object") {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    // Try to parse back to original type (for empty objects like "locale": {})
    current[parts[parts.length - 1]] = value;
  }
  return result;
}

/** Re-nest and restore empty objects (like "locale": {}). */
function nestTranslations(
  flat: FlatMap,
  sourceStructure: Record<string, unknown>,
): Record<string, unknown> {
  const result = unflatten(flat);
  // Restore empty objects from source
  restoreEmptyObjects(result, sourceStructure);
  return result;
}

function restoreEmptyObjects(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
) {
  for (const [k, v] of Object.entries(source)) {
    if (
      typeof v === "object" &&
      v !== null &&
      !Array.isArray(v) &&
      Object.keys(v).length === 0
    ) {
      target[k] = {};
    } else if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      if (typeof target[k] === "object" && target[k] !== null) {
        restoreEmptyObjects(
          target[k] as Record<string, unknown>,
          v as Record<string, unknown>,
        );
      }
    }
  }
}

interface HashStore {
  /** Per-locale, per-key hash of the English source value. */
  keys: Record<string, Record<string, string>>;
}

function loadHashes(): HashStore {
  if (!existsSync(HASH_FILE)) return { keys: {} };
  try {
    const raw = JSON.parse(readFileSync(HASH_FILE, "utf-8"));
    // Migrate from old format (flat locale→hash) to new format
    if (!raw.keys) return { keys: {} };
    return raw as HashStore;
  } catch {
    return { keys: {} };
  }
}

function saveHashes(hashes: HashStore) {
  writeFileSync(HASH_FILE, JSON.stringify(hashes, null, 2) + "\n");
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

async function translateKeys(
  client: Anthropic,
  keysToTranslate: FlatMap,
  locale: string,
  langName: string,
): Promise<FlatMap> {
  // Build a simple JSON of just the keys that need translating
  const sourceSubset = JSON.stringify(keysToTranslate, null, 2);

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Translate these i18n key-value pairs from English to ${langName} (locale: ${locale}). Rules:
- Return ONLY valid JSON, no markdown fences or explanation
- Keep all JSON keys exactly as-is (they are dot-paths like "header.title")
- Translate only the string values
- Preserve placeholders like {low}, {high}, {count}, {shown}, {total}, {year}, {date}, {unique} exactly
- Keep proper nouns (Jon Bois, World Cupigami, FIFA, NFL, Wikipedia, Penaltigami) untranslated
- Keep "scorigami" and "penaltigami" untranslated
- Keep "The Fjelstul World Cup Database" and author attribution untranslated
- Keep "football-data.org" untranslated
- Keep date format strings like "MMMM d, yyyy" as-is
- Use natural, fluent ${langName} — not robotic literal translations
- Do not use escaped quotes in values — rephrase if needed

${sourceSubset}`,
      },
    ],
  });

  const text = (msg.content[0] as { type: "text"; text: string }).text.trim();
  const cleaned = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(cleaned) as FlatMap;
}

async function main() {
  const client = new Anthropic();
  const sourceJson = readFileSync(join(MESSAGES_DIR, "en.json"), "utf-8");
  const source: Record<string, unknown> = JSON.parse(sourceJson);
  const sourceFlat = flatten(source);
  const hashes = loadHashes();

  const force = process.argv.includes("--force");
  const onlyLocale = process.argv.find((a) => a !== "--force" && !a.startsWith("-") && a !== process.argv[0] && a !== process.argv[1]);

  const localesToProcess = onlyLocale
    ? [onlyLocale]
    : Object.keys(localeNames).filter((l) => !SKIP.has(l));

  let translated = 0;
  let skipped = 0;

  for (const locale of localesToProcess) {
    const outPath = join(MESSAGES_DIR, `${locale}.json`);
    const langName = localeNames[locale];

    if (!langName) {
      console.log(`⚠  ${locale} — unknown locale, skipping`);
      continue;
    }

    // Determine which keys need translating
    const localeHashes = hashes.keys[locale] ?? {};
    const keysNeeded: FlatMap = {};

    for (const [path, value] of Object.entries(sourceFlat)) {
      const currentHash = hashValue(value);
      if (force || localeHashes[path] !== currentHash) {
        keysNeeded[path] = value;
      }
    }

    // Also check if the locale file is missing entirely
    const localeExists = existsSync(outPath);

    if (Object.keys(keysNeeded).length === 0 && localeExists) {
      skipped++;
      continue;
    }

    const totalKeys = Object.keys(sourceFlat).length;
    const changedCount = Object.keys(keysNeeded).length;

    // If more than 80% of keys need translating, just translate the whole file
    const translateAll = !localeExists || changedCount > totalKeys * 0.8;

    if (translateAll) {
      console.log(`🌐 Translating → ${locale} (${langName}) [full: ${changedCount}/${totalKeys} keys]...`);
    } else {
      console.log(`🌐 Translating → ${locale} (${langName}) [${changedCount} changed key${changedCount === 1 ? "" : "s"}]...`);
    }

    try {
      const keysToSend = translateAll ? sourceFlat : keysNeeded;
      const translatedKeys = await translateKeys(client, keysToSend, locale, langName);

      // Merge with existing translations
      let existingFlat: FlatMap = {};
      if (localeExists && !translateAll) {
        try {
          const existing = JSON.parse(readFileSync(outPath, "utf-8"));
          existingFlat = flatten(existing);
        } catch {
          // If existing file is invalid, start fresh
          existingFlat = {};
        }
      }

      // Merge: existing + new translations
      const merged = { ...existingFlat, ...translatedKeys };

      // Remove keys that no longer exist in source
      for (const key of Object.keys(merged)) {
        if (!(key in sourceFlat)) {
          delete merged[key];
        }
      }

      // Rebuild nested structure
      const nested = nestTranslations(merged, source);
      const output = JSON.stringify(nested, null, 2) + "\n";

      // Validate JSON roundtrip
      JSON.parse(output);

      writeFileSync(outPath, output);

      // Update hashes for all keys we just translated
      if (!hashes.keys[locale]) hashes.keys[locale] = {};
      for (const path of Object.keys(keysToSend)) {
        hashes.keys[locale][path] = hashValue(sourceFlat[path]);
      }
      // Also mark unchanged keys as current if we did a full translate
      if (translateAll) {
        for (const [path, value] of Object.entries(sourceFlat)) {
          hashes.keys[locale][path] = hashValue(value);
        }
      }
      saveHashes(hashes);

      translated++;
      console.log(`✅ ${locale} done`);
    } catch (err) {
      console.error(
        `❌ ${locale} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (skipped > 0)
    console.log(`⏭  ${skipped} locale(s) up-to-date`);
  console.log(`\n✅ ${translated} translated, ${skipped} skipped`);
}

main();
