// ⚠ FICHIER GÉNÉRÉ — ne pas éditer à la main.
// Sources : wiki officiel (wiki.leagueoflegends.com), fichiers du jeu (CommunityDragon), Data Dragon.
// Régénérer : deno task data
// Patch de référence : 16.20.1
// Généré le : 2026-10-13

/** Métadonnées de génération (affichées dans /methode). */
export const DATA_META = {
  /** patch Data Dragon (liste champions, runes, icônes, disponibilité SR) */
  patch: "16.20.1",
  /** dernier patch noté par le wiki pour les champions (fraîcheur de la source) */
  statsPatch: "26.20",
  generatedAt: "2026-10-13",
  champions: 173,
  items: 202,
  runes: 17,
  /** sorts dont les nombres viennent des fichiers du jeu (CommunityDragon) au patch près */
  gameFormulas: {
    "damage": 421,
    "changed": 28,
    "shield": 33,
    "heal": 21,
    "keptPercent": 31,
    "keptNone": 81,
    "keptMismatch": 19,
  },
  /** passifs : modélisés (jeu ou wiki), dégâts conditionnels non reproduits, sans dégâts */
  passives: { "modeled": 29, "conditional": 68, "utility": 76 },
} as const;
