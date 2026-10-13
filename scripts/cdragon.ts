/**
 * CommunityDragon — les fichiers du jeu (.bin) convertis en JSON, versionnés par patch.
 *
 *   https://raw.communitydragon.org/<patch>/game/data/characters/<id>/<id>.bin.json
 *
 * C'est la source la plus à jour pour les valeurs de sorts (cooldowns, ratios,
 * passifs) : elle suit chaque patch, là où Meraki peut avoir des mois de retard.
 * Ce module lit un fichier de champion et convertit ses formules (« GameCalculation »)
 * en `Formula` (data/types.ts), que le moteur évalue (lib/formula.ts).
 *
 * Honnêteté : on ne convertit que les briques dont le sens est vérifié. Une
 * formule qui utilise une brique inconnue (cumul de buff, condition, stat non
 * identifiée…) renvoie null — l'appelant retombe alors sur Meraki et le signale.
 */

import type { AbilityKey, Formula, GameRef, StatRef } from "../data/types.ts";

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
 * Stats vérifiées sur des sorts connus (Garen W = PV bonus, Malphite = PV max,
 * Ahri = AP, Sejuani = armure / RM…). mStatFormula : 0 total, 1 base, 2 bonus.
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
    default:
      return null; // VA, crit, vitesse… : sens non vérifié
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
export function toFormula(spell: Json, calcName: string, maxRank: number): Formula | null {
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
      default:
        return null; // cumul de buff, condition, ressource, brique non nommée…
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
    if (c.__type !== "GameCalculation") return null;
    const parts = (c.mFormulaParts ?? []).map(part);
    if (!parts.every(Boolean)) return null;
    const total = sum(parts as Formula[]);
    if (!c.mMultiplier) return total;
    const m = part(c.mMultiplier);
    return m ? mul([total, m]) : null;
  };

  return calc(calcName);
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
  return ref.times === undefined ? f : mul([f, { op: "num", n: ref.times }]);
}
