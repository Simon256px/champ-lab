/**
 * OVERRIDES écrits à la main — le complément humain du pipeline généré.
 *
 * Le pipeline (scripts/fetch-data.ts) remplit tout ce qui est mécanique et
 * plat (stats de base, ratios AP/AD, stats d'objets). Mais deux choses ne se
 * dérivent PAS d'une API :
 *
 *   1. Les PASSIFS complexes que le moteur modélise déjà (Rabadon %AP,
 *      Fendoir %pén.) : le wiki les met en texte, pas en stat plate. On les
 *      réinjecte ici, exactement comme la donnée était saisie avant.
 *   2. Les CHOIX de théorycraft : quels objets proposer sur l'étagère d'un
 *      champion, quelle rune keystone par défaut, l'ordre de compétences, et
 *      les corrections de ratios (sorts mixtes, cas particuliers de kit).
 *
 * >>> C'est ici que la communauté affine un champion, sans toucher au généré. <<<
 */

import type { AbilityKey, AbilityRatios, Adaptive, ItemStats } from "./types.ts";

// ---------------------------------------------------------------------------
// Étagères par défaut (ids d'objets de data/items.ts, tels que slugifiés).
// Utilisées quand un champion n'a pas d'étagère sur mesure ci-dessous.
// ---------------------------------------------------------------------------

export const DEFAULT_AP_SHELF = [
  "sorcerersshoes",
  "ludensecho",
  "shadowflame",
  "rabadonsdeathcap",
  "voidstaff",
  "zhonyashourglass",
];

/** Tireurs (AD à distance) : bottes de VA, critique et à l'impact. */
export const DEFAULT_MARKSMAN_SHELF = [
  "berserkersgreaves",
  "krakenslayer",
  "infinityedge",
  "phantomdancer",
  "lorddominiksregards",
  "bloodthirster",
];

export const DEFAULT_AD_SHELF = [
  "ionianbootsoflucidity",
  "stridebreaker",
  "blackcleaver",
  "trinityforce",
  "deathsdance",
  "steraksgage",
];

// ---------------------------------------------------------------------------
// Whitelist d'objets : ids toujours inclus même sans stat plate exploitable
// (utile pour un objet dont l'intérêt est un passif modélisé en override).
// ---------------------------------------------------------------------------

export const ITEM_WHITELIST: string[] = [
  "rabadonsdeathcap",
  "voidstaff",
  "blackcleaver",
];

// ---------------------------------------------------------------------------
// Overrides d'objets : passifs que le moteur sait modéliser mais que le wiki
// n'expose pas en stat plate.
// ---------------------------------------------------------------------------

interface ItemOverride {
  name?: string;
  short?: string;
  /** stats fusionnées PAR-DESSUS les stats générées (écrase les collisions) */
  stats?: Partial<ItemStats>;
}

export const ITEM_OVERRIDES: Record<string, ItemOverride> = {
  // Coiffe de Rabadon : +30% de puissance (passif « Opus magique »).
  rabadonsdeathcap: { short: "RABADON", stats: { apAmp: 0.30 } },
  // Bâton du Vide : la %pén.M est déjà une stat plate côté wiki — rien à ajouter,
  // mais on fige le libellé court.
  voidstaff: { short: "VOID" },
  // Fendoir noir : le shred d'armure en % est un passif (pas une stat) → modélisé.
  blackcleaver: { short: "CLEAVER", stats: { armorPenPercent: 0.30 } },
  // Quelques libellés courts lisibles pour les objets fréquents.
  sorcerersshoes: { short: "SORC" },
  ludensecho: { short: "LUDEN" },
  shadowflame: { short: "SHADOW" },
  zhonyashourglass: { short: "ZHONYA" },
  ionianbootsoflucidity: { short: "IONIE" },
  trinityforce: { short: "TRINITÉ" },
  stridebreaker: { short: "STRIDE" },
  deathsdance: { short: "DEATHS" },
};

// ---------------------------------------------------------------------------
// Overrides de champions : théorycraft + corrections de ratios.
// Tout est optionnel — un champion sans entrée prend les valeurs générées.
// ---------------------------------------------------------------------------

interface AbilityOverride {
  /**
   * Contrôle conditionnel. Le pipeline le détecte seul dans l'infobulle (« If the
   * target collides with terrain… ») ; ce réglage corrige la lecture : true = ignorer
   * le contrôle, false = le compter malgré l'infobulle.
   */
  conditionalCc?: boolean;
  /**
   * Ligne de progression du wiki à retenir comme dégâts du sort (« Total Mixed
   * Damage ») quand celle choisie par défaut n'est qu'une partie du sort. Aucun
   * chiffre saisi : les valeurs restent celles du patch.
   */
  line?: string;
  type?: "magic" | "physical" | "true" | "util";
  base?: number[];
  ratios?: AbilityRatios;
  name?: string;
}

interface ChampionOverride {
  adaptive?: Adaptive;
  hasBleed?: boolean;
  /** 18 entrées Q|W|E|R : l'ordre de montée des sorts (déduit le rang au niv N) */
  skillOrder?: AbilityKey[];
  /** ids d'objets proposés sur l'étagère */
  shelf?: string[];
  /** rune keystone par défaut (id de data/runes.ts) */
  keystone?: string;
  /** objet de départ de la timeline (défaut : Doran adapté au profil) — un jungler part avec son compagnon */
  starter?: string;
  /** corrections d'abilities par touche */
  abilities?: Partial<Record<AbilityKey, AbilityOverride>>;
}

export const CHAMPION_OVERRIDES: Record<string, ChampionOverride> = {
  // --- Contrôles conditionnels : le pipeline les lit dans les infobulles (« If… »).
  // Ici, seulement ce que l'infobulle ne formule pas comme une condition.
  yasuo: { abilities: { Q: { conditionalCc: true } } }, // projette seulement au 3e Q (« While he has 2 stacks »)

  // --- Les deux champions "seed" historiques : on conserve leur réglage soigné.
  ahri: {
    adaptive: "AP",
    keystone: "electrocute",
    skillOrder: ["Q", "W", "E", "Q", "Q", "R", "Q", "E", "Q", "E", "R", "E", "E", "W", "W", "R", "W", "W"],
    abilities: {
      // L'orbe frappe à l'aller ET au retour. Le wiki expose « Damage Per Pass » (retenu
      // par défaut) et « Total Mixed Damage » : on prend le total des deux passages
      // (le retour est en vrai dégât ; approximé en magique).
      Q: { line: "Total Mixed Damage" },
    },
    shelf: [
      "sorcerersshoes",
      "ludensecho",
      "shadowflame",
      "rabadonsdeathcap",
      "voidstaff",
      "zhonyashourglass",
    ],
  },
  ivern: {
    adaptive: "AP",
    // Aery (non modélisée : aucun effet de rune) plutôt qu'Électrocution, hors profil.
    keystone: "summonaery",
    // Ivern se joue en jungle : il part avec un compagnon de jungle, pas un Doran.
    starter: "gustwalkerhatchling",
    // Ordre type : Q niv 1, E niv 2, W niv 3, E au max, puis Q, ultime 6/11/16.
    skillOrder: ["Q", "E", "W", "E", "E", "R", "E", "Q", "E", "Q", "R", "Q", "Q", "W", "W", "R", "W", "W"],
    // Build d'enchanteur : bottes, objets de soutien (puissance, accélération, soins et boucliers).
    shelf: [
      "ionianbootsoflucidity",
      "moonstonerenewer",
      "shurelyasbattlesong",
      "redemption",
      "staffofflowingwater",
      "imperialmandate",
    ],
  },
  darius: {
    adaptive: "AD",
    hasBleed: true,
    keystone: "conqueror",
    skillOrder: ["Q", "E", "W", "Q", "Q", "R", "Q", "W", "Q", "W", "R", "W", "W", "E", "E", "R", "E", "E"],
    shelf: ["stridebreaker", "blackcleaver", "trinityforce", "deathsdance"],
    abilities: {
      // La guillotine noxienne est du vrai dégât exécutant — le wiki l'encode bien,
      // mais on verrouille le type pour l'invariant d'exécution du moteur.
      R: { type: "true" },
    },
  },
};
