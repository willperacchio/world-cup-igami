import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const flagsDir = join(__dirname, "../public/flags");
if (!existsSync(flagsDir)) mkdirSync(flagsDir, { recursive: true });

// Map of filename -> Wikimedia Commons file title
// Year-suffixed filenames for teams whose flags changed between WC appearances
const flagFiles: Record<string, string> = {
  // Current/standard flags
  "AGO": "Flag_of_Angola.svg",
  "ARE": "Flag_of_the_United_Arab_Emirates.svg",
  "ARG": "Flag_of_Argentina.svg",
  "AUS": "Flag_of_Australia.svg",
  "AUT": "Flag_of_Austria.svg",
  "BEL": "Flag_of_Belgium.svg",
  "BGR": "Flag_of_Bulgaria.svg",
  "BIH": "Flag_of_Bosnia_and_Herzegovina.svg",
  "BOL": "Flag_of_Bolivia.svg",
  "BRA": "Flag_of_Brazil.svg",
  "CAN": "Flag_of_Canada.svg",
  "CHE": "Flag_of_Switzerland.svg",
  "CHL": "Flag_of_Chile.svg",
  "CHN": "Flag_of_the_People%27s_Republic_of_China.svg",
  "CIV": "Flag_of_C%C3%B4te_d%27Ivoire.svg",
  "CMR": "Flag_of_Cameroon.svg",
  "COL": "Flag_of_Colombia.svg",
  "CRI": "Flag_of_Costa_Rica_(state).svg",
  "CUB": "Flag_of_Cuba.svg",
  "CZE": "Flag_of_the_Czech_Republic.svg",
  "DNK": "Flag_of_Denmark.svg",
  "DZA": "Flag_of_Algeria.svg",
  "ECU": "Flag_of_Ecuador.svg",
  "ENG": "Flag_of_England.svg",
  "FRA": "Flag_of_France.svg",
  "GHA": "Flag_of_Ghana.svg",
  "GRC": "Flag_of_Greece.svg",
  "HND": "Flag_of_Honduras.svg",
  "HRV": "Flag_of_Croatia.svg",
  "HTI": "Flag_of_Haiti.svg",
  "HUN": "Flag_of_Hungary.svg",
  "IRL": "Flag_of_Ireland.svg",
  "IRQ": "Flag_of_Iraq.svg",
  "ISL": "Flag_of_Iceland.svg",
  "ISR": "Flag_of_Israel.svg",
  "ITA": "Flag_of_Italy.svg",
  "JAM": "Flag_of_Jamaica.svg",
  "JPN": "Flag_of_Japan.svg",
  "KOR": "Flag_of_South_Korea.svg",
  "KWT": "Flag_of_Kuwait.svg",
  "MAR": "Flag_of_Morocco.svg",
  "MEX": "Flag_of_Mexico.svg",
  "NGA": "Flag_of_Nigeria.svg",
  "NIR": "Flag_of_Northern_Ireland_(1953%E2%80%931972).svg",
  "NLD": "Flag_of_the_Netherlands.svg",
  "NOR": "Flag_of_Norway.svg",
  "NZL": "Flag_of_New_Zealand.svg",
  "PAN": "Flag_of_Panama.svg",
  "PER": "Flag_of_Peru.svg",
  "POL": "Flag_of_Poland.svg",
  "PRK": "Flag_of_North_Korea.svg",
  "PRT": "Flag_of_Portugal.svg",
  "PRY": "Flag_of_Paraguay.svg",
  "QAT": "Flag_of_Qatar.svg",
  "ROU": "Flag_of_Romania.svg",
  "RUS": "Flag_of_Russia.svg",
  "SAU": "Flag_of_Saudi_Arabia.svg",
  "SCO": "Flag_of_Scotland.svg",
  "SEN": "Flag_of_Senegal.svg",
  "SLV": "Flag_of_El_Salvador.svg",
  "SRB": "Flag_of_Serbia.svg",
  "SVK": "Flag_of_Slovakia.svg",
  "SVN": "Flag_of_Slovenia.svg",
  "SWE": "Flag_of_Sweden.svg",
  "TGO": "Flag_of_Togo.svg",
  "TTO": "Flag_of_Trinidad_and_Tobago.svg",
  "TUN": "Flag_of_Tunisia.svg",
  "TUR": "Flag_of_Turkey.svg",
  "UKR": "Flag_of_Ukraine.svg",
  "URY": "Flag_of_Uruguay.svg",
  "USA": "Flag_of_the_United_States.svg",
  "WAL": "Flag_of_Wales.svg",
  "ZAF": "Flag_of_South_Africa.svg",

  // Historical teams (separate entries in data)
  "CSK": "Flag_of_the_Czech_Republic.svg", // Czechoslovakia used the same flag design
  "DDR": "Flag_of_East_Germany.svg",
  "IDN": "Flag_of_the_Netherlands.svg", // Dutch East Indies played under Dutch flag
  "SCG": "Flag_of_Serbia_and_Montenegro.svg",
  "SUN": "Flag_of_the_Soviet_Union.svg",
  "YUG": "Flag_of_Yugoslavia_(1946%E2%80%931992).svg",
  "COD": "Flag_of_Zaire.svg",

  // Year-specific variants for teams whose flags changed
  "IRN_1978": "Flag_of_Iran_(1964%E2%80%931980).svg",
  "IRN": "Flag_of_Iran.svg",
  "EGY_1934": "Flag_of_Egypt_(1922%E2%80%931953).svg",
  "EGY": "Flag_of_Egypt.svg",
  "ESP_1934": "Flag_of_the_Second_Spanish_Republic.svg",
  "ESP": "Flag_of_Spain.svg",
  "DEU_1934": "Flag_of_Germany_(1935%E2%80%931945).svg",
  "DEU": "Flag_of_Germany.svg",
  "ROU_1970": "Flag_of_Romania_(1965%E2%80%931989).svg",
};

async function downloadFlag(filename: string, wikiTitle: string): Promise<void> {
  const outPath = join(flagsDir, `${filename}.svg`);
  if (existsSync(outPath)) {
    console.log(`  SKIP ${filename} (already exists)`);
    return;
  }

  // Use Wikimedia Commons Special:Redirect to get the actual file
  const url = `https://commons.wikimedia.org/wiki/Special:Redirect/file/${wikiTitle}`;

  try {
    const resp = await fetch(url, { redirect: "follow" });
    if (!resp.ok) {
      console.error(`  FAIL ${filename}: HTTP ${resp.status} for ${wikiTitle}`);
      return;
    }
    const svg = await resp.text();
    writeFileSync(outPath, svg);
    console.log(`  OK   ${filename}`);
  } catch (err) {
    console.error(`  FAIL ${filename}: ${err}`);
  }
}

async function main() {
  console.log(`Downloading ${Object.keys(flagFiles).length} flags to ${flagsDir}...\n`);

  for (const [filename, wikiTitle] of Object.entries(flagFiles)) {
    await downloadFlag(filename, wikiTitle);
    await new Promise(r => setTimeout(r, 2500));
  }

  console.log("\nDone!");
}

main();
