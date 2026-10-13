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
    {
      "kind": "parry",
      "key": "W",
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
    {
      "kind": "dodgeAutos",
      "key": "E",
      "duration": {
        "op": "num",
        "n": 2,
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
  "ivern": [
    {
      "kind": "abilityOnHit",
      "key": "W",
      "every": 1,
    },
    {
      "kind": "pet",
      "key": "R",
      "name": "Daisy",
      "type": "physical",
      "ad": {
        "op": "sum",
        "of": [
          {
            "op": "rank",
            "v": [
              70,
              100,
              130,
            ],
          },
          {
            "op": "stat",
            "stat": "ap",
            "f": {
              "op": "num",
              "n": 0.15,
            },
          },
        ],
      },
      "baseAttackSpeed": {
        "op": "num",
        "n": 0.75,
      },
      "bonusAttackSpeed": {
        "op": "mul",
        "of": [
          {
            "op": "rank",
            "v": [
              30,
              45,
              60,
            ],
          },
          {
            "op": "num",
            "n": 0.01,
          },
        ],
      },
      "hp": {
        "op": "sum",
        "of": [
          {
            "op": "steps",
            "l1": 1000,
            "perLevel": 0,
            "bp": [
              {
                "level": 7,
                "add": 0,
                "perLevel": 50,
              },
              {
                "level": 11,
                "add": 0,
                "perLevel": 400,
              },
            ],
          },
          {
            "op": "stat",
            "stat": "ap",
            "f": {
              "op": "num",
              "n": 0.5,
            },
          },
        ],
      },
      "duration": {
        "op": "num",
        "n": 45,
      },
      "slamEvery": 3,
      "slamType": "magic",
      "slamDamage": {
        "op": "sum",
        "of": [
          {
            "op": "rank",
            "v": [
              90,
              140,
              190,
            ],
          },
          {
            "op": "stat",
            "stat": "ap",
            "f": {
              "op": "num",
              "n": 0.5,
            },
          },
        ],
      },
      "slamCooldown": {
        "op": "num",
        "n": 3,
      },
      "slamCc": {
        "op": "num",
        "n": 1,
      },
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
