// ⚠ FICHIER GÉNÉRÉ — ne pas éditer à la main.
// Source : Meraki (lolstaticdata) + Data Dragon.
// Régénérer : deno task data
// Patch de référence : 16.20.1
// Généré le : 2026-10-13

// Passifs décrits dans data/mechanics.ts, valeurs résolues depuis les fichiers du jeu.
import type { Mechanic } from "../types.ts";

export const GENERATED_MECHANICS: Record<string, Mechanic[]> = {
  "fiora": [
    {
      "kind": "periodic",
      "name": "Point vital",
      "type": "true",
      "interval": 2.25,
      "damage": {
        "op": "sum",
        "of": [
          {
            "op": "num",
            "n": 0.03,
          },
          {
            "op": "stat",
            "stat": "bonusAd",
            "f": {
              "op": "num",
              "n": 0.0004,
            },
          },
        ],
      },
      "scale": "targetMaxHp",
      "heal": {
        "op": "lerp",
        "from": 35,
        "to": 100,
      },
    },
    {
      "kind": "abilityDamage",
      "key": "R",
      "type": "true",
      "damage": {
        "op": "mul",
        "of": [
          {
            "op": "sum",
            "of": [
              {
                "op": "num",
                "n": 0.03,
              },
              {
                "op": "stat",
                "stat": "bonusAd",
                "f": {
                  "op": "num",
                  "n": 0.0004,
                },
              },
            ],
          },
          {
            "op": "num",
            "n": 4,
          },
        ],
      },
      "scale": "targetMaxHp",
    },
  ],
  "jax": [
    {
      "kind": "stackingAttackSpeed",
      "name": "Assaut implacable",
      "perStack": {
        "op": "steps",
        "l1": 0.05,
        "perLevel": 0,
        "bp": [
          {
            "level": 4,
            "add": 0.015,
            "perLevel": 0,
          },
          {
            "level": 7,
            "add": 0.015,
            "perLevel": 0,
          },
          {
            "level": 10,
            "add": 0.015,
            "perLevel": 0,
          },
          {
            "level": 13,
            "add": 0.015,
            "perLevel": 0,
          },
          {
            "level": 16,
            "add": 0.015,
            "perLevel": 0,
          },
          {
            "level": 19,
            "add": 0.015,
            "perLevel": 0,
          },
        ],
      },
      "maxStacks": {
        "op": "num",
        "n": 8,
      },
    },
  ],
  "vayne": [
    {
      "kind": "abilityOnHit",
      "key": "W",
      "every": 3,
    },
  ],
  "darius": [
    {
      "kind": "missingHpHeal",
      "key": "Q",
      "pct": {
        "op": "num",
        "n": 0.17,
      },
    },
  ],
};
