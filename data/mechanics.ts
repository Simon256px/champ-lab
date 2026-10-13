import type { GameRef, Mechanic } from "./types.ts";

/**
 * Mécaniques de kit absentes de Meraki — passifs surtout.
 *
 * On ne saisit PAS de chiffres ici : chaque valeur est une référence (`GameRef`)
 * vers les fichiers du jeu (CommunityDragon), que `deno task data` résout au
 * patch courant dans data/generated/mechanics.gen.ts. Ce fichier décrit seulement
 * QUOI modéliser ; les nombres suivent le jeu.
 *
 * Vocabulaire (data/types.ts, `Mechanic`), appliqué par lib/engine.ts :
 *
 *   onHit                dégâts en plus tous les N coups d'auto
 *   abilityOnHit         un sort qui se déclenche sur les autos au lieu d'être lancé
 *   periodic             dégâts (et soin) toutes les X secondes
 *   stackingAttackSpeed  VA bonus qui s'empile à chaque auto
 *   missingHpHeal        soin en % des PV manquants à chaque lancer d'un sort
 *   abilityDamage        donne des dégâts à un sort que Meraki laisse utilitaire
 *   pet                  familier invoqué (Daisy) : attaques, onde de choc, PV
 *   afterAbility         chaque sort charge la prochaine auto (Riven, Lux)
 *   parry                parade : bloque le plus gros coup et le plus long contrôle adverses
 *   dodgeAutos           esquive les autos adverses pendant X secondes
 *
 * Pour trouver le nom d'un calcul : ouvrir
 * https://raw.communitydragon.org/latest/game/data/characters/<id>/<id>.bin.json
 * et chercher le sort (mSpell → mSpellCalculations / DataValues). Voir
 * docs/adding-a-champion.md.
 */
export const MECHANICS: Record<string, Mechanic<GameRef>[]> = {
  // --- Passifs à l'impact : textes des infobulles du jeu, valeurs du passif ---
  akshan: [
    // Sale combat : « After launching an Attack, Akshan will fire an additional shot ».
    { kind: "onHit", name: "Second tir", type: "physical", damage: { slot: "P", calc: "SecondAutoDamage" } },
    // « Every three hits … deals an additional … magic damage » (compté sur les autos seules).
    {
      kind: "onHit",
      name: "Sale combat",
      type: "magic",
      every: { slot: "P", value: "MaxStacks" },
      damage: { slot: "P", calc: "PassiveProcDamage" },
    },
  ],
  caitlyn: [
    // Headshot : 5 stacks (1 par auto), la 6e auto est un headshot.
    {
      kind: "onHit",
      name: "Headshot",
      type: "physical",
      every: { slot: "P", value: "AttacksPerHeadshot", plus: 1 },
      damage: { slot: "P", calc: "HeadShotBonusDamage" },
    },
  ],
  diana: [{
    kind: "onHit",
    name: "Lame lunaire",
    type: "magic",
    every: { slot: "P", value: "AttackCount" },
    damage: { slot: "P", calc: "CleaveDamage" },
  }],
  gwen: [{
    kind: "onHit",
    name: "Mille coupures",
    type: "magic",
    damage: { slot: "P", calc: "PercentHealth1000Cuts" },
    scale: "targetMaxHp",
  }],
  kaisa: [{
    kind: "onHit",
    name: "Plasma (base)",
    type: "magic",
    damage: { slot: "P", calc: "PBaseDamage" },
  }],
  locke: [{
    kind: "onHit",
    name: "Dégâts à l'impact",
    type: "magic",
    damage: { slot: "P", calc: "MinOnHitDamage" },
  }],
  lux: [{
    kind: "afterAbility",
    name: "Illumination",
    type: "magic",
    damage: { slot: "P", calc: "TotalDamage" },
  }],
  masteryi: [{
    kind: "onHit",
    name: "Double frappe",
    type: "physical",
    every: { slot: "P", value: "AttackCount" },
    damage: { slot: "P", calc: "TotalDamage" },
  }],
  mordekaiser: [{
    kind: "onHit",
    name: "Ténèbres",
    type: "magic",
    damage: { slot: "P", calc: "BonusAPAuto" },
  }],
  orianna: [{ kind: "onHit", name: "Remontoir", type: "magic", damage: { slot: "P", calc: "TotalDamage" } }],
  rell: [{ kind: "onHit", name: "Brise-armure", type: "magic", damage: { slot: "P", calc: "OnHitDamage" } }],
  riven: [{
    kind: "afterAbility",
    name: "Lame runique",
    type: "physical",
    damage: { slot: "P", calc: "TotalDamage" },
  }],

  fiora: [
    {
      // Danse du duelliste : un point vital = % des PV max de la cible en dégâts
      // bruts + soin. Un nouveau point apparaît peu après : un toutes les 2,25 s.
      kind: "periodic",
      name: "Point vital",
      type: "true",
      interval: 2.25,
      damage: { slot: "P", calc: "PassiveDamageTotal" },
      scale: "targetMaxHp",
      heal: { slot: "P", calc: "PassiveHealAmount" },
    },
    {
      // Défi suprême : révèle 4 points vitaux (RDamageTotal = 4 × le passif).
      kind: "abilityDamage",
      key: "R",
      type: "true",
      damage: { slot: "P", calc: "RDamageTotal" },
      scale: "targetMaxHp",
    },
    {
      // Riposte : bloque les dégâts et les contrôles pendant la parade.
      kind: "parry",
      key: "W",
    },
  ],
  jax: [
    {
      // Assaut implacable : chaque auto donne un stack de VA.
      kind: "stackingAttackSpeed",
      name: "Assaut implacable",
      perStack: { slot: "P", calc: "AttackSpeedPerStack" },
      maxStacks: { slot: "P", value: "MaxStacks" },
    },
    {
      // Contre-attaque : esquive les autos adverses (puis étourdit, lu comme contrôle).
      kind: "dodgeAutos",
      key: "E",
      duration: { slot: "E", value: "DodgeDuration" },
    },
  ],
  vayne: [
    {
      // Carreaux d'argent : le W n'est pas lancé, il frappe tous les 3 coups.
      kind: "abilityOnHit",
      key: "W",
      every: 3,
    },
  ],
  ivern: [
    {
      // Faiseur de buissons (passif) : dans un buisson et 3 s après en être sorti, chaque
      // auto inflige des dégâts magiques en plus. Ivern crée ses buissons (3 charges) :
      // on suppose qu'il se bat dans le sien.
      kind: "abilityOnHit",
      key: "W",
      every: 1,
    },
    {
      // Daisy ! : familier qui saute dans la mêlée. Stats tirées du sort R (AD, VA bonus,
      // PV, durée) et du fichier de Daisy (VA de base). Son 3e coup consécutif lance une
      // onde de choc (dégâts magiques + projection), au plus une fois toutes les 3 s.
      kind: "pet",
      key: "R",
      name: "Daisy",
      type: "physical",
      ad: { slot: "R", calc: "TotalDaisyAD" },
      baseAttackSpeed: { slot: "R", character: "ivernminion", field: "attackSpeedModifiable" },
      bonusAttackSpeed: { slot: "R", value: "DaisyAS", times: 0.01 },
      hp: { slot: "R", calc: "TotalDaisyHP" },
      resists: { slot: "R", calc: "TotalBonusResists" },
      duration: { slot: "R", value: "DaisyDuration" },
      slamEvery: 3,
      slamType: "magic",
      slamDamage: { slot: "R", calc: "TotalShockwaveDamage" },
      slamCooldown: { slot: "R", value: "ShockwaveCD" },
      slamCc: { slot: "R", value: "ShockwaveCCDuration" },
    },
  ],
  darius: [
    {
      // Décimation : la lame soigne d'une part des PV manquants par champion touché.
      kind: "missingHpHeal",
      key: "Q",
      pct: { slot: "Q", value: "MissingHealthHeal", times: 0.01 },
    },
  ],
};
