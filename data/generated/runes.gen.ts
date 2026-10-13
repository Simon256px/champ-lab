// ⚠ FICHIER GÉNÉRÉ — ne pas éditer à la main.
// Sources : wiki officiel (wiki.leagueoflegends.com), fichiers du jeu (CommunityDragon), Data Dragon.
// Régénérer : deno task data
// Patch de référence : 16.20.1
// Généré le : 2026-10-13

import type { RuneDef } from "../types.ts";

/** Runes keystone (Data Dragon). `kind` pilote le calcul ; "none" = neutre. */
export const GENERATED_RUNES: Record<string, RuneDef & { tree: string }> = {
  "aftershock": {
    "id": "aftershock",
    "name": "Aftershock",
    "description": "keystone · Resolve · valeurs du jeu",
    "kind": "aftershock",
    "icon":
      "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Resolve/VeteranAftershock/VeteranAftershock.png",
    "tree": "Resolve",
    "values": {
      "DamageRadius": 350,
      "Cooldown": 20,
      "StartingBaseDamage": 25,
      "MaxBaseDamage": 120,
      "DelayBeforeBurst": 2.5,
      "HealthRatio": 0.08,
      "FlatResists": 45,
      "BonusResistMin": 80,
      "BonusResistMax": 150,
      "PercentBonusResist": 0.75,
    },
    "calcs": {
      "MaxResistCalc": {
        "op": "lerp",
        "from": 80,
        "to": 150,
      },
      "ArmorBuff": {
        "op": "sum",
        "of": [
          {
            "op": "num",
            "n": 45,
          },
          {
            "op": "stat",
            "stat": "bonusArmor",
            "f": {
              "op": "num",
              "n": 0.75,
            },
          },
        ],
      },
      "MagicResistBuff": {
        "op": "sum",
        "of": [
          {
            "op": "num",
            "n": 45,
          },
          {
            "op": "stat",
            "stat": "bonusMr",
            "f": {
              "op": "num",
              "n": 0.75,
            },
          },
        ],
      },
      "DamageCalc": {
        "op": "sum",
        "of": [
          {
            "op": "lerp",
            "from": 25,
            "to": 120,
          },
          {
            "op": "stat",
            "stat": "bonusHp",
            "f": {
              "op": "num",
              "n": 0.08,
            },
          },
        ],
      },
    },
  },
  "arcanecomet": {
    "id": "arcanecomet",
    "name": "Arcane Comet",
    "description": "keystone · Sorcery · valeurs du jeu",
    "kind": "comet",
    "icon":
      "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Sorcery/ArcaneComet/ArcaneComet.png",
    "tree": "Sorcery",
    "values": {
      "RechargeTime": 20,
      "DamageBase": 15,
      "DamageMax": 100,
      "APRatio": 0.05,
      "ADRatio": 0.1,
      "RechargeTimeMin": 8,
      "PercentRefund": 0.2,
      "DotPercentRefund": 0.05,
      "AoEPercentRefund": 0.1,
      "MaxDamageAmp": 1,
      "MaxRange": 750,
    },
    "calcs": {
      "DamageCalc": {
        "op": "sum",
        "of": [
          {
            "op": "lerp",
            "from": 15,
            "to": 100,
          },
          {
            "op": "stat",
            "stat": "ap",
            "f": {
              "op": "num",
              "n": 0.05,
            },
          },
          {
            "op": "stat",
            "stat": "bonusAd",
            "f": {
              "op": "num",
              "n": 0.1,
            },
          },
        ],
      },
      "CooldownCalc": {
        "op": "clamp",
        "f": {
          "op": "lerp",
          "from": 20,
          "to": 8,
        },
        "min": 0.3,
        "max": 20,
      },
    },
  },
  "conqueror": {
    "id": "conqueror",
    "name": "Conqueror",
    "description": "keystone · Precision · valeurs du jeu",
    "kind": "conqueror",
    "icon":
      "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Precision/Conqueror/Conqueror.png",
    "tree": "Precision",
    "values": {
      "MinAdaptivePerStack": 1.8,
      "MaxAdaptivePerStack": 4,
      "MaxStacks": 12,
      "BuffDuration": 5,
      "TimeUntilNextStackFromSameSpell": 4,
      "HealingPercent": 0.08,
      "RangedHealingPercent": 0.05,
    },
    "calcs": {},
  },
  "darkharvest": {
    "id": "darkharvest",
    "name": "Dark Harvest",
    "description": "keystone · Domination · valeurs du jeu",
    "kind": "darkharvest",
    "icon":
      "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Domination/DarkHarvest/DarkHarvest.png",
    "tree": "Domination",
    "values": {
      "HarvestThreshold": 0.5,
      "Cooldown": 35,
      "BaseDamage": 30,
      "ADRatio": 0.1,
      "APRatio": 0.05,
      "DamagePerSoulEssence": 11,
      "CooldownResetValue": 1,
    },
    "calcs": {
      "TotalDamage": {
        "op": "sum",
        "of": [
          {
            "op": "num",
            "n": 30,
          },
          {
            "op": "stat",
            "stat": "ap",
            "f": {
              "op": "num",
              "n": 0.05,
            },
          },
          {
            "op": "stat",
            "stat": "bonusAd",
            "f": {
              "op": "num",
              "n": 0.1,
            },
          },
        ],
      },
    },
  },
  "deathfiretouch": {
    "id": "deathfiretouch",
    "name": "Deathfire Touch",
    "description": "keystone · Sorcery · valeurs du jeu",
    "kind": "deathfire",
    "icon":
      "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Sorcery/DeathfireTouch/DEATHFIRE_TOUCH_KEYSTONE.png",
    "tree": "Sorcery",
    "values": {
      "ADRatio": 0.07,
      "APRatio": 0.025,
      "Duration": 4,
      "TimeToAmp": 3,
      "DamageMultiplier": 0.75,
      "AoEDuration": 2,
      "DotDuration": 1,
      "Level1DamageTOOLTIP": 3,
      "TicksPerSecond": 2,
      "APRatioTT": 2.5,
      "ADRatioTT": 7,
    },
    "calcs": {
      "DamageCalc": {
        "op": "sum",
        "of": [
          {
            "op": "lerp",
            "from": 3,
            "to": 12,
          },
          {
            "op": "stat",
            "stat": "ap",
            "f": {
              "op": "num",
              "n": 0.025,
            },
          },
          {
            "op": "stat",
            "stat": "bonusAd",
            "f": {
              "op": "num",
              "n": 0.07,
            },
          },
        ],
      },
    },
  },
  "electrocute": {
    "id": "electrocute",
    "name": "Electrocute",
    "description": "keystone · Domination · valeurs du jeu",
    "kind": "electro",
    "icon":
      "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Domination/Electrocute/Electrocute.png",
    "tree": "Domination",
    "values": {
      "Cooldown": 20,
      "DamageBase": 70,
      "DamageMax": 240,
      "BonusADRatio": 0.1,
      "WindowDuration": 3,
      "APRatio": 0.05,
      "CooldownMin": 20,
    },
    "calcs": {
      "TotalDamage": {
        "op": "sum",
        "of": [
          {
            "op": "lerp",
            "from": 70,
            "to": 240,
          },
          {
            "op": "stat",
            "stat": "ap",
            "f": {
              "op": "num",
              "n": 0.05,
            },
          },
          {
            "op": "stat",
            "stat": "bonusAd",
            "f": {
              "op": "num",
              "n": 0.1,
            },
          },
        ],
      },
    },
  },
  "firststrike": {
    "id": "firststrike",
    "name": "First Strike",
    "description": "keystone · Inspiration · valeurs du jeu",
    "kind": "firststrike",
    "icon":
      "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Inspiration/FirstStrike/FirstStrike.png",
    "tree": "Inspiration",
    "values": {
      "Duration": 3,
      "DamageAmp": 0.07,
      "OOCTimer": 10,
      "GoldProcBonus": 10,
      "GoldPercentBonus": 0.5,
      "GoldPercentBonusRanged": 0.35,
      "GraceWindow": 0.25,
      "TooltipOnlyCooldownStartAmount": 25,
      "TooltipOnlyCooldownEndAmount": 15,
      "MissileNoiseNumberLimiter": 3,
      "MissileNoiseRangeLimiter": 1500,
      "ModesCooldownReduction": 1,
    },
    "calcs": {
      "Cooldown": {
        "op": "lerp",
        "from": 25,
        "to": 15,
      },
      "ChampRange": {
        "op": "num",
        "n": 1,
      },
      "MeleeItemCalcValue": {
        "op": "num",
        "n": 0,
      },
      "RangedItemCalcValue": {
        "op": "num",
        "n": 0,
      },
    },
    "rangedCalcs": {
      "Cooldown": {
        "op": "lerp",
        "from": 25,
        "to": 15,
      },
      "ChampRange": {
        "op": "num",
        "n": 2,
      },
      "MeleeItemCalcValue": {
        "op": "num",
        "n": 0,
      },
      "RangedItemCalcValue": {
        "op": "num",
        "n": 0,
      },
    },
  },
  "fleetfootwork": {
    "id": "fleetfootwork",
    "name": "Fleet Footwork",
    "description": "keystone · Precision · valeurs du jeu",
    "kind": "fleet",
    "icon":
      "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Precision/FleetFootwork/FleetFootwork.png",
    "tree": "Precision",
    "values": {
      "HealBonusADRatio": 0.1,
      "HealAPRatio": 0.05,
      "HealBase": 15,
      "HealMax": 160,
      "MSBuff": 0.2,
      "MSDuration": 1,
      "RangedMSMod": 0.75,
      "RangedHealMod": 0.6,
      "MinionHealMod": 0.15,
    },
    "calcs": {
      "HealAmount": {
        "op": "sum",
        "of": [
          {
            "op": "lerp",
            "from": 15,
            "to": 160,
          },
          {
            "op": "stat",
            "stat": "bonusAd",
            "f": {
              "op": "num",
              "n": 0.1,
            },
          },
          {
            "op": "stat",
            "stat": "ap",
            "f": {
              "op": "num",
              "n": 0.05,
            },
          },
        ],
      },
      "MoveSpeedCalc": {
        "op": "num",
        "n": 0.2,
      },
    },
    "rangedCalcs": {
      "HealAmount": {
        "op": "mul",
        "of": [
          {
            "op": "sum",
            "of": [
              {
                "op": "lerp",
                "from": 15,
                "to": 160,
              },
              {
                "op": "stat",
                "stat": "bonusAd",
                "f": {
                  "op": "num",
                  "n": 0.1,
                },
              },
              {
                "op": "stat",
                "stat": "ap",
                "f": {
                  "op": "num",
                  "n": 0.05,
                },
              },
            ],
          },
          {
            "op": "num",
            "n": 0.6,
          },
        ],
      },
      "MoveSpeedCalc": {
        "op": "num",
        "n": 0.15,
      },
    },
  },
  "graspoftheundying": {
    "id": "graspoftheundying",
    "name": "Grasp of the Undying",
    "description": "keystone · Resolve · valeurs du jeu",
    "kind": "grasp",
    "icon":
      "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Resolve/GraspOfTheUndying/GraspOfTheUndying.png",
    "tree": "Resolve",
    "values": {
      "PercentHealthDamage": 0.035,
      "Window": 5,
      "TriggerTime": 4,
      "PercentHealthHeal": 0.013,
      "MaxHealthPerProc": 5,
      "RangedPenaltyMod": 0.4,
      "RangedHealthPerProc": 2,
      "MeleeFlatHeal": 0,
    },
    "calcs": {
      "DamageCalc": {
        "op": "stat",
        "stat": "maxHp",
        "f": {
          "op": "num",
          "n": 0.035,
        },
      },
      "HealCalc": {
        "op": "stat",
        "stat": "maxHp",
        "f": {
          "op": "num",
          "n": 0.013,
        },
      },
    },
    "rangedCalcs": {
      "DamageCalc": {
        "op": "mul",
        "of": [
          {
            "op": "stat",
            "stat": "maxHp",
            "f": {
              "op": "num",
              "n": 0.035,
            },
          },
          {
            "op": "num",
            "n": 0.4,
          },
        ],
      },
      "HealCalc": {
        "op": "mul",
        "of": [
          {
            "op": "stat",
            "stat": "maxHp",
            "f": {
              "op": "num",
              "n": 0.013,
            },
          },
          {
            "op": "num",
            "n": 0.4,
          },
        ],
      },
    },
  },
  "guardian": {
    "id": "guardian",
    "name": "Guardian",
    "description": "keystone · Resolve · valeurs du jeu",
    "kind": "guardian",
    "icon": "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Resolve/Guardian/Guardian.png",
    "tree": "Resolve",
    "values": {
      "SnuggleRange": 350,
      "ShieldBase": 40,
      "ShieldMax": 150,
      "APRatio": 0.2,
      "HPRatio": 0.06,
      "ShieldDuration": 1.5,
      "Cooldown": 75,
      "GuardDuration": 2.5,
      "CooldownMaxLevel": 40,
      "ThresholdMin": 50,
      "ThresholdMax": 165,
    },
    "calcs": {
      "ThresholdCalc": {
        "op": "lerp",
        "from": 40,
        "to": 150,
      },
      "ShieldCalc": {
        "op": "sum",
        "of": [
          {
            "op": "lerp",
            "from": 40,
            "to": 150,
          },
          {
            "op": "stat",
            "stat": "ap",
            "f": {
              "op": "num",
              "n": 0.2,
            },
          },
          {
            "op": "stat",
            "stat": "bonusHp",
            "f": {
              "op": "num",
              "n": 0.06,
            },
          },
        ],
      },
      "CooldownCalc": {
        "op": "lerp",
        "from": 75,
        "to": 40,
      },
    },
  },
  "hailofblades": {
    "id": "hailofblades",
    "name": "Hail of Blades",
    "description": "keystone · Domination · valeurs du jeu",
    "kind": "hailofblades",
    "icon":
      "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Domination/HailOfBlades/HailOfBlades.png",
    "tree": "Domination",
    "values": {
      "NumHits": 3,
      "Duration": 3,
      "ASBoost": 0.9,
      "Cooldown": 10,
      "ASBoostRanged": 0.6,
      "BonusDamageMin": 2,
      "BonusDamageMax": 20,
      "BonusADRatio": 0.12,
      "APRatio": 0.1,
      "MaxBonusHits": 2,
    },
    "calcs": {
      "MeleeItemCalcValue": {
        "op": "num",
        "n": 90,
      },
      "RangedItemCalcValue": {
        "op": "num",
        "n": 60,
      },
      "ChampRange": {
        "op": "num",
        "n": 1,
      },
      "BonusDamage": {
        "op": "sum",
        "of": [
          {
            "op": "lerp",
            "from": 2,
            "to": 20,
          },
          {
            "op": "stat",
            "stat": "ap",
            "f": {
              "op": "num",
              "n": 0.1,
            },
          },
          {
            "op": "stat",
            "stat": "bonusAd",
            "f": {
              "op": "num",
              "n": 0.12,
            },
          },
        ],
      },
    },
    "rangedCalcs": {
      "MeleeItemCalcValue": {
        "op": "num",
        "n": 90,
      },
      "RangedItemCalcValue": {
        "op": "num",
        "n": 60,
      },
      "ChampRange": {
        "op": "num",
        "n": 2,
      },
      "BonusDamage": {
        "op": "sum",
        "of": [
          {
            "op": "lerp",
            "from": 2,
            "to": 20,
          },
          {
            "op": "stat",
            "stat": "ap",
            "f": {
              "op": "num",
              "n": 0.1,
            },
          },
          {
            "op": "stat",
            "stat": "bonusAd",
            "f": {
              "op": "num",
              "n": 0.12,
            },
          },
        ],
      },
    },
  },
  "lethaltempo": {
    "id": "lethaltempo",
    "name": "Lethal Tempo",
    "description": "keystone · Precision · valeurs du jeu",
    "kind": "lethaltempo",
    "icon":
      "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Precision/LethalTempo/LethalTempoTemp.png",
    "tree": "Precision",
    "values": {
      "Duration": 6,
      "MaxStacks": 6,
      "TTASPerStackMelee": 0.06,
      "PerfectlyTimedForgivance": 0.25,
      "TTASPerStackRanged": 0.04,
      "TTMinNoteDamageMelee": 9,
      "TTMaxNoteDamageMelee": 30,
      "TTMinNoteDamageRanged": 6,
      "TTMaxNoteDamageRanged": 24,
    },
    "calcs": {
      "NoteDamage": {
        "op": "mul",
        "of": [
          {
            "op": "lerp",
            "from": 9,
            "to": 30,
          },
          {
            "op": "sum",
            "of": [
              {
                "op": "num",
                "n": 1,
              },
              {
                "op": "stat",
                "stat": "bonusAttackSpeed",
                "f": {
                  "op": "num",
                  "n": 1,
                },
              },
            ],
          },
        ],
      },
      "ASPerStack": {
        "op": "num",
        "n": 0.06,
      },
    },
    "rangedCalcs": {
      "NoteDamage": {
        "op": "mul",
        "of": [
          {
            "op": "mul",
            "of": [
              {
                "op": "lerp",
                "from": 9,
                "to": 30,
              },
              {
                "op": "num",
                "n": 0.667,
              },
            ],
          },
          {
            "op": "sum",
            "of": [
              {
                "op": "num",
                "n": 1,
              },
              {
                "op": "stat",
                "stat": "bonusAttackSpeed",
                "f": {
                  "op": "num",
                  "n": 1,
                },
              },
            ],
          },
        ],
      },
      "ASPerStack": {
        "op": "num",
        "n": 0.048,
      },
    },
  },
  "presstheattack": {
    "id": "presstheattack",
    "name": "Press the Attack",
    "description": "keystone · Precision · valeurs du jeu",
    "kind": "pta",
    "icon":
      "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Precision/PressTheAttack/PressTheAttack.png",
    "tree": "Precision",
    "values": {
      "MinDamage": 40,
      "MaxDamage": 160,
      "BonusADRatio": 0,
      "APRatio": 0,
      "LethalityRatio": 0,
      "HitsRequired": 3,
      "TimeBetweenHits": 4,
      "AmpPotencyMaxSelf": 0.08,
      "AmpDuration": 5,
      "AmpPotencyMaxOthers": 0.08,
      "AmpPotencyStartSelf": 0.08,
      "AmpPotencyStartOthers": 0.08,
      "BonusPercentDamage": 0.08,
      "OutOfCombatTimer": 5,
      "Cooldown": 6,
    },
    "calcs": {},
  },
  "summonaery": {
    "id": "summonaery",
    "name": "Summon Aery",
    "description": "keystone · Sorcery · valeurs du jeu",
    "kind": "aery",
    "icon":
      "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Sorcery/SummonAery/SummonAery.png",
    "tree": "Sorcery",
    "values": {
      "ShieldBase": 20,
      "ShieldMax": 100,
      "ShieldRatio": 0.05,
      "DamageMax": 50,
      "DamageBase": 10,
      "DamageAPRatio": 0.05,
      "DamageADRatio": 0.1,
      "ShieldRatioAD": 0.1,
      "ShieldDuration": 2.5,
    },
    "calcs": {
      "DamageCalc": {
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
              "n": 0.05,
            },
          },
          {
            "op": "stat",
            "stat": "bonusAd",
            "f": {
              "op": "num",
              "n": 0.1,
            },
          },
        ],
      },
      "ShieldCalc": {
        "op": "sum",
        "of": [
          {
            "op": "lerp",
            "from": 20,
            "to": 100,
          },
          {
            "op": "stat",
            "stat": "ap",
            "f": {
              "op": "num",
              "n": 0.05,
            },
          },
          {
            "op": "stat",
            "stat": "bonusAd",
            "f": {
              "op": "num",
              "n": 0.1,
            },
          },
        ],
      },
    },
  },
  "glacialaugment": {
    "id": "glacialaugment",
    "name": "Glacial Augment",
    "description":
      "keystone · Inspiration · Immobilizing an enemy champion will cause 3 glacial rays that slow nearby enemies and reduce their damage to your allies.",
    "kind": "none",
    "icon":
      "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Inspiration/GlacialAugment/GlacialAugment.png",
    "tree": "Inspiration",
    "values": {
      "SlowZoneDuration": 3,
      "SlowZoneSlowBase": 20,
      "SlowZoneLength": 700,
      "SlowZoneWidth": 80,
      "RayCount": 3,
      "Cooldown": 25,
      "BeamPosIndent": 100,
      "CCCarryOverRatio": 100,
      "DmgReduction": 0.15,
      "SlowZoneSlowAPRatio": 0.06,
      "SlowZoneSlowbADRatio": 0.07,
      "SlowZoneSlowHealShieldRatio": 90,
    },
    "calcs": {
      "SlowZoneCalc": null,
    },
    "noDuelEffect": "ralentissements et réduction des dégâts infligés aux alliés : sans effet en 1 contre 1",
  },
  "phaserush": {
    "id": "phaserush",
    "name": "Stormraider's Surge",
    "description":
      "keystone · Sorcery · Dealing 25% of a champion's maximum health grants a burst of MS and Slow Resist.",
    "kind": "none",
    "icon":
      "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Sorcery/PhaseRush/StormraidersSurgeRuneIcon2.png",
    "tree": "Sorcery",
    "values": {
      "SlowResist": 0.5,
      "Duration": 4,
      "Window": 3,
      "MinCooldown": 10,
      "MaxCooldown": 20,
      "RangedEffectiveness": 0.75,
      "DamageThreshold": 0.25,
      "HasteMax": 0.48,
    },
    "calcs": {
      "CooldownCalc": {
        "op": "lerp",
        "from": 20,
        "to": 10,
      },
      "MoveSpeedCalc": {
        "op": "lerp",
        "from": 0.48,
        "to": 0.48,
      },
    },
    "rangedCalcs": {
      "CooldownCalc": {
        "op": "lerp",
        "from": 20,
        "to": 10,
      },
      "MoveSpeedCalc": {
        "op": "mul",
        "of": [
          {
            "op": "lerp",
            "from": 0.48,
            "to": 0.48,
          },
          {
            "op": "num",
            "n": 0.75,
          },
        ],
      },
    },
    "noDuelEffect":
      "vitesse de déplacement et résistance aux ralentissements : sans effet dans un duel immobile",
  },
  "unsealedspellbook": {
    "id": "unsealedspellbook",
    "name": "Unsealed Spellbook",
    "description":
      "keystone · Inspiration · Swap Summoner Spells while out of combat. Swapping to unique Summoner Spells will increase the rate at which you can make future swaps.",
    "kind": "none",
    "icon":
      "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Inspiration/UnsealedSpellbook/UnsealedSpellbook.png",
    "tree": "Inspiration",
    "values": {
      "ShardRechargeMinutes": 4.5,
      "ShardFirstMinutes": 6,
      "NumSummonersBeforeRepeat": 3,
      "ShardRechargeReductionSeconds": 25,
    },
    "calcs": {},
    "noDuelEffect": "échange de sorts d'invocateur : hors du modèle",
  },
};
