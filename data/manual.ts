import type { Champion } from "@/data/types.ts";

/**
 * Champions saisis À LA MAIN — SECOURS uniquement.
 *
 * Les champions absents du wiki seraient générés depuis les
 * fichiers du jeu (scripts/fetch-data.ts, championFromGame) et l'emportent sur
 * cette saisie. Elle ne sert que si les fichiers du jeu sont indisponibles.
 *
 * Le roster généré l'emporte toujours sur cette saisie (les données du wiki et du
 * jeu étant plus fiables). En
 * attendant, on le câble avec ce qui est confirmé (stats de base, noms de
 * sorts, types de dégâts, adaptatif) et des valeurs de dégâts ILLUSTRATIVES,
 * à raffiner par patch — dans l'esprit du reste du repo.
 */
export const MANUAL_CHAMPIONS: Record<string, Champion> = {
  locke: {
    id: "locke",
    name: "Locke",
    title: "l'Exorciste de cendres",
    initial: "L",
    adaptive: "AP",
    // Stats de base : confirmées via Data Dragon (patch 16.13.x).
    base: {
      ad: 58,
      adPerLevel: 0,
      hp: 655,
      hpPerLevel: 109,
      armor: 32,
      armorPerLevel: 4.2,
      mr: 32,
      mrPerLevel: 2.05,
      // Profil type mage à distance (illustratif, à recroiser avec Data Dragon).
      attackSpeed: 0.625,
      attackSpeedRatio: 0.625,
      attackSpeedPerLevel: 0.02,
      attackRange: 525,
    },
    // Ordre type mage : max Q > E > W, ult 6/11/16.
    skillOrder: ["Q", "E", "W", "Q", "Q", "R", "Q", "E", "Q", "E", "R", "E", "E", "W", "W", "R", "W", "W"],
    // Noms de sorts et types de dégâts : confirmés (Data Dragon). Valeurs de base
    // et ratios : ILLUSTRATIFS (saisie de secours) — à raffiner.
    abilities: {
      Q: {
        name: "Clous rituels",
        type: "magic",
        maxRank: 5,
        base: [70, 105, 140, 175, 210],
        ratios: { ap: 0.5 },
      },
      W: {
        name: "Ignition de l'âme",
        type: "magic",
        maxRank: 5,
        base: [60, 90, 120, 150, 180],
        ratios: { ap: 0.4 },
      },
      E: {
        name: "Poursuite cendrée",
        type: "magic",
        maxRank: 5,
        base: [50, 80, 110, 140, 170],
        ratios: { ap: 0.35 },
      },
      R: {
        name: "Purgatoire",
        type: "magic",
        maxRank: 3,
        base: [150, 250, 350],
        ratios: { ap: 0.7 },
      },
    },
    // Étagère conservée pour compat (l'UI expose désormais tout le catalogue).
    shelf: [
      "sorcerersshoes",
      "ludensecho",
      "shadowflame",
      "rabadonsdeathcap",
      "voidstaff",
      "zhonyashourglass",
    ],
    keystone: "electrocute",
  },
};
