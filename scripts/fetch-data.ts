/**
 * PIPELINE DE DONNÉES — Meraki (lolstaticdata) + Data Dragon → data/generated/
 *
 * C'est LE chantier annoncé dans le README : brancher un vrai pipeline versionné
 * par patch au lieu de saisir les champions à la main.
 *
 *   deno task data              # patch courant (Data Dragon "latest")
 *   deno task data -- 15.24.1   # patch figé
 *
 * Ce que fait le script :
 *   1. résout le patch (Data Dragon /api/versions.json) ;
 *   2. récupère TOUS les champions + objets depuis Meraki ;
 *   3. les projette sur les types du domaine (data/types.ts) — on n'extrait que
 *      ce que le moteur sait modéliser (stats plates, ratios AP / AD / bonus AD) ;
 *   4. fusionne des "overrides" écrits à la main (data/overrides.ts) pour les
 *      passifs complexes (Rabadon %AP, Fendoir %pén.), les étagères d'objets
 *      recommandés et la rune par défaut de chaque champion ;
 *   5. lit les fichiers du jeu (CommunityDragon, au patch près) : cooldowns, et
 *      valeurs des passifs décrits dans data/mechanics.ts ;
 *   6. écrit data/generated/champions.gen.ts, items.gen.ts, mechanics.gen.ts, meta.gen.ts.
 *
 * Honnêteté : les mécaniques non-plates (dégâts % PV, passifs conditionnels…)
 * ne sont PAS inventées. Elles restent à modéliser au cas par cas dans
 * lib/engine.ts, exactement comme avant. Le pipeline remplit le générique.
 */

import type {
  Ability,
  AbilityKey,
  AbilityRatios,
  Adaptive,
  Champion,
  ChampionBaseStats,
  DamageType,
  Formula,
  GameRef,
  Item,
  ItemStats,
  ItemTier,
  Mechanic,
  ScaledValue,
} from "../data/types.ts";
import { MECHANICS } from "../data/mechanics.ts";
import {
  cdragonVersion,
  cooldowns,
  fetchChampionBin,
  resolveRef,
  type SpellSlots,
  spellSlots,
} from "./cdragon.ts";
import {
  CHAMPION_OVERRIDES,
  DEFAULT_AD_SHELF,
  DEFAULT_AP_SHELF,
  ITEM_OVERRIDES,
  ITEM_WHITELIST,
} from "../data/overrides.ts";

const MERAKI = "https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US";
const DDRAGON = "https://ddragon.leagueoflegends.com";

const OUT_DIR = new URL("../data/generated/", import.meta.url);

// ---------------------------------------------------------------------------
// Types bruts (partiels) des réponses Meraki — juste ce qu'on consomme.
// ---------------------------------------------------------------------------

interface MStat {
  flat: number;
  perLevel: number;
  percent?: number;
}
interface MChampionStats {
  attackDamage: MStat;
  attackSpeed?: MStat;
  attackSpeedRatio?: MStat;
  attackRange?: MStat;
  criticalStrikeDamage?: MStat;
  health: MStat;
  armor: MStat;
  magicResistance: MStat;
}
interface MModifier {
  units: string[];
  values: number[];
}
interface MLeveling {
  attribute: string;
  modifiers: MModifier[];
}
interface MEffect {
  description?: string;
  leveling?: MLeveling[];
}
interface MAbility {
  name: string;
  damageType?: string;
  effects: MEffect[];
  cooldown?: { modifiers?: MModifier[] } | null;
}
interface MChampion {
  /** clé numérique Riot (ex. 103) — PAS le slug */
  id: number;
  /** id string Data Dragon (ex. "Ahri", "LeeSin") — sert au slug et au portrait */
  key: string;
  name: string;
  title: string;
  /** dernier patch où Meraki a mis à jour ce champion (peut être ancien) */
  patchLastChanged?: string;
  adaptiveType?: string;
  attackType?: string;
  stats: MChampionStats;
  abilities: Record<string, MAbility[]>;
}

/** Stats de base Data Dragon (champion.json) — source de vérité "plate", par patch. */
interface DDChampStats {
  hp: number;
  hpperlevel: number;
  armor: number;
  armorperlevel: number;
  spellblock: number;
  spellblockperlevel: number;
  attackdamage: number;
  attackdamageperlevel: number;
  attackspeed?: number;
  /** en % (1 = +1 % par niveau) */
  attackspeedperlevel?: number;
  attackrange?: number;
}

interface MItemStat {
  flat?: number;
  percent?: number;
}
interface MItem {
  /** id numérique Riot (identique à la clé Data Dragon) — sert au filtre SR */
  id: number;
  name: string;
  rank?: string[];
  removed?: boolean;
  requiredChampion?: string;
  shop?: { purchasable?: boolean };
  stats?: Record<string, MItemStat>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json() as Promise<T>;
}

/** slug stable et sûr pour une URL : "Lee Sin" → "leesin", "Kai'Sa" → "kaisa". */
function slugify(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const round = (n: number, p = 2) => Math.round(n * 10 ** p) / 10 ** p;

/** Type de dégâts d'un sort, déduit du champ Meraki (fallback : magique/util). */
function damageType(m: string | undefined, hasDamage: boolean): DamageType {
  if (!hasDamage) return "util";
  switch (m) {
    case "MAGIC_DAMAGE":
      return "magic";
    case "PHYSICAL_DAMAGE":
      return "physical";
    case "TRUE_DAMAGE":
      return "true";
    // MIXED_DAMAGE / absent : on retient le canal principal côté ratios ; par
    // défaut magique (la plupart des sorts mixtes sont à dominante AP).
    default:
      return "magic";
  }
}

/**
 * Convertit une unité Meraki en clé de ratio du domaine (ou null si non modélisé).
 * Les unités composées (« 3 % (+ 0,55 % par 100 AP) des PV max de la cible »)
 * gardent leur part fixe : le bonus par 100 AP est ignoré.
 */
function ratioKeyFromUnit(unit: string): keyof AbilityRatios | null {
  const u = unit.trim().toLowerCase().replace(/\s+/g, " ");
  if (u === "% ap") return "ap";
  if (u === "% ad") return "totalAd";
  if (u === "% bonus ad") return "bonusAd";
  if (/primary target/.test(u)) return null;
  if (/target'?s maximum health/.test(u)) return "targetMaxHp";
  if (/target'?s missing health/.test(u)) return "targetMissingHp";
  if (/target'?s current health/.test(u)) return "targetCurrentHp";
  if (/^% (of (his|her|its) )?bonus health$/.test(u)) return "bonusHp";
  if (/^% (of (his|her|its) )?maximum health$/.test(u)) return "maxHp";
  return null; // létalité conditionnelle, % mana, % armure… → non modélisé
}

/**
 * Choisit la ligne de dégâts "principale" d'un sort parmi les entrées de
 * leveling de Meraki. Heuristique : on privilégie un attribut dont le nom
 * contient "Damage", en écartant les "Total"/"Maximum"/"Reduced"/"Minimum"/
 * "Per Stack" qui sont des variantes/plafonds. À défaut, une variante ; sinon rien.
 */
function pickDamageLeveling(ability: MAbility): MLeveling | null {
  const levelings: MLeveling[] = [];
  for (const eff of ability.effects) {
    for (const lv of eff.leveling ?? []) levelings.push(lv);
  }
  if (levelings.length === 0) return null;

  // « Damage » au sens dégâts infligés — pas « Attack Damage » (un buff de stat) ni
  // « Damage Reduction / Amplification / Taken » (des modificateurs).
  const isDamage = (a: string) =>
    /damage/i.test(a) && !/(attack damage|reduction|amplif|taken|stored|absorbed|blocked)/i.test(a);
  const isVariant = (a: string) =>
    /(total|maximum|minimum|reduced|per stack|monster|per second|bonus)/i.test(a);

  const primary = levelings.find((l) => isDamage(l.attribute) && !isVariant(l.attribute));
  if (primary) return primary;
  // Pas de ligne « Damage » : le sort ne fait pas de dégâts modélisables. On ne
  // retombe PAS sur la première ligne venue (bouclier, largeur de mur, buff…).
  return levelings.find((l) => isDamage(l.attribute)) ?? null;
}

/** Projette une ligne de leveling Meraki sur base[] par rang + ratios (fixes ou par rang). */
function scaledFromLeveling(lv: MLeveling): ScaledValue | null {
  let base: number[] = [];
  const ratios: AbilityRatios = {};
  const rankRatios: Partial<Record<keyof AbilityRatios, number[]>> = {};

  for (const mod of lv.modifiers) {
    const units = mod.units;
    // Un modifier "flat" a ses unités vides ("").
    if (units.every((u) => u.trim() === "")) {
      if (base.length === 0) base = mod.values.map((v) => round(v));
      continue;
    }
    const key = ratioKeyFromUnit(units[0]);
    if (!key || !mod.values.length) continue;
    const values = mod.values.map((v) => round(v / 100, 4));
    ratios[key] = values[0];
    // Ratio qui varie avec le rang (Darius Q 100→140 % AD) : on garde la série.
    if (values.some((v) => v !== values[0])) rankRatios[key] = values;
  }

  if (base.length === 0 && Object.keys(ratios).length === 0) return null;
  if (base.length === 0) base = [0];
  return Object.keys(rankRatios).length ? { base, ratios, rankRatios } : { base, ratios };
}

/** Extrait base[] par rang + ratios depuis la ligne de dégâts choisie. */
function extractAbilityDamage(ability: MAbility): ScaledValue | null {
  const lv = pickDamageLeveling(ability);
  return lv ? scaledFromLeveling(lv) : null;
}

/**
 * Bouclier ou soin d'un sort : première ligne dont l'attribut correspond, en
 * préférant celles qui ne sont pas des variantes (max, min, par seconde…).
 */
function extractEffect(ability: MAbility, match: RegExp, exclude: RegExp): ScaledValue | null {
  const levelings: MLeveling[] = [];
  for (const eff of ability.effects) {
    for (const lv of eff.leveling ?? []) {
      if (match.test(lv.attribute) && !exclude.test(lv.attribute)) levelings.push(lv);
    }
  }
  const isVariant = (a: string) => /(maximum|minimum|per second|total|increased|empowered|bonus)/i.test(a);
  const lv = levelings.find((l) => !isVariant(l.attribute)) ?? levelings[0];
  return lv ? scaledFromLeveling(lv) : null;
}

// ---------------------------------------------------------------------------
// Mapping champion
// ---------------------------------------------------------------------------

const ABILITY_KEYS: AbilityKey[] = ["Q", "W", "E", "R"];

function mapChampion(m: MChampion, dd?: DDChampStats): Champion {
  const id = slugify(m.key);
  const ov = CHAMPION_OVERRIDES[id] ?? {};

  // Stats plates : Data Dragon (versionné par patch) fait foi — Meraki "latest"
  // peut être en retard d'un ou plusieurs patchs. Exception : adPerLevel, que
  // Data Dragon renvoie à 0 (bug connu) → Meraki fait foi.
  const pick = (ddv: number | undefined, mv: number) => (ddv && ddv > 0 ? ddv : mv);
  const base: ChampionBaseStats = {
    ad: round(pick(dd?.attackdamage, m.stats.attackDamage.flat)),
    adPerLevel: round(m.stats.attackDamage.perLevel),
    hp: round(pick(dd?.hp, m.stats.health.flat)),
    hpPerLevel: round(pick(dd?.hpperlevel, m.stats.health.perLevel)),
    armor: round(pick(dd?.armor, m.stats.armor.flat)),
    armorPerLevel: round(pick(dd?.armorperlevel, m.stats.armor.perLevel)),
    mr: round(pick(dd?.spellblock, m.stats.magicResistance.flat)),
    mrPerLevel: round(pick(dd?.spellblockperlevel, m.stats.magicResistance.perLevel)),
    attackSpeed: round(pick(dd?.attackspeed, m.stats.attackSpeed?.flat ?? 0), 3),
    // Le ratio n'existe que côté Meraki ; à défaut, il vaut la VA de base.
    attackSpeedRatio: round(
      m.stats.attackSpeedRatio?.flat || pick(dd?.attackspeed, m.stats.attackSpeed?.flat ?? 0.625),
      3,
    ),
    attackSpeedPerLevel: round(pick(dd?.attackspeedperlevel, m.stats.attackSpeed?.perLevel ?? 0) / 100, 4),
    attackRange: round(pick(dd?.attackrange, m.stats.attackRange?.flat ?? 0)),
    critDamage: round((m.stats.criticalStrikeDamage?.flat || 175) / 100, 3),
  };

  const adaptive: Adaptive = ov.adaptive ?? (m.adaptiveType === "PHYSICAL_DAMAGE" ? "AD" : "AP");

  const abilities = {} as Record<AbilityKey, Ability>;
  for (const key of ABILITY_KEYS) {
    const arr = m.abilities[key];
    const ma = arr?.[0];
    if (!ma) {
      abilities[key] = { name: key, type: "util", maxRank: key === "R" ? 3 : 5, base: [0], ratios: {} };
      continue;
    }
    const dmg = extractAbilityDamage(ma);
    const type = damageType(ma.damageType, !!dmg);
    const maxRank = key === "R" ? 3 : 5;
    const cooldown = ma.cooldown?.modifiers?.[0]?.values?.map((v) => round(v));
    const shield = extractEffect(ma, /shield/i, /reduc|destroy|break/i);
    const heal = extractEffect(ma, /heal|health restored/i, /reduc|grievous|cut/i);
    abilities[key] = {
      name: ma.name,
      type,
      maxRank,
      base: dmg?.base ?? [0],
      ratios: dmg?.ratios ?? {},
      ...(dmg?.rankRatios ? { rankRatios: dmg.rankRatios } : {}),
      ...(cooldown?.length ? { cooldown } : {}),
      ...(shield ? { shield } : {}),
      ...(heal ? { heal } : {}),
    };
  }

  const defaultShelf = adaptive === "AD" ? DEFAULT_AD_SHELF : DEFAULT_AP_SHELF;
  // ids Data Dragon (slugifiés) des runes modélisées.
  const defaultKeystone = adaptive === "AD" ? "conqueror" : "electrocute";

  return {
    id,
    name: m.name,
    title: m.title,
    initial: m.name[0]?.toUpperCase() ?? "?",
    adaptive,
    hasBleed: ov.hasBleed,
    base,
    // Ordre de compétences non fourni par Meraki (dépend du build). On applique
    // un ordre par défaut raisonnable : max Q > W > E, ult aux niv 6/11/16 ;
    // un override par champion peut l'affiner.
    skillOrder: ov.skillOrder ?? defaultSkillOrder(),
    abilities: applyAbilityOverrides(id, abilities),
    shelf: ov.shelf ?? defaultShelf,
    keystone: ov.keystone ?? defaultKeystone,
  };
}

/** Ordre par défaut : max Q, puis W, puis E, ult 6/11/16. */
function defaultSkillOrder(): AbilityKey[] {
  return ["Q", "W", "E", "Q", "Q", "R", "Q", "E", "Q", "E", "R", "E", "E", "W", "W", "R", "W", "W"];
}

/** Applique les overrides d'abilities (type/ratios corrigés à la main) si présents. */
function applyAbilityOverrides(id: string, abilities: Record<AbilityKey, Ability>) {
  const ov = CHAMPION_OVERRIDES[id]?.abilities;
  if (!ov) return abilities;
  for (const key of ABILITY_KEYS) {
    const o = ov[key];
    if (!o) continue;
    const merged = { ...abilities[key], ...o };
    // Un ratio corrigé à la main remplace aussi sa série par rang générée.
    if (o.ratios && merged.rankRatios) {
      const rr = { ...merged.rankRatios };
      for (const k of Object.keys(o.ratios) as (keyof AbilityRatios)[]) delete rr[k];
      if (Object.keys(rr).length) merged.rankRatios = rr;
      else delete merged.rankRatios;
    }
    abilities[key] = merged;
  }
  return abilities;
}

// ---------------------------------------------------------------------------
// Mapping objet
// ---------------------------------------------------------------------------

function mapItemStats(m: MItem, dd?: Record<string, number>): ItemStats {
  const s = m.stats ?? {};
  const stats: ItemStats = {};
  const flat = (k: string) => s[k]?.flat ?? 0;
  const pct = (k: string) => s[k]?.percent ?? 0;

  if (flat("attackDamage")) stats.ad = round(flat("attackDamage"));
  if (flat("abilityPower")) stats.ap = round(flat("abilityPower"));
  if (flat("health")) stats.hp = round(flat("health"));
  if (flat("armor")) stats.armor = round(flat("armor"));
  if (flat("magicResistance")) stats.mr = round(flat("magicResistance"));
  if (flat("abilityHaste")) stats.abilityHaste = round(flat("abilityHaste"));
  if (flat("magicPenetration")) stats.magicPenFlat = round(flat("magicPenetration"));
  if (pct("magicPenetration")) stats.magicPenPercent = round(pct("magicPenetration") / 100, 3);
  if (pct("armorPenetration")) stats.armorPenPercent = round(pct("armorPenetration") / 100, 3);
  if (flat("lethality")) stats.lethality = round(flat("lethality"));
  // Meraki range la VA bonus et le crit en « flat » ou en « percent » selon l'objet.
  const asPct = flat("attackSpeed") || pct("attackSpeed");
  if (asPct) stats.attackSpeed = round(asPct / 100, 3);
  const critPct = flat("criticalStrikeChance") || pct("criticalStrikeChance");
  if (critPct) stats.critChance = round(critPct / 100, 3);
  const lifeSteal = flat("lifesteal") || pct("lifesteal");
  if (lifeSteal) stats.lifeSteal = round(lifeSteal / 100, 3);
  const omnivamp = flat("omnivamp") || pct("omnivamp");
  if (omnivamp) stats.omnivamp = round(omnivamp / 100, 3);

  // Stats plates : Data Dragon (versionné par patch) fait foi quand il les
  // expose — Meraki "latest" peut retarder d'un ou plusieurs patchs. L'AH, la
  // létalité et les %pén n'existent pas côté DD : Meraki fait foi.
  if (dd) {
    if (dd.FlatPhysicalDamageMod) stats.ad = round(dd.FlatPhysicalDamageMod);
    if (dd.FlatMagicDamageMod) stats.ap = round(dd.FlatMagicDamageMod);
    if (dd.FlatHPPoolMod) stats.hp = round(dd.FlatHPPoolMod);
    if (dd.FlatArmorMod) stats.armor = round(dd.FlatArmorMod);
    if (dd.FlatSpellBlockMod) stats.mr = round(dd.FlatSpellBlockMod);
    if (dd.PercentAttackSpeedMod) stats.attackSpeed = round(dd.PercentAttackSpeedMod, 3);
    if (dd.FlatCritChanceMod) stats.critChance = round(dd.FlatCritChanceMod, 3);
    if (dd.PercentLifeStealMod) stats.lifeSteal = round(dd.PercentLifeStealMod, 3);
  }
  return stats;
}

/** Tier d'un objet d'après le rang Meraki. Undefined = non achetable en partie (conso, trinket…). */
function itemTier(rank: string[]): ItemTier | undefined {
  if (rank.includes("BOOTS")) return "boots";
  if (rank.includes("LEGENDARY")) return "legendary";
  if (rank.includes("EPIC")) return "epic";
  if (rank.includes("BASIC")) return "basic";
  if (rank.includes("STARTER")) return "starter";
  return undefined;
}

/** Libellé court : reprend l'override s'il existe, sinon dérive du nom. */
function itemShort(name: string, ov?: { short?: string }): string {
  if (ov?.short) return ov.short;
  const cleaned = name.replace(/['â€™]/g, "").toUpperCase();
  const first = cleaned.split(/\s+/)[0];
  return (first.length >= 4 ? first : cleaned.replace(/\s+/g, "")).slice(0, 8);
}

// ---------------------------------------------------------------------------
// Rendu des fichiers .gen.ts
// ---------------------------------------------------------------------------

function header(patch: string): string {
  return `// ⚠ FICHIER GÉNÉRÉ — ne pas éditer à la main.
// Source : Meraki (lolstaticdata) + Data Dragon.
// Régénérer : deno task data
// Patch de référence : ${patch}
// Généré le : ${new Date().toISOString().slice(0, 10)}
`;
}

function renderChampions(champs: Champion[], patch: string): string {
  const body = champs
    .map((c) => `  ${JSON.stringify(c.id)}: ${JSON.stringify(c, null, 2).replace(/\n/g, "\n  ")},`)
    .join("\n");
  return `${header(patch)}
import type { Champion } from "../types.ts";

export const GENERATED_CHAMPIONS: Record<string, Champion> = {
${body}
};
`;
}

function renderItems(items: Item[], patch: string): string {
  const body = items
    .map((it) => `  ${JSON.stringify(it.id)}: ${JSON.stringify(it, null, 2).replace(/\n/g, "\n  ")},`)
    .join("\n");
  return `${header(patch)}
import type { Item } from "../types.ts";

export const GENERATED_ITEMS: Record<string, Item> = {
${body}
};
`;
}

/**
 * Runes keystone : comportement modélisé dans le moteur, par id Data Dragon.
 * Seules celles listées ici ont un effet réel ; les autres sont "none" (neutres).
 */
const RUNE_KIND: Record<string, "electro" | "conqueror"> = {
  "8112": "electro", // Électrocution (Domination)
  "8010": "conqueror", // Conquérant (Precision)
};

interface DDRuneSlot {
  runes: Array<{ id: number; key: string; name: string; icon: string; shortDesc?: string }>;
}
interface DDRuneTree {
  id: number;
  name: string;
  slots: DDRuneSlot[];
}

interface GenRune {
  id: string;
  name: string;
  description: string;
  kind: "electro" | "conqueror" | "none";
  icon: string;
  tree: string;
}

/** Extrait les runes keystone (slot 0 de chaque arbre) depuis Data Dragon. */
function mapRunes(trees: DDRuneTree[]): GenRune[] {
  const out: GenRune[] = [];
  for (const tree of trees) {
    const keystones = tree.slots[0]?.runes ?? [];
    for (const k of keystones) {
      const idStr = String(k.id);
      const kind: GenRune["kind"] = Object.hasOwn(RUNE_KIND, idStr) ? RUNE_KIND[idStr] : "none";
      const modeled = kind !== "none";
      const shortDesc = (k.shortDesc ?? "").replace(/<[^>]+>/g, "").trim();
      out.push({
        id: slugify(k.key),
        name: k.name,
        description: modeled
          ? `keystone · ${tree.name} · calcul modélisé`
          : `keystone · ${tree.name}${shortDesc ? ` · ${shortDesc}` : ""} · non modélisée`,
        kind,
        icon: `${DDRAGON}/cdn/img/${k.icon}`,
        tree: tree.name,
      });
    }
  }
  // Les runes modélisées d'abord (elles pilotent le calcul).
  return out.sort((a, b) => {
    const am = a.kind !== "none", bm = b.kind !== "none";
    if (am !== bm) return am ? -1 : 1;
    return a.name.localeCompare(b.name, "fr");
  });
}

function renderRunes(runes: GenRune[], patch: string): string {
  const body = runes
    .map((r) => `  ${JSON.stringify(r.id)}: ${JSON.stringify(r, null, 2).replace(/\n/g, "\n  ")},`)
    .join("\n");
  return `${header(patch)}
import type { RuneDef } from "../types.ts";

/** Runes keystone (Data Dragon). \`kind\` pilote le calcul ; "none" = neutre. */
export const GENERATED_RUNES: Record<string, RuneDef & { tree: string }> = {
${body}
};
`;
}

function renderMechanics(mechanics: Record<string, Mechanic[]>, patch: string): string {
  const body = Object.entries(mechanics)
    .map(([id, list]) => `  ${JSON.stringify(id)}: ${JSON.stringify(list, null, 2).replace(/\n/g, "\n  ")},`)
    .join("\n");
  return `${header(patch)}
// Passifs décrits dans data/mechanics.ts, valeurs résolues depuis les fichiers du jeu.
import type { Mechanic } from "../types.ts";

export const GENERATED_MECHANICS: Record<string, Mechanic[]> = {
${body}
};
`;
}

/**
 * Résout les GameRef de data/mechanics.ts en formules. Une mécanique dont une
 * référence est introuvable (sort renommé, calcul non convertible) est écartée
 * et signalée — on n'invente pas de valeur.
 */
function resolveMechanics(
  champions: Champion[],
  slotsById: Map<string, SpellSlots>,
): Record<string, Mechanic[]> {
  const out: Record<string, Mechanic[]> = {};
  let ok = 0;
  for (const [id, list] of Object.entries(MECHANICS)) {
    const champ = champions.find((c) => c.id === id);
    const slots = slotsById.get(id);
    if (!champ || !slots) {
      console.warn(`  ⚠ mécaniques de ${id} : champion ou fichiers du jeu introuvables.`);
      continue;
    }
    const maxRank = (ref: GameRef) => (ref.slot === "P" ? 1 : champ.abilities[ref.slot].maxRank);
    for (const m of list) {
      const resolved: Record<string, unknown> = {};
      let failed: string | null = null;
      for (const [k, v] of Object.entries(m)) {
        if (v && typeof v === "object" && "slot" in v) {
          const ref = v as GameRef;
          const f: Formula | null = resolveRef(slots, ref, maxRank(ref));
          if (!f) failed = `${ref.slot}/${ref.calc ?? ref.value}`;
          resolved[k] = f;
        } else resolved[k] = v;
      }
      if (failed) {
        console.warn(`  ⚠ mécanique ${id} ${m.kind} : référence ${failed} non résolue, écartée.`);
        continue;
      }
      (out[id] ??= []).push(resolved as Mechanic);
      ok++;
    }
  }
  console.log(`  mécaniques : ${ok} résolues depuis les fichiers du jeu.`);
  return out;
}

function renderMeta(
  patch: string,
  counts: { champions: number; items: number; runes: number; statsPatch: string },
): string {
  return `${header(patch)}
/** Métadonnées de génération (affichées dans /methode). */
export const DATA_META = {
  /** patch Data Dragon (liste champions, runes, icônes, disponibilité SR) */
  patch: ${JSON.stringify(patch)},
  /** patch réel des stats/ratios champions côté Meraki (peut être plus ancien) */
  statsPatch: ${JSON.stringify(counts.statsPatch)},
  generatedAt: ${JSON.stringify(new Date().toISOString().slice(0, 10))},
  champions: ${counts.champions},
  items: ${counts.items},
  runes: ${counts.runes},
} as const;
`;
}

/** Patch le plus fréquent parmi les champions Meraki (leur vraie fraîcheur). */
function mostCommonPatch(patches: string[]): string {
  const count = new Map<string, number>();
  for (const p of patches) count.set(p, (count.get(p) ?? 0) + 1);
  let best = "?", n = 0;
  for (const [p, c] of count) if (c > n) [best, n] = [p, c];
  return best;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const arg = Deno.args[0];
  const versions = await fetchJson<string[]>(`${DDRAGON}/api/versions.json`);
  const patch = arg ?? versions[0];
  console.log(`▶ Patch de référence : ${patch}`);

  // --- Champions ---
  console.log("▶ Récupération de la liste des champions (Data Dragon)…");
  const dd = await fetchJson<{ data: Record<string, { id: string; stats: DDChampStats }> }>(
    `${DDRAGON}/cdn/${patch}/data/en_US/champion.json`,
  );
  const championIds = Object.values(dd.data).map((c) => c.id).sort();
  // Stats de base par slug — croisées avec Meraki dans mapChampion.
  const ddStatsBySlug = new Map<string, DDChampStats>();
  for (const c of Object.values(dd.data)) ddStatsBySlug.set(slugify(c.id), c.stats);
  console.log(`  ${championIds.length} champions à traiter.`);

  const champions: Champion[] = [];
  const merakiPatches: string[] = [];
  let done = 0;
  // Petites vagues pour ne pas marteler le CDN.
  const BATCH = 12;
  for (let i = 0; i < championIds.length; i += BATCH) {
    const slice = championIds.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      slice.map((id) => fetchJson<MChampion>(`${MERAKI}/champions/${id}.json`)),
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === "fulfilled") {
        try {
          champions.push(mapChampion(r.value, ddStatsBySlug.get(slugify(r.value.key))));
          if (r.value.patchLastChanged) merakiPatches.push(r.value.patchLastChanged);
        } catch (e) {
          console.warn(`  ⚠ mapping échoué pour ${slice[j]} : ${(e as Error).message}`);
        }
      } else {
        console.warn(`  ⚠ fetch échoué pour ${slice[j]} : ${r.reason}`);
      }
    }
    done += slice.length;
    console.log(`  …${done}/${championIds.length}`);
  }
  champions.sort((a, b) => a.name.localeCompare(b.name, "fr"));

  const statsPatch = mostCommonPatch(merakiPatches);
  if (statsPatch !== "?" && !patch.startsWith(statsPatch.split(".")[0])) {
    console.log(
      `  ⚠ Meraki est sur le patch ${statsPatch}, Data Dragon sur ${patch} : ` +
        `les stats champions peuvent être en retard (voir deno task audit).`,
    );
  }

  // --- Fichiers du jeu (CommunityDragon) : à jour au patch, contrairement à Meraki ---
  const cdVersion = cdragonVersion(patch);
  console.log(`▶ Fichiers du jeu (CommunityDragon ${cdVersion})…`);
  const slotsById = new Map<string, SpellSlots>();
  for (let i = 0; i < champions.length; i += BATCH) {
    const slice = champions.slice(i, i + BATCH);
    const bins = await Promise.all(slice.map((c) => fetchChampionBin(cdVersion, c.id).catch(() => null)));
    slice.forEach((c, j) => {
      if (bins[j]) slotsById.set(c.id, spellSlots(bins[j]));
    });
  }
  console.log(`  ${slotsById.size}/${champions.length} champions trouvés.`);

  // Cooldowns : le jeu fait foi.
  let cdTotal = 0;
  let cdChanged = 0;
  for (const c of champions) {
    const slots = slotsById.get(c.id);
    if (!slots) continue;
    for (const key of ABILITY_KEYS) {
      const cd = cooldowns(slots[key], c.abilities[key].maxRank);
      if (!cd) continue;
      cdTotal++;
      if (JSON.stringify(cd) !== JSON.stringify(c.abilities[key].cooldown)) cdChanged++;
      c.abilities[key].cooldown = cd;
    }
  }
  console.log(
    `  cooldowns : ${cdTotal} sorts au patch ${cdVersion}, dont ${cdChanged} différents de Meraki.`,
  );

  // Passifs (data/mechanics.ts) : références résolues en formules du patch.
  const mechanics = resolveMechanics(champions, slotsById);

  // --- Objets ---
  // Disponibilité sur la Faille de l'invocateur (classé) : Data Dragon expose
  // `maps["11"]` (SR). Meraki ne l'a pas, mais la clé numérique d'un item est
  // commune aux deux → on croise.
  console.log("▶ Récupération de la disponibilité SR (Data Dragon)…");
  const ddItems = await fetchJson<
    {
      data: Record<string, {
        maps?: Record<string, boolean>;
        stats?: Record<string, number>;
        gold?: { total: number };
        from?: string[];
      }>;
    }
  >(
    `${DDRAGON}/cdn/${patch}/data/en_US/item.json`,
  );
  const srItemIds = new Set<string>();
  for (const [id, it] of Object.entries(ddItems.data)) {
    if (it.maps?.["11"]) srItemIds.add(id);
  }

  console.log("▶ Récupération des objets (Meraki)…");
  const rawItems = await fetchJson<Record<string, MItem>>(`${MERAKI}/items.json`);
  const items: Item[] = [];
  const wanted = new Set(ITEM_WHITELIST);
  // id numérique Riot → slug, pour traduire les recettes Data Dragon.
  const slugByRiotId = new Map<string, string>();
  for (const m of Object.values(rawItems)) {
    if (m.removed || m.requiredChampion) continue;
    if (!m.shop?.purchasable) continue;
    // Faille de l'invocateur uniquement (exclut ARAM, Arena, etc.).
    if (!srItemIds.has(String(m.id)) && !wanted.has(slugify(m.name))) continue;
    const tier = itemTier(m.rank ?? []);
    const id = slugify(m.name);
    // Objets complets (légendaires + bottes) pour le labo ; starters, objets de
    // base et épiques pour la timeline de build (Long Sword, Doran, Brutalizer…).
    if (!tier && !wanted.has(id)) continue;
    const dd = ddItems.data[String(m.id)];
    const stats = mapItemStats(m, dd?.stats);
    const ov = ITEM_OVERRIDES[id];
    const merged: ItemStats = { ...stats, ...(ov?.stats ?? {}) };
    // Un légendaire sans aucune stat modélisée n'apporte rien au moteur : on
    // l'écarte (sauf whitelist). Composants et bottes restent : les recettes en
    // ont besoin (Bottes → Steelcaps, Greaves → Zephyr…).
    if (tier === "legendary" && Object.keys(merged).length === 0 && !wanted.has(id)) continue;
    slugByRiotId.set(String(m.id), id);
    items.push({
      id,
      name: ov?.name ?? m.name,
      short: itemShort(m.name, ov),
      stats: merged,
      tier,
      cost: dd?.gold?.total,
      // Recette brute (ids Riot) — traduite en slugs une fois tous les objets connus.
      from: dd?.from,
      // Icône officielle Data Dragon (clé = id numérique Riot).
      icon: `${DDRAGON}/cdn/${patch}/img/item/${m.id}.png`,
    });
  }
  // Recettes : ids Riot → slugs. Un composant absent (hors SR…) casse le calcul
  // du coût de combinaison : on le signale.
  const brokenRecipes: string[] = [];
  for (const it of items) {
    if (!it.from?.length) {
      delete it.from;
      continue;
    }
    const slugs = it.from.map((rid) => slugByRiotId.get(rid));
    const missing = it.from.filter((_, i) => !slugs[i]);
    if (missing.length) brokenRecipes.push(`${it.id} (${missing.join(", ")})`);
    it.from = slugs.filter((s): s is string => !!s);
  }
  if (brokenRecipes.length) {
    console.log(`  ⚠ Recettes avec un composant inconnu : ${brokenRecipes.join(" ; ")}`);
  }
  items.sort((a, b) => a.name.localeCompare(b.name, "fr"));

  // --- Intégrité : une étagère ne doit référencer que des objets existants.
  // On filtre les ids inconnus (plutôt que planter l'UI qui fait ITEMS[id].name)
  // et on complète avec l'étagère par défaut si elle devient trop courte.
  const itemIds = new Set(items.map((it) => it.id));
  let dropped = 0;
  for (const c of champions) {
    const clean = c.shelf.filter((id) => itemIds.has(id));
    dropped += c.shelf.length - clean.length;
    const fallback = c.adaptive === "AD" ? DEFAULT_AD_SHELF : DEFAULT_AP_SHELF;
    for (const id of fallback) {
      if (clean.length >= 6) break;
      if (itemIds.has(id) && !clean.includes(id)) clean.push(id);
    }
    c.shelf = clean;
  }
  if (dropped) console.log(`  ⚠ ${dropped} référence(s) d'étagère inconnue(s) écartée(s).`);

  // --- Runes ---
  console.log("▶ Récupération des runes (Data Dragon)…");
  const runeTrees = await fetchJson<DDRuneTree[]>(
    `${DDRAGON}/cdn/${patch}/data/en_US/runesReforged.json`,
  );
  const runes = mapRunes(runeTrees);
  const modeledRunes = runes.filter((r) => r.kind !== "none").length;
  console.log(`  ${runes.length} runes keystone (${modeledRunes} modélisées).`);

  // --- Écriture ---
  await Deno.mkdir(OUT_DIR, { recursive: true });
  await Deno.writeTextFile(new URL("champions.gen.ts", OUT_DIR), renderChampions(champions, patch));
  await Deno.writeTextFile(new URL("items.gen.ts", OUT_DIR), renderItems(items, patch));
  await Deno.writeTextFile(new URL("runes.gen.ts", OUT_DIR), renderRunes(runes, patch));
  await Deno.writeTextFile(new URL("mechanics.gen.ts", OUT_DIR), renderMechanics(mechanics, patch));
  await Deno.writeTextFile(
    new URL("meta.gen.ts", OUT_DIR),
    renderMeta(patch, {
      champions: champions.length,
      items: items.length,
      runes: runes.length,
      statsPatch,
    }),
  );

  // Reformate les fichiers générés pour qu'ils passent `deno fmt --check`
  // (JSON.stringify n'ajoute pas les virgules finales attendues par Deno).
  console.log("▶ Formatage des fichiers générés (deno fmt)…");
  const fmt = new Deno.Command("deno", {
    args: ["fmt", "data/generated/"],
    stdout: "null",
    stderr: "inherit",
  });
  const { success } = await fmt.output();
  if (!success) console.warn("  ⚠ `deno fmt` a échoué — lance-le à la main.");

  console.log(
    `✔ Généré : ${champions.length} champions, ${items.length} objets, ${runes.length} runes → data/generated/`,
  );
  console.log("  Lance ensuite : deno task check && deno task test");
}

if (import.meta.main) {
  await main();
}
