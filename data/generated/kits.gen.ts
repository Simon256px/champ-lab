// ⚠ FICHIER GÉNÉRÉ — ne pas éditer à la main.
// Source : Meraki (lolstaticdata) + Data Dragon.
// Régénérer : deno task data
// Patch de référence : 16.20.1
// Généré le : 2026-10-13

// Fiches de kit complètes (infobulles, valeurs et calculs du jeu) pour les pages dédiées.
import type { KitSheet } from "../types.ts";

export const GENERATED_KITS: Record<string, KitSheet> = {
  "ivern": {
    "patch": "16.20.1",
    "spells": {
      "P": {
        "name": "Friend of the Forest",
        "text":
          "Ivern cannot attack or be attacked by non-epic monsters. Ivern can create magical groves on jungle camps which grow over time. When the grove is fully grown, Ivern may free the monsters to receive gold and experience.",
        "maxRank": 1,
        "values": {
          "LevelForBuffShare": [
            5,
          ],
          "PickupDuration": [
            60,
          ],
          "KrugExperience": [
            58,
          ],
          "KrugGold": [
            84,
          ],
          "ModeSpeedOverride": [
            1,
          ],
        },
        "calcs": {
          "HarvestDuration": {
            "op": "steps",
            "l1": 40,
            "perLevel": -2,
            "bp": [
              {
                "level": 7,
                "add": 0,
                "perLevel": -3,
              },
              {
                "level": 12,
                "add": 0,
                "perLevel": -4,
              },
              {
                "level": 15,
                "add": 0,
                "perLevel": -2,
              },
              {
                "level": 16,
                "add": 0,
                "perLevel": 0,
              },
            ],
          },
          "HealthCostPercent": {
            "op": "steps",
            "l1": 15,
            "perLevel": -0.882,
            "bp": [],
          },
          "{c6433908}": {
            "op": "steps",
            "l1": 20,
            "perLevel": -1.175,
            "bp": [],
          },
          "HealthTooltip": {
            "op": "mul",
            "of": [
              {
                "op": "steps",
                "l1": 15,
                "perLevel": -0.882,
                "bp": [],
              },
              {
                "op": "stat",
                "stat": "baseHp",
                "f": {
                  "op": "num",
                  "n": 0.01,
                },
              },
            ],
          },
          "ManaTooltip": null,
        },
      },
      "Q": {
        "name": "Rootcaller",
        "text":
          "Ivern conjures a vine dealing <magicDamage>@TotalDamage@ magic damage</magicDamage> and <status>Rooting</status> the first enemy hit for @RootDuration@ seconds. Allies that Attack a <status>Rooted</status> enemy dash into Attack Range. <br><br><recast>Recast:</recast> Ivern dashes directly onto the <status>Rooted</status> enemy.<br><br><rules>Hitting non-epic monsters reduces <spellName>Rootcaller's</spellName> cooldown by 50%.</rules>@SpellModifierDescriptionAppend@",
        "maxRank": 5,
        "values": {
          "DashSpeed": [
            1500,
            1500,
            1500,
            1500,
            1500,
          ],
          "BaseDamage": [
            80,
            125,
            170,
            215,
            260,
          ],
          "RootDuration": [
            1.6,
            1.7,
            1.8,
            1.9,
            2,
          ],
          "APRatio": [
            0.7,
            0.7,
            0.7,
            0.7,
            0.7,
          ],
        },
        "calcs": {
          "TotalDamage": {
            "op": "sum",
            "of": [
              {
                "op": "rank",
                "v": [
                  80,
                  125,
                  170,
                  215,
                  260,
                ],
              },
              {
                "op": "stat",
                "stat": "ap",
                "f": {
                  "op": "num",
                  "n": 0.7,
                },
              },
            ],
          },
        },
        "cooldown": [
          14,
          13,
          12,
          11,
          10,
        ],
      },
      "W": {
        "name": "Brushmaker",
        "text":
          "<spellPassive>Passive:</spellPassive> While in brush and for @BuffDuration@ seconds after leaving, Ivern's Attacks deal an additional <magicDamage>@TotalDamage@ magic damage</magicDamage>. Nearby allies will gain this effect for @AllyBuffDuration@ seconds and deal <magicDamage>@TotalAllyDamage@ magic damage</magicDamage>.<br><br><spellActive>Active:</spellActive> Ivern grows a patch of Brush, revealing the area for @RevealDuration@ seconds. The Brush persists until Ivern's team loses vision within it, or up to @MaxBrushDuration@ seconds.@SpellModifierDescriptionAppend@",
        "maxRank": 5,
        "values": {
          "BuffDuration": [
            3,
            3,
            3,
            3,
            3,
          ],
          "AllyBuffDuration": [
            1.5,
            1.5,
            1.5,
            1.5,
            1.5,
          ],
          "BaseDamage": [
            20,
            27.5,
            35,
            42.5,
            50,
          ],
          "AllyBaseDamage": [
            10,
            15,
            20,
            25,
            30,
          ],
          "RevealDuration": [
            8,
            8,
            8,
            8,
            8,
          ],
          "MaxBrushDuration": [
            45,
            45,
            45,
            45,
            45,
          ],
          "BrushRadius": [
            190,
            190,
            190,
            190,
            190,
          ],
          "BrushSpacing": [
            90,
            90,
            90,
            90,
            90,
          ],
        },
        "calcs": {
          "TotalDamage": {
            "op": "sum",
            "of": [
              {
                "op": "rank",
                "v": [
                  20,
                  27.5,
                  35,
                  42.5,
                  50,
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
          "TotalAllyDamage": {
            "op": "sum",
            "of": [
              {
                "op": "rank",
                "v": [
                  10,
                  15,
                  20,
                  25,
                  30,
                ],
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
        "cooldown": [
          0.5,
          0.5,
          0.5,
          0.5,
          0.5,
        ],
        "ammo": {
          "max": 3,
          "recharge": 20,
        },
      },
      "E": {
        "name": "Triggerseed",
        "text":
          "Ivern grants <shield>@TotalShield@ Shield</shield> to an ally champion or Daisy. After @ShieldDuration@ seconds, it bursts, dealing <magicDamage>@TotalDamage@ magic damage</magicDamage> and <status>Slowing</status> enemies by @SlowAmount*100@% for @SlowDuration@ seconds.<br><br>If <spellName>Triggerseed</spellName> detonates and no enemy champions are hit while the shield still persists, the ally will be shielded for <shield>@TotalShield@ </shield>for @ShieldDuration@ seconds.@SpellModifierDescriptionAppend@",
        "maxRank": 5,
        "values": {
          "BaseShield": [
            75,
            115,
            155,
            195,
            235,
          ],
          "ShieldAPRatio": [
            0.5,
            0.5,
            0.5,
            0.5,
            0.5,
          ],
          "BaseDamage": [
            70,
            90,
            110,
            130,
            150,
          ],
          "DamageAPRatio": [
            0.8,
            0.8,
            0.8,
            0.8,
            0.8,
          ],
          "SlowAmount": [
            0.4,
            0.45,
            0.5,
            0.55,
            0.6,
          ],
          "SlowDuration": [
            2,
            2,
            2,
            2,
            2,
          ],
          "ShieldDuration": [
            2,
            2,
            2,
            2,
            2,
          ],
        },
        "calcs": {
          "TotalShield": {
            "op": "sum",
            "of": [
              {
                "op": "rank",
                "v": [
                  75,
                  115,
                  155,
                  195,
                  235,
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
          "TotalDamage": {
            "op": "sum",
            "of": [
              {
                "op": "rank",
                "v": [
                  70,
                  90,
                  110,
                  130,
                  150,
                ],
              },
              {
                "op": "stat",
                "stat": "ap",
                "f": {
                  "op": "num",
                  "n": 0.8,
                },
              },
            ],
          },
        },
        "cooldown": [
          11,
          10,
          9,
          8,
          7,
        ],
      },
      "R": {
        "name": "Daisy!",
        "text":
          "Ivern summons his sentinel friend Daisy to leap into the fray for @DaisyDuration@ seconds.<br><br><spellActive>Daisy, Slam!:</spellActive> Daisy's 3rd consecutive Attack on the same champion or epic monster will launch a shockwave, dealing<magicDamage> @TotalShockwaveDamage@ magic damage</magicDamage> to all enemies hit as well as <status>Knocking Up</status> for @ShockwaveCCDuration@ second. This effect can only occur once every @ShockwaveCD@ seconds.<br><br><recast>Recast:</recast> Instruct Daisy to Attack or move.@SpellModifierDescriptionAppend@",
        "maxRank": 3,
        "values": {
          "SpawnBuffDuration": [
            5,
            5,
            5,
          ],
          "MSOnSpawn": [
            40,
            40,
            40,
          ],
          "DROnSpawn": [
            25,
            25,
            25,
          ],
          "DaisyAS": [
            30,
            45,
            60,
          ],
          "DaisyAD": [
            70,
            100,
            130,
          ],
          "DaisyAoeDR": [
            25,
            25,
            25,
          ],
          "DaisyDuration": [
            45,
            45,
            45,
          ],
          "ShockwaveBaseDamage": [
            90,
            140,
            190,
          ],
          "ShockwaveCCDuration": [
            1,
            1,
            1,
          ],
          "ShockwaveCD": [
            3,
            3,
            3,
          ],
        },
        "calcs": {
          "TotalBonusResists": {
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
          "TotalDaisyHP": {
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
          "TotalDaisyAD": {
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
          "TotalShockwaveDamage": {
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
        },
        "cooldown": [
          140,
          130,
          120,
        ],
      },
    },
  },
};
