// ⚠ FICHIER GÉNÉRÉ — ne pas éditer à la main.
// Source : Meraki (lolstaticdata) + Data Dragon.
// Régénérer : deno task data
// Patch de référence : 16.20.1
// Généré le : 2026-10-13

// Passifs décrits dans data/mechanics.ts, valeurs résolues depuis les fichiers du jeu.
import type { Mechanic } from "../types.ts";

export const GENERATED_MECHANICS: Record<string, Mechanic[]> = {
  "akshan": [
    {
      "kind": "onHit",
      "name": "Second tir",
      "type": "physical",
      "damage": {
        "op": "stat",
        "stat": "ad",
        "f": {
          "op": "num",
          "n": 0.5,
        },
      },
    },
    {
      "kind": "onHit",
      "name": "Sale combat",
      "type": "magic",
      "every": {
        "op": "num",
        "n": 3,
      },
      "damage": {
        "op": "sum",
        "of": [
          {
            "op": "steps",
            "l1": 15,
            "perLevel": 0,
            "bp": [
              {
                "level": 6,
                "add": 25,
                "perLevel": 0,
              },
              {
                "level": 11,
                "add": 40,
                "perLevel": 0,
              },
              {
                "level": 16,
                "add": 70,
                "perLevel": 0,
              },
            ],
          },
          {
            "op": "stat",
            "stat": "ap",
            "f": {
              "op": "num",
              "n": 0.6,
            },
          },
        ],
      },
    },
  ],
  "caitlyn": [
    {
      "kind": "onHit",
      "name": "Headshot",
      "type": "physical",
      "every": {
        "op": "sum",
        "of": [
          {
            "op": "num",
            "n": 5,
          },
          {
            "op": "num",
            "n": 1,
          },
        ],
      },
      "damage": {
        "op": "stat",
        "stat": "ad",
        "f": {
          "op": "sum",
          "of": [
            {
              "op": "steps",
              "l1": 0.6,
              "perLevel": 0,
              "bp": [
                {
                  "level": 7,
                  "add": 0.2,
                  "perLevel": 0,
                },
                {
                  "level": 13,
                  "add": 0.2,
                  "perLevel": 0,
                },
              ],
            },
            {
              "op": "mul",
              "of": [
                {
                  "op": "stat",
                  "stat": "critChance",
                  "f": {
                    "op": "num",
                    "n": 1,
                  },
                },
                {
                  "op": "sum",
                  "of": [
                    {
                      "op": "stat",
                      "stat": "critDamage",
                      "f": {
                        "op": "num",
                        "n": 1,
                      },
                    },
                    {
                      "op": "num",
                      "n": -1,
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    },
  ],
  "diana": [
    {
      "kind": "onHit",
      "name": "Lame lunaire",
      "type": "magic",
      "every": {
        "op": "num",
        "n": 3,
      },
      "damage": {
        "op": "sum",
        "of": [
          {
            "op": "steps",
            "l1": 20,
            "perLevel": 5,
            "bp": [
              {
                "level": 7,
                "add": 0,
                "perLevel": 10,
              },
              {
                "level": 12,
                "add": 0,
                "perLevel": 15,
              },
              {
                "level": 17,
                "add": 0,
                "perLevel": 25,
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
    },
  ],
  "gwen": [
    {
      "kind": "onHit",
      "name": "Mille coupures",
      "type": "magic",
      "damage": {
        "op": "mul",
        "of": [
          {
            "op": "sum",
            "of": [
              {
                "op": "num",
                "n": 1,
              },
              {
                "op": "stat",
                "stat": "ap",
                "f": {
                  "op": "num",
                  "n": 0.006,
                },
              },
            ],
          },
          {
            "op": "num",
            "n": 0.01,
          },
        ],
      },
      "scale": "targetMaxHp",
    },
  ],
  "kaisa": [
    {
      "kind": "onHit",
      "name": "Plasma (base)",
      "type": "magic",
      "damage": {
        "op": "sum",
        "of": [
          {
            "op": "lerp",
            "from": 4,
            "to": 30,
          },
          {
            "op": "stat",
            "stat": "ap",
            "f": {
              "op": "num",
              "n": 0.12,
            },
          },
        ],
      },
    },
  ],
  "locke": [
    {
      "kind": "onHit",
      "name": "Dégâts à l'impact",
      "type": "magic",
      "damage": {
        "op": "sum",
        "of": [
          {
            "op": "lerp",
            "from": 5,
            "to": 40,
          },
          {
            "op": "stat",
            "stat": "ap",
            "f": {
              "op": "num",
              "n": 0.1,
            },
          },
        ],
      },
    },
  ],
  "lux": [
    {
      "kind": "afterAbility",
      "name": "Illumination",
      "type": "magic",
      "damage": {
        "op": "sum",
        "of": [
          {
            "op": "byLevel",
            "v": [
              20,
              30,
              40,
              50,
              60,
              70,
              80,
              90,
              100,
              110,
              120,
              130,
              140,
              150,
              160,
              170,
              180,
              190,
            ],
          },
          {
            "op": "stat",
            "stat": "ap",
            "f": {
              "op": "num",
              "n": 0.35,
            },
          },
        ],
      },
    },
  ],
  "masteryi": [
    {
      "kind": "onHit",
      "name": "Double frappe",
      "type": "physical",
      "every": {
        "op": "num",
        "n": 4,
      },
      "damage": {
        "op": "stat",
        "stat": "ad",
        "f": {
          "op": "num",
          "n": 0.5,
        },
      },
    },
  ],
  "mordekaiser": [
    {
      "kind": "onHit",
      "name": "Ténèbres",
      "type": "magic",
      "damage": {
        "op": "stat",
        "stat": "ap",
        "f": {
          "op": "num",
          "n": 0.4,
        },
      },
    },
  ],
  "orianna": [
    {
      "kind": "onHit",
      "name": "Remontoir",
      "type": "magic",
      "damage": {
        "op": "sum",
        "of": [
          {
            "op": "lerp",
            "from": 10,
            "to": 50,
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
    },
  ],
  "rell": [
    {
      "kind": "onHit",
      "name": "Brise-armure",
      "type": "magic",
      "damage": {
        "op": "sum",
        "of": [
          {
            "op": "stat",
            "stat": "armor",
            "f": {
              "op": "num",
              "n": 0.05,
            },
          },
          {
            "op": "stat",
            "stat": "mr",
            "f": {
              "op": "num",
              "n": 0.05,
            },
          },
        ],
      },
    },
  ],
  "riven": [
    {
      "kind": "afterAbility",
      "name": "Lame runique",
      "type": "physical",
      "damage": {
        "op": "stat",
        "stat": "ad",
        "f": {
          "op": "lerp",
          "from": 0.3,
          "to": 0.45,
        },
      },
    },
  ],
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
      "resists": {
        "op": "steps",
        "l1": 30,
        "perLevel": 0,
        "bp": [
          {
            "level": 7,
            "add": 0,
            "perLevel": 5,
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
