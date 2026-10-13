/**
 * CommunityDragon — les fichiers du jeu (.bin) convertis en JSON, versionnés par patch.
 *
 *   https://raw.communitydragon.org/<patch>/game/data/characters/<id>/<id>.bin.json
 *
 * C'est la source la plus à jour pour les valeurs de sorts (cooldowns, ratios,
 * passifs) : elle suit chaque patch, là où une source tierce peut prendre du retard.
 * Ce module lit un fichier de champion et convertit ses formules (« GameCalculation »)
 * en `Formula` (data/types.ts), que le moteur évalue (lib/formula.ts).
 *
 * Honnêteté : on ne convertit que les briques dont le sens est vérifié. Une
 * formule qui utilise une brique inconnue (cumul de buff, condition, stat non
 * identifiée…) renvoie null — l'appelant retombe alors sur le wiki et le signale.
 */

import type { AbilityKey, Formula, GameRef, ItemRef, StatRef } from "../data/types.ts";

export const CDRAGON = "https://raw.communitydragon.org";

/** Patch Data Dragon « 16.20.1 » → dossier CommunityDragon « 16.20 ». */
export function cdragonVersion(ddPatch: string): string {
  return ddPatch.split(".").slice(0, 2).join(".");
}

// deno-lint-ignore no-explicit-any
type Json = any;

/** Les sorts d'un champion, par emplacement (P = passif). */
export type SpellSlots = Partial<Record<"P" | AbilityKey, Json>>;

export async function fetchChampionBin(version: string, id: string): Promise<Json | null> {
  const res = await fetch(`${CDRAGON}/${version}/game/data/characters/${id}/${id}.bin.json`);
  if (!res.ok) {
    await res.body?.cancel();
    return null;
  }
  return res.json();
}

/** Retrouve les mSpell de Q/W/E/R (spellNames) et du passif (mCharacterPassiveSpell). */
export function spellSlots(bin: Json): SpellSlots {
  const rootKey = Object.keys(bin).find((k) => /\/CharacterRecords\/Root$/.test(k));
  if (!rootKey) return {};
  const root = bin[rootKey];
  const prefix = rootKey.replace(/\/CharacterRecords\/Root$/, "");
  const slots: SpellSlots = {};
  const keys: AbilityKey[] = ["Q", "W", "E", "R"];
  (root.spellNames ?? []).forEach((name: string, i: number) => {
    const spell = bin[`${prefix}/Spells/${name}`]?.mSpell;
    if (spell && keys[i]) slots[keys[i]] = spell;
  });
  const passive = root.mCharacterPassiveSpell && bin[root.mCharacterPassiveSpell]?.mSpell;
  if (passive) slots.P = passive;
  return slots;
}

/** Arrondi à 6 chiffres significatifs (0.00039999998989515007 → 0.0004). */
function clean(n: number): number {
  return Number(n.toPrecision(6));
}

/** Cooldowns par rang (index 0 des fichiers = rang 0, ignoré). Undefined si absent ou nul. */
export function cooldowns(spell: Json, maxRank: number): number[] | undefined {
  const cd: number[] | undefined = spell?.cooldownTime;
  if (!cd?.length) return undefined;
  const ranks = cd.slice(1, 1 + maxRank).map(clean);
  return ranks.length && ranks.some((v) => v > 0) ? ranks : undefined;
}

/**
 * Stats vérifiées sur des sorts connus, recoupées avec les unités du wiki :
 *   0 AP (Ahri) · 1 armure (Malphite E) · 2 AD · 4 VA (Akshan E « par 100 % de VA
 *   bonus », passif de Jhin) · 6 RM (Sejuani) · 8 chance de crit (passif de Jhin,
 *   Caitlyn) · 9 dégâts critiques (Aphelios R) · 12 PV (Garen W, Malphite) ·
 *   29 létalité (Pyke R).
 * mStatFormula : 0 total, 1 base, 2 bonus.
 */
function statRef(stat = 0, formula = 0): StatRef | null {
  switch (stat) {
    case 0:
      return "ap"; // l'AP est entièrement « bonus »
    case 1:
      return formula === 2 ? "bonusArmor" : formula === 0 ? "armor" : null;
    case 2:
      return formula === 2 ? "bonusAd" : formula === 1 ? "baseAd" : "ad";
    case 6:
      return formula === 2 ? "bonusMr" : formula === 0 ? "mr" : null;
    case 12:
      return formula === 2 ? "bonusHp" : formula === 1 ? "baseHp" : "maxHp";
    case 4:
      return formula === 2 ? "bonusAttackSpeed" : formula === 0 ? "attackSpeed" : null;
    case 8:
      return "critChance";
    case 9:
      return "critDamage";
    case 29:
      return "lethality";
    default:
      return null; // vitesse de déplacement, portée, PV manquants… : non modélisé
  }
}

/** Valeurs par rang d'une DataValue (index 0 = rang 0, ignoré), réduites si constantes. */
function rankValues(values: number[] | undefined, maxRank: number): Formula {
  if (!values?.length) return { op: "num", n: 0 };
  const v = values.slice(1, 1 + Math.max(1, maxRank)).map(clean);
  if (!v.length) return { op: "num", n: clean(values[0]) };
  return v.every((x) => x === v[0]) ? { op: "num", n: v[0] } : { op: "rank", v };
}

/** Simplifications : sommes et produits à un seul terme, multiplications par 1. */
function sum(of: Formula[]): Formula {
  const parts = of.filter((f) => !(f.op === "num" && f.n === 0));
  if (parts.length === 0) return { op: "num", n: 0 };
  return parts.length === 1 ? parts[0] : { op: "sum", of: parts };
}
function mul(of: Formula[]): Formula {
  if (of.some((f) => f.op === "num" && f.n === 0)) return { op: "num", n: 0 };
  const parts = of.filter((f) => !(f.op === "num" && f.n === 1));
  if (parts.length === 0) return { op: "num", n: 1 };
  const nums = parts.filter((f): f is { op: "num"; n: number } => f.op === "num");
  if (nums.length === parts.length) return { op: "num", n: clean(nums.reduce((a, f) => a * f.n, 1)) };
  return parts.length === 1 ? parts[0] : { op: "mul", of: parts };
}

/** Convertit une formule de sort en Formula. Null si une brique n'est pas reconnue. */
export function toFormula(spell: Json, calcName: string, maxRank: number, ranged = false): Formula | null {
  const calcs = spell?.mSpellCalculations ?? {};
  const dataValues: Json[] = spell?.DataValues ?? [];
  const named = (name: string) => rankValues(dataValues.find((d) => d.name === name)?.values, maxRank);
  const seen = new Set<string>();

  const part = (p: Json): Formula | null => {
    if (!p || typeof p !== "object") return null;
    switch (p.__type) {
      case "NumberCalculationPart":
        return { op: "num", n: clean(p.mNumber ?? 0) };
      case "NamedDataValueCalculationPart":
        return named(p.mDataValue);
      case "EffectValueCalculationPart": {
        const eff = spell?.mEffectAmount?.[(p.mEffectIndex ?? 1) - 1]?.value;
        return rankValues(eff, maxRank);
      }
      case "StatByCoefficientCalculationPart":
      case "StatByNamedDataValueCalculationPart":
      case "StatBySubPartCalculationPart": {
        const stat = statRef(p.mStat, p.mStatFormula);
        if (!stat) return null;
        const coef = p.__type === "StatByCoefficientCalculationPart"
          ? { op: "num", n: clean(p.mCoefficient ?? 0) } as Formula
          : p.__type === "StatByNamedDataValueCalculationPart"
          ? named(p.mDataValue)
          : part(p.mSubpart);
        if (!coef) return null;
        if (coef.op === "num" && coef.n === 0) return { op: "num", n: 0 };
        return { op: "stat", stat, f: coef };
      }
      case "ProductOfSubPartsCalculationPart": {
        const a = part(p.mPart1);
        const b = part(p.mPart2);
        return a && b ? mul([a, b]) : null;
      }
      case "SumOfSubPartsCalculationPart": {
        const parts = (p.mSubparts ?? []).map(part);
        return parts.every(Boolean) ? sum(parts as Formula[]) : null;
      }
      case "ByCharLevelInterpolationCalculationPart":
        return { op: "lerp", from: clean(p.mStartValue ?? 0), to: clean(p.mEndValue ?? 0) };
      case "ByCharLevelFormulaCalculationPart":
        // Une valeur par niveau (Lux : 20 au niveau 1 … 190 au niveau 18).
        return p.values?.length ? { op: "byLevel", v: (p.values as number[]).slice(0, 18).map(clean) } : null;
      case "AbilityResourceByCoefficientCalculationPart": {
        // Ressource (mana) : formule 2 = mana bonus, sinon mana max.
        const coef = clean(p.mCoefficient ?? 0);
        return coef
          ? { op: "stat", stat: p.mStatFormula === 2 ? "bonusMana" : "maxMana", f: { op: "num", n: coef } }
          : null;
      }
      case "ClampSubPartsCalculationPart": {
        // Somme bornée (Comète arcanique : recharge 20 → 8 s, jamais sous le plancher).
        const parts = (p.mSubparts ?? []).map(part);
        if (!parts.every(Boolean)) return null;
        return {
          op: "clamp",
          f: sum(parts as Formula[]),
          min: clean(p.mFloor ?? 0),
          max: clean(p.mCeiling ?? 1e9),
        };
      }
      case "ByCharLevelBreakpointsCalculationPart":
        return {
          op: "steps",
          l1: clean(p.mLevel1Value ?? 0),
          perLevel: clean(p.mInitialBonusPerLevel ?? 0),
          bp: (p.mBreakpoints ?? []).map((b: Json) => ({
            level: b.mLevel,
            add: clean(b.mAdditionalBonusAtThisLevel ?? 0),
            // Champ omis = 0 (valeur par défaut des fichiers du jeu) : le gain par niveau s'arrête.
            perLevel: clean(b.mBonusPerLevelAtAndAfter ?? 0),
          })),
        };
      default: {
        // Interpolation niveau 1 → 18 entre deux valeurs nommées (Grêle de lames :
        // BonusDamageMin → BonusDamageMax). Brique sans nom lisible dans les fichiers.
        // Même brique, autre forme : StartDataValue / EndDataValue (Locke).
        if (p.StartDataValue && p.EndDataValue) {
          const from = named(p.StartDataValue);
          const to = named(p.EndDataValue);
          if (from.op === "num" && to.op === "num") return { op: "lerp", from: from.n, to: to.n };
        }
        if (p["{0589a59c}"] && p["{0b65bc23}"]) {
          const from = named(p["{0589a59c}"]);
          const to = named(p["{0b65bc23}"]);
          if (from.op === "num" && to.op === "num") return { op: "lerp", from: from.n, to: to.n };
        }
        return null; // cumul de buff, condition, ressource, brique non nommée…
      }
    }
  };

  const calc = (name: string): Formula | null => {
    if (seen.has(name)) return null; // garde-fou contre une référence circulaire
    seen.add(name);
    const c = calcs[name];
    if (!c) return null;
    if (c.__type === "GameCalculationModified") {
      const base = calc(c.mModifiedGameCalculation);
      const m = part(c.mMultiplier);
      return base && m ? mul([base, m]) : null;
    }
    // Calcul qui change selon que le porteur attaque à distance (objets : BotRK, Hydre…).
    if (c.__type === "GameCalculationConditional") {
      if (c.mConditionalCalculationRequirements?.__type !== "IsRangedCastRequirement") return null;
      return calc(ranged ? c.mConditionalGameCalculation : c.mDefaultGameCalculation);
    }
    // « {e9a3c91d} » : calcul d'objet avec un multiplicateur à distance (Kraken ×0,8).
    const itemCalc = c.__type === "{e9a3c91d}";
    if (c.__type !== "GameCalculation" && !itemCalc) return null;
    const parts = (c.mFormulaParts ?? []).map(part);
    if (!parts.every(Boolean)) return null;
    let total = sum(parts as Formula[]);
    // Multiplicateur à distance (objets, runes : Kraken ×0,8, Poigne ×0,4).
    if (ranged && c.mRangedMultiplier) {
      const rm = part(c.mRangedMultiplier);
      if (!rm) return null;
      total = mul([total, rm]);
    }
    if (!c.mMultiplier) return total;
    const m = part(c.mMultiplier);
    return m ? mul([total, m]) : null;
  };

  return calc(calcName);
}

/**
 * Calculs candidats d'un sort pour un effet (dégâts, bouclier, soin), du plus
 * probable au moins probable. On écarte les variantes : dégâts aux monstres ou
 * sbires, minimum / maximum, bonus, par seconde, par stack, infobulles…
 */
export function candidateCalcs(spell: Json, effect: "damage" | "shield" | "heal"): string[] {
  const names = Object.keys(spell?.mSpellCalculations ?? {});
  const match = effect === "damage" ? /damage/i : effect === "shield" ? /shield/i : /heal/i;
  const variant =
    /(monster|minion|tooltip|minimum|^min|maximum|^max|bonus|persecond|second|tick|perstack|stack|reduction|amp|crit|empower|percent|cap|dps|tower|turret|pet|clone|ward)/i;
  const preferred = effect === "damage"
    ? ["TotalDamage", "Damage", "DamageCalc", "CalculatedDamage", "FinalDamage", "TotalDamageCalc"]
    : effect === "shield"
    ? ["TotalShield", "ShieldAmount", "Shield", "ShieldStrength", "TotalShieldAmount"]
    : ["TotalHeal", "HealAmount", "Heal", "TotalHealing", "Healing"];
  const ok = names.filter((n) => match.test(n) && !variant.test(n));
  const rank = (n: string) => {
    const i = preferred.indexOf(n);
    return i >= 0 ? i : preferred.length;
  };
  return ok.sort((a, b) => rank(a) - rank(b) || a.length - b.length);
}

/** Vrai si le calcul est affiché en % (fraction de quelque chose : PV de la cible…) — sens inconnu. */
export function isPercentCalc(spell: Json, calcName: string): boolean {
  return !!spell?.mSpellCalculations?.[calcName]?.mDisplayAsPercent;
}

/** Famille d'un contrôle, pour rapprocher une durée (« StunDuration ») d'un mot d'infobulle (« Stunned »). */
export type CcKind =
  | "stun"
  | "knock"
  | "charm"
  | "fear"
  | "taunt"
  | "suppress"
  | "sleep"
  | "polymorph"
  | "berserk";

/** Famille d'après un nom de DataValue ou un mot d'infobulle. Null = générique (« CCDuration »). */
export function ccKind(word: string): CcKind | null {
  const w = word.toLowerCase();
  if (/stun/.test(w)) return "stun";
  if (/knock|airborne/.test(w)) return "knock";
  if (/charm/.test(w)) return "charm";
  if (/fear|flee/.test(w)) return "fear";
  if (/taunt/.test(w)) return "taunt";
  if (/suppress/.test(w)) return "suppress";
  if (/sleep|drowsy/.test(w)) return "sleep";
  if (/polymorph/.test(w)) return "polymorph";
  if (/berserk/.test(w)) return "berserk";
  return null;
}

/** Contrôles qui empêchent d'agir. Les enracinements (root, snare) n'en font pas partie. */
const HARD_CC = /(stun|knock|airborne|fear|flee|charm|taunt|suppress|sleep|polymorph|cc)/i;
/** Variantes écartées : sur sbires/monstres, contre un mur, durée max d'une charge, effet sur soi… */
const CC_VARIANT = /(minion|monster|wall|berserk|slow|noncharm|self|outer|bonus|max|root|snare)/i;

/**
 * Durée de contrôle d'un sort (s, par rang), lue dans ses DataValues. Si le sort en
 * porte plusieurs (Alistar W : étourdissement et projection simultanés), on garde
 * la plus longue — elles se chevauchent, elles ne s'additionnent pas.
 */
export function ccDuration(
  spell: Json,
  maxRank: number,
  allowed: (kind: CcKind | null) => boolean = () => true,
): Formula | null {
  return ccPick(spell, maxRank, allowed)?.formula ?? null;
}

/** Comme ccDuration, avec la famille du contrôle retenu (projection et suppression ignorent la ténacité). */
export function ccPick(
  spell: Json,
  maxRank: number,
  allowed: (kind: CcKind | null) => boolean = () => true,
): { formula: Formula; kind: CcKind | null } | null {
  const dvs: Json[] = (spell?.DataValues ?? []).filter((d: Json) =>
    /duration/i.test(d.name) && HARD_CC.test(d.name) && !CC_VARIANT.test(d.name) && d.values?.length &&
    allowed(ccKind(d.name))
  );
  if (!dvs.length) return null;
  const atMax = (d: Json) => d.values[Math.min(maxRank, d.values.length - 1)] ?? 0;
  const longest = dvs.reduce((a, d) => (atMax(d) > atMax(a) ? d : a), dvs[0]);
  const f = rankValues(longest.values, maxRank);
  return f.op === "num" && f.n <= 0 ? null : { formula: f, kind: ccKind(longest.name) };
}

/** Enracinements : empêchent de bouger (et de dasher), pas d'agir. */
const ROOT_VARIANT = /(minion|monster|wall|max|self|bonus|ally|allies)/i;

/** Durée d'enracinement d'un sort (s, par rang), la plus longue s'il en porte plusieurs. */
export function rootDuration(spell: Json, maxRank: number): Formula | null {
  const dvs: Json[] = (spell?.DataValues ?? []).filter((d: Json) =>
    /duration/i.test(d.name) && /(root|snare)/i.test(d.name) && !ROOT_VARIANT.test(d.name) && d.values?.length
  );
  if (!dvs.length) return null;
  const atMax = (d: Json) => d.values[Math.min(maxRank, d.values.length - 1)] ?? 0;
  const longest = dvs.reduce((a, d) => (atMax(d) > atMax(a) ? d : a), dvs[0]);
  const f = rankValues(longest.values, maxRank);
  return f.op === "num" && f.n <= 0 ? null : f;
}

/**
 * Ralentissement d'un sort : part de vitesse retirée (0..1, valeurs négatives et en %
 * normalisées) et durée. Null si le sort n'a pas les deux.
 */
export function slowEffect(spell: Json, maxRank: number): { amount: Formula; duration: Formula } | null {
  const dvs: Json[] = spell?.DataValues ?? [];
  const amount = dvs.find((d) =>
    /^(ms)?slow(amount|percent|mod)?$|^(ms|movespeed)slow(percent|amount)$/i.test(d.name) && d.values?.length
  );
  const duration = dvs.find((d) => /^slowduration$/i.test(d.name) && d.values?.length);
  if (!amount || !duration) return null;
  const norm = (amount.values as number[]).map((v) => {
    const a = Math.abs(v);
    return a > 1 ? a / 100 : a;
  });
  const f = rankValues(norm, maxRank);
  const d = rankValues(duration.values, maxRank);
  if ((f.op === "num" && f.n <= 0) || (d.op === "num" && d.n <= 0)) return null;
  return { amount: f, duration: d };
}

// ---------------------------------------------------------------------------
// Infobulles (client du jeu) : le SENS que les formules n'ont pas
// ---------------------------------------------------------------------------

/** Infobulle d'un sort telle que le client du jeu l'affiche, avec ses @placeholders@. */
export interface SpellTooltip {
  name: string;
  maxLevel?: number;
  text: string;
  ammo?: { max: number; recharge: number };
}

/** Infobulles de Q/W/E/R pour chaque champion, indexées par alias en minuscules (« monkeyking »). */
export async function fetchTooltips(
  version: string,
): Promise<Map<string, Partial<Record<"P" | AbilityKey, SpellTooltip>>>> {
  const base = `${CDRAGON}/${version}/plugins/rcp-be-lol-game-data/global/default/v1`;
  const summary: Json[] = await (await fetch(`${base}/champion-summary.json`)).json();
  const out = new Map<string, Partial<Record<"P" | AbilityKey, SpellTooltip>>>();
  const queue = summary.filter((c) => c.id > 0);
  const worker = async () => {
    while (queue.length) {
      const c = queue.shift()!;
      const res = await fetch(`${base}/champions/${c.id}.json`).catch(() => null);
      if (!res?.ok) {
        await res?.body?.cancel();
        continue;
      }
      const data = await res.json();
      const spells: Partial<Record<"P" | AbilityKey, SpellTooltip>> = {};
      for (const s of data.spells ?? []) {
        const key = String(s.spellKey ?? "").toUpperCase() as AbilityKey;
        if (!["Q", "W", "E", "R"].includes(key)) continue;
        const max = s.ammo?.maxAmmo?.[0] ?? 0;
        spells[key] = {
          name: s.name,
          maxLevel: s.maxLevel,
          text: s.dynamicDescription ?? s.description ?? "",
          ...(max > 0 ? { ammo: { max, recharge: s.ammo.ammoRechargeTime?.[0] ?? 0 } } : {}),
        };
      }
      if (data.passive) spells.P = { name: data.passive.name, text: data.passive.description ?? "" };
      out.set(String(c.alias).toLowerCase(), spells);
    }
  };
  await Promise.all(Array.from({ length: 12 }, worker));
  return out;
}

/** Contrôles qui empêchent d'agir, tels que les infobulles les nomment (<status>Stunned</status>…). */
const CC_STATUS =
  /<status>[^<]*\b(stun|stuns|stunned|knock|knocks|knocked|airborne|charm|charms|charmed|fear|fears|feared|flee|taunt|taunts|taunted|suppress|suppresses|suppressed|sleep|asleep|drowsy|polymorph|berserk)/i;
/**
 * Une phrase qui pose une condition (« If the target collides with terrain… »). Seul
 * « if » compte : « When used on an enemy » (Lulu W) est un choix, « While active »
 * (Volibear Q) une durée — pas des conditions.
 */
const CONDITION = /\bif\b/i;
/** Verbes de rapprochement : le sort permet de combler la distance. */
const MOBILITY =
  /\b(dash|dashes|dashing|leap|leaps|lunge|lunges|blink|blinks|teleport|teleports|(?:charges?|rams?) (?:forward|toward))\b/i;

export interface TooltipFacts {
  /** type de dégâts de chaque calcul cité dans une balise de dégâts */
  damageTypes: Map<string, "magic" | "physical" | "true">;
  /** calculs de dégâts dans l'ordre d'apparition */
  damageCalcs: string[];
  /** familles de contrôle posées sans condition */
  ccUnconditional: Set<CcKind>;
  /** familles de contrôle posées seulement sous condition (mur, cible enflammée, parade…) */
  ccConditional: Set<CcKind>;
  /** le sort rapproche son lanceur (dash, saut, téléportation) */
  mobility: boolean;
}

/** Lit une infobulle : types de dégâts par calcul, contrôles (conditionnels ou non), mobilité. */
export function parseTooltip(text: string, championName?: string): TooltipFacts {
  const damageTypes = new Map<string, "magic" | "physical" | "true">();
  const damageCalcs: string[] = [];
  for (const m of text.matchAll(/<(magic|physical|true)Damage>([\s\S]*?)<\/\1Damage>/gi)) {
    const type = m[1].toLowerCase() as "magic" | "physical" | "true";
    for (const ref of m[2].matchAll(/@([A-Za-z0-9_]+)(?:\*[\d.]+)?@/g)) {
      if (!damageTypes.has(ref[1])) {
        damageTypes.set(ref[1], type);
        damageCalcs.push(ref[1]);
      }
    }
  }
  // Phrases : on découpe sur les fins de phrase et les sauts de ligne de l'infobulle.
  // Les infobulles collent souvent les phrases (« …seconds.When used… ») : on coupe
  // aussi sur un point suivi d'une majuscule.
  const sentences = text.split(/<br\s*\/?>|(?<=\.)\s*(?=[A-Z<])/i);
  const ccUnconditional = new Set<CcKind>();
  const ccConditional = new Set<CcKind>();
  const statusAll = new RegExp(CC_STATUS.source, "gi");
  for (const s of sentences) {
    const conditional = CONDITION.test(s.replace(/<[^>]+>/g, ""));
    for (const m of s.matchAll(statusAll)) {
      const kind = ccKind(m[1]);
      if (kind) (conditional ? ccConditional : ccUnconditional).add(kind);
    }
  }
  // Mobilité : le verbe doit avoir le champion pour sujet (« Ivern dashes onto… »), pas
  // un familier (« Daisy to leap into the fray ») ni les alliés (« Allies … dash »).
  // Nom complet et premier mot (« Nunu & Willump » → « Nunu »), plus les pronoms.
  const escape = (n: string) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const names = championName ? [championName, championName.split(/[\s&']/)[0]].map(escape) : [];
  const subject = championName ? new RegExp(`\\b(${names.join("|")}|he|she|they)\\b`, "i") : null;
  const mobile = sentences.some((s) => {
    const p = s.replace(/<[^>]+>/g, " ");
    const m = MOBILITY.exec(p);
    if (!m) return false;
    if (!subject) return true;
    // Impératif en tête de phrase (« Recast: Dash to the marked champion », « Leap in a direction »).
    const before = p.slice(0, m.index).replace(/^.*:\s*/, "").trim();
    if (before === "") return true;
    // Sinon, le sujet le plus proche du verbe décide : le champion (ou un pronom) oui,
    // un familier, un clone ou les alliés non (« Zed's Shadow dashes », « Daisy to leap »).
    const lastChampion = Math.max(
      -1,
      ...[...before.matchAll(new RegExp(subject.source, "gi"))].map((x) => x.index!),
    );
    const lastOther = Math.max(
      -1,
      ...[...before.matchAll(/\b(allies|ally|daisy|tibbers|pet|clone|shadow|minion|ghoul|maiden)\b/gi)].map((
        x,
      ) => x.index!),
    );
    return lastChampion >= 0 && lastChampion > lastOther;
  });
  const plain = text.replace(/<[^>]+>/g, " ");
  // Un sort qui attire la cible (<status>Pulling</status> : Darius E, Blitzcrank Q) comble
  // l'écart autant qu'un dash. « pulls back her orb » (Ahri Q) n'est pas une attraction.
  const pulls = /<status>[^<]*\bpull/i.test(text);
  return {
    damageTypes,
    damageCalcs,
    ccUnconditional,
    ccConditional,
    mobility: (subject ? mobile : MOBILITY.test(plain)) || pulls,
  };
}

/** Sort à viser (esquivable) d'après son type de ciblage dans les fichiers du jeu. */
export function isAimed(spell: Json): boolean {
  const t = spell?.mTargetingTypeData?.__type;
  return ["Location", "Direction", "LocationClamped", "Area", "Cone"].includes(t);
}

// ---------------------------------------------------------------------------
// Objets (game/items.cdtb.bin.json)
// ---------------------------------------------------------------------------

/** Fichier des objets du jeu, indexé par id Riot (« 3071 »). */
export async function fetchItemsBin(version: string): Promise<Map<string, Json>> {
  const res = await fetch(`${CDRAGON}/${version}/game/items.cdtb.bin.json`);
  if (!res.ok) {
    await res.body?.cancel();
    return new Map();
  }
  const all = await res.json();
  const out = new Map<string, Json>();
  for (const [k, v] of Object.entries<Json>(all)) {
    const m = /^Items\/(\d+)$/.exec(k);
    if (m && v?.__type === "ItemData") out.set(m[1], v);
  }
  return out;
}

/** Présente un objet comme un sort (DataValues, calculs) pour réutiliser toFormula. */
export function itemAsSpell(item: Json): Json {
  return {
    DataValues: (item?.mDataValues ?? []).map((d: Json) => ({
      name: d.mName,
      values: Array(7).fill(d.mValue ?? 0),
    })),
    mSpellCalculations: item?.mItemCalculations ?? {},
    mEffectAmount: item?.mEffectAmount,
  };
}

/** Stats d'objet que Data Dragon et le wiki n'exposent pas : dégâts critiques bonus, ténacité. */
export function itemExtraStats(
  item: Json,
): { critDamage?: number; tenacity?: number; healShieldPower?: number } {
  const out: { critDamage?: number; tenacity?: number; healShieldPower?: number } = {};
  if (item?.mFlatCritDamageMod) out.critDamage = clean(item.mFlatCritDamageMod);
  if (item?.mPercentTenacityItemMod) out.tenacity = clean(item.mPercentTenacityItemMod);
  if (item?.mPercentHealingAmountMod) out.healShieldPower = clean(item.mPercentHealingAmountMod);
  return out;
}

/** Stat de base d'un personnage (« attackSpeedModifiable » → 0,75 pour Daisy). */
export function characterBaseStat(bin: Json, field: string): number | null {
  const root = Object.entries<Json>(bin ?? {}).find(([k]) => /\/CharacterRecords\/Root$/.test(k))?.[1];
  const v = root?.[field];
  const n = typeof v === "number" ? v : v?.baseValue;
  return typeof n === "number" ? clean(n) : null;
}

/** Résout une ItemRef sur un objet (mêlée, ou à distance si `ranged`). */
export function resolveItemRef(item: Json, ref: ItemRef, ranged = false): Formula | null {
  const spell = itemAsSpell(item);
  let f: Formula | null = null;
  if (ref.calc) f = toFormula(spell, ref.calc, 1, ranged);
  else if (ref.value) {
    const dv = spell.DataValues.find((d: Json) => d.name === ref.value);
    if (dv) f = rankValues(dv.values, 1);
  }
  if (!f) return null;
  if (ref.stat) f = { op: "stat", stat: ref.stat, f };
  return ref.times === undefined ? f : mul([f, { op: "num", n: ref.times }]);
}

/**
 * Fiche d'un sort : toutes ses valeurs brutes (par rang) et tous ses calculs convertis,
 * pour rendre l'infobulle du jeu avec des nombres calculés.
 */
export function kitSpell(spell: Json, tooltip: SpellTooltip, maxRank: number): {
  name: string;
  text: string;
  maxRank: number;
  values: Record<string, number[]>;
  calcs: Record<string, Formula | null>;
  cooldown?: number[];
  ammo?: { max: number; recharge: number };
} {
  const values: Record<string, number[]> = {};
  for (const d of spell?.DataValues ?? []) {
    const v: number[] = d.values ?? [];
    values[d.name] = (v.length > 1 ? v.slice(1, 1 + maxRank) : v).map(clean);
  }
  const calcs: Record<string, Formula | null> = {};
  for (const name of Object.keys(spell?.mSpellCalculations ?? {})) {
    try {
      calcs[name] = toFormula(spell, name, maxRank);
    } catch {
      calcs[name] = null;
    }
  }
  const cd = cooldowns(spell, maxRank);
  return {
    name: tooltip.name,
    text: tooltip.text,
    maxRank,
    values,
    calcs,
    ...(cd ? { cooldown: cd } : {}),
    ...(tooltip.ammo ? { ammo: tooltip.ammo } : {}),
  };
}

// ---------------------------------------------------------------------------
// Runes (game/perks.cdtb.bin.json)
// ---------------------------------------------------------------------------

/** Données de script des runes du jeu, indexées par id de rune (« 8112 »). */
export async function fetchPerks(version: string): Promise<Map<string, Json>> {
  const res = await fetch(`${CDRAGON}/${version}/game/perks.cdtb.bin.json`);
  if (!res.ok) {
    await res.body?.cancel();
    return new Map();
  }
  const out = new Map<string, Json>();
  for (const v of Object.values<Json>(await res.json())) {
    if (v?.__type === "Perk" && v.mPerkId) out.set(String(v.mPerkId), v.mScript?.mSpellScriptData ?? {});
  }
  return out;
}

/**
 * Valeurs et calculs d'une rune : mEffectAmount (valeurs uniques) et mCalculations,
 * convertis comme ceux d'un sort ; variante à distance gardée si elle diffère.
 */
export function perkData(script: Json): {
  values: Record<string, number>;
  calcs: Record<string, Formula | null>;
  rangedCalcs?: Record<string, Formula | null>;
} {
  const values: Record<string, number> = {};
  for (const [k, v] of Object.entries<Json>(script?.mEffectAmount ?? {})) {
    if (typeof v === "number" && !k.startsWith("{")) values[k] = clean(v);
  }
  const spell = {
    DataValues: Object.entries(values).map(([name, v]) => ({ name, values: Array(7).fill(v) })),
    mSpellCalculations: script?.mCalculations ?? {},
  };
  const calcs: Record<string, Formula | null> = {};
  const rangedCalcs: Record<string, Formula | null> = {};
  let differs = false;
  for (const name of Object.keys(spell.mSpellCalculations)) {
    if (name.startsWith("{")) continue;
    calcs[name] = toFormula(spell, name, 1, false);
    rangedCalcs[name] = toFormula(spell, name, 1, true);
    if (JSON.stringify(calcs[name]) !== JSON.stringify(rangedCalcs[name])) differs = true;
  }
  return differs ? { values, calcs, rangedCalcs } : { values, calcs };
}

/** Résout une GameRef sur les sorts d'un champion. Null si introuvable ou non convertible. */
export function resolveRef(slots: SpellSlots, ref: GameRef, maxRank: number): Formula | null {
  const spell = slots[ref.slot];
  if (!spell) return null;
  let f: Formula | null = null;
  if (ref.calc) f = toFormula(spell, ref.calc, maxRank);
  else if (ref.value) {
    const dv = (spell.DataValues ?? []).find((d: Json) => d.name === ref.value);
    if (dv) f = rankValues(dv.values, maxRank);
  }
  if (!f) return null;
  if (ref.times !== undefined) f = mul([f, { op: "num", n: ref.times }]);
  return ref.plus === undefined ? f : sum([f, { op: "num", n: ref.plus }]);
}
