// ⚠ FICHIER GÉNÉRÉ — ne pas éditer à la main.
// Sources : wiki officiel (wiki.leagueoflegends.com), fichiers du jeu (CommunityDragon), Data Dragon.
// Régénérer : deno task data
// Patch de référence : 16.20.1
// Généré le : 2026-10-13

// Statut du passif de chaque champion : fichiers du jeu (data/mechanics.ts) ou wiki officiel.
import type { PassiveStatus } from "../types.ts";

export const GENERATED_PASSIVES: Record<string, PassiveStatus> = {
  "aatrox": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Innate: Periodically, Aatrox empowers his next basic attack to gain 50 bonus range and deal bonus magic damage equal to 4%–10% of the target's maximum health, capped at 100–320 against monsters.",
  },
  "ahri": {
    "verdict": "utility",
    "source": "wiki",
    "note": "Innate: Ahri generates a stack of Essence Fragment whenever she kills a minion or monster.",
  },
  "akali": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Swinging Kama: Akali's next basic attack is empowered to have an uncancellable windup, gain doubled range and deal 35–182 (+ 60% bonus AD) (+ 55% AP) bonus magic damage.",
  },
  "akshan": {
    "verdict": "modeled",
    "source": "game",
    "note": "The shield may be gained only once every few seconds.",
  },
  "alistar": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Triumphant Roar can occur only once every few seconds, though Alistar may still generate stacks before then.",
  },
  "ambessa": {
    "verdict": "modeled",
    "source": "wiki",
    "note":
      "Medarda Maxim: Ambessa's next basic attack on-attack is empowered to have an uncancellable windup, gain 75 bonus range and 50% bonus attack speed, deal 5–25 (+ 20% bonus AD) bonus physical damage, which applies life steal, and restore 40–70 energy.",
  },
  "amumu": {
    "verdict": "conditional",
    "source": "wiki",
    "note": "Cursed targets receive 10% bonus true damage from all incoming pre-mitigation magic damage.",
  },
  "anivia": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Periodically, upon taking fatal damage, Anivia enters resurrection for 6 seconds and restores all of her health.",
  },
  "annie": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate - Pyromania: Annie generates a stack of Pyromania whenever she hits an enemy with Disintegrate or casts her other abilities, stacking up to 4 times, at which she gains Energized.",
  },
  "aphelios": {
    "verdict": "utility",
    "source": "wiki",
    "note": "Innate: Aphelios has access to an arsenal of 5 Moonstone Weapons, created by his sister Alune.",
  },
  "ashe": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Innate: Ashe's basic attacks deal bonus physical damage equal to 0%–100% (+ 0%–30%) (based on critical strike chance) of the attack's damage.",
  },
  "aurelionsol": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Aurelion Sol's damaging abilities against enemies generate him permanent stacks of Stardust, which gradually augments his abilities.",
  },
  "aurora": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "The third stack against a target consumes them all to deal bonus magic damage equal to 1% (+ 2.7% per 100 AP) of the target's maximum health.",
  },
  "azir": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "The Sun Disc functions the same as a standard inner turret but deals magic damage, gains 40% AP bonus attack damage, and grants its kill credit to Azir.",
  },
  "bard": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "While he has Meeps, his basic attacks are empowered to each consume a Meep on-attack to deal 30 (+ 6 per 5 Chimes collected) (+ 40% AP) bonus magic damage.",
  },
  "belveth": {
    "verdict": "utility",
    "source": "wiki",
    "note": "Innate: Bel'Veth is allowed to exceed the attack speed cap.",
  },
  "blitzcrank": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Periodically, when damaged to 30% maximum health, Blitzcrank generates a shield equal to 35% of maximum mana, lasting for up to 10 seconds.",
  },
  "brand": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Ablaze: While afflicted with Ablaze, the target is dealt magic damage equal to 2% of their maximum health over 4 seconds. 0.167% of their maximum health every 0.25 seconds over 4 seconds. Each stack of Ablaze deals damage to the target individually and applies their damage ticks dependent on the time they were applied, even if the duration of all the stacks are refreshed.",
  },
  "braum": {
    "verdict": "conditional",
    "source": "wiki",
    "note": "This effect cannot apply to the same target more than once every few seconds.",
  },
  "briar": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "The bleed deals 10–50 (+ 50% bonus AD) total physical damage and heals Briar for 2.5–12.5 (+ 12.5% bonus AD) over the duration, increased by 2.5–12.5 (+ 12.5% bonus AD) and 0.63–3.13 (+ 3.125% bonus AD) for each subsequent stack respectively and up to a maximum of 20–100 (+ 100% bonus AD) total physical damage and 5–25 (+ 25% bonus AD) over the duration. 1–5 (+ 5% bonus AD) physical damage and heals Briar for 0.25–1.25 (+ 1.25% bonus AD) every 0.5 seconds, increased by 0.25–1.25 (+ 1.25% bonus AD) and 0.06–0.31 (+ 0.3125% bonus AD) for each subsequent stack respectively and up to a maximum of 2–10 (+ 10% bonus AD) physical damage and 0.5–2.5 (+ 2.5% bonus AD) per tick. If a target dies while bleeding, she will heal herself equal to 125% of the remaining bleed damage.",
  },
  "caitlyn": {
    "verdict": "modeled",
    "source": "game",
    "note":
      "Headshot: Caitlyn's basic attack is empowered to have an uncancellable windup and deal 60%–100% (+ 0%–100% (+ 0%–30%) (based on critical strike chance)) AD bonus physical damage, increased to 110% (+ 0%–100% (+ 0%–30%) (based on critical strike chance)) AD against non-champions.",
  },
  "camille": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Innate: Periodically, Camille's next basic attack on-hit against an enemy champion grants her a shield equal to 10%–20% of her maximum health, lasting for 2 seconds and absorbing damage from either exclusively physical damage or magic damage, based on which type the target has previously dealt most of against champions as well as on Camille's current armor and magic resistance.",
  },
  "cassiopeia": {
    "verdict": "utility",
    "source": "wiki",
    "note": "Innate: Cassiopeia increases the effectiveness of all movement speed bonuses by 5%–36%.",
  },
  "chogath": {
    "verdict": "utility",
    "source": "wiki",
    "note": "Innate: Whenever Cho'Gath kills an enemy, it heals for 18–52 and restores 4.72–9.48 mana.",
  },
  "corki": {
    "verdict": "modeled",
    "source": "wiki",
    "note": "Innate: Corki's basic attacks deal bonus true damage equal to 20% AD.",
  },
  "darius": {
    "verdict": "modeled",
    "source": "game",
    "note":
      "Hemorrhage: For each stack, the target is dealt 13–30 (+ 30% bonus AD) total physical damage over the duration, 3.25–7.5 (+ 7.5% bonus AD) physical damage every 1.25 seconds over the duration, up to a maximum of 65–150 (+ 150% bonus AD) total physical damage over the duration. 16.25–37.5 (+ 37.5% bonus AD) physical damage with each tick. Hemorrhage deals 250% damage against monsters.",
  },
  "diana": {
    "verdict": "modeled",
    "source": "game",
    "note":
      "At 2 stacks, Diana empowers her next basic attack to consume the stacks on-hit to additionally cleave nearby enemies, dealing them 20–220 (+ 50% AP) magic damage.",
    "wiki": [
      {
        "kind": "onHit",
        "name": "Moonsilver Blade",
        "type": "magic",
        "damage": {
          "op": "sum",
          "of": [
            {
              "op": "byLevel",
              "v": [
                20,
                25,
                30,
                35,
                40,
                45,
                55,
                65,
                75,
                85,
                95,
                110,
                125,
                140,
                155,
                170,
                195,
                220,
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
        "every": {
          "op": "num",
          "n": 3,
        },
      },
    ],
  },
  "drmundo": {
    "verdict": "utility",
    "source": "wiki",
    "note": "Innate: Dr.",
  },
  "draven": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: When Draven catches a Spinning Axe, kills a non-champion, or destroys a turret, he gains a stack of Adoration.",
  },
  "ekko": {
    "verdict": "conditional",
    "source": "wiki",
    "note": "Resonance cannot affect the same target more than once every few seconds.",
  },
  "elise": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Innate - Spider Form: Elise's basic attacks deal 14–44 Spider Form's Rank) (+ 15% AP) bonus magic damage and heal her for 6–12 Spider Form's Rank) (+ 8% AP) on-hit.",
  },
  "evelynn": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Evelynn shrouds herself in Demon Shade after not performing actions that break stealth for 4 seconds.",
  },
  "ezreal": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Ezreal generates a stack of Rising Spell Force for each enemy hit by his abilities, lasting for 6 seconds, refreshing on subsequent hits, and stacking up to 5 times.",
  },
  "fiddlesticks": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate - Scarecrow Effigy: Fiddlesticks begins the game with an exclusive Scarecrow Effigy, which permanently occupies the trinket slot.",
  },
  "fiora": {
    "verdict": "modeled",
    "source": "game",
    "note":
      "Dealing damage in the direction of a Vital will trigger it to deal bonus true damage equal to 3% (+ 4% per 100 bonus AD) of target's maximum health, heal Fiora for 35–100, and grant her 20%–50% Grand Challenge's Rank) bonus movement speed that decays over 1.85 seconds.",
  },
  "fizz": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Fizz is permanently ghosted and reduces every instance of pre-mitigation damage taken by 4 (+ 1% AP), up to a maximum of 50% reduction.",
  },
  "galio": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Innate: Periodically, Galio's next basic attack is empowered to have an uncancellable windup, gain 40% bonus attack speed and deal 15–115 (+ 100% AD) (+ 40% AP) (+ 60% bonus magic resistance) modified magic damage to the target and all enemies near them.",
  },
  "gangplank": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Innate: Periodically, Gangplank empowers his next basic attack to set the target on fire, dealing them 50–250 (+ 100% bonus AD) bonus true damage over 2.5 seconds. 5–25 (+ 10% bonus AD) bonus true damage every 0.25 seconds over 2.5 seconds. Turrets are dealt 50% damage.",
  },
  "garen": {
    "verdict": "utility",
    "source": "wiki",
    "note": "Innate: Garen regenerates an additional 1.5%–10.1% of his maximum health every 5 seconds.",
  },
  "gnar": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate - Rage Gene: Mini Gnar generates 4–11 Rage over 2 seconds upon dealing or receiving damage, up to 100.",
  },
  "gragas": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Periodically, after casting an ability, Gragas heals himself for 5.5% of his maximum health.",
  },
  "graves": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Innate - 12-Gauge: Graves' basic attack sprays 4 pellets in a cone, each colliding with the first enemy unit in their path, dealing 70%–100.01% AD physical damage plus 23.31%–33.3% AD additional physical damage about one-third of the damage for each subsequent pellet hitting the same target, up to 139.93%–199.92% AD total physical damage against a single target.",
  },
  "gwen": {
    "verdict": "modeled",
    "source": "game",
    "note":
      "Innate: Gwen's basic attacks on-hit, the center of Snip Snip!, and Needlework deal bonus magic damage equal to 1% (+ 0.6% per 100 AP) of the target's maximum health.",
    "wiki": [
      {
        "kind": "onHit",
        "name": "A Thousand Cuts",
        "type": "magic",
        "damage": {
          "op": "sum",
          "of": [
            {
              "op": "num",
              "n": 0.01,
            },
            {
              "op": "stat",
              "stat": "ap",
              "f": {
                "op": "num",
                "n": 0.00006,
              },
            },
          ],
        },
        "scale": "targetMaxHp",
      },
    ],
  },
  "hecarim": {
    "verdict": "utility",
    "source": "wiki",
    "note": "Innate: Hecarim gains bonus attack damage equal to 12%–24% of his bonus movement speed.",
  },
  "heimerdinger": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Heimerdinger gains 20% bonus movement speed while near an allied turret or a H-28G Evolution Turret or H-28Q Apex Turret deployed by him.",
  },
  "hwei": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Subsequent damaging abilities against marked targets consume the mark to create an explosion beneath them, dealing 40–285 (+ 35% AP) bonus magic damage to enemies in the area after a 0.85-second delay.",
  },
  "illaoi": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Tentacles are commanded to attack by Illaoi's abilities, dealing 9–180 (+ 110% AD) (+ 40% AP) physical damage to all enemies struck, increased by 0%–30% Tentacle Smash's rank).",
  },
  "irelia": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "At maximum stacks, Irelia's basic attacks are empowered to deal 10–61 (+ 20% bonus AD) bonus magic damage on-hit.",
  },
  "ivern": {
    "verdict": "modeled",
    "source": "game",
    "note": "Innate: Ivern cannot attack nor damage non-epic monsters.",
  },
  "janna": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Janna's basic attacks on-hit and Zephyr deal bonus magic damage equal to 30% of her bonus movement speed.",
  },
  "jarvaniv": {
    "verdict": "conditional",
    "source": "wiki",
    "note": "This effect cannot occur on the same target more than once every few seconds.",
  },
  "jax": {
    "verdict": "modeled",
    "source": "game",
    "note":
      "Innate: Jax's basic attacks generate a stack of Relentless Assault on-attack for 2.5 seconds, refreshing on subsequent attacks and stacking up to 8 times.",
  },
  "jayce": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Whenever Jayce switches between either Hammer Stance or Cannon Stance, he gains ghosting and 30 bonus movement speed for 0.75 seconds.",
  },
  "jhin": {
    "verdict": "modeled",
    "source": "wiki",
    "note":
      "Jhin's final round attack has an uncancellable windup, always critically strikes, and deals bonus physical damage equal to 15%–25% of the target's missing health.",
  },
  "jinx": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Whenever Jinx scores a takedown against an enemy champion, epic monster, turret, or inhibitor within 3 seconds of damaging them, she gains 175% bonus movement speed decaying over 6 seconds.",
  },
  "ksante": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "His basic attacks against marked enemies are empowered to consume the mark, dealing 12 (+ 1%–2% of target's maximum health) bonus physical damage.",
  },
  "kaisa": {
    "verdict": "modeled",
    "source": "game",
    "note":
      "Innate - Caustic Wounds: Plasma stacks applied by Kai'Sa's basic attacks or Void Seeker deal 4–30 (+ 12% AP) additional magic damage plus 1–8 (+ 3% AP) additional magic damage per Plasma stack before application, up to a total of 8–62 (+ 24% AP) additional magic damage at 4 Plasma stacks before application.",
  },
  "kalista": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: When Kalista inputs a movement command during her basic attack windup or shortly after it completes, or while in cast time of Pierce, she will dash in that direction.",
  },
  "karma": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Mantra's current cooldown is reduced by 4 seconds for each enemy champion hit by Karma's damaging abilities.",
  },
  "karthus": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Upon taking fatal damage, Karthus enters a zombie state for 7 seconds, during which he can cast his abilities at no cost.",
  },
  "kassadin": {
    "verdict": "conditional",
    "source": "wiki",
    "note": "Innate: Kassadin is permanently ghosted and takes 10% reduced magic damage.",
  },
  "katarina": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Innate - Sinister Steel: Whenever Katarina retrieves a Dagger, she slashes around herself to deal 68–240 (+ 60% bonus AD) (+ 70%–100% AP) magic damage to nearby enemies, apply on-hit effects to enemy champions hit, and reduce Shunpo's current cooldown by 78%–96% of its total cooldown.",
  },
  "kayle": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "While Kayle is Exalted, her basic attacks on-attack also launch a wave of fire forward that deals 20–41 (+ 10% bonus AD) (+ 25% AP) magic damage to all enemies it passes through.",
  },
  "kayn": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Shadow Assassin Bonus: Upon entering combat with enemy champions, Kayn becomes empowered for 3 seconds to deal 20%–40% of post-mitigation physical and magic damage dealt against enemy champions as bonus magic damage.",
  },
  "kennen": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Kennen's abilities apply a stack of Mark of the Storm to enemies hit for 6 seconds, refreshing on subsequent applications and stacking up to 3 times.",
  },
  "khazix": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Unseen Threat: Kha'Zix empowers his next basic attack against an enemy champion to deal 22–141 (+ 50% bonus AD) bonus magic damage and slow them by 25% for 2 seconds.",
  },
  "kindred": {
    "verdict": "utility",
    "source": "wiki",
    "note": "Innate: Both Lamb and Wolf mark targets to hunt.",
  },
  "kled": {
    "verdict": "utility",
    "source": "wiki",
    "note": "Innate: Kled rides his semi-trusty mount, Skaarl.",
  },
  "kogmaw": {
    "verdict": "conditional",
    "source": "wiki",
    "note": "At the end of the duration, he explodes to deal 140–650 true damage to nearby enemies.",
  },
  "leblanc": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Periodically, when LeBlanc is damaged to 40% maximum health, she creates a clone of herself, after which they both instantly become invisible for 1 second.",
  },
  "leesin": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: After casting an ability, Lee Sin's next 2 basic attacks on-hit within 3 seconds gain 40% bonus attack speed and restore energy.",
  },
  "leona": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Allied champions' damaging attacks and abilities against a marked target will consume the mark to deal 32–151 bonus magic damage.",
  },
  "lillia": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Innate: Lillia's abilities apply Dream Dust to enemies hit, which deals 5% (+ 1.25% per 100 AP) of the target's maximum health total magic damage over 3 seconds, capped at 70–180 against monsters. 0.83% (+ 0.2083% per 100 AP) of the target's maximum health magic damage every 0.5 seconds over 3 seconds, capped at 11.67–30 per tick against monsters.",
  },
  "lissandra": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "They will chase nearby visible enemies for 4 seconds, prioritizing champions, after which they shatter to deal 120–520 (+ 50% AP) magic damage to nearby enemies.",
  },
  "locke": {
    "verdict": "modeled",
    "source": "game",
    "note":
      "Innate: Locke's basic attacks deal 5–40 (+ 10% AP) bonus magic damage on-hit, increased by 0%–100%, up to 10–80 (+ 20% AP).",
    "wiki": [
      {
        "kind": "onHit",
        "name": "Silver Stake",
        "type": "magic",
        "damage": {
          "op": "sum",
          "of": [
            {
              "op": "byLevel",
              "v": [
                5,
                7.06,
                9.12,
                11.18,
                13.24,
                15.29,
                17.35,
                19.41,
                21.47,
                23.53,
                25.59,
                27.65,
                29.71,
                31.76,
                33.82,
                35.88,
                37.94,
                40,
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
    ],
  },
  "lucian": {
    "verdict": "modeled",
    "source": "wiki",
    "note":
      "Innate: After casting an ability, Lucian's next basic attack within 3.5 seconds fires an additional shot on-attack after 0.25 seconds, which deals 50%–60% AD physical damage.",
  },
  "lulu": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Each bolt deals 5–39 (+ 5% AP) magic damage to the first enemy it collides with, for a total of 15–117 (+ 15% AP) on hitting a single target with all three bolts.",
  },
  "lux": {
    "verdict": "modeled",
    "source": "game",
    "note":
      "Lux's basic attacks on-hit and Final Spark consume the mark to deal 30–200 (+ 35% AP) bonus magic damage.",
  },
  "malphite": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate - Shard of the Monolith: Malphite gains increased percentage size equal to 8% of his total armor, capped at 35% increased size at 437.5 armor.",
  },
  "malzahar": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Periodically, Malzahar gains Void Shift until he takes non- minion damage or negates a crowd control effect, to which it then lingers for 0.25 seconds before expiring.",
  },
  "maokai": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Periodically, Maokai empowers his next basic attack to have an uncancellable windup and heal him for 4%–12.8% maximum health after a 0.25-second delay.",
  },
  "masteryi": {
    "verdict": "modeled",
    "source": "game",
    "note":
      "At 3 stacks, Master Yi's next basic attack on-attack is empowered to consume the stacks on-hit and strike twice, the second strike dealing 50% AD physical damage.",
    "wiki": [
      {
        "kind": "onHit",
        "name": "Double Strike",
        "type": "physical",
        "damage": {
          "op": "stat",
          "stat": "ad",
          "f": {
            "op": "num",
            "n": 0.5,
          },
        },
        "every": {
          "op": "num",
          "n": 4,
        },
      },
    ],
  },
  "mel": {
    "verdict": "modeled",
    "source": "wiki",
    "note":
      "Each projectile deals 8–30 (+ 4% AP) magic damage, for a total possible damage of 72–270 (+ 36% AP) at maximum stacks.",
  },
  "milio": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Innate: Milio's ability hits on himself and allied champions grant an enchantment for 4 seconds, which causes the next basic attack or ability hit against enemies to deal 7%–15% of enchanted target's AD bonus magic damage and apply a burn that deals 10–50 (+ 20% of Milio's AP) magic damage 1.67–8.33 (+ 3.33% of Milio's AP) magic damage every 0.25 seconds over 1.5 seconds.",
  },
  "missfortune": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "If the enemy was unmarked, this also deals 50%–100% AD bonus physical damage, halved to 25%–50% AD against minions.",
  },
  "mordekaiser": {
    "verdict": "modeled",
    "source": "game",
    "note": "Innate: Mordekaiser's basic attacks are empowered to deal 40% AP bonus magic damage on-hit.",
    "wiki": [
      {
        "kind": "onHit",
        "name": "Darkness Rise",
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
  },
  "morgana": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Morgana heals herself for 18% of the post-mitigation damage dealt by her abilities against champions, large minions, and medium and large monsters.",
  },
  "naafiri": {
    "verdict": "utility",
    "source": "wiki",
    "note": "Innate: Periodically, Naafiri summons a Packmate that fights alongside her.",
  },
  "nami": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Nami's abilities grant 100 (+ 25% AP) bonus movement speed to allied champions hit, decaying over 1.5 seconds.",
  },
  "nasus": {
    "verdict": "utility",
    "source": "wiki",
    "note": "Innate: Nasus gains 10%–20% life steal.",
  },
  "nautilus": {
    "verdict": "conditional",
    "source": "wiki",
    "note": "This effect cannot occur on the same target more than once every few seconds.",
  },
  "neeko": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Neeko has a collection of disguises to take on the appearance of allied champions, displayed on her Disguise Menu.",
  },
  "nidalee": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate - Prowl: While in brush, Nidalee gains ghosting and 10% bonus movement speed, increased to 30% while facing a visible enemy champion within 1400 range.",
  },
  "nilah": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Whenever Nilah kills a minion, she and the nearest allied champion gain an additional 50% of the experience they would have lost from sharing.",
  },
  "nocturne": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Innate: Periodically, Nocturne empowers his next basic attack to slash in a circle, dealing 120% AD physical damage to the target and nearby enemies and healing himself for 13–30 (+ 30% AP) per enemy hit.",
  },
  "nunu": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Willump's basic attacks additionally deal 30% AD physical damage to secondary targets in a cone in front of him.",
  },
  "olaf": {
    "verdict": "utility",
    "source": "wiki",
    "note": "Innate: Olaf gains 0%–100% of 50%–100% bonus attack speed and 8%–25% life steal.",
  },
  "orianna": {
    "verdict": "modeled",
    "source": "game",
    "note":
      "Clockwork Winding: Orianna's basic attacks are empowered to deal 10–50 (+ 15% AP) bonus magic damage on-hit, increased by 15% 1.5–7.5 (+ 2.25% AP) per stack, up to 13–65 (+ 19.5% AP) total bonus magic damage.",
  },
  "ornn": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Ornn's and allies' immobilizing effects or silences against Brittle enemies will consume the debuff to deal bonus magic damage equal to 9%–17% of the target's maximum health, capped at 200–500 Bellows Breath's rank) against monsters, and cause the crowd control to last 30% longer (if applicable).",
  },
  "pantheon": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Pantheon generates a stack of Mortal Will whenever he lands a basic attack on-hit or casts an ability, stacking up to 5 times.",
  },
  "poppy": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Innate: Periodically, Poppy's next basic attack on-attack is empowered to throw her buckler, gaining 350 bonus range and dealing 20–180 bonus magic damage.",
  },
  "pyke": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Pyke's maximum health cannot increase except through growth (per level), instead he gains 1 bonus attack damage per 14 bonus health.",
  },
  "qiyana": {
    "verdict": "conditional",
    "source": "wiki",
    "note": "This effect cannot occur on the same target more than once every few seconds.",
  },
  "quinn": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Quinn's basic attacks on-hit against Harrier targets are empowered to consume the mark to deal 15–120 (+ 40% bonus AD) bonus physical damage.",
  },
  "rakan": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Periodically, Rakan grants himself a shield for 30–225 (+ 95% AP) that lasts until broken.",
  },
  "rammus": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Rammus gains bonus attack damage equal to the sum of 15% total armor and 15% total magic resistance.",
  },
  "reksai": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Rek'Sai basic attacks generate 25 Fury on-hit, reduced to 4 per hit against minions, and to 5 per hit against wards and jungle plants.",
  },
  "rell": {
    "verdict": "modeled",
    "source": "game",
    "note":
      "Innate: Rell's basic attacks deal bonus magic damage on-hit equal to the sum of 5% of her total armor and 5% of her total magic resistance.",
  },
  "renata": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "If the enemy was unmarked, the attack also deals bonus magic damage equal to 1%–2% (+ 2% per 100 AP) of the target's maximum health.",
  },
  "renekton": {
    "verdict": "utility",
    "source": "wiki",
    "note": "Innate: Renekton's basic attacks generate 5 Fury on-hit.",
  },
  "rengar": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Upon casting a basic ability or using Savagery's first attack, Rengar generates a stack of Ferocity for 1 second, stacking up 4 times but not refreshing on subsequent triggers (unexpected).",
  },
  "riven": {
    "verdict": "modeled",
    "source": "game",
    "note":
      "Riven's basic attacks are empowered to each consume a stack to deal bonus physical damage equal to 30%–45% AD.",
    "wiki": [
      {
        "kind": "afterAbility",
        "name": "Runic Blade",
        "type": "physical",
        "damage": {
          "op": "stat",
          "stat": "ad",
          "f": {
            "op": "byLevel",
            "v": [
              0.3,
              0.3088,
              0.3176,
              0.3265,
              0.3353,
              0.3441,
              0.3529,
              0.3618,
              0.3706,
              0.3794,
              0.3882,
              0.3971,
              0.4059,
              0.4147,
              0.4235,
              0.4324,
              0.4412,
              0.45,
            ],
          },
        },
      },
    ],
  },
  "rumble": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "During this time, he gains 30%–100% bonus attack speed and empowers his basic attacks to deal 5–40 (+ 25% AP) (+ 4% of the target's maximum health) bonus magic damage on-hit.",
  },
  "ryze": {
    "verdict": "utility",
    "source": "wiki",
    "note": "Innate: Ryze increases his maximum mana by (10% per 100 AP).",
  },
  "samira": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "The empowered attack resets Samira's basic attack timer, is affected by critical strike modifiers, applies on-hit effects only once, and cannot occur on the same target more than once every few seconds.",
  },
  "sejuani": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Sejuani's next basic attack or ability against a Frozen enemy will consume the mark to deal bonus magic damage equal to 10% of their maximum health, capped at 250 against epic monsters.",
  },
  "senna": {
    "verdict": "modeled",
    "source": "wiki",
    "note":
      "Innate - Relic Cannon: Senna's basic attacks on-hit deal 20% AD bonus physical damage and grant her 10%–20% of the target's movement speed as bonus movement speed for 0.5 seconds.",
  },
  "seraphine": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "While any amount of Notes are active, Seraphine's next basic attack is empowered to have an uncancellable windup, gain 25 bonus attack range per Note, and fire all Notes at the target, with each one dealing 4–25 (+ 4% AP) magic damage, reduced by 75% for Notes from allies.",
  },
  "sett": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Sett's Right Punch is empowered to gain 50 bonus range (unless Knuckle Down is active), attack at 8 times the Left Punch's attack speed, and deal 5–90 (+ 55% bonus AD) bonus physical damage.",
  },
  "shaco": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Innate: Shaco's basic attacks are empowered to deal 20–30 (+ 20% bonus AD) bonus physical damage when hitting an enemy from behind.",
  },
  "shen": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: After completing an ability's effects, Shen grants himself a shield for 47–120 (+ 13% bonus health) for 2.5 seconds.",
  },
  "shyvana": {
    "verdict": "utility",
    "source": "wiki",
    "note": "Innate: Shyvana generates Scalemail stacks from scoring takedowns against certain enemies.",
  },
  "singed": {
    "verdict": "conditional",
    "source": "wiki",
    "note": "This effect cannot occur on the same target more than once every few seconds.",
  },
  "sion": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Sion can only move and use his basic attacks and item actives, and empowers himself with the following effects: 1.75 attack speed minimum and maximum 100% life steal Basic attacks deal bonus physical damage on-hit equal to 10% of the target's maximum health, capped at 75 against non-champions Ghosting One cast of Death Surge, which replaces all of his abilities",
  },
  "sivir": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Sivir's basic attacks on-attack and ability hits against enemy champions grant her 55–75 bonus movement speed decaying over 1.5 seconds, refreshing on subsequent hits.",
  },
  "skarner": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Enemies afflicted with 3 stacks take magic damage equal to 5%–9% of their maximum health over the duration, capped at 100–300 against monsters. 0.63%–1.13% of their maximum health every 0.5 seconds over the duration, capped at 12.5–37.5 per tick against monsters.",
  },
  "smolder": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Super Scorcher Breath: Deals bonus magic damage equal to 25%–60% (+ 0%–10.5%) (based on critical strike chance) of Dragon Practice stacks.",
  },
  "sona": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "At 3 stacks, her next basic attack is empowered to consume them all to have an uncancellable windup, deal 20–240 (+ 20% AP) bonus magic damage, and apply an additional effect based on the last basic ability she cast: Hymn of Valor - Staccato: Bonus damage is modified to 30–360 (+ 30% AP).",
  },
  "soraka": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Soraka gains 90% bonus movement speed while facing nearby allied champions that are below 40% of their maximum health.",
  },
  "swain": {
    "verdict": "utility",
    "source": "wiki",
    "note": "Innate: Enemy champions that die will leave behind a Soul Fragment for 16 seconds.",
  },
  "sylas": {
    "verdict": "modeled",
    "source": "wiki",
    "note":
      "Unshackled: Sylas' next basic attack gains 125% bonus attack speed and is empowered to have an uncancellable windup and consume a stack to whirl his chains around him, dealing 130% AD (+ 30% AP) magic damage to the primary target and 40% AD (+ 20% AP) magic damage to nearby enemies.",
  },
  "syndra": {
    "verdict": "conditional",
    "source": "wiki",
    "note": "This cannot occur on the same target more than once every few seconds.",
  },
  "tahmkench": {
    "verdict": "modeled",
    "source": "wiki",
    "note":
      "Innate: Tahm Kench's basic attacks on-hit and Tongue Lash are empowered to deal 5–60 (+ 1.25% AP per 100 bonus health) (+ 4% of his bonus health) bonus magic damage and apply a stack of An Acquired Taste against enemy champions for 5 seconds, refreshing on subsequent hits and stacking up to 3 times.",
  },
  "taliyah": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: While near terrain, Taliyah gains 10%–40% bonus movement speed, which builds up over 1 second while in range for at least 0.4 seconds, and decays at the same rate once out of range for at least 3 seconds.",
  },
  "talon": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Talon's next basic attack on-hit against an enemy with 3 Wound stacks is empowered to consume them all to cause the target to bleed, dealing 80–280 (+ 210% bonus AD) total physical damage 5–17.5 (+ 13.125% bonus AD) physical damage every 0.125 seconds over 2 seconds.",
  },
  "taric": {
    "verdict": "modeled",
    "source": "wiki",
    "note":
      "Innate: After casting an ability, Taric empowers his next two basic attacks within 5 seconds to each gain 100% total attack speed, deal 25–93 (+ 15% bonus armor) bonus magic damage on-attack, and reduce the remaining cooldowns of his basic abilities by 1–2 seconds.",
  },
  "teemo": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Teemo gains invisibility after 1.5 seconds without moving, taking non- over time damage, performing actions that break stealth, channeling, or being in stasis.",
  },
  "thresh": {
    "verdict": "utility",
    "source": "wiki",
    "note": "Innate: Thresh's armor does not increase through growth (per level).",
  },
  "tristana": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Tristana's basic attacks, Explosive Charge and Buster Shot gain 0–150 bonus range, for a total of 550–700.",
  },
  "trundle": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Whenever a nearby enemy dies, Trundle heals himself for 1.8%–5.5% of their maximum health.",
  },
  "tryndamere": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Tryndamere generates 5 Fury on his basic attacks on-hit, and 10 Fury on critical strikes and each time he kills an enemy.",
  },
  "twistedfate": {
    "verdict": "utility",
    "source": "wiki",
    "note": "Innate: Whenever Twisted Fate kills an enemy, he generates 1–6.",
  },
  "twitch": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Deadly Venom: For each stack, the target is dealt 1–5 (+ 3% AP) true damage per second over the duration, 6–30 (+ 18% AP) total true damage over the duration, for a maximum of 6–30 (+ 18% AP) true damage with each tick. 36–180 (+ 108% AP) total true damage over the duration. This effect is considered a poison.",
  },
  "udyr": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate - Awakened Spirit: Udyr has no ultimate ability and instead has 4 basic abilities that each incur a 1.5-second global cooldown when cast.",
  },
  "urgot": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Urgot's next basic attack on-hit within the arc of a shotgun will cause it to fire in a cone, dealing 40%–100% AD (+ 2%–6% of target's maximum health) physical damage to enemies hit, capped at 100–360 against monsters.",
  },
  "varus": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: When Varus kills an enemy, he gains 10%–20% bonus attack speed as well as bonus attack damage and ability power equal to 11% of his total bonus attack speed for 5–11 seconds, refreshing on subsequent unit kills.",
  },
  "vayne": {
    "verdict": "modeled",
    "source": "game",
    "note":
      "Innate: Vayne gains 30 bonus movement speed while facing a nearby visible enemy champion, increased to 90 while under the effects of Final Hour.",
  },
  "veigar": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Veigar generates a stack of Phenomenal Evil for each enemy champion hit by his abilities, and 5 stacks whenever he scores an enemy champion takedown.",
  },
  "velkoz": {
    "verdict": "conditional",
    "source": "wiki",
    "note": "The third stack consumes them all to deal 35–180 (+ 60% AP) bonus true damage.",
  },
  "vex": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Gloom's detonation deals 40–150 (+ 25% AP) bonus magic damage and refunds 25% of Doom's cooldown.",
  },
  "vi": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Periodically, Vi's next ability hit grants her a shield equal to 10% of her maximum health for 3 seconds.",
  },
  "viego": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Whenever Viego scores an enemy champion takedown while alive and within 3 seconds of damaging them, a Mist Wraith spawns from that champion's corpse for 8 seconds.",
  },
  "viktor": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Viktor can augment each of his abilities at the cost of 100 Hex Fragments, which he gains from killing enemies: Minions and monsters generate 1 Hex Fragment.",
  },
  "vladimir": {
    "verdict": "utility",
    "source": "wiki",
    "note": "Innate: Vladimir gains (3.333% bonus health) as ability power and (160% AP) as bonus health.",
  },
  "volibear": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Lightning Claws: Volibear's claws ignite with lightning, empowering his basic attacks on-hit to deal 11–60 (+ 20% bonus AD) (+ 45% AP) bonus magic damage to the target and the nearest visible enemy within 450 units of the target, chaining up to 4 subsequent targets.",
  },
  "warwick": {
    "verdict": "modeled",
    "source": "wiki",
    "note": "Innate: Warwick deals 6–55 (+ 15% bonus AD) (+ 10% AP) bonus magic damage on-hit.",
  },
  "monkeyking": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Wukong gains 6–10 bonus armor and regenerates an additional 0.35% of his maximum health every 5 seconds.",
  },
  "xayah": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Xayah's basic attacks are empowered to each consume a stack on-attack to instead shoot a Feather that deals the triggering attack's damage to the primary target and 35%–55% AD physical damage to other enemies hit.",
  },
  "xerath": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Periodically, Xerath empowers his next basic attack on-hit to restore 30–195 mana, doubled to 60–390 against enemy champions.",
  },
  "xinzhao": {
    "verdict": "modeled",
    "source": "wiki",
    "note":
      "The third stack consumes them all to deal 15%–60% AD (+ 5%–20% AP) bonus physical damage and heal Xin Zhao for 2%–5% of his maximum health (+ 40%–70% AP).",
  },
  "yasuo": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Yasuo's critical strikes deal only (190% + 28.5%) AD physical damage. 95% of the critical damage champions usually have.",
  },
  "yone": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Yone begins attacking with Steel Sword, and basic attacks with Azakana Sword deal 50% AD physical damage and 50% AD magic damage.",
  },
  "yorick": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate - Final Service: Whenever Yorick uses Last Rites to score the killing blow on any enemy or damage an enemy champion or large monster, he raises a grave at their location.",
  },
  "yunara": {
    "verdict": "conditional",
    "source": "wiki",
    "note": "Innate: Yunara's critical strikes deal 10% (+ 10% per 100 AP) bonus magic damage.",
  },
  "yuumi": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Periodically, Yuumi's next basic attack against an enemy champion is empowered to have an uncancellable windup, gain 50 bonus range and become non-projectile.",
  },
  "zaahen": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Zaahen generates a stack of Determination for each enemy champion damaged by his basic attacks and abilities, lasting for 5 seconds, refreshing on subsequent triggers, and stacking up to 12 times.",
  },
  "zac": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate - The Secret Weapon: Zac gains increased percentage size equal to 1.5% of his bonus health, capped at 35% increased size at 2333.33 bonus health.",
  },
  "zed": {
    "verdict": "conditional",
    "source": "wiki",
    "note": "Contempt for the Weak cannot occur on the same champion more than once every few seconds.",
  },
  "zeri": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Basic Attack: Zeri zaps the target, dealing 10–25 (+ 3% AP) magic damage, applying spell effects as spell damage, triggering on-cast effects and executing the target if they are below 70–160 (+ 20% AP) health.",
  },
  "ziggs": {
    "verdict": "conditional",
    "source": "wiki",
    "note":
      "Innate: Periodically, Ziggs empowers his next basic attack to deal 20–160 (+ 50% AP) bonus magic damage, increased by 75% against structures. increased to 35–280 (+ 87.5% AP) against structures.",
  },
  "zilean": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Zilean generates 2–12 experience (does not count towards his own level up) every 5 seconds.",
  },
  "zoe": {
    "verdict": "modeled",
    "source": "wiki",
    "note":
      "Innate: After casting an ability, Zoe empowers her next basic attack or Spell Thief bolt within 5 seconds to become non-projectile and deal 16–130 (+ 20% AP) bonus magic damage.",
  },
  "zyra": {
    "verdict": "utility",
    "source": "wiki",
    "note":
      "Innate: Periodically, Zyra spawns one or two Seeds nearby that last for 30 seconds, granting sight over the surrounding area for 1 second.",
  },
};
