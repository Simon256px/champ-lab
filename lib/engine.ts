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
 *
 * Deux modes de combo :
 *   burst  (window absent) : une rotation Q/W/E/R + rune, sans auto-attaque ;
 *   trade  (window = T s)  : chaque sort relancé selon son cooldown (ability
 *                            haste comprise), auto-attaques à la vitesse
 *                            d'attaque, crits en espérance. Pas d'animation,
 *                            de déplacement ni de reset d'auto : c'est un plafond.
 *
 * Kits et survie :
 *   dégâts en % des PV (max / manquants / actuels de la cible, PV du lanceur) ;
 *   ratios par rang ; passifs saisis à la main (champion.mechanics) ;
 *   boucliers et soins des sorts, vol de vie et omnivampirisme des objets, qui
 *   s'ajoutent aux PV effectifs du camp qui les porte dans le duel.
 */

import type {
  AbilityKey,
  AbilityRatios,
  Adaptive,
  Champion,
  DamageLine,
  DamageType,
  Formula,
  HpScale,
  IncludeMap,
  Item,
  RuneDef,
  ScaledValue,
  StatRef,
  TargetProfile,
} from "@/data/types.ts";
import { evalFormula } from "@/lib/formula.ts";

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

/** Vitesse d'attaque maximale. */
export const ATTACK_SPEED_CAP = 2.5;

/**
 * En dessous de ce cooldown (s), un « sort » est une posture ou un toggle (Q de
 * Jinx…) : on ne le compte qu'une fois au lieu de le relancer en boucle.
 */
export const MIN_REAL_COOLDOWN = 1;

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
  /** attaques par seconde, plafonnées à 2,5 */
  attackSpeed: number;
  /** chance de coup critique, 0..1 */
  critChance: number;
  /** multiplicateur d'un coup critique (1,75 de base) */
  critDamage: number;
  abilityHaste: number;
  /** VA bonus des objets seuls (fraction), pour recalculer la VA avec un buff */
  itemAttackSpeed: number;
  /** PV max et PV bonus (objets) du lanceur */
  maxHp: number;
  bonusHp: number;
  /** armure et RM du lanceur (totales et bonus des objets), pour les formules qui en dépendent */
  armor: number;
  bonusArmor: number;
  mr: number;
  bonusMr: number;
  lifeSteal: number;
  omnivamp: number;
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
  const sum = (pick: (s: (typeof stats)[number]) => number | undefined) =>
    stats.reduce((a, s) => a + (pick(s) ?? 0), 0);
  const itemAttackSpeed = sum((s) => s.attackSpeed);
  const bonusHp = sum((s) => s.hp);
  const bonusArmor = sum((s) => s.armor);
  const bonusMr = sum((s) => s.mr);

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
    attackSpeed: attackSpeedOf(champion, level, itemAttackSpeed),
    critChance: Math.min(1, sum((s) => s.critChance)),
    critDamage: champion.base.critDamage ?? 1.75,
    abilityHaste: sum((s) => s.abilityHaste),
    itemAttackSpeed,
    maxHp: growth(champion.base.hp, champion.base.hpPerLevel, level) + bonusHp,
    bonusHp,
    armor: growth(champion.base.armor, champion.base.armorPerLevel, level) + bonusArmor,
    bonusArmor,
    mr: growth(champion.base.mr, champion.base.mrPerLevel, level) + bonusMr,
    bonusMr,
    lifeSteal: sum((s) => s.lifeSteal),
    omnivamp: sum((s) => s.omnivamp),
  };
}

/**
 * Vitesse d'attaque : base + ratio × (VA bonus des objets + croissance par
 * niveau). Les champions saisis sans VA prennent le profil standard 0,625.
 */
export function attackSpeedOf(champion: Champion, level: number, bonusFromItems: number): number {
  const b = champion.base;
  const base = b.attackSpeed ?? 0.625;
  const ratio = b.attackSpeedRatio ?? base;
  const bonus = bonusFromItems + growth(0, b.attackSpeedPerLevel ?? 0.02, level);
  return Math.min(ATTACK_SPEED_CAP, base + ratio * bonus);
}

/** Cooldown effectif d'un sort au rang donné, ability haste comprise (s). Undefined = inconnu. */
export function cooldownOf(
  champion: Champion,
  key: AbilityKey,
  rank: number,
  haste: number,
): number | undefined {
  const cds = champion.abilities[key].cooldown;
  if (!cds?.length || rank < 1) return undefined;
  const cd = cds[Math.min(rank, cds.length) - 1];
  return (cd * 100) / (100 + haste);
}

/** Lancers d'un sort sur une fenêtre de `window` s, premier lancer à t = 0. */
export function castsIn(window: number, cooldown: number | undefined): number {
  if (cooldown === undefined || cooldown < MIN_REAL_COOLDOWN) return 1;
  return 1 + Math.floor(window / cooldown + 1e-9);
}

/** Auto-attaques sur une fenêtre de `window` s, première à t = 0. */
export function autosIn(window: number, attackSpeed: number): number {
  return 1 + Math.floor(window * attackSpeed + 1e-9);
}

/**
 * Autos sur la fenêtre en tenant compte d'une VA qui s'empile à chaque coup
 * (Jax) : on avance coup par coup, chaque intervalle dépendant des stacks acquis.
 */
export function autoCount(window: number, champion: Champion, level: number, s: DerivedStats): number {
  const stacking = champion.mechanics?.find((m) => m.kind === "stackingAttackSpeed");
  if (!stacking || stacking.kind !== "stackingAttackSpeed") return autosIn(window, s.attackSpeed);
  const perStack = formulaAt(stacking.perStack, 1, level, s);
  const maxStacks = formulaAt(stacking.maxStacks, 1, level, s);
  let t = 0;
  let n = 1; // premier coup à t = 0
  while (true) {
    const stacks = Math.min(n, maxStacks);
    t += 1 / attackSpeedOf(champion, level, s.itemAttackSpeed + perStack * stacks);
    if (t > window + 1e-9) return n;
    n++;
  }
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

/** Stats du lanceur sous la forme attendue par les formules de jeu. */
export function formulaStats(s: DerivedStats): Record<StatRef, number> {
  return {
    ap: s.ap,
    ad: s.totalAD,
    baseAd: s.baseAD,
    bonusAd: s.bonusAD,
    maxHp: s.maxHp,
    baseHp: s.maxHp - s.bonusHp,
    bonusHp: s.bonusHp,
    armor: s.armor,
    bonusArmor: s.bonusArmor,
    mr: s.mr,
    bonusMr: s.bonusMr,
  };
}

/** Évalue une formule de jeu pour ce lanceur, à ce rang et ce niveau. */
export function formulaAt(f: Formula, rank: number, level: number, s: DerivedStats): number {
  return evalFormula(f, { rank, level, stats: formulaStats(s) });
}

/** Une fraction de PV de la cible (Vayne W, points vitaux) convertie en PV. */
export function hpScaled(value: number, scale: HpScale | undefined, target?: TargetProfile): number {
  if (!scale) return value;
  if (!target) return 0;
  const hp = scale === "targetMaxHp"
    ? target.hpMax
    : scale === "targetCurrentHp"
    ? target.hpCur
    : Math.max(0, target.hpMax - target.hpCur);
  return value * hp;
}

/** Ratios effectifs au rang donné : la série par rang l'emporte sur la valeur fixe. */
export function ratiosAt(v: ScaledValue, rank: number): AbilityRatios {
  if (!v.rankRatios) return v.ratios;
  const out: AbilityRatios = { ...v.ratios };
  for (const [k, series] of Object.entries(v.rankRatios) as [keyof AbilityRatios, number[]][]) {
    out[k] = series[Math.min(rank, series.length) - 1];
  }
  return out;
}

/** Contribution des ratios aux stats du lanceur et aux PV de la cible. */
export function ratioSum(r: AbilityRatios, s: DerivedStats, target?: TargetProfile): number {
  const t = target ?? { hpMax: 0, hpCur: 0 };
  return (r.ap ?? 0) * s.ap +
    (r.totalAd ?? 0) * s.totalAD +
    (r.bonusAd ?? 0) * s.bonusAD +
    (r.bonusHp ?? 0) * s.bonusHp +
    (r.maxHp ?? 0) * s.maxHp +
    (r.targetMaxHp ?? 0) * t.hpMax +
    (r.targetCurrentHp ?? 0) * t.hpCur +
    (r.targetMissingHp ?? 0) * Math.max(0, t.hpMax - t.hpCur);
}

/** Valeur d'un effet chiffré (dégâts, bouclier, soin) au rang donné. */
export function scaledAt(v: ScaledValue, rank: number, s: DerivedStats, target?: TargetProfile): number {
  if (rank < 1) return 0;
  return (v.base[Math.min(rank, v.base.length) - 1] ?? 0) + ratioSum(ratiosAt(v, rank), s, target);
}

/**
 * Dégâts bruts d'un sort (avant résistances). Sans cible, les ratios en % des
 * PV de la cible comptent pour 0 (affichage hors duel).
 */
export function abilityRaw(
  champion: Champion,
  key: AbilityKey,
  level: number,
  s: DerivedStats,
  ranks?: Partial<Record<AbilityKey, number>>,
  target?: TargetProfile,
): number {
  const ability = champion.abilities[key];
  if (ability.type === "util") return 0;
  const rank = resolveRank(champion, key, level, ranks);
  if (rank < 1) return 0; // sort pas encore appris
  // Formule des fichiers du jeu si on l'a (à jour au patch), sinon base + ratios Meraki.
  if (ability.formula) {
    return hpScaled(formulaAt(ability.formula, rank, level, s), ability.formulaScale, target);
  }
  return scaledAt(ability, rank, s, target);
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
  /**
   * Fenêtre de trade en secondes. Absent = burst (une rotation, sans auto). Présent :
   * sorts relancés selon leur cooldown + auto-attaques.
   */
  window?: number;
}

export interface ComboResult {
  stats: DerivedStats;
  lines: DamageLine[];
  /** dégâts effectifs totaux du combo (mitigés) */
  total: number;
  /** dégâts vrais de l'ultime de Darius — seuil d'exécution (0 sinon) */
  execHP: number;
  /** boucliers que le lanceur se pose sur la fenêtre */
  shield: number;
  /** soins du lanceur sur la fenêtre (sorts, passifs, vol de vie, omnivampirisme) */
  heal: number;
  /**
   * Soins en % des PV manquants (Darius Q), exprimés en fraction des dégâts reçus :
   * le duel les multiplie par ce que le lanceur a encaissé.
   */
  missingHpHealRatio: number;
}

/** Calcule le combo complet : lignes de dégâts, total, seuil d'exécution. */
export function computeCombo(input: ComboInput): ComboResult {
  const { champion, level, itemIds, items, runes, runeOn, target, bleedStacks, include, ranks, window } =
    input;
  const keystoneId = input.keystoneId ?? champion.keystone;
  const stats = computeStats(champion, level, itemIds, items, runes, runeOn, keystoneId);
  const lines: DamageLine[] = [];

  const mechanics = champion.mechanics ?? [];
  // Sorts qui se déclenchent sur les autos (Vayne W) : pas lancés, comptés plus bas.
  const onHitKeys = new Set(mechanics.flatMap((m) => (m.kind === "abilityOnHit" ? [m.key] : [])));
  const autos = window === undefined ? 0 : autoCount(window, champion, level, stats);

  const keys: AbilityKey[] = ["Q", "W", "E", "R"];
  for (const key of keys) {
    const ability = champion.abilities[key];
    if (ability.type === "util") continue;
    if (!include[key]) continue;
    if (onHitKeys.has(key)) continue;
    const raw = abilityRaw(champion, key, level, stats, ranks, target);
    if (raw <= 0) continue; // sort pas appris (rang 0) → pas de ligne
    let dmg = raw * damageMultiplier(ability.type, stats, target);
    // L'ultime de Darius gagne +20 % de dégâts par stack d'hémorragie (max +100 %).
    if (key === "R" && champion.hasBleed) dmg *= 1 + BLEED_ULT_AMP_PER_STACK * bleedStacks;
    const casts = window === undefined ? 1 : castsIn(
      window,
      cooldownOf(champion, key, resolveRank(champion, key, level, ranks), stats.abilityHaste),
    );
    const name = casts > 1 ? `${ability.name} ×${casts}` : ability.name;
    lines.push({ key, name, type: ability.type, damage: dmg * casts });
  }

  // Auto-attaques (mode trade) : AD total, crits en espérance.
  if (window !== undefined) {
    const perHit = stats.totalAD * (1 + stats.critChance * (stats.critDamage - 1));
    lines.push({
      key: "AA",
      name: `Auto-attaques ×${autos}`,
      type: "physical",
      damage: autos * perHit * damageMultiplier("physical", stats, target),
    });
  }

  // Passifs saisis à la main (data/mechanics.ts).
  let mechanicHeal = 0;
  for (const m of mechanics) {
    if (m.kind === "abilityOnHit") {
      const ability = champion.abilities[m.key];
      const procs = Math.floor(autos / m.every);
      if (ability.type === "util" || !include[m.key] || procs < 1) continue;
      const raw = abilityRaw(champion, m.key, level, stats, ranks, target);
      if (raw <= 0) continue;
      lines.push({
        key: m.key,
        name: `${ability.name} ×${procs}`,
        type: ability.type,
        damage: procs * raw * damageMultiplier(ability.type, stats, target),
      });
    } else if (m.kind === "onHit") {
      const procs = Math.floor(autos / (m.every ?? 1));
      if (procs < 1 || m.type === "util") continue;
      const raw = hpScaled(formulaAt(m.damage, 1, level, stats), m.scale, target);
      lines.push({
        key: "P",
        name: `${m.name} ×${procs}`,
        type: m.type,
        damage: procs * raw * damageMultiplier(m.type, stats, target),
      });
    } else if (m.kind === "periodic") {
      // Burst : un déclenchement. Trade : un toutes les `interval` s depuis t = 0.
      const procs = window === undefined ? 1 : 1 + Math.floor(window / m.interval + 1e-9);
      if (m.type === "util") continue;
      const raw = hpScaled(formulaAt(m.damage, 1, level, stats), m.scale, target);
      lines.push({
        key: "P",
        name: procs > 1 ? `${m.name} ×${procs}` : m.name,
        type: m.type,
        damage: procs * raw * damageMultiplier(m.type, stats, target),
      });
      if (m.heal) mechanicHeal += procs * formulaAt(m.heal, 1, level, stats);
    }
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

  // Survie : boucliers et soins des sorts (relancés selon leur cooldown en trade),
  // soins des passifs, vol de vie sur les autos, omnivampirisme sur tout.
  let shield = 0;
  let heal = mechanicHeal;
  for (const key of keys) {
    const ability = champion.abilities[key];
    if (!ability.shield && !ability.heal) continue;
    if (include[key] === false) continue;
    const rank = resolveRank(champion, key, level, ranks);
    if (rank < 1) continue;
    const casts = window === undefined
      ? 1
      : castsIn(window, cooldownOf(champion, key, rank, stats.abilityHaste));
    if (ability.shield) shield += casts * scaledAt(ability.shield, rank, stats);
    if (ability.heal) heal += casts * scaledAt(ability.heal, rank, stats);
  }
  const autoDamage = lines.find((l) => l.key === "AA")?.damage ?? 0;
  heal += stats.lifeSteal * autoDamage + stats.omnivamp * total;

  // Soins en % des PV manquants : à chaque lancer (t = 0, cd, 2·cd…), on suppose que
  // les dégâts reçus arrivent régulièrement sur la fenêtre — les PV manquants à
  // l'instant t valent donc (t / fenêtre) × dégâts reçus. Burst : lancé à t = 0, rien à soigner.
  let missingHpHealRatio = 0;
  if (window !== undefined && window > 0) {
    for (const m of mechanics) {
      if (m.kind !== "missingHpHeal" || include[m.key] === false) continue;
      const rank = resolveRank(champion, m.key, level, ranks);
      if (rank < 1) continue;
      const pct = formulaAt(m.pct, rank, level, stats);
      const cd = cooldownOf(champion, m.key, rank, stats.abilityHaste);
      const casts = castsIn(window, cd);
      for (let i = 0; i < casts; i++) missingHpHealRatio += (pct * i * (cd ?? 0)) / window;
    }
  }

  return { stats, lines, total, execHP, shield, heal, missingHpHealRatio };
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

export interface DuelOptions {
  /** fenêtre de trade (s). Absent = burst. Ignoré si allIn. */
  window?: number;
  /**
   * All-in jusqu'à la mort : le duel s'arrête au premier kill (ou à TTK_LIMIT).
   * killPct est alors mesuré à cet instant et plafonné à 1.
   */
  allIn?: boolean;
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
  /** mode trade / all-in : secondes pour que A tue B (Infinity = pas avant TTK_LIMIT) */
  ttkA?: number;
  /** mode trade / all-in : secondes pour que B tue A */
  ttkB?: number;
  /** fenêtre réellement simulée (s) : la fenêtre demandée, ou l'instant du premier kill en all-in */
  window?: number;
  /** PV que chaque camp se rend sur la fenêtre (boucliers + soins plafonnés aux dégâts reçus) */
  sustainA: number;
  sustainB: number;
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
  opts: DuelOptions = {},
): DuelResult {
  const targetA = targetFromChampion(a.champion, a.level, a.itemIds, items);
  const targetB = targetFromChampion(b.champion, b.level, b.itemIds, items);
  const inputOf = (atk: DuelSide, target: TargetProfile): ComboInput => ({
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
  const inA = inputOf(a, targetB);
  const inB = inputOf(b, targetA);
  const at = (w: number | undefined) => {
    const ab = computeCombo({ ...inA, window: w });
    const ba = computeCombo({ ...inB, window: w });
    return {
      ab,
      ba,
      // Chaque camp profite de SES boucliers/soins (son propre combo), face aux dégâts de l'autre.
      ehpA: effectiveHp(targetA.hpMax, ab, ba.total),
      ehpB: effectiveHp(targetB.hpMax, ba, ab.total),
    };
  };
  const timed = opts.allIn || opts.window !== undefined;
  // A tue B quand ses dégâts dépassent les PV de B + ce que B se rend (bouclier, soins).
  const ttkA = timed ? timeToKill((w) => at(w).ab.total, (w) => at(w).ehpB) : undefined;
  const ttkB = timed ? timeToKill((w) => at(w).ba.total, (w) => at(w).ehpA) : undefined;
  // All-in : on s'arrête au premier mort — c'est lui qui décide du duel.
  const window = opts.allIn ? Math.min(ttkA!, ttkB!, TTK_LIMIT) : opts.window;
  const { ab: aToB, ba: bToA, ehpA, ehpB } = at(window);
  const cap = (n: number) => (opts.allIn ? Math.min(1, n) : n);
  const killPctA = cap(aToB.total / ehpB);
  const killPctB = cap(bToA.total / ehpA);
  const result: DuelResult = {
    aToB,
    bToA,
    targetA,
    targetB,
    killPctA,
    killPctB,
    edge: killPctA - killPctB,
    sustainA: ehpA - targetA.hpMax,
    sustainB: ehpB - targetB.hpMax,
  };
  if (timed) Object.assign(result, { ttkA, ttkB, window });
  return result;
}

/**
 * PV effectifs d'un camp sur la fenêtre : PV max + boucliers + soins. Un soin ne
 * rend que ce qui a été perdu : il est plafonné aux dégâts reçus.
 */
export function effectiveHp(
  hpMax: number,
  own: Pick<ComboResult, "shield" | "heal" | "missingHpHealRatio">,
  damageTaken: number,
): number {
  const heal = own.heal + own.missingHpHealRatio * damageTaken;
  return hpMax + own.shield + Math.min(heal, damageTaken);
}

/** Limite de recherche du temps pour tuer (s). Au-delà, le duel est considéré sans kill. */
export const TTK_LIMIT = 20;

/** Pas du balayage de timeToKill (s), avant affinage par dichotomie. */
const TTK_SCAN_STEP = 0.25;

/**
 * Plus petite fenêtre (s) dont les dégâts atteignent les PV (`hp`, fixes ou
 * fonction de la fenêtre quand l'adversaire se soigne ou se protège). Balayage
 * par pas de 0,25 s puis dichotomie au centième sur l'intervalle du premier kill.
 * 0 = le burst initial suffit ; Infinity = pas de kill avant `limit`.
 */
export function timeToKill(
  damageAt: (window: number) => number,
  hp: number | ((window: number) => number),
  limit = TTK_LIMIT,
): number {
  const hpAt = typeof hp === "number" ? () => hp : hp;
  const kills = (w: number) => damageAt(w) >= hpAt(w);
  if (kills(0)) return 0;
  let lo = 0;
  let hi = -1;
  for (let w = TTK_SCAN_STEP; w <= limit + 1e-9; w += TTK_SCAN_STEP) {
    if (kills(w)) {
      hi = w;
      break;
    }
    lo = w;
  }
  if (hi < 0) return Infinity;
  while (hi - lo > 0.01) {
    const mid = (lo + hi) / 2;
    if (kills(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}
