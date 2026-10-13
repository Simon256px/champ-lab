/**
 * Moteur de théorycraft — pur, typé, sans dépendance framework.
 *
 * Tout le calcul de dégâts vit ici. Aucune donnée en dur : on reçoit un
 * champion + un contexte, on renvoie des chiffres. Testé dans engine_test.ts.
 *
 * Modèle (simplifié mais cohérent) :
 *   stat(N)   = base + croissance * (N-1) * (0.7025 + 0.0175*(N-1))
 *   dégâts    = base[rang] + Σ(ratio * stat correspondante)
 *   effectif  = dégâts * 100 / (100 + résistance après pénétration)
 *   vrai      = ignore les résistances
 */

import type {
  AbilityKey,
  Adaptive,
  Champion,
  DamageLine,
  DamageType,
  IncludeMap,
  Item,
  RuneDef,
  TargetProfile,
} from "@/data/types.ts";

/** Amplification de l'ultime par stack d'hémorragie : +20 %/stack, +100 % max à 5. */
export const BLEED_ULT_AMP_PER_STACK = 0.2;

/**
 * Rune Conquérant à pleins stacks (12) : force adaptative interpolée par niveau.
 * 12,96–30,66 AD bonus ou 21,6–51,11 AP selon le profil adaptatif du champion.
 * (Le soin à pleins stacks n'est pas modélisé.)
 */
export function conquerorBonus(adaptive: Adaptive, level: number): { ad: number; ap: number } {
  const t = (level - 1) / 17;
  return adaptive === "AD"
    ? { ad: 12.96 + (30.66 - 12.96) * t, ap: 0 }
    : { ad: 0, ap: 21.6 + (51.11 - 21.6) * t };
}

/** Croissance d'une stat par niveau (formule officielle de League). */
export function growth(base: number, perLevel: number, level: number): number {
  return base + perLevel * (level - 1) * (0.7025 + 0.0175 * (level - 1));
}

/** Empilement multiplicatif de plusieurs sources de pénétration en %. */
export function stackPercent(values: Array<number | undefined>): number {
  return 1 - values.reduce<number>((acc, p) => acc * (1 - (p ?? 0)), 1);
}

/** Rang effectif d'un sort au niveau donné, déduit de l'ordre de compétences. */
export function rankOf(champion: Champion, key: AbilityKey, level: number): number {
  let points = 0;
  for (let i = 0; i < level && i < champion.skillOrder.length; i++) {
    if (champion.skillOrder[i] === key) points++;
  }
  return Math.min(points, champion.abilities[key].maxRank);
}

/** Stats dérivées à partir du champion, du niveau, du build et de la rune. */
export interface DerivedStats {
  baseAD: number;
  bonusAD: number;
  totalAD: number;
  ap: number;
  magicPenFlat: number;
  magicPenPct: number;
  lethality: number;
  armorPenPct: number;
}

export function computeStats(
  champion: Champion,
  level: number,
  itemIds: string[],
  items: Record<string, Item>,
  runes: Record<string, RuneDef>,
  runeOn: boolean,
  keystoneId: string = champion.keystone,
): DerivedStats {
  const stats = itemIds.map((id) => items[id].stats);
  const baseAD = growth(champion.base.ad, champion.base.adPerLevel, level);

  let bonusAD = stats.reduce((a, s) => a + (s.ad ?? 0), 0);
  let flatAP = stats.reduce((a, s) => a + (s.ap ?? 0), 0);
  const apAmp = stats.reduce((a, s) => a + (s.apAmp ?? 0), 0);

  // Rune Conquérant : force adaptative à pleins stacks — AD bonus ou AP selon
  // le profil du champion. L'AP gagnée profite à l'amplification (Rabadon).
  const keystone = runes[keystoneId];
  if (runeOn && keystone?.kind === "conqueror") {
    const conq = conquerorBonus(champion.adaptive, level);
    bonusAD += conq.ad;
    flatAP += conq.ap;
  }

  return {
    baseAD,
    bonusAD,
    totalAD: baseAD + bonusAD,
    ap: flatAP * (1 + apAmp),
    magicPenFlat: stats.reduce((a, s) => a + (s.magicPenFlat ?? 0), 0),
    magicPenPct: stackPercent(stats.map((s) => s.magicPenPercent)),
    lethality: stats.reduce((a, s) => a + (s.lethality ?? 0), 0),
    armorPenPct: stackPercent(stats.map((s) => s.armorPenPercent)),
  };
}

/** Multiplicateur de dégâts effectifs selon le type et les résistances de la cible. */
export function damageMultiplier(type: DamageType, s: DerivedStats, t: TargetProfile): number {
  if (type === "true") return 1;
  if (type === "magic") {
    const mr = Math.max(0, t.mr * (1 - s.magicPenPct) - s.magicPenFlat);
    return 100 / (100 + mr);
  }
  // physical
  const armor = Math.max(0, t.armor * (1 - s.armorPenPct) - s.lethality);
  return 100 / (100 + armor);
}

/**
 * Rang effectif d'un sort : rang explicite choisi par l'utilisateur s'il est
 * fourni, sinon rang déduit de l'ordre de compétences au niveau donné.
 */
export function resolveRank(
  champion: Champion,
  key: AbilityKey,
  level: number,
  ranks?: Partial<Record<AbilityKey, number>>,
): number {
  const explicit = ranks?.[key];
  if (explicit !== undefined) {
    return Math.max(0, Math.min(explicit, champion.abilities[key].maxRank));
  }
  return rankOf(champion, key, level);
}

/** Dégâts bruts d'un sort (avant résistances). */
export function abilityRaw(
  champion: Champion,
  key: AbilityKey,
  level: number,
  s: DerivedStats,
  ranks?: Partial<Record<AbilityKey, number>>,
): number {
  const ability = champion.abilities[key];
  if (ability.type === "util") return 0;
  const rank = resolveRank(champion, key, level, ranks);
  if (rank < 1) return 0; // sort pas encore appris
  const r = ability.ratios;
  return (ability.base[rank - 1] ?? 0) +
    (r.ap ?? 0) * s.ap +
    (r.totalAd ?? 0) * s.totalAD +
    (r.bonusAd ?? 0) * s.bonusAD;
}

export interface ComboInput {
  champion: Champion;
  level: number;
  itemIds: string[];
  items: Record<string, Item>;
  runes: Record<string, RuneDef>;
  runeOn: boolean;
  target: TargetProfile;
  bleedStacks: number;
  include: IncludeMap;
  /** rangs choisis à la main (Q/W/E/R). Absent = déduit de skillOrder + niveau. */
  ranks?: Partial<Record<AbilityKey, number>>;
  /** rune keystone active (id de data/runes.ts). Absent = champion.keystone. */
  keystoneId?: string;
}

export interface ComboResult {
  stats: DerivedStats;
  lines: DamageLine[];
  /** dégâts effectifs totaux du combo (mitigés) */
  total: number;
  /** dégâts vrais de l'ultime de Darius — seuil d'exécution (0 sinon) */
  execHP: number;
}

/** Calcule le combo complet : lignes de dégâts, total, seuil d'exécution. */
export function computeCombo(input: ComboInput): ComboResult {
  const { champion, level, itemIds, items, runes, runeOn, target, bleedStacks, include, ranks } = input;
  const keystoneId = input.keystoneId ?? champion.keystone;
  const stats = computeStats(champion, level, itemIds, items, runes, runeOn, keystoneId);
  const lines: DamageLine[] = [];

  const keys: AbilityKey[] = ["Q", "W", "E", "R"];
  for (const key of keys) {
    const ability = champion.abilities[key];
    if (ability.type === "util") continue;
    if (!include[key]) continue;
    const raw = abilityRaw(champion, key, level, stats, ranks);
    if (raw <= 0) continue; // sort pas appris (rang 0) → pas de ligne
    let dmg = raw * damageMultiplier(ability.type, stats, target);
    // L'ultime de Darius gagne +20 % de dégâts par stack d'hémorragie (max +100 %).
    if (key === "R" && champion.hasBleed) dmg *= 1 + BLEED_ULT_AMP_PER_STACK * bleedStacks;
    lines.push({ key, name: ability.name, type: ability.type, damage: dmg });
  }

  // Saignement (Hémorragie) : 13–30 selon le niveau (+30 % AD bonus) de dégâts
  // physiques PAR stack, sur 5 s.
  if (champion.hasBleed && include.bleed && bleedStacks > 0) {
    const perStack = 12 + level + 0.3 * stats.bonusAD;
    const raw = perStack * bleedStacks;
    lines.push({
      key: "P",
      name: `Hémorragie ×${bleedStacks}`,
      type: "physical",
      damage: raw * damageMultiplier("physical", stats, target),
    });
  }

  // Rune Électrocution : burst après 3 sorts/attaques distincts. 70–260 selon
  // le niveau (+5 % AP, +10 % AD bonus) ; dégâts adaptatifs — physiques si la
  // contribution AD dépasse la contribution AP, magiques sinon.
  const keystone = runes[keystoneId];
  if (runeOn && keystone?.kind === "electro" && include.rune) {
    const fromAP = 0.05 * stats.ap;
    const fromAD = 0.1 * stats.bonusAD;
    const raw = 70 + (190 * (level - 1)) / 17 + fromAP + fromAD;
    const type: DamageType = fromAD > fromAP ? "physical" : "magic";
    lines.push({
      key: "✦",
      name: "Électrocution",
      type,
      damage: raw * damageMultiplier(type, stats, target),
    });
  }

  const total = lines.reduce((a, l) => a + l.damage, 0);
  const rLine = lines.find((l) => l.key === "R");
  const execHP = champion.hasBleed && rLine ? rLine.damage : 0;

  return { stats, lines, total, execHP };
}

/** Répartition des dégâts par type (pour la barre du readout). */
export function damageByType(lines: DamageLine[]): Record<"magic" | "physical" | "true", number> {
  const out = { magic: 0, physical: 0, true: 0 };
  for (const l of lines) {
    if (l.type === "magic" || l.type === "physical" || l.type === "true") out[l.type] += l.damage;
  }
  return out;
}

/**
 * Impact marginal d'un objet sur le combo actuel (LA fonction signature).
 * Renvoie la différence de dégâts totaux si on ajoutait cet objet au build.
 */
export function itemImpact(base: ComboInput, itemId: string): number {
  if (base.itemIds.includes(itemId)) return 0;
  return itemImpactFrom(base, computeCombo(base).total, itemId);
}

/**
 * Variante optimisée : le total "avant" est déjà connu (calculé une fois par
 * l'appelant). Évite de recalculer le combo de base pour chaque objet listé —
 * divise par ~2 le coût du mode impact sur un grand catalogue.
 */
export function itemImpactFrom(base: ComboInput, beforeTotal: number, itemId: string): number {
  if (base.itemIds.includes(itemId)) return 0;
  const after = computeCombo({ ...base, itemIds: [...base.itemIds, itemId] }).total;
  return after - beforeTotal;
}

// ---------------------------------------------------------------------------
// Cible champion & duel symétrique
// ---------------------------------------------------------------------------

/** Stats défensives d'un champion : croissance par niveau + stats plates des objets. */
export interface Defenses {
  hp: number;
  armor: number;
  mr: number;
}

export function computeDefenses(
  champion: Champion,
  level: number,
  itemIds: string[],
  items: Record<string, Item>,
): Defenses {
  const stats = itemIds.map((id) => items[id].stats);
  const b = champion.base;
  return {
    hp: growth(b.hp, b.hpPerLevel, level) + stats.reduce((a, s) => a + (s.hp ?? 0), 0),
    armor: growth(b.armor, b.armorPerLevel, level) + stats.reduce((a, s) => a + (s.armor ?? 0), 0),
    mr: growth(b.mr, b.mrPerLevel, level) + stats.reduce((a, s) => a + (s.mr ?? 0), 0),
  };
}

/** Profil de cible tiré d'un vrai champion, PV pleins. Remplace les sliders manuels. */
export function targetFromChampion(
  champion: Champion,
  level: number,
  itemIds: string[],
  items: Record<string, Item>,
): TargetProfile {
  const d = computeDefenses(champion, level, itemIds, items);
  return { armor: d.armor, mr: d.mr, hpMax: d.hp, hpCur: d.hp };
}

/** Un camp du duel : tout ce qu'il faut pour calculer son combo, sauf la cible. */
export interface DuelSide {
  champion: Champion;
  level: number;
  itemIds: string[];
  runeOn: boolean;
  keystoneId?: string;
  ranks?: Partial<Record<AbilityKey, number>>;
  /** stacks d'hémorragie supposés (Darius). Défaut : 5, comme le labo. */
  bleedStacks?: number;
  /** Défaut : tout le kit (all-in). */
  include?: IncludeMap;
}

export interface DuelResult {
  /** combo de A sur B, et de B sur A */
  aToB: ComboResult;
  bToA: ComboResult;
  targetA: TargetProfile;
  targetB: TargetProfile;
  /** part des PV max de B retirée par le combo de A (> 1 = overkill) */
  killPctA: number;
  /** part des PV max de A retirée par le combo de B */
  killPctB: number;
  /** killPctA - killPctB : > 0 = A sort gagnant de l'échange de combos */
  edge: number;
}

const ALL_IN: IncludeMap = { Q: true, W: true, E: true, R: true, bleed: true, rune: true };

/**
 * Duel symétrique : chaque camp place son combo complet sur l'autre, PV pleins.
 * Indicateur théorique de burst — ni auto-attaques, ni cooldowns, ni soins,
 * boucliers, portée ou contrôles.
 */
export function computeDuel(
  a: DuelSide,
  b: DuelSide,
  items: Record<string, Item>,
  runes: Record<string, RuneDef>,
): DuelResult {
  const targetA = targetFromChampion(a.champion, a.level, a.itemIds, items);
  const targetB = targetFromChampion(b.champion, b.level, b.itemIds, items);
  const combo = (atk: DuelSide, target: TargetProfile) =>
    computeCombo({
      champion: atk.champion,
      level: atk.level,
      itemIds: atk.itemIds,
      items,
      runes,
      runeOn: atk.runeOn,
      target,
      bleedStacks: atk.bleedStacks ?? 5,
      include: atk.include ?? ALL_IN,
      ranks: atk.ranks,
      keystoneId: atk.keystoneId,
    });
  const aToB = combo(a, targetB);
  const bToA = combo(b, targetA);
  const killPctA = aToB.total / targetB.hpMax;
  const killPctB = bToA.total / targetA.hpMax;
  return { aToB, bToA, targetA, targetB, killPctA, killPctB, edge: killPctA - killPctB };
}
