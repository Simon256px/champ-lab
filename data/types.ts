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

/**
 * Formule de jeu, convertie depuis les fichiers du jeu (CommunityDragon) par le
 * pipeline et évaluée par le moteur (lib/formula.ts). Petit arbre typé :
 */
export type Formula =
  | { op: "num"; n: number }
  /** valeur par rang (index 0 = rang 1) */
  | { op: "rank"; v: number[] }
  /** interpolation linéaire du niveau 1 au niveau 18 */
  | { op: "lerp"; from: number; to: number }
  /** valeur au niveau 1, +perLevel par niveau, paliers qui ajoutent `add` et fixent le gain par niveau */
  | { op: "steps"; l1: number; perLevel: number; bp: { level: number; add: number; perLevel: number }[] }
  /** stat du lanceur × sous-formule */
  | { op: "stat"; stat: StatRef; f: Formula }
  | { op: "sum"; of: Formula[] }
  | { op: "mul"; of: Formula[] }
  /** sous-formule bornée entre min et max */
  | { op: "clamp"; f: Formula; min: number; max: number }
  /** une valeur par niveau (index 0 = niveau 1) */
  | { op: "byLevel"; v: number[] };

/** Stats du lanceur qu'une formule peut lire. */
export type StatRef =
  | "ap"
  | "ad"
  | "baseAd"
  | "bonusAd"
  | "maxHp"
  | "baseHp"
  | "bonusHp"
  | "armor"
  | "bonusArmor"
  | "mr"
  | "bonusMr"
  /** vitesse d'attaque totale (attaques/s) et bonus (fraction : 0,4 = +40 %) */
  | "attackSpeed"
  | "bonusAttackSpeed"
  /** chance de crit (0..1) et multiplicateur de crit (1,75) */
  | "critChance"
  | "critDamage"
  | "lethality"
  /** mana max et mana bonus (objets) */
  | "maxMana"
  | "bonusMana";

/** Ce que multiplie une formule exprimée en fraction de PV (Vayne W : 4–10 % des PV max de la cible). */
export type HpScale = "targetMaxHp" | "targetMissingHp" | "targetCurrentHp";

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
  /**
   * Dégâts tirés des fichiers du jeu (prioritaires sur base/ratios). `formulaScale` :
   * la formule est une fraction des PV de la cible.
   */
  formula?: Formula;
  formulaScale?: HpScale;
  /** bouclier posé sur le lanceur à chaque lancer */
  shield?: ScaledValue;
  /** soin du lanceur à chaque lancer */
  heal?: ScaledValue;
  /** bouclier et soin tirés des fichiers du jeu (prioritaires sur shield / heal) */
  shieldFormula?: Formula;
  healFormula?: Formula;
  /**
   * Contrôle qui empêche d'agir (étourdissement, projection, peur, charme…), en
   * secondes par lancer, tiré des fichiers du jeu. Les immobilisations seules
   * (enracinement) n'en font pas partie : le duel est sans déplacement.
   */
  cc?: Formula;
  /** contrôle insensible à la ténacité (projection, suppression) */
  ccIgnoresTenacity?: boolean;
  /** enracinement (s par lancer) : empêche de bouger et de dasher, pas d'agir */
  root?: Formula;
  /** ralentissement : part de vitesse retirée (0..1) et durée (s) */
  slow?: { amount: Formula; duration: Formula };
  /** sort à viser (esquivable) d'après son type de ciblage dans les fichiers du jeu */
  aimed?: boolean;
  /** le sort rapproche son lanceur (dash, saut, téléportation), d'après l'infobulle */
  mobility?: boolean;
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
  /** vitesse de déplacement de base (unités/s) */
  moveSpeed?: number;
  /** mana de base et par niveau (énergie pour certains champions) */
  mana?: number;
  manaPerLevel?: number;
  /** dégâts d'un coup critique, en multiplicateur (1,75 = 175 %). Absent = 1,75. */
  critDamage?: number;
}

/**
 * Référence à une valeur des fichiers du jeu (CommunityDragon), résolue en
 * Formula par le pipeline : un calcul (`calc`) ou une valeur brute (`value`) du
 * sort placé sur `slot` (P = passif). `times` multiplie (ex. 0,01 pour des %).
 */
export interface GameRef {
  slot: "P" | AbilityKey;
  calc?: string;
  value?: string;
  times?: number;
  /** ajouté après `times` (Caitlyn : 5 stacks, le 6e coup est un headshot → +1) */
  plus?: number;
  /**
   * Lire une stat de base dans le fichier d'un AUTRE personnage (familier : Daisy =
   * « ivernminion ») : `field` est le nom du champ (« attackSpeedModifiable »).
   */
  character?: string;
  field?: string;
}

/**
 * Mécanique de kit absente de Meraki (passifs surtout). Saisie dans
 * data/mechanics.ts avec des GameRef, résolue en Formula dans
 * data/generated/mechanics.gen.ts, appliquée par le moteur en mode trade / all-in.
 */
export type Mechanic<A = Formula> =
  | {
    /** dégâts en plus tous les `every` coups d'auto (1 = chaque coup) */
    kind: "onHit";
    name: string;
    type: DamageType;
    every?: A;
    damage: A;
    scale?: HpScale;
  }
  | {
    /** chaque sort lancé charge la prochaine auto (Riven, Lux) : au plus une par lancer */
    kind: "afterAbility";
    name: string;
    type: DamageType;
    damage: A;
    scale?: HpScale;
  }
  | {
    /** un sort dont les dégâts tombent tous les `every` coups d'auto au lieu d'être lancés (Vayne W) */
    kind: "abilityOnHit";
    key: AbilityKey;
    every: number;
  }
  | {
    /** dégâts (et soin) toutes les `interval` secondes à partir de t = 0 (points vitaux de Fiora) */
    kind: "periodic";
    name: string;
    type: DamageType;
    interval: number;
    damage: A;
    scale?: HpScale;
    heal?: A;
  }
  | {
    /** VA bonus qui s'empile à chaque auto (Jax) */
    kind: "stackingAttackSpeed";
    name: string;
    perStack: A;
    maxStacks: A;
  }
  | {
    /** à chaque lancer de `key`, soin d'une fraction des PV manquants (Darius Q) */
    kind: "missingHpHeal";
    key: AbilityKey;
    pct: A;
  }
  | {
    /** parade : chaque lancer de `key` bloque le plus gros coup et le plus long contrôle adverses (Fiora W) */
    kind: "parry";
    key: AbilityKey;
  }
  | {
    /** esquive : chaque lancer de `key` annule les autos adverses pendant `duration` s (Jax E) */
    kind: "dodgeAutos";
    key: AbilityKey;
    duration: A;
  }
  | {
    /** donne des dégâts à un sort que Meraki laisse utilitaire (Fiora R : 4 points vitaux) */
    kind: "abilityDamage";
    key: AbilityKey;
    type: DamageType;
    damage: A;
    scale?: HpScale;
  }
  | {
    /**
     * Familier invoqué par `key` (Daisy) : il attaque de son côté à partir du lancer.
     * Vitesse d'attaque = base × (1 + bonus). Tous les `slamEvery` coups, une onde de
     * choc (dégâts + contrôle), au plus une fois par `slamCooldown`.
     */
    kind: "pet";
    key: AbilityKey;
    name: string;
    type: DamageType;
    ad: A;
    baseAttackSpeed: A;
    bonusAttackSpeed: A;
    hp: A;
    /** armure et RM du familier (Daisy : 30 → 90 selon le niveau) */
    resists?: A;
    duration: A;
    slamEvery?: number;
    slamType?: DamageType;
    slamDamage?: A;
    slamCooldown?: A;
    slamCc?: A;
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
  /** objet de départ de la timeline (data/overrides.ts) ; défaut : Doran selon le profil */
  starter?: string;
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
  /** dégâts critiques en plus (IE : 0,3 → crit à 205 %) */
  critDamage?: number;
  /** ténacité en fraction (réduit la durée des contrôles, sauf projections et suppressions) */
  tenacity?: number;
  /** soins et boucliers renforcés, en fraction (Bâton aqueux 0,1) */
  healShieldPower?: number;
  /** mana en plus */
  mana?: number;
}

/** Référence à une valeur du fichier d'un objet (CommunityDragon), résolue par le pipeline. */
export interface ItemRef {
  calc?: string;
  value?: string;
  times?: number;
  /** multiplie la valeur par une stat du porteur (Sterak : 0,6 × PV bonus) */
  stat?: StatRef;
}

/**
 * Effet d'objet (passif ou actif) que le moteur applique. Saisi dans
 * data/item-mechanics.ts avec des ItemRef, résolu en Formula dans items.gen.ts.
 */
export type ItemMechanic<A = Formula> =
  | {
    /** dégâts en plus tous les `every` coups d'auto (Kraken : 3 ; BotRK, Nashor : 1) */
    kind: "onHit";
    type: DamageType;
    every?: A;
    damage: A;
    /** variante à distance si elle diffère (Kraken ×0,8, BotRK 6 % au lieu de 9 %) */
    rangedDamage?: A;
    scale?: HpScale;
  }
  | {
    /** dégâts déclenchés par un sort, sur la prochaine auto si `needsAuto` (Lame enchantée), une fois par `cooldown` */
    kind: "spellProc";
    type: DamageType;
    damage: A;
    cooldown: A;
    needsAuto: boolean;
  }
  | {
    /** actif d'objet lancé une fois par `cooldown` (Brise-pas) */
    kind: "active";
    type: DamageType;
    damage: A;
    cooldown: A;
  }
  | {
    /** réduction d'armure qui s'empile à chaque coup physique (Fendoir noir) */
    kind: "armorShred";
    perStack: A;
    maxStacks: A;
  }
  | {
    /** brûlure par seconde tant que les sorts touchent (Liandry) */
    kind: "burn";
    type: DamageType;
    perSecond: A;
    scale?: HpScale;
    duration: A;
  }
  | {
    /**
     * Stat en plus (Sterak : 50 % de l'AD de base ; Archange : AP selon le mana).
     * `perStack` + `secondsPerStack` : stat qui grandit avec le temps porté (Baguette des âges).
     */
    kind: "statBonus";
    stat: "bonusAd" | "ap" | "hp" | "mana";
    amount: A;
    secondsPerStack?: A;
    maxStacks?: A;
  }
  | {
    /** stase (Zhonya) : esquive le plus gros coup de sort adverse, une fois */
    kind: "stasis";
    duration: A;
  }
  | {
    /** renaissance (Ange gardien) : rend une part des PV de base, une fois */
    kind: "revive";
    hpShare: A;
  }
  | {
    /** bouclier quand les PV passent sous un seuil (Sterak, Arc-bouclier, Gueule : magique seulement) */
    kind: "lifeline";
    shield: A;
    rangedShield?: A;
    magicOnly?: boolean;
  }
  | {
    /** actif de soin (Rédemption), avec dégâts en % des PV de la cible */
    kind: "activeHeal";
    heal: A;
    damage?: A;
    type?: DamageType;
    scale?: HpScale;
  }
  | {
    /** une part des dégâts reçus est différée (Danse de la mort) */
    kind: "damageDelay";
    share: A;
    rangedShare?: A;
    seconds: A;
  }
  | {
    /** renvoie des dégâts à chaque auto reçue (Cotte épineuse) */
    kind: "thorns";
    type: DamageType;
    damage: A;
  }
  | {
    /** blessures graves : réduit les soins adverses ; `whenStruck` = seulement sur les autos reçues */
    kind: "grievous";
    amount: A;
    whenStruck?: boolean;
  }
  | {
    /** soins et boucliers reçus renforcés (Visage spirituel) */
    kind: "healShieldReceived";
    heal: A;
    shield: A;
  }
  | {
    /** dégâts des coups critiques reçus réduits (Présage de Randuin) */
    kind: "critReduction";
    amount: A;
  };

/** Un sort tel que le jeu le décrit : infobulle, valeurs brutes et calculs (fiche de kit). */
export interface KitSpell {
  name: string;
  /** infobulle du client, avec ses @placeholders@ (valeurs et calculs ci-dessous) */
  text: string;
  maxRank: number;
  /** valeurs brutes par rang (index 0 = rang 1) */
  values: Record<string, number[]>;
  /** calculs du jeu convertis ; null = brique non reconnue */
  calcs: Record<string, Formula | null>;
  cooldown?: number[];
  /** charges (W d'Ivern : 3 buissons, une charge toutes les 20 s) */
  ammo?: { max: number; recharge: number };
}

/** Fiche complète d'un champion, générée depuis les fichiers du jeu (data/generated/kits.gen.ts). */
export interface KitSheet {
  patch: string;
  spells: Partial<Record<"P" | AbilityKey, KitSpell>>;
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
  /** effets modélisés (data/item-mechanics.ts, valeurs du jeu) */
  mechanics?: ItemMechanic[];
}

/** Comportement d'une rune modélisé dans lib/engine.ts. "none" = non modélisée (neutre). */
export type RuneKind =
  | "electro"
  | "conqueror"
  | "aery"
  | "comet"
  | "pta"
  | "lethaltempo"
  | "hailofblades"
  | "grasp"
  | "aftershock"
  | "fleet"
  | "darkharvest"
  | "firststrike"
  | "guardian"
  | "deathfire"
  /** aucun effet dans un duel immobile (vitesse, ralentissement, sorts d'invocateur) */
  | "none";

export interface RuneDef {
  id: string;
  name: string;
  description: string;
  /** identifiant du comportement modélisé dans lib/engine.ts */
  kind: RuneKind;
  /** URL de l'icône officielle de la rune (Data Dragon). */
  icon?: string;
  /** valeurs du fichier des runes du jeu (perks.cdtb.bin.json → mEffectAmount) */
  values?: Record<string, number>;
  /** calculs du jeu convertis ; variante à distance si elle diffère */
  calcs?: Record<string, Formula | null>;
  rangedCalcs?: Record<string, Formula | null>;
  /** pourquoi la rune n'a pas d'effet dans le duel (kind « none ») */
  noDuelEffect?: string;
}

export interface TargetProfile {
  armor: number;
  mr: number;
  hpMax: number;
  hpCur: number;
  /** part des dégâts critiques retirée (Présage de Randuin) */
  critReduction?: number;
}

/** Une ligne de dégâts calculée (un sort, le saignement, ou une rune). */
export interface DamageLine {
  key: string;
  name: string;
  type: DamageType;
  damage: number;
  /** nombre de coups dans la ligne (lancers, autos, déclenchements). Absent = 1. */
  hits?: number;
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
