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
export function conquerorBonus(
  rune: RuneDef | undefined,
  adaptive: Adaptive,
  level: number,
  stacks?: number,
): { ad: number; ap: number } {
  const v = rune?.values ?? {};
  const perStack = lerpLevel(v.MinAdaptivePerStack ?? 0, v.MaxAdaptivePerStack ?? 0, level);
  const force = perStack * (stacks ?? v.MaxStacks ?? 0);
  // 1 point de force adaptative = 0,6 AD bonus ou 1 AP (règle du jeu).
  return adaptive === "AD" ? { ad: ADAPTIVE_AD_RATIO * force, ap: 0 } : { ad: 0, ap: force };
}

/** Une unité de force adaptative vaut 0,6 AD bonus (ou 1 AP). */
export const ADAPTIVE_AD_RATIO = 0.6;

/** Interpolation linéaire du niveau 1 au niveau 18. */
export function lerpLevel(from: number, to: number, level: number): number {
  return from + ((to - from) * (level - 1)) / 17;
}

/**
 * Type d'un dégât adaptatif : physique si l'AD bonus dépasse l'AP, magique si l'AP
 * dépasse l'AD bonus, sinon selon le profil du champion (règle du jeu).
 */
export function adaptiveType(s: { bonusAD: number; ap: number }, champion: Champion): DamageType {
  if (s.bonusAD > s.ap) return "physical";
  if (s.ap > s.bonusAD) return "magic";
  return champion.adaptive === "AD" ? "physical" : "magic";
}

/**
 * Aery ne repart qu'une fois revenue au lanceur : un aller-retour en combat
 * rapproché est estimé à 2 s (le jeu ne l'expose pas, il dépend de la distance).
 */
export const AERY_ROUND_TRIP = 2;

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
  /** multiplicateur d'un coup critique (1,75 de base, +0,3 avec IE) */
  critDamage: number;
  /** ténacité (fraction), objets cumulés multiplicativement */
  tenacity: number;
  /** soins et boucliers renforcés (fraction), objets cumulés */
  healShieldPower: number;
  abilityHaste: number;
  /** VA bonus des objets seuls (fraction), pour recalculer la VA avec un buff */
  itemAttackSpeed: number;
  /** VA bonus totale (objets + croissance par niveau), en fraction */
  bonusAttackSpeed: number;
  /** PV max et PV bonus (objets) du lanceur */
  maxHp: number;
  bonusHp: number;
  /** mana max et mana bonus (objets) */
  maxMana: number;
  bonusMana: number;
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
  /** minutes depuis l'achat de chaque objet (timeline) ; absent = objet chargé au maximum */
  itemAges?: Record<string, number>,
): DerivedStats {
  const stats = itemIds.map((id) => items[id].stats);
  const baseAD = growth(champion.base.ad, champion.base.adPerLevel, level);
  const sum = (pick: (s: (typeof stats)[number]) => number | undefined) =>
    stats.reduce((a, s) => a + (pick(s) ?? 0), 0);
  const itemAttackSpeed = sum((s) => s.attackSpeed);
  const bonusHp = sum((s) => s.hp);
  const bonusArmor = sum((s) => s.armor);
  const bonusMr = sum((s) => s.mr);

  const bonusAD = stats.reduce((a, s) => a + (s.ad ?? 0), 0);
  const flatAP = stats.reduce((a, s) => a + (s.ap ?? 0), 0);
  const apAmp = stats.reduce((a, s) => a + (s.apAmp ?? 0), 0);

  // Conquérant n'est plus appliqué ici : ses stacks dépendent des coups portés,
  // computeCombo les compte (valeurs du jeu). Paramètres gardés pour l'appelant.
  void runes;
  void runeOn;
  void keystoneId;

  const bonusMana = sum((s) => s.mana);
  const out: DerivedStats = {
    baseAD,
    bonusAD,
    totalAD: baseAD + bonusAD,
    ap: flatAP * (1 + apAmp),
    magicPenFlat: stats.reduce((a, s) => a + (s.magicPenFlat ?? 0), 0),
    magicPenPct: stackPercent(stats.map((s) => s.magicPenPercent)),
    lethality: stats.reduce((a, s) => a + (s.lethality ?? 0), 0),
    armorPenPct: stackPercent(stats.map((s) => s.armorPenPercent)),
    attackSpeed: attackSpeedOf(champion, level, itemAttackSpeed),
    bonusAttackSpeed: itemAttackSpeed + growth(0, champion.base.attackSpeedPerLevel ?? 0.02, level),
    critChance: Math.min(1, sum((s) => s.critChance)),
    critDamage: (champion.base.critDamage ?? 1.75) + sum((s) => s.critDamage),
    tenacity: stackPercent(stats.map((s) => s.tenacity)),
    healShieldPower: sum((s) => s.healShieldPower),
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
    maxMana: growth(champion.base.mana ?? 0, champion.base.manaPerLevel ?? 0, level) + bonusMana,
    bonusMana,
  };
  // Stats conditionnelles d'objets (Sterak : % de l'AD de base ; Archange, Manamune :
  // selon le mana ; Baguette des âges : stacks gagnés avec le temps porté).
  for (const id of new Set(itemIds)) {
    for (const m of items[id]?.mechanics ?? []) {
      if (m.kind !== "statBonus") continue;
      let amount = formulaAt(m.amount, 1, level, out);
      if (m.secondsPerStack && m.maxStacks) {
        const max = formulaAt(m.maxStacks, 1, level, out);
        const per = formulaAt(m.secondsPerStack, 1, level, out);
        const age = itemAges?.[id];
        const stacks = age === undefined ? max : Math.min(max, Math.floor((age * 60) / Math.max(1, per)));
        amount *= stacks;
      }
      if (m.stat === "bonusAd") {
        out.bonusAD += amount;
        out.totalAD += amount;
      } else if (m.stat === "ap") out.ap += amount * (1 + apAmp);
      else if (m.stat === "hp") {
        out.maxHp += amount;
        out.bonusHp += amount;
      } else if (m.stat === "mana") {
        out.maxMana += amount;
        out.bonusMana += amount;
      }
    }
  }
  return out;
}

/**
 * Vitesse d'attaque : base + ratio × (VA bonus des objets + croissance par
 * niveau). Les champions saisis sans VA prennent le profil standard 0,625.
 */
export function attackSpeedOf(
  champion: Champion,
  level: number,
  bonusFromItems: number,
  uncapped = false,
): number {
  const b = champion.base;
  const base = b.attackSpeed ?? 0.625;
  const ratio = b.attackSpeedRatio ?? base;
  const bonus = bonusFromItems + growth(0, b.attackSpeedPerLevel ?? 0.02, level);
  const as = base + ratio * bonus;
  return uncapped ? as : Math.min(ATTACK_SPEED_CAP, as);
}

/** Bonus de VA qui changent pendant le combat (runes). */
export interface AutoMods {
  /** VA qui s'empile à chaque auto (Tempo mortel) */
  stacking?: { perStack: number; maxStacks: number };
  /** VA renforcée sur les N premières autos de chaque cycle, plafond ignoré (Grêle de lames) */
  opening?: { bonus: number; hits: number; cooldown: number };
}

/** Détail des autos sur la fenêtre : nombre, autos renforcées, autos à stacks pleins. */
export function autoTimeline(
  window: number,
  champion: Champion,
  level: number,
  s: DerivedStats,
  mods: AutoMods = {},
): { count: number; openingHits: number; fullStackHits: number } {
  const jax = champion.mechanics?.find((m) => m.kind === "stackingAttackSpeed");
  const jaxPer = jax?.kind === "stackingAttackSpeed" ? formulaAt(jax.perStack, 1, level, s) : 0;
  const jaxMax = jax?.kind === "stackingAttackSpeed" ? formulaAt(jax.maxStacks, 1, level, s) : 0;
  const st = mods.stacking;
  const op = mods.opening;
  let t = 0;
  let n = 0;
  let openingHits = 0;
  let fullStackHits = 0;
  let cycleStart = 0;
  let openingLeft = op ? op.hits : 0;
  while (t <= window + 1e-9) {
    n++; // un coup à t
    if (op && openingLeft > 0) openingHits++;
    if (st && n > st.maxStacks) fullStackHits++;
    const stacks = Math.min(n, jaxMax);
    const ltStacks = st ? Math.min(n, st.maxStacks) : 0;
    const boosted = op !== undefined && openingLeft > 0;
    if (boosted) openingLeft--;
    const bonus = s.itemAttackSpeed + jaxPer * stacks + (st ? st.perStack * ltStacks : 0) +
      (boosted && openingLeft > 0 ? op!.bonus : 0);
    t += 1 / attackSpeedOf(champion, level, bonus, boosted && openingLeft > 0);
    if (op && t >= cycleStart + op.cooldown) {
      cycleStart += op.cooldown;
      openingLeft = op.hits;
    }
  }
  return { count: n, openingHits, fullStackHits };
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
export function autoCount(
  window: number,
  champion: Champion,
  level: number,
  s: DerivedStats,
  mods: AutoMods = {},
): number {
  const jax = champion.mechanics?.some((m) => m.kind === "stackingAttackSpeed");
  if (!jax && !mods.stacking && !mods.opening) return autosIn(window, s.attackSpeed);
  return autoTimeline(window, champion, level, s, mods).count;
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
    attackSpeed: s.attackSpeed,
    bonusAttackSpeed: s.bonusAttackSpeed,
    critChance: s.critChance,
    critDamage: s.critDamage,
    lethality: s.lethality,
    maxMana: s.maxMana,
    bonusMana: s.bonusMana,
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

/** Base d'un effet : part par rang + part par niveau du champion (si le sort en a une). */
export function baseAt(v: ScaledValue, rank: number, level: number): number {
  const byLevel = v.levelBase?.length ? v.levelBase[Math.min(Math.max(level, 1), v.levelBase.length) - 1] : 0;
  return (v.base[Math.min(rank, v.base.length) - 1] ?? 0) + byLevel;
}

/** Valeur d'un effet chiffré (dégâts, bouclier, soin) au rang et au niveau donnés. */
export function scaledAt(
  v: ScaledValue,
  rank: number,
  s: DerivedStats,
  target?: TargetProfile,
  level = 1,
): number {
  if (rank < 1) return 0;
  return baseAt(v, rank, level) + ratioSum(ratiosAt(v, rank), s, target);
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
  // Formule des fichiers du jeu si on l'a (à jour au patch), sinon base + ratios du wiki.
  if (ability.formula) {
    return hpScaled(formulaAt(ability.formula, rank, level, s), ability.formulaScale, target);
  }
  return scaledAt(ability, rank, s, target, level);
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
  /**
   * Part des sorts à viser (skillshots, zones) qui touchent, 0..1. Défaut 1 : tout
   * touche. Pondère leurs dégâts et leurs contrôles (espérance).
   */
  accuracy?: number;
  /** le familier meurt après ce délai (s) : l'adversaire l'a pris pour cible */
  petLifetime?: number;
  /** minutes depuis l'achat de chaque objet ; absent = objets chargés au maximum */
  itemAges?: Record<string, number>;
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
  /** contrôles infligés sur la fenêtre (s cumulées) et le plus long d'entre eux */
  ccDuration: number;
  ccLongest: number;
  /** part des contrôles réduite par la ténacité, et part qui l'ignore (projections, suppressions) */
  ccReducible: number;
  ccIrreducible: number;
  /** parades (Fiora W) et secondes d'esquive des autos (Jax E) sur la fenêtre */
  parries: number;
  dodgeAutosSeconds: number;
  /** résistances en plus pendant `seconds` (Répercussion) */
  resistBuff?: { armor: number; mr: number; seconds: number };
  /** PV rendus une fois (Ange gardien) */
  extraHp: number;
  /** boucliers sous un seuil de PV (Sterak, Arc-bouclier, Gueule : magique seulement) */
  lifelines: { amount: number; magicOnly: boolean }[];
  /** part des dégâts reçus différée pendant `seconds` (Danse de la mort) */
  damageDelay?: { share: number; seconds: number };
  /** dégâts renvoyés par auto reçue (Cotte épineuse) */
  thorns?: { type: DamageType; perHit: number };
  /** blessures graves infligées : par les coups, et sur les autos reçues (Cotte, Veste) */
  grievousOffense: number;
  grievousStruck: number;
}

/** Calcule le combo complet : lignes de dégâts, total, seuil d'exécution. */
export function computeCombo(input: ComboInput): ComboResult {
  const { champion, level, itemIds, items, runes, runeOn, target, bleedStacks, include, ranks, window } =
    input;
  const keystoneId = input.keystoneId ?? champion.keystone;
  const accuracy = Math.max(0, Math.min(1, input.accuracy ?? 1));
  const stats = computeStats(champion, level, itemIds, items, runes, runeOn, keystoneId, input.itemAges);
  const lines: DamageLine[] = [];

  const mechanics = champion.mechanics ?? [];
  // Sorts qui se déclenchent sur les autos (Vayne W) : pas lancés, comptés plus bas.
  const onHitKeys = new Set(mechanics.flatMap((m) => (m.kind === "abilityOnHit" ? [m.key] : [])));
  const keystone = runeOn ? runes[keystoneId] : undefined;
  const ranged = (champion.base.attackRange ?? 0) >= 300;
  const rv = keystone?.values ?? {};
  const rc = (name: string) =>
    (ranged ? keystone?.rangedCalcs?.[name] : undefined) ?? keystone?.calcs?.[name] ?? null;
  const runeOnFight = keystone !== undefined && include.rune !== false;
  const autoMods: AutoMods = {};
  if (runeOnFight && keystone.kind === "lethaltempo") {
    autoMods.stacking = {
      perStack: ranged ? rv.TTASPerStackRanged ?? 0 : rv.TTASPerStackMelee ?? 0,
      maxStacks: rv.MaxStacks ?? 0,
    };
  }
  if (runeOnFight && keystone.kind === "hailofblades") {
    autoMods.opening = {
      bonus: ranged ? rv.ASBoostRanged ?? 0 : rv.ASBoost ?? 0,
      hits: rv.NumHits ?? 0,
      cooldown: rv.Cooldown ?? 10,
    };
  }
  const autoInfo = window === undefined
    ? { count: 0, openingHits: 0, fullStackHits: 0 }
    : autoTimeline(window, champion, level, stats, autoMods);
  const autos = autoInfo.count;

  const keys: AbilityKey[] = ["Q", "W", "E", "R"];
  /** Lancers d'un sort sur la fenêtre (1 en burst), 0 s'il n'est pas appris ou exclu. */
  const castsOf = (key: AbilityKey) => {
    const rank = resolveRank(champion, key, level, ranks);
    if (rank < 1 || include[key] === false) return { rank, casts: 0 };
    const casts = window === undefined
      ? 1
      : castsIn(window, cooldownOf(champion, key, rank, stats.abilityHaste));
    return { rank, casts };
  };
  const totalCasts = keys.reduce((a, k) => a + castsOf(k).casts, 0);
  const damagingCastsPlanned = keys
    .filter((k) => champion.abilities[k].type !== "util" && !onHitKeys.has(k))
    .reduce((a, k) => a + castsOf(k).casts, 0);

  // Conquérant : chaque sort ou auto qui touche donne 2 stacks (1 par auto à distance).
  // On applique la force adaptative MOYENNE sur les coups de la fenêtre (valeurs du jeu).
  let conquerorFullShare = 0;
  if (runeOnFight && keystone.kind === "conqueror") {
    const instances = damagingCastsPlanned + autos;
    const max = rv.MaxStacks ?? 0;
    const gain = instances > 0 ? (2 * damagingCastsPlanned + (ranged ? 1 : 2) * autos) / instances : 0;
    let sumStacks = 0;
    let atFull = 0;
    for (let i = 0; i < instances; i++) {
      const stacksNow = Math.min(max, gain * i);
      sumStacks += stacksNow;
      if (stacksNow >= max) atFull++;
    }
    const avg = instances > 0 ? sumStacks / instances : 0;
    conquerorFullShare = instances > 0 ? atFull / instances : 0;
    const bonus = conquerorBonus(
      keystone,
      adaptiveType(stats, champion) === "physical" ? "AD" : "AP",
      level,
      avg,
    );
    stats.bonusAD += bonus.ad;
    stats.totalAD += bonus.ad;
    stats.ap += bonus.ap;
  }

  // Effets d'objets équipés (une fois par objet, même en double).
  const itemMechanics = [...new Set(itemIds)].flatMap((id) =>
    (items[id]?.mechanics ?? []).map((m) => ({ name: items[id].name, m }))
  );

  // Réduction d'armure qui s'empile (Fendoir noir) : chaque coup physique ajoute un
  // stack ; on applique la réduction MOYENNE sur les coups de la fenêtre.
  for (const { m } of itemMechanics) {
    if (m.kind !== "armorShred") continue;
    const physicalHits = autos +
      keys.filter((k) => champion.abilities[k].type === "physical").reduce((a, k) => a + castsOf(k).casts, 0);
    if (physicalHits < 1) continue;
    const perStack = formulaAt(m.perStack, 1, level, stats);
    const max = formulaAt(m.maxStacks, 1, level, stats);
    let stacks = 0;
    for (let i = 0; i < physicalHits; i++) stacks += Math.min(i, max); // le stack tombe après le coup
    stats.armorPenPct = stackPercent([stats.armorPenPct, (perStack * stacks) / physicalHits]);
  }
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
    if (ability.aimed) dmg *= accuracy;
    const casts = window === undefined ? 1 : castsIn(
      window,
      cooldownOf(champion, key, resolveRank(champion, key, level, ranks), stats.abilityHaste),
    );
    const name = casts > 1 ? `${ability.name} ×${casts}` : ability.name;
    lines.push({ key, name, type: ability.type, damage: dmg * casts, hits: casts });
  }

  // Auto-attaques (mode trade) : AD total, crits en espérance.
  if (window !== undefined) {
    const perHit = stats.totalAD *
      (1 + stats.critChance * (stats.critDamage - 1) * (1 - (target.critReduction ?? 0)));
    lines.push({
      key: "AA",
      name: `Auto-attaques ×${autos}`,
      type: "physical",
      damage: autos * perHit * damageMultiplier("physical", stats, target),
      hits: autos,
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
        hits: procs,
      });
    } else if (m.kind === "onHit") {
      const every = m.every ? formulaAt(m.every, 1, level, stats) : 1;
      const procs = Math.floor(autos / Math.max(1, every));
      if (procs < 1 || m.type === "util") continue;
      const raw = hpScaled(formulaAt(m.damage, 1, level, stats), m.scale, target);
      lines.push({
        key: "P",
        name: `${m.name} ×${procs}`,
        type: m.type,
        damage: procs * raw * damageMultiplier(m.type, stats, target),
      });
    } else if (m.kind === "afterAbility") {
      // `hits` autos chargées par sort lancé (et touché), dans la limite des autos portées.
      const casts = lines.filter((l) => ["Q", "W", "E", "R"].includes(l.key)).reduce(
        (a, l) => a + (l.hits ?? 1),
        0,
      );
      const procs = Math.min(casts * (m.hits ?? 1), autos);
      if (procs < 1 || m.type === "util") continue;
      const raw = hpScaled(formulaAt(m.damage, 1, level, stats), m.scale, target);
      lines.push({
        key: "P",
        name: `${m.name} ×${procs}`,
        type: m.type,
        damage: procs * raw * damageMultiplier(m.type, stats, target),
        hits: procs,
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

  // Familier (Daisy) : invoqué au lancer de son sort, il attaque de son côté pendant la
  // fenêtre (ou sa durée de vie si plus courte). En burst, pas d'attaque : rien.
  let petCc = 0;
  let petCcLongest = 0;
  for (const m of mechanics) {
    if (m.kind !== "pet" || window === undefined) continue;
    const { rank, casts } = castsOf(m.key);
    if (casts < 1) continue;
    const alive = Math.min(window, formulaAt(m.duration, rank, level, stats), input.petLifetime ?? Infinity);
    const attackSpeed = Math.min(
      ATTACK_SPEED_CAP,
      formulaAt(m.baseAttackSpeed, rank, level, stats) *
        (1 + formulaAt(m.bonusAttackSpeed, rank, level, stats)),
    );
    const attacks = autosIn(alive, attackSpeed);
    // Le familier n'a ni pénétration ni létalité : résistances pleines de la cible.
    const petStats = { ...stats, armorPenPct: 0, lethality: 0, magicPenFlat: 0, magicPenPct: 0 };
    const ad = formulaAt(m.ad, rank, level, stats);
    lines.push({
      key: m.key,
      name: `${m.name} — attaques ×${attacks}`,
      type: m.type,
      damage: attacks * ad * damageMultiplier(m.type, petStats, target),
      hits: attacks,
    });
    if (m.slamEvery && m.slamDamage && m.slamCooldown) {
      const cd = formulaAt(m.slamCooldown, rank, level, stats);
      const procs = Math.min(
        Math.floor(attacks / m.slamEvery),
        1 + Math.floor(Math.max(0, alive) / Math.max(0.1, cd) + 1e-9),
      );
      if (procs >= 1) {
        const type = m.slamType ?? m.type;
        lines.push({
          key: m.key,
          name: `${m.name} — onde de choc ×${procs}`,
          type,
          damage: procs * formulaAt(m.slamDamage, rank, level, stats) *
            damageMultiplier(type, petStats, target),
          hits: procs,
        });
        if (m.slamCc) {
          const d = formulaAt(m.slamCc, rank, level, stats);
          petCc += procs * d;
          petCcLongest = Math.max(petCcLongest, d);
        }
      }
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

  // Effets d'objets (data/item-mechanics.ts, valeurs du jeu).
  const damagingCasts = lines.filter((l) => ["Q", "W", "E", "R"].includes(l.key))
    .reduce((a, l) => a + (l.hits ?? 1), 0);
  for (const { name, m } of itemMechanics) {
    let procs = 0;
    let raw = 0;
    if (m.kind === "onHit") {
      const every = m.every ? formulaAt(m.every, 1, level, stats) : 1;
      procs = Math.floor(autos / Math.max(1, every));
      const f = ranged && m.rangedDamage ? m.rangedDamage : m.damage;
      raw = hpScaled(formulaAt(f, 1, level, stats), m.scale, target);
    } else if (m.kind === "spellProc") {
      // Une fois par lancer de sort, au plus une fois par cooldown, et seulement s'il
      // y a une auto pour la porter (Lame enchantée).
      const cd = formulaAt(m.cooldown, 1, level, stats);
      const cap = window === undefined ? 1 : 1 + Math.floor(window / Math.max(0.1, cd) + 1e-9);
      procs = Math.min(totalCasts, cap, m.needsAuto ? autos : Infinity);
      raw = formulaAt(m.damage, 1, level, stats);
    } else if (m.kind === "active") {
      procs = window === undefined ? 1 : castsIn(window, formulaAt(m.cooldown, 1, level, stats));
      raw = formulaAt(m.damage, 1, level, stats);
    } else if (m.kind === "burn") {
      // Entretenue par les sorts qui touchent : sa durée par sort, dans la limite de la fenêtre.
      const duration = formulaAt(m.duration, 1, level, stats);
      if (damagingCasts < 1) continue;
      const seconds = window === undefined ? duration : Math.min(window, duration * damagingCasts);
      procs = 1;
      raw = seconds * hpScaled(formulaAt(m.perSecond, 1, level, stats), m.scale, target);
    } else continue;
    if (procs < 1 || raw <= 0) continue;
    lines.push({
      key: "I",
      name: procs > 1 ? `${name} ×${procs}` : name,
      type: m.type,
      damage: procs * raw * damageMultiplier(m.type, stats, target),
      hits: procs,
    });
  }

  // Effets défensifs et utilitaires des objets (valeurs du jeu).
  let extraHp = 0;
  let itemHeal = 0;
  let stasis = 0;
  let damageDelay: ComboResult["damageDelay"];
  let thorns: ComboResult["thorns"];
  let grievousOffense = 0;
  let grievousStruck = 0;
  let healReceived = 0;
  let shieldReceived = 0;
  const lifelines: ComboResult["lifelines"] = [];
  for (const { name, m } of itemMechanics) {
    const at = (f: Formula) => formulaAt(f, 1, level, stats);
    if (m.kind === "stasis") stasis = Math.max(stasis, 1);
    else if (m.kind === "revive") extraHp = Math.max(extraHp, at(m.hpShare) * (stats.maxHp - stats.bonusHp));
    else if (m.kind === "lifeline") {
      lifelines.push({
        amount: at(ranged && m.rangedShield ? m.rangedShield : m.shield),
        magicOnly: !!m.magicOnly,
      });
    } else if (m.kind === "activeHeal") {
      itemHeal += at(m.heal) * (1 + stats.healShieldPower);
      if (m.damage && m.type) {
        const raw = hpScaled(at(m.damage), m.scale, target);
        lines.push({
          key: "I",
          name,
          type: m.type,
          damage: raw * damageMultiplier(m.type, stats, target),
          hits: 1,
        });
      }
    } else if (m.kind === "damageDelay") {
      damageDelay = { share: at(ranged && m.rangedShare ? m.rangedShare : m.share), seconds: at(m.seconds) };
    } else if (m.kind === "thorns") thorns = { type: m.type, perHit: at(m.damage) };
    else if (m.kind === "grievous") {
      if (m.whenStruck) grievousStruck = Math.max(grievousStruck, at(m.amount));
      else grievousOffense = Math.max(grievousOffense, at(m.amount));
    } else if (m.kind === "healShieldReceived") {
      healReceived = Math.max(healReceived, at(m.heal));
      shieldReceived = Math.max(shieldReceived, at(m.shield));
    }
  }

  // Rune keystone (valeurs du fichier des runes du jeu).
  let runeShield = 0;
  let runeHeal = 0;
  let resistBuff: ComboResult["resistBuff"];
  if (runeOnFight) {
    const kind = keystone.kind;
    const adaptive = adaptiveType(stats, champion);
    const ev = (name: string) => {
      const f = rc(name);
      return f ? formulaAt(f, 1, level, stats) : 0;
    };
    const abilityHits = lines.filter((l) => ["Q", "W", "E", "R"].includes(l.key)).reduce(
      (a, l) => a + (l.hits ?? 1),
      0,
    );
    const hits = abilityHits + autos;
    const cycles = (
      cd: number,
    ) => (window === undefined ? 1 : 1 + Math.floor(window / Math.max(0.1, cd) + 1e-9));
    const push = (name: string, type: DamageType, procs: number, raw: number) => {
      if (procs < 1 || raw <= 0) return;
      lines.push({
        key: "✦",
        name: procs > 1 ? `${name} ×${procs}` : name,
        type,
        damage: procs * raw * damageMultiplier(type, stats, target),
        hits: procs,
      });
    };
    const soFar = () => lines.reduce((a, l) => a + l.damage, 0);
    if (kind === "electro") {
      // 3 coups distincts en 3 s ; recharge du jeu.
      const procs = hits >= 3 ? Math.min(Math.floor(hits / 3), cycles(rv.Cooldown ?? 20)) : 0;
      push(keystone.name, adaptive, procs, ev("TotalDamage"));
    } else if (kind === "aery") {
      push(
        keystone.name,
        adaptive,
        Math.min(hits, window === undefined ? 1 : cycles(AERY_ROUND_TRIP)),
        ev("DamageCalc"),
      );
      // Aery protège aussi : un bouclier à chaque bouclier lancé par un sort.
      const shieldCasts = keys.filter((k) => champion.abilities[k].shield).reduce(
        (a, k) => a + castsOf(k).casts,
        0,
      );
      runeShield += shieldCasts * ev("ShieldCalc");
    } else if (kind === "comet") {
      push(
        keystone.name,
        adaptive,
        Math.min(abilityHits, cycles(ev("CooldownCalc") || 20)),
        ev("DamageCalc"),
      );
    } else if (kind === "pta") {
      // 3 autos consécutives : dégâts bonus, puis +8 % sur la suite du combat.
      const procs = autos >= (rv.HitsRequired ?? 3)
        ? Math.min(Math.floor(autos / (rv.HitsRequired ?? 3)), cycles(rv.Cooldown ?? 6))
        : 0;
      push(keystone.name, adaptive, procs, lerpLevel(rv.MinDamage ?? 0, rv.MaxDamage ?? 0, level));
      if (procs > 0) {
        const after = Math.max(0, autos - (rv.HitsRequired ?? 3)) / Math.max(1, autos);
        const amp = soFar() * (rv.BonusPercentDamage ?? 0) * after;
        if (amp > 0) {
          lines.push({
            key: "✦",
            name: `${keystone.name} (+${Math.round((rv.BonusPercentDamage ?? 0) * 100)} %)`,
            type: "true",
            damage: amp,
            hits: 1,
          });
        }
      }
    } else if (kind === "lethaltempo") {
      push(keystone.name, adaptive, autoInfo.fullStackHits, ev("NoteDamage"));
    } else if (kind === "hailofblades") {
      push(keystone.name, "true", autoInfo.openingHits, ev("BonusDamage"));
    } else if (kind === "grasp") {
      const procs = window === undefined ? 0 : Math.min(autos, cycles(rv.TriggerTime ?? 4));
      push(keystone.name, "magic", procs, ev("DamageCalc"));
      runeHeal += procs * ev("HealCalc");
    } else if (kind === "aftershock") {
      // Après un contrôle (ou un enracinement) : résistances pendant le délai, puis explosion.
      const immobilizing = keys.filter((k) => champion.abilities[k].cc || champion.abilities[k].root)
        .reduce((a, k) => a + castsOf(k).casts, 0);
      const procs = Math.min(immobilizing, cycles(rv.Cooldown ?? 20));
      push(keystone.name, "magic", procs, ev("DamageCalc"));
      if (procs > 0 && window !== undefined) {
        const cap = ev("MaxResistCalc");
        resistBuff = {
          armor: Math.min(cap, ev("ArmorBuff")),
          mr: Math.min(cap, ev("MagicResistBuff")),
          seconds: procs * (rv.DelayBeforeBurst ?? 0),
        };
      }
    } else if (kind === "fleet") {
      // On entre en combat avec une attaque chargée : un soin.
      if (autos > 0) runeHeal += ev("HealAmount");
    } else if (kind === "darkharvest") {
      if (soFar() >= (rv.HarvestThreshold ?? 0.5) * target.hpMax) {
        push(keystone.name, adaptive, 1, ev("TotalDamage"));
      }
    } else if (kind === "firststrike") {
      const share = window === undefined ? 1 : Math.min(1, (rv.Duration ?? 0) / Math.max(0.1, window));
      const amp = soFar() * (rv.DamageAmp ?? 0) * share;
      if (amp > 0) {
        lines.push({
          key: "✦",
          name: `${keystone.name} (+${Math.round((rv.DamageAmp ?? 0) * 100)} %)`,
          type: "true",
          damage: amp,
          hits: 1,
        });
      }
    } else if (kind === "guardian") {
      runeShield += ev("ShieldCalc");
    } else if (kind === "deathfire") {
      // Brûlure entretenue par les sorts ; amplifiée après TimeToAmp secondes.
      if (abilityHits > 0) {
        const t = window === undefined
          ? rv.Duration ?? 0
          : Math.min(window, (rv.Duration ?? 0) * abilityHits);
        const amped = Math.min(t, rv.TimeToAmp ?? 0) +
          Math.max(0, t - (rv.TimeToAmp ?? 0)) * (1 + (rv.DamageMultiplier ?? 0));
        push(keystone.name, "magic", 1, ev("DamageCalc") * amped);
      }
    }
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
    // Soins et boucliers renforcés (objets d'enchanteur) : sur les boucliers et soins des sorts.
    const power = 1 + stats.healShieldPower;
    if (ability.shield) {
      shield += casts * power *
        (ability.shieldFormula
          ? formulaAt(ability.shieldFormula, rank, level, stats)
          : scaledAt(ability.shield, rank, stats, undefined, level));
    }
    if (ability.heal) {
      heal += casts * power *
        (ability.healFormula
          ? formulaAt(ability.healFormula, rank, level, stats)
          : scaledAt(ability.heal, rank, stats, undefined, level));
    }
  }
  const autoDamage = lines.find((l) => l.key === "AA")?.damage ?? 0;
  heal += stats.lifeSteal * autoDamage + stats.omnivamp * total;
  shield += runeShield;
  heal += runeHeal + itemHeal;
  // Conquérant à pleins stacks : soigne d'une part des dégâts infligés (moins à distance).
  if (runeOnFight && keystone.kind === "conqueror") {
    heal += total * conquerorFullShare * (ranged ? rv.RangedHealingPercent ?? 0 : rv.HealingPercent ?? 0);
  }

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

  // Contrôles, parades, esquives : comptés sur la fenêtre (en burst, tout tombe à
  // t = 0 et le duel n'en tient pas compte).
  let ccDuration = 0;
  let ccLongest = 0;
  let ccReducible = 0;
  let ccIrreducible = 0;
  let parries = 0;
  let dodgeAutosSeconds = 0;
  // Un sort dont le contrôle passe par un familier (onde de choc de Daisy) est compté
  // via le familier, au rythme de ses coups — pas une fois de plus au lancer.
  const petCcKeys = new Set(mechanics.flatMap((m) => (m.kind === "pet" && m.slamCc ? [m.key] : [])));
  for (const key of keys) {
    const cc = champion.abilities[key].cc;
    if (!cc || petCcKeys.has(key)) continue;
    const { rank, casts } = castsOf(key);
    if (casts < 1) continue;
    const d = formulaAt(cc, rank, level, stats);
    // Un sort à viser ne contrôle que s'il touche : espérance.
    const total = casts * d * (champion.abilities[key].aimed ? accuracy : 1);
    ccDuration += total;
    if (champion.abilities[key].ccIgnoresTenacity) ccIrreducible += total;
    else ccReducible += total;
    ccLongest = Math.max(ccLongest, d);
  }
  // Soins et boucliers reçus renforcés (Visage spirituel), sur tout ce que le champion se rend.
  heal *= 1 + healReceived;
  shield *= 1 + shieldReceived;
  missingHpHealRatio *= 1 + healReceived;

  // Onde de choc du familier : projection, donc insensible à la ténacité.
  ccDuration += petCc;
  ccIrreducible += petCc;
  ccLongest = Math.max(ccLongest, petCcLongest);
  // Stase (Zhonya) : esquive un coup, comme une parade.
  parries += stasis;
  for (const m of mechanics) {
    if (m.kind === "parry") parries += castsOf(m.key).casts;
    if (m.kind === "dodgeAutos") {
      const { rank, casts } = castsOf(m.key);
      dodgeAutosSeconds += casts * formulaAt(m.duration, rank, level, stats);
    }
  }

  return {
    stats,
    lines,
    total,
    execHP,
    shield,
    heal,
    missingHpHealRatio,
    ccDuration,
    ccLongest,
    ccReducible,
    ccIrreducible,
    parries,
    dodgeAutosSeconds,
    ...(resistBuff ? { resistBuff } : {}),
    extraHp,
    lifelines,
    ...(damageDelay ? { damageDelay } : {}),
    ...(thorns ? { thorns } : {}),
    grievousOffense,
    grievousStruck,
  };
}

/**
 * Dégâts de l'attaquant que le défenseur annule : chaque parade bloque l'un des
 * plus gros coups de sort, l'esquive annule les autos qui tombent pendant sa durée.
 */
export function blockedDamage(attacker: ComboResult, defender: ComboResult, window?: number): number {
  let blocked = 0;
  // Résistances temporaires (Répercussion) : réduisent la part des dégâts qui tombe
  // pendant leur durée.
  // Danse de la mort : une part des dégâts reçus tombe plus tard (sur `seconds`).
  if (defender.damageDelay) {
    const share = window === undefined
      ? 1
      : Math.min(1, defender.damageDelay.seconds / Math.max(0.1, window));
    blocked += attacker.total * defender.damageDelay.share * share;
  }
  const rb = defender.resistBuff;
  if (rb && window !== undefined && window > 0) {
    const share = Math.min(1, rb.seconds / window);
    const reduce = (resist: number, bonus: number) => 1 - (100 + resist) / (100 + resist + bonus);
    for (const l of attacker.lines) {
      if (l.type === "physical") blocked += share * l.damage * reduce(defender.stats.armor, rb.armor);
      if (l.type === "magic") blocked += share * l.damage * reduce(defender.stats.mr, rb.mr);
    }
  }
  if (defender.parries > 0) {
    const perHit: number[] = [];
    for (const l of attacker.lines) {
      if (!["Q", "W", "E", "R"].includes(l.key)) continue;
      const n = l.hits ?? 1;
      for (let i = 0; i < n; i++) perHit.push(l.damage / n);
    }
    perHit.sort((a, b) => b - a);
    blocked += perHit.slice(0, defender.parries).reduce((a, d) => a + d, 0);
  }
  const aa = attacker.lines.find((l) => l.key === "AA");
  if (aa && defender.dodgeAutosSeconds > 0) {
    const n = aa.hits ?? 1;
    const dodged = Math.min(n, Math.floor(defender.dodgeAutosSeconds * attacker.stats.attackSpeed));
    blocked += (dodged * aa.damage) / n;
  }
  return blocked;
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
  itemAges?: Record<string, number>,
): Defenses {
  const s = computeStats(champion, level, itemIds, items, {}, false, champion.keystone, itemAges);
  return { hp: s.maxHp, armor: s.armor, mr: s.mr };
}

/** Profil de cible tiré d'un vrai champion, PV pleins. Remplace les sliders manuels. */
export function targetFromChampion(
  champion: Champion,
  level: number,
  itemIds: string[],
  items: Record<string, Item>,
  itemAges?: Record<string, number>,
): TargetProfile {
  const d = computeDefenses(champion, level, itemIds, items, itemAges);
  // Dégâts critiques reçus réduits (Présage de Randuin), lu dans les effets d'objets.
  let critReduction = 0;
  for (const id of new Set(itemIds)) {
    for (const m of items[id]?.mechanics ?? []) {
      if (m.kind === "critReduction") {
        critReduction = Math.max(critReduction, evalFormula(m.amount, ZERO_CTX));
      }
    }
  }
  return { armor: d.armor, mr: d.mr, hpMax: d.hp, hpCur: d.hp, ...(critReduction ? { critReduction } : {}) };
}

/** Contexte vide pour une valeur d'objet constante (pas de stat, rang ou niveau). */
const ZERO_CTX = {
  rank: 1,
  level: 1,
  stats: {
    ap: 0,
    ad: 0,
    baseAd: 0,
    bonusAd: 0,
    maxHp: 0,
    baseHp: 0,
    bonusHp: 0,
    armor: 0,
    bonusArmor: 0,
    mr: 0,
    bonusMr: 0,
    attackSpeed: 0,
    bonusAttackSpeed: 0,
    critChance: 0,
    critDamage: 0,
    lethality: 0,
    maxMana: 0,
    bonusMana: 0,
  },
};

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
  /** minutes depuis l'achat de chaque objet (timeline) ; absent = objets chargés au maximum */
  itemAges?: Record<string, number>;
}

export interface DuelOptions {
  /** fenêtre de trade (s). Absent = burst. Ignoré si allIn. */
  window?: number;
  /** part des sorts à viser qui touchent (0..1, défaut 1) */
  accuracy?: number;
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
  /** secondes pendant lesquelles chaque camp est contrôlé (après parade et ténacité) */
  ccOnA: number;
  ccOnB: number;
  /** secondes perdues par chaque camp à combler l'écart de portée (0 avec un dash) */
  approachA: number;
  approachB: number;
  /** dégâts adverses annulés par chaque camp (parade, esquive, Répercussion) */
  blockedByA: number;
  blockedByB: number;
  /** l'adversaire a tué le familier de A (resp. B) d'abord, au bout de ce temps (s) */
  petKillA?: number;
  petKillB?: number;
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
  const targetA = targetFromChampion(a.champion, a.level, a.itemIds, items, a.itemAges);
  const targetB = targetFromChampion(b.champion, b.level, b.itemIds, items, b.itemAges);
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
    accuracy: opts.accuracy,
    itemAges: atk.itemAges,
  });
  const inA = inputOf(a, targetB);
  // Portée : le camp qui a moins de portée perd le temps de combler l'écart, sauf s'il
  // a un sort de mobilité appris. Seulement en trade / all-in (en burst, tout est à t = 0).
  const statsA = computeStats(
    a.champion,
    a.level,
    a.itemIds,
    items,
    runes,
    a.runeOn,
    a.keystoneId,
    a.itemAges,
  );
  const statsB = computeStats(
    b.champion,
    b.level,
    b.itemIds,
    items,
    runes,
    b.runeOn,
    b.keystoneId,
    b.itemAges,
  );
  const approachA = approachTime(b, a, statsB, opts.accuracy ?? 1);
  const approachB = approachTime(a, b, statsA, opts.accuracy ?? 1);
  // Familier (Daisy) : PV et résistances, pour que l'adversaire puisse le tuer d'abord.
  const petOf = (side: DuelSide, s: DerivedStats) => {
    const m = side.champion.mechanics?.find((x) => x.kind === "pet");
    if (!m || m.kind !== "pet" || side.include?.[m.key] === false) return null;
    const rank = resolveRank(side.champion, m.key, side.level, side.ranks);
    if (rank < 1) return null;
    const hp = formulaAt(m.hp, rank, side.level, s);
    const resists = m.resists ? formulaAt(m.resists, rank, side.level, s) : 0;
    return { hp, profile: { armor: resists, mr: resists, hpMax: hp, hpCur: hp } as TargetProfile };
  };
  const petA = petOf(a, statsA);
  const petB = petOf(b, statsB);
  const inB = inputOf(b, targetA);
  /**
   * Temps qu'un camp met à tuer le familier adverse, à sa cadence sur la fenêtre.
   * Infinity s'il ne fait pas de dégâts.
   */
  const petKillTime = (attacker: ComboInput, pet: { hp: number; profile: TargetProfile }, w: number) => {
    const vsPet = computeCombo({ ...attacker, target: pet.profile, window: w });
    const dps = vsPet.total / Math.max(0.5, w);
    return dps > 0 ? pet.hp / dps : Infinity;
  };
  const at = (w: number | undefined) => {
    // Chaque camp choisit ce qui l'arrange le plus : ignorer le familier adverse, ou le
    // tuer d'abord (il perd ce temps sur le champion, le familier cesse de frapper).
    if (w === undefined || (!petA && !petB)) return atWith(w, undefined, undefined);
    const tA = petA ? petKillTime(inB, petA, w) : Infinity; // B tue le familier de A
    const tB = petB ? petKillTime(inA, petB, w) : Infinity; // A tue le familier de B
    let best = atWith(w, undefined, undefined);
    const scoreB = (r: typeof best) => r.dmgB / r.ehpA - r.dmgA / r.ehpB;
    if (tA < w) {
      const alt = atWith(w, tA, undefined);
      if (scoreB(alt) > scoreB(best)) best = alt;
    }
    if (tB < w) {
      const alt = atWith(w, best.petKillA, tB);
      if (-scoreB(alt) > -scoreB(best)) best = alt;
    }
    return best;
  };
  const atWith = (w: number | undefined, petKillA: number | undefined, petKillB: number | undefined) => {
    const pa = computeCombo({ ...inA, window: w, petLifetime: petKillA });
    const pb = computeCombo({ ...inB, window: w, petLifetime: petKillB });
    // Contrôles : le camp contrôlé perd ce temps d'action (une parade en absorbe un).
    // Burst : tout tombe à t = 0, les contrôles ne changent rien.
    // Ténacité : réduit les contrôles subis, sauf projections et suppressions.
    const ccOn = (victim: ComboResult, caster: ComboResult) =>
      Math.max(
        0,
        caster.ccReducible * (1 - victim.stats.tenacity) + caster.ccIrreducible -
          victim.parries * caster.ccLongest,
      );
    const ccOnA = w === undefined ? 0 : ccOn(pa, pb);
    const ccOnB = w === undefined ? 0 : ccOn(pb, pa);
    // Le temps passé à tuer le familier adverse est perdu pour frapper le champion.
    const lostA = w === undefined ? 0 : ccOnA + approachA + (petKillB ?? 0);
    const lostB = w === undefined ? 0 : ccOnB + approachB + (petKillA ?? 0);
    const ab = lostA > 0
      ? computeCombo({ ...inA, window: Math.max(0, w! - lostA), petLifetime: petKillA })
      : pa;
    const ba = lostB > 0
      ? computeCombo({ ...inB, window: Math.max(0, w! - lostB), petLifetime: petKillB })
      : pb;
    const blockedByB = blockedDamage(ab, ba, w);
    const blockedByA = blockedDamage(ba, ab, w);
    // Épines (Cotte épineuse) : chaque auto reçue renvoie des dégâts à l'attaquant.
    const autosOf = (r: ComboResult) => r.lines.find((l) => l.key === "AA")?.hits ?? 0;
    const thornsTo = (wearer: ComboResult, struckBy: ComboResult, struckTarget: TargetProfile) =>
      wearer.thorns
        ? wearer.thorns.perHit * autosOf(struckBy) *
          damageMultiplier(wearer.thorns.type, wearer.stats, struckTarget)
        : 0;
    const dmgA = Math.max(0, ab.total - blockedByB) + thornsTo(ab, ba, targetB);
    const dmgB = Math.max(0, ba.total - blockedByA) + thornsTo(ba, ab, targetA);
    // Blessures graves sur les soins de chaque camp.
    const woundsOnA = Math.max(ba.grievousOffense, autosOf(ab) > 0 ? ba.grievousStruck : 0);
    const woundsOnB = Math.max(ab.grievousOffense, autosOf(ba) > 0 ? ab.grievousStruck : 0);
    const magicOf = (r: ComboResult) =>
      r.lines.filter((l) => l.type === "magic").reduce((a, l) => a + l.damage, 0);
    return {
      ab,
      ba,
      dmgA,
      dmgB,
      ccOnA,
      ccOnB,
      blockedByA,
      blockedByB,
      petKillA,
      petKillB,
      // Chaque camp profite de SES boucliers/soins (son propre combo), face aux dégâts de l'autre.
      ehpA: effectiveHp(targetA.hpMax, ab, dmgB, woundsOnA, magicOf(ba)),
      ehpB: effectiveHp(targetB.hpMax, ba, dmgA, woundsOnB, magicOf(ab)),
    };
  };
  const timed = opts.allIn || opts.window !== undefined;
  // A tue B quand ses dégâts dépassent les PV de B + ce que B se rend (bouclier, soins).
  const ttkA = timed ? timeToKill((w) => at(w).dmgA, (w) => at(w).ehpB) : undefined;
  const ttkB = timed ? timeToKill((w) => at(w).dmgB, (w) => at(w).ehpA) : undefined;
  // All-in : on s'arrête au premier mort — c'est lui qui décide du duel.
  const window = opts.allIn ? Math.min(ttkA!, ttkB!, TTK_LIMIT) : opts.window;
  const {
    ab: aToB,
    ba: bToA,
    ehpA,
    ehpB,
    dmgA,
    dmgB,
    ccOnA,
    ccOnB,
    blockedByA,
    blockedByB,
    petKillA,
    petKillB,
  } = at(
    window,
  );
  const cap = (n: number) => (opts.allIn ? Math.min(1, n) : n);
  const killPctA = cap(dmgA / ehpB);
  const killPctB = cap(dmgB / ehpA);
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
    ccOnA,
    ccOnB,
    approachA: timed ? approachA : 0,
    approachB: timed ? approachB : 0,
    blockedByA,
    blockedByB,
    ...(petKillA !== undefined ? { petKillA } : {}),
    ...(petKillB !== undefined ? { petKillB } : {}),
  };
  if (timed) Object.assign(result, { ttkA, ttkB, window });
  return result;
}

/** Temps de rapprochement plafonné (s) : au-delà, le modèle sans déplacement n'a plus de sens. */
export const MAX_APPROACH = 2;

/**
 * Secondes que `chaser` perd à rejoindre `ranged` quand ce dernier a plus de portée :
 * (portée de l'un − portée de l'autre) / vitesse de déplacement, plafonné. Zéro si
 * `chaser` a un sort de mobilité appris (dash, saut, téléportation).
 */
export function approachTime(
  ranged: DuelSide,
  chaser: DuelSide,
  rangedStats?: DerivedStats,
  accuracy = 1,
): number {
  const gap = (ranged.champion.base.attackRange ?? 0) - (chaser.champion.base.attackRange ?? 0);
  if (gap <= 0) return 0;
  const keys: AbilityKey[] = ["Q", "W", "E", "R"];
  const learned = (side: DuelSide, k: AbilityKey) =>
    resolveRank(side.champion, k, side.level, side.ranks) >= 1 && side.include?.[k] !== false;
  const canDash = keys.some((k) => chaser.champion.abilities[k].mobility && learned(chaser, k));
  const ms = chaser.champion.base.moveSpeed ?? 335;
  // Le camp à portée ralentit et enracine celui qui approche (sorts appris, espérance
  // de toucher pour les sorts à viser). Un enracinement bloque aussi les dashs.
  let slow = 0;
  let slowFor = 0;
  let slowHit = 1;
  let root = 0;
  if (rangedStats) {
    for (const k of keys) {
      const ab = ranged.champion.abilities[k];
      if (!learned(ranged, k)) continue;
      const rank = resolveRank(ranged.champion, k, ranged.level, ranged.ranks);
      const hit = ab.aimed ? accuracy : 1;
      if (ab.slow) {
        const amount = formulaAt(ab.slow.amount, rank, ranged.level, rangedStats);
        if (amount * hit > slow * slowHit) {
          slow = Math.min(0.99, amount);
          slowFor = formulaAt(ab.slow.duration, rank, ranged.level, rangedStats);
          slowHit = hit;
        }
      }
      if (ab.root) root = Math.max(root, hit * formulaAt(ab.root, rank, ranged.level, rangedStats));
    }
  }
  let move = 0;
  if (!canDash) {
    const plain = gap / ms;
    const slowed = ms * (1 - slow);
    const withSlow = gap / slowed <= slowFor ? gap / slowed : slowFor + (gap - slowed * slowFor) / ms;
    move = Math.min(MAX_APPROACH, slowHit * withSlow + (1 - slowHit) * plain);
  }
  return move + root;
}

/**
 * PV effectifs d'un camp sur la fenêtre : PV max + boucliers + soins. Un soin ne
 * rend que ce qui a été perdu : il est plafonné aux dégâts reçus.
 */
export function effectiveHp(
  hpMax: number,
  own:
    & Pick<ComboResult, "shield" | "heal" | "missingHpHealRatio">
    & Partial<Pick<ComboResult, "extraHp" | "lifelines">>,
  damageTaken: number,
  wounds = 0,
  magicTaken = 0,
): number {
  // Blessures graves : réduisent les soins, pas les boucliers.
  const heal = (own.heal + own.missingHpHealRatio * damageTaken) * (1 - wounds);
  // Boucliers de seuil (sous 30 % de PV) : déclenchés dans tout duel qui va au bout ;
  // magiques seulement pour la Gueule.
  const lifeline = (own.lifelines ?? []).reduce(
    (a, l) => a + (l.magicOnly ? Math.min(l.amount, magicTaken) : l.amount),
    0,
  );
  return hpMax + own.shield + Math.min(heal, damageTaken) + lifeline + (own.extraHp ?? 0);
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
