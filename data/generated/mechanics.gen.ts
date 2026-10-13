// ⚠ FICHIER GÉNÉRÉ — ne pas éditer à la main.
// Sources : wiki officiel (wiki.leagueoflegends.com), fichiers du jeu (CommunityDragon), Data Dragon.
// Régénérer : deno task data
// Patch de référence : 16.20.1
// Généré le : 2026-10-13

// Passifs : data/mechanics.ts (valeurs des fichiers du jeu), sinon lus sur le wiki officiel.
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
  "ambessa": [
    {
      "kind": "afterAbility",
      "name": "Drakehound's Step",
      "type": "physical",
      "damage": {
        "op": "sum",
        "of": [
          {
            "op": "byLevel",
            "v": [
              5,
              6.18,
              7.35,
              8.53,
              9.71,
              10.88,
              12.06,
              13.24,
              14.41,
              15.59,
              16.76,
              17.94,
              19.12,
              20.29,
              21.47,
              22.65,
              23.82,
              25,
            ],
          },
          {
            "op": "stat",
            "stat": "bonusAd",
            "f": {
              "op": "num",
              "n": 0.2,
            },
          },
        ],
      },
    },
  ],
  "corki": [
    {
      "kind": "onHit",
      "name": "Hextech Munitions",
      "type": "true",
      "damage": {
        "op": "stat",
        "stat": "ad",
        "f": {
          "op": "num",
          "n": 0.2,
        },
      },
    },
  ],
  "jhin": [
    {
      "kind": "onHit",
      "name": "Whisper",
      "type": "physical",
      "damage": {
        "op": "byLevel",
        "v": [
          0.15,
          0.15,
          0.15,
          0.15,
          0.15,
          0.2,
          0.2,
          0.2,
          0.2,
          0.2,
          0.25,
          0.25,
          0.25,
          0.25,
          0.25,
          0.25,
          0.25,
          0.25,
        ],
      },
      "every": {
        "op": "num",
        "n": 4,
      },
      "scale": "targetMissingHp",
    },
  ],
  "lucian": [
    {
      "kind": "afterAbility",
      "name": "Lightslinger",
      "type": "physical",
      "damage": {
        "op": "stat",
        "stat": "ad",
        "f": {
          "op": "byLevel",
          "v": [
            0.5,
            0.5,
            0.5,
            0.5,
            0.5,
            0.5,
            0.55,
            0.55,
            0.55,
            0.55,
            0.55,
            0.55,
            0.6,
            0.6,
            0.6,
            0.6,
            0.6,
            0.6,
          ],
        },
      },
    },
  ],
  "mel": [
    {
      "kind": "afterAbility",
      "name": "Searing Brilliance",
      "type": "magic",
      "damage": {
        "op": "mul",
        "of": [
          {
            "op": "num",
            "n": 3,
          },
          {
            "op": "sum",
            "of": [
              {
                "op": "byLevel",
                "v": [
                  8,
                  9.29,
                  10.59,
                  11.88,
                  13.18,
                  14.47,
                  15.76,
                  17.06,
                  18.35,
                  19.65,
                  20.94,
                  22.24,
                  23.53,
                  24.82,
                  26.12,
                  27.41,
                  28.71,
                  30,
                ],
              },
              {
                "op": "stat",
                "stat": "ap",
                "f": {
                  "op": "num",
                  "n": 0.04,
                },
              },
            ],
          },
        ],
      },
    },
  ],
  "senna": [
    {
      "kind": "onHit",
      "name": "Absolution",
      "type": "physical",
      "damage": {
        "op": "stat",
        "stat": "ad",
        "f": {
          "op": "num",
          "n": 0.2,
        },
      },
    },
  ],
  "sylas": [
    {
      "kind": "afterAbility",
      "name": "Petricite Burst",
      "type": "magic",
      "damage": {
        "op": "sum",
        "of": [
          {
            "op": "stat",
            "stat": "ad",
            "f": {
              "op": "num",
              "n": 1.3,
            },
          },
          {
            "op": "stat",
            "stat": "ap",
            "f": {
              "op": "num",
              "n": 0.3,
            },
          },
        ],
      },
    },
  ],
  "tahmkench": [
    {
      "kind": "onHit",
      "name": "An Acquired Taste",
      "type": "magic",
      "damage": {
        "op": "sum",
        "of": [
          {
            "op": "byLevel",
            "v": [
              5,
              10,
              15,
              20,
              25,
              30,
              35,
              40,
              45,
              50,
              55,
              60,
              60,
              60,
              60,
              60,
              60,
              60,
            ],
          },
          {
            "op": "mul",
            "of": [
              {
                "op": "stat",
                "stat": "ap",
                "f": {
                  "op": "num",
                  "n": 1,
                },
              },
              {
                "op": "stat",
                "stat": "bonusHp",
                "f": {
                  "op": "num",
                  "n": 0.000125,
                },
              },
            ],
          },
          {
            "op": "stat",
            "stat": "bonusHp",
            "f": {
              "op": "num",
              "n": 0.04,
            },
          },
        ],
      },
    },
  ],
  "taric": [
    {
      "kind": "afterAbility",
      "name": "Bravado",
      "type": "magic",
      "damage": {
        "op": "sum",
        "of": [
          {
            "op": "byLevel",
            "v": [
              25,
              29,
              33,
              37,
              41,
              45,
              49,
              53,
              57,
              61,
              65,
              69,
              73,
              77,
              81,
              85,
              89,
              93,
            ],
          },
          {
            "op": "stat",
            "stat": "bonusArmor",
            "f": {
              "op": "num",
              "n": 0.15,
            },
          },
        ],
      },
      "hits": 2,
    },
  ],
  "warwick": [
    {
      "kind": "onHit",
      "name": "Eternal Hunger",
      "type": "magic",
      "damage": {
        "op": "sum",
        "of": [
          {
            "op": "byLevel",
            "v": [
              6,
              8.88,
              11.76,
              14.65,
              17.53,
              20.41,
              23.29,
              26.18,
              29.06,
              31.94,
              34.82,
              37.71,
              40.59,
              43.47,
              46.35,
              49.24,
              52.12,
              55,
            ],
          },
          {
            "op": "stat",
            "stat": "bonusAd",
            "f": {
              "op": "num",
              "n": 0.15,
            },
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
  "xinzhao": [
    {
      "kind": "onHit",
      "name": "Determination",
      "type": "physical",
      "damage": {
        "op": "sum",
        "of": [
          {
            "op": "stat",
            "stat": "ad",
            "f": {
              "op": "byLevel",
              "v": [
                0.15,
                0.15,
                0.15,
                0.15,
                0.15,
                0.3,
                0.3,
                0.3,
                0.3,
                0.3,
                0.45,
                0.45,
                0.45,
                0.45,
                0.45,
                0.6,
                0.6,
                0.6,
              ],
            },
          },
          {
            "op": "stat",
            "stat": "ap",
            "f": {
              "op": "byLevel",
              "v": [
                0.05,
                0.05,
                0.05,
                0.05,
                0.05,
                0.1,
                0.1,
                0.1,
                0.1,
                0.1,
                0.15,
                0.15,
                0.15,
                0.15,
                0.15,
                0.2,
                0.2,
                0.2,
              ],
            },
          },
        ],
      },
      "every": {
        "op": "num",
        "n": 3,
      },
    },
  ],
  "zoe": [
    {
      "kind": "afterAbility",
      "name": "More Sparkles!",
      "type": "magic",
      "damage": {
        "op": "sum",
        "of": [
          {
            "op": "byLevel",
            "v": [
              16,
              20,
              24,
              28,
              32,
              36,
              42,
              48,
              54,
              60,
              66,
              74,
              82,
              90,
              100,
              110,
              120,
              130,
            ],
          },
          {
            "op": "stat",
            "stat": "ap",
            "f": {
              "op": "num",
              "n": 0.2,
            },
          },
        ],
      },
    },
  ],
};
