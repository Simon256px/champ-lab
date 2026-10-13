/**
 * AUDIT DES STATS — croise les 3 sources pour évaluer l'exactitude du généré.
 *
 *   deno task audit
 *
 * Le pipeline (fetch-data.ts) tire les stats du wiki officiel. Cet audit les recroise
 * avec une source INDÉPENDANTE (Data Dragon) pour détecter les écarts :
 *
 *   - Data Dragon  → stats de base des champions (source de vérité "plate"),
 *                    stats plates d'objets.
 *   - Community Dragon → présence des assets (icônes) référencés.
 *   - Wiki officiel (via data/generated) → ce que l'app utilise réellement.
 *
 * On ne prétend pas re-vérifier les ratios de sorts (Data Dragon ne les donne
 * pas proprement — c'est justement pourquoi on lit le wiki et les fichiers du jeu). On vérifie ce
 * qui est vérifiable de façon croisée, et on liste le reste comme "non vérifié".
 *
 * Sortie : un rapport lisible + un code de sortie non nul si des écarts au-delà
 * de la tolérance sont trouvés (utile en CI).
 */

import { CHAMPIONS } from "../data/champions.ts";
import { ITEMS } from "../data/items.ts";
import { RUNE_LIST } from "../data/runes.ts";
import { DATA_META } from "../data/generated/meta.gen.ts";

const DDRAGON = "https://ddragon.leagueoflegends.com";
const PATCH = DATA_META.patch;

// Tolérance relative sur les stats numériques (arrondis wiki vs DD).
const TOL = 0.02;

interface Issue {
  severity: "écart" | "info";
  entity: string;
  field: string;
  detail: string;
}
const issues: Issue[] = [];
let checked = 0;
let infoAdPerLevel = 0;

const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(TOL * Math.abs(b), 0.51);

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} — ${url}`);
  return r.json() as Promise<T>;
}

// --- 0. Provenance : fraîcheur de la source (dernier patch noté par le wiki) ---
function auditProvenance() {
  console.log(`  Data Dragon : ${PATCH}`);
  console.log(`  Wiki officiel : dernier changement de champion noté au patch ${DATA_META.statsPatch}`);
  console.log();
}

// --- 1. Stats de base des champions : généré (wiki) vs Data Dragon ---
async function auditChampions() {
  const dd = await fetchJson<{ data: Record<string, { id: string }> }>(
    `${DDRAGON}/cdn/${PATCH}/data/en_US/champion.json`,
  );
  const ddIds = new Map<string, string>(); // slug → DD id
  for (const c of Object.values(dd.data)) {
    ddIds.set(c.id.toLowerCase().replace(/[^a-z0-9]/g, ""), c.id);
  }

  for (const champ of Object.values(CHAMPIONS)) {
    const ddId = ddIds.get(champ.id);
    if (!ddId) {
      issues.push({
        severity: "info",
        entity: champ.id,
        field: "existence",
        detail: "absent de Data Dragon (champion manuel ?) — non vérifié",
      });
      continue;
    }
    const full = await fetchJson<{ data: Record<string, { stats: Record<string, number> }> }>(
      `${DDRAGON}/cdn/${PATCH}/data/en_US/champion/${ddId}.json`,
    );
    const s = full.data[ddId].stats;
    // NB : Data Dragon renvoie systématiquement `attackdamageperlevel = 0`
    // (bug connu de longue date). C'est exactement pourquoi le projet tire ses
    // stats du wiki et non de DD. On EXCLUT donc ce champ du croisement (le
    // comparer donnerait 170 faux positifs). Les autres champs DD sont fiables.
    const pairs: Array<[string, number, number]> = [
      ["ad", champ.base.ad, s.attackdamage],
      ["hp", champ.base.hp, s.hp],
      ["hpPerLevel", champ.base.hpPerLevel, s.hpperlevel],
      ["armor", champ.base.armor, s.armor],
      ["armorPerLevel", champ.base.armorPerLevel, s.armorperlevel],
      ["mr", champ.base.mr, s.spellblock],
      ["mrPerLevel", champ.base.mrPerLevel, s.spellblockperlevel],
    ];
    for (const [field, got, expected] of pairs) {
      checked++;
      if (!near(got, expected)) {
        issues.push({
          severity: "écart",
          entity: champ.id,
          field: `base.${field}`,
          detail: `généré=${got} vs DataDragon=${expected}`,
        });
      }
    }
    // `adPerLevel` : non recroisable via DD (voir ci-dessus). On le note comme
    // vérifié-mais-non-croisé pour la transparence du rapport.
    infoAdPerLevel++;
  }
}

// --- 2. Stats plates d'objets : généré (wiki) vs Data Dragon ---
async function auditItems() {
  const dd = await fetchJson<
    { data: Record<string, { name: string; description?: string } & Record<string, unknown>> }
  >(
    `${DDRAGON}/cdn/${PATCH}/data/en_US/item.json`,
  );
  // DD ne structure pas les stats aussi proprement que le wiki ; on vérifie via
  // le bloc `stats` de DD quand il existe (clés type FlatPhysicalDamageMod…).
  // ⚠ Un même nom existe en plusieurs variantes (ids 22XXXX = équilibrage ARAM,
  // hors Faille) : on croise par id numérique (celui de l'URL d'icône) et le
  // secours par nom ne considère que les objets de la Faille (maps["11"]).
  const byId = new Map<string, Record<string, number>>();
  const byName = new Map<string, Record<string, number>>();
  for (const [ddId, raw] of Object.entries(dd.data)) {
    const it = raw as { name: string; maps?: Record<string, boolean>; stats?: Record<string, number> };
    byId.set(ddId, it.stats ?? {});
    if (it.maps?.["11"]) byName.set(it.name.toLowerCase(), it.stats ?? {});
  }
  const DD_KEY: Record<string, string> = {
    ad: "FlatPhysicalDamageMod",
    ap: "FlatMagicDamageMod",
    hp: "FlatHPPoolMod",
    armor: "FlatArmorMod",
  };
  for (const it of Object.values(ITEMS)) {
    const numericId = it.icon?.match(/\/item\/(\d+)\.png$/)?.[1];
    const ddStats = (numericId ? byId.get(numericId) : undefined) ?? byName.get(it.name.toLowerCase());
    if (!ddStats) {
      issues.push({
        severity: "info",
        entity: it.id,
        field: "existence",
        detail: "nom introuvable côté DD — non vérifié",
      });
      continue;
    }
    for (const [k, ddKey] of Object.entries(DD_KEY)) {
      const got = (it.stats as Record<string, number>)[k];
      const expected = ddStats[ddKey];
      if (got === undefined && !expected) continue;
      checked++;
      if (got !== undefined && expected !== undefined && !near(got, expected)) {
        issues.push({
          severity: "écart",
          entity: it.id,
          field: k,
          detail: `généré=${got} vs DataDragon=${expected}`,
        });
      }
    }
  }
}

// --- 3. Icônes (Community/Data Dragon) : URLs bien formées + un échantillon HEAD ---
async function auditIcons() {
  const sampleItems = Object.values(ITEMS).slice(0, 5);
  const sampleRunes = RUNE_LIST.slice(0, 3);
  const urls = [
    ...sampleItems.map((i) => i.icon).filter(Boolean),
    ...sampleRunes.map((r) => r.icon).filter(Boolean),
  ] as string[];
  for (const u of urls) {
    checked++;
    try {
      const r = await fetch(u, { method: "HEAD", signal: AbortSignal.timeout(8000) });
      if (!r.ok) issues.push({ severity: "écart", entity: u, field: "icon", detail: `HTTP ${r.status}` });
    } catch (e) {
      issues.push({ severity: "écart", entity: u, field: "icon", detail: (e as Error).message });
    }
  }
}

async function main() {
  console.log(`▶ Audit des stats — patch ${PATCH}`);
  console.log("  Croisement wiki (généré) ↔ Data Dragon ↔ Community Dragon…\n");

  auditProvenance();
  await auditChampions();
  await auditItems();
  await auditIcons();

  const ecarts = issues.filter((i) => i.severity === "écart");
  const infos = issues.filter((i) => i.severity === "info");

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Vérifications : ${checked}`);
  console.log(`Écarts        : ${ecarts.length}`);
  console.log(`Non vérifiés  : ${infos.length}`);
  console.log(`${"=".repeat(60)}\n`);

  if (ecarts.length) {
    console.log("⚠ ÉCARTS (généré ≠ source indépendante) :");
    for (const i of ecarts.slice(0, 40)) console.log(`  ✗ ${i.entity} · ${i.field} — ${i.detail}`);
    if (ecarts.length > 40) console.log(`  … +${ecarts.length - 40} autres`);
    console.log();
  }
  if (infos.length) {
    console.log("ℹ NON VÉRIFIÉS (source indépendante indisponible) :");
    const byReason = new Map<string, number>();
    for (const i of infos) byReason.set(i.detail, (byReason.get(i.detail) ?? 0) + 1);
    for (const [reason, n] of byReason) console.log(`  · ${n}× ${reason}`);
    console.log();
  }

  const rate = checked ? Math.round((1 - ecarts.length / checked) * 1000) / 10 : 100;
  console.log(`Taux de concordance : ${rate}% (${checked - ecarts.length}/${checked})`);
  console.log(
    `\nNon recroisés par choix :\n` +
      `  · ${infoAdPerLevel}× base.adPerLevel — Data Dragon renvoie 0 (bug connu) ; le wiki fait foi.\n` +
      `  · ratios de sorts — Data Dragon ne les expose pas proprement (lus sur le wiki et dans le jeu).\n` +
      `    Ils sont recoupés avec les formules du jeu dans le pipeline (${DATA_META.gameFormulas.damage} sorts concordent).`,
  );

  if (ecarts.length) Deno.exit(1);
}

if (import.meta.main) await main();
