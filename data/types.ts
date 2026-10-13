/**
 * Types du domaine — la "forme" des données de jeu.
 *
 * Tout ce que la communauté ajoute (champions, objets, runes) doit se
 * conformer à ces interfaces. Aucune logique ici : juste la structure.
 */

export type DamageType = "magic" | "physical" | "true" | "util";
export type Adaptive = "AP" | "AD";
export type AbilityKey = "Q" | "W" | "E" | "R";

/** Coefficients d'un sort. Tous optionnels : un sort ne scale que sur ce qui le concerne. */
export interface AbilityRatios {
  /** ratio sur la puissance (AP) */
  ap?: number;
  /** ratio sur l'AD total (base + bonus) */
  totalAd?: number;
  /** ratio sur l'AD bonus (objets/runes uniquement) */
  bonusAd?: number;
  /** fraction des PV max de la CIBLE (0,06 = 6 %) */
  targetMaxHp?: number;
  /** fraction des PV manquants de la cible */
  targetMissingHp?: number;
  /** fraction des PV actuels de la cible */
  targetCurrentHp?: number;
  /** fraction des PV bonus du LANCEUR (objets) */
  bonusHp?: number;
  /** fraction des PV max du lanceur */
  maxHp?: number;
}

/** Valeur d'un effet chiffré par rang : base[rang] + Σ ratios. Sert aux boucliers et aux soins. */
export interface ScaledValue {
  base: number[];
  ratios: AbilityRatios;
  rankRatios?: Partial<Record<keyof AbilityRatios, number[]>>;
}

export interface Ability {
  name: string;
  type: DamageType;
  /** rang max : 5 pour les sorts de base, 3 pour l'ultime */
  maxRank: number;
  /** dégâts de base par rang. base[0] = rang 1. Un sort utilitaire peut valoir [0]. */
  base: number[];
  ratios: AbilityRatios;
  /**
   * Ratios qui changent avec le rang (Darius Q 100→140 % AD, Vayne W 6→10 % PV max).
   * Prioritaire sur `ratios` pour les clés présentes. Index 0 = rang 1.
   */
  rankRatios?: Partial<Record<keyof AbilityRatios, number[]>>;
  /** temps de recharge par rang, en secondes (avant ability haste). Absent = inconnu. */
  cooldown?: number[];
  /** bouclier posé sur le lanceur à chaque lancer */
  shield?: ScaledValue;
  /** soin du lanceur à chaque lancer */
  heal?: ScaledValue;
}

export interface ChampionBaseStats {
  ad: number;
  adPerLevel: number;
  hp: number;
  hpPerLevel: number;
  armor: number;
  armorPerLevel: number;
  mr: number;
  mrPerLevel: number;
  /** vitesse d'attaque de base (attaques/s). Absent = 0,625. */
  attackSpeed?: number;
  /** ratio appliqué à la vitesse d'attaque bonus. Absent = attackSpeed. */
  attackSpeedRatio?: number;
  /** vitesse d'attaque bonus par niveau, en fraction (0,02 = 2 %). */
  attackSpeedPerLevel?: number;
  /** portée d'auto-attaque (unités) */
  attackRange?: number;
  /** dégâts d'un coup critique, en multiplicateur (1,75 = 175 %). Absent = 1,75. */
  critDamage?: number;
}

/** Valeur qui croît linéairement du niveau 1 (`from`) au niveau 18 (`to`). */
export interface ByLevel {
  from: number;
  to: number;
}

/**
 * Mécanique de kit que Meraki n'expose pas en chiffres (passifs surtout), saisie
 * dans data/mechanics.ts et appliquée par le moteur en mode trade / all-in.
 */
export type Mechanic =
  | {
    /** dégâts en plus tous les `every` coups d'auto (1 = chaque coup) */
    kind: "onHit";
    name: string;
    type: DamageType;
    every?: number;
    base?: ByLevel;
    ratios?: AbilityRatios;
  }
  | {
    /** un sort dont les dégâts tombent tous les `every` coups d'auto au lieu d'être lancés (Vayne W) */
    kind: "abilityOnHit";
    key: AbilityKey;
    every: number;
  }
  | {
    /** dégâts toutes les `interval` secondes à partir de t = 0 (points vitaux de Fiora) */
    kind: "periodic";
    name: string;
    type: DamageType;
    interval: number;
    base?: ByLevel;
    ratios?: AbilityRatios;
    /** fraction des PV max de la cible gagnée par point d'AD bonus (Fiora : 0,04 / 100 AD) */
    targetMaxHpPerBonusAd?: number;
    /** soin du lanceur à chaque déclenchement */
    heal?: ByLevel;
  }
  | {
    /** VA bonus qui s'empile à chaque auto (Jax) */
    kind: "stackingAttackSpeed";
    name: string;
    perStack: ByLevel;
    maxStacks: number;
  };

export interface Champion {
  id: string;
  name: string;
  title: string;
  /** initiale affichée dans le portrait placeholder */
  initial: string;
  adaptive: Adaptive;
  /** Darius & co : passif de saignement pris en compte dans le combo */
  hasBleed?: boolean;
  base: ChampionBaseStats;
  /** ordre de compétences sur 18 niveaux — sert à déduire le rang de chaque sort au niveau N */
  skillOrder: AbilityKey[];
  abilities: Record<AbilityKey, Ability>;
  /** objets recommandés proposés dans le rack (ids référençant data/items.ts) */
  shelf: string[];
  /** rune keystone par défaut (id référençant data/runes.ts) */
  keystone: string;
  /** passifs et effets de kit modélisés à la main (data/mechanics.ts) */
  mechanics?: Mechanic[];
}

export interface ItemStats {
  ad?: number;
  ap?: number;
  /** amplification de puissance, ex. 0.30 pour +30 % d'AP (Rabadon) */
  apAmp?: number;
  hp?: number;
  armor?: number;
  /** résistance magique */
  mr?: number;
  abilityHaste?: number;
  magicPenFlat?: number;
  /** pénétration magique en %, ex. 0.40 */
  magicPenPercent?: number;
  /** pénétration d'armure en % (Fendoir noir…) */
  armorPenPercent?: number;
  /** létalité ~ pénétration d'armure plate */
  lethality?: number;
  /** vitesse d'attaque bonus en fraction, ex. 0.40 pour +40 % */
  attackSpeed?: number;
  /** chance de coup critique en fraction, ex. 0.25 */
  critChance?: number;
  /** vol de vie en fraction (soigne d'une part des dégâts d'auto-attaque) */
  lifeSteal?: number;
  /** omnivampirisme en fraction (soigne d'une part de tous les dégâts) */
  omnivamp?: number;
}

/** Place d'un objet dans l'arbre de craft. Les composants servent à la timeline de build. */
export type ItemTier = "starter" | "basic" | "epic" | "legendary" | "boots";

export interface Item {
  id: string;
  name: string;
  /** libellé court affiché dans les slots */
  short: string;
  stats: ItemStats;
  tier?: ItemTier;
  /** prix total en or (composants compris) */
  cost?: number;
  /** recette : ids des composants directs (un id peut apparaître deux fois) */
  from?: string[];
  /** URL de l'icône officielle de l'objet (Data Dragon). */
  icon?: string;
}

/** Comportement d'une rune modélisé dans lib/engine.ts. "none" = non modélisée (neutre). */
export type RuneKind = "electro" | "conqueror" | "none";

export interface RuneDef {
  id: string;
  name: string;
  description: string;
  /** identifiant du comportement modélisé dans lib/engine.ts */
  kind: RuneKind;
  /** URL de l'icône officielle de la rune (Data Dragon). */
  icon?: string;
}

export interface TargetProfile {
  armor: number;
  mr: number;
  hpMax: number;
  hpCur: number;
}

/** Une ligne de dégâts calculée (un sort, le saignement, ou une rune). */
export interface DamageLine {
  key: string;
  name: string;
  type: DamageType;
  damage: number;
}

/** Ce qui est inclus dans le combo. */
export interface IncludeMap {
  Q: boolean;
  W: boolean;
  E: boolean;
  R: boolean;
  bleed: boolean;
  rune: boolean;
}
