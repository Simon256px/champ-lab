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
}

export interface Ability {
  name: string;
  type: DamageType;
  /** rang max : 5 pour les sorts de base, 3 pour l'ultime */
  maxRank: number;
  /** dégâts de base par rang. base[0] = rang 1. Un sort utilitaire peut valoir [0]. */
  base: number[];
  ratios: AbilityRatios;
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
}

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
}

export interface Item {
  id: string;
  name: string;
  /** libellé court affiché dans les slots */
  short: string;
  stats: ItemStats;
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
