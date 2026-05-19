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
};

const SKIP = new Set(["en"]);

function loadHashes(): Record<string, string> {
  if (!existsSync(HASH_FILE)) return {};
  return JSON.parse(readFileSync(HASH_FILE, "utf-8"));
}

function saveHashes(hashes: Record<string, string>) {
  writeFileSync(HASH_FILE, JSON.stringify(hashes, null, 2) + "\n");
}

function hashSource(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

async function translate(client: Anthropic, sourceJson: string, locale: string, langName: string): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: `Translate this JSON i18n file from English to ${langName} (locale: ${locale}). Rules:
- Return ONLY valid JSON, no markdown fences or explanation
- Keep all JSON keys exactly as-is (English)
- Translate only the string values
- Preserve placeholders like {low}, {high}, {count}, {shown}, {total} exactly
- Keep proper nouns (Jon Bois, World Cupigami, FIFA, NFL) untranslated
- Keep "The Fjelstul World Cup Database" and author attribution untranslated
- For "locale" key, keep it as an empty object
- Use natural, fluent ${langName} — not robotic literal translations

${sourceJson}`,
    }],
  });

  const text = (msg.content[0] as { type: "text"; text: string }).text.trim();
  return text.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
}

async function main() {
  const client = new Anthropic();
  const sourceJson = readFileSync(join(MESSAGES_DIR, "en.json"), "utf-8");
  const sourceHash = hashSource(sourceJson);
  const hashes = loadHashes();

  const onlyLocale = process.argv[2];
  const force = process.argv.includes("--force");

  const localesToProcess = onlyLocale && onlyLocale !== "--force"
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

    if (!force && existsSync(outPath) && hashes[locale] === sourceHash) {
      skipped++;
      continue;
    }

    const reason = !existsSync(outPath) ? "new" : hashes[locale] !== sourceHash ? "source changed" : "forced";
    console.log(`🌐 Translating → ${locale} (${langName}) [${reason}]...`);
    try {
      const result = await translate(client, sourceJson, locale, langName);
      JSON.parse(result);
      writeFileSync(outPath, result + "\n");
      hashes[locale] = sourceHash;
      saveHashes(hashes);
      translated++;
      console.log(`✅ ${locale} done`);
    } catch (err) {
      console.error(`❌ ${locale} failed:`, err instanceof Error ? err.message : err);
    }
  }

  if (skipped > 0) console.log(`⏭  ${skipped} locale(s) up-to-date (source unchanged)`);
  console.log(`\n✅ ${translated} translated, ${skipped} skipped`);
  if (translated > 0) console.log(`Source hash: ${sourceHash}`);
}

main();
