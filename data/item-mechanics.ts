import type { ItemMechanic, ItemRef } from "./types.ts";

/**
 * Effets d'objets — passifs et actifs que les stats plates ne disent pas.
 *
 * Comme data/mechanics.ts : on ne saisit pas de chiffres. Chaque valeur est une
 * référence (`ItemRef`) au fichier des objets du jeu
 * (https://raw.communitydragon.org/latest/game/items.cdtb.bin.json, entrée
 * « Items/<id Riot> » → mDataValues / mItemCalculations), résolue au patch courant
 * par `deno task data`. Les variantes mêlée / distance du jeu sont résolues toutes
 * les deux : le moteur prend la bonne selon la portée du porteur.
 *
 * Vocabulaire (data/types.ts, `ItemMechanic`), appliqué par lib/engine.ts :
 *
 *   onHit        dégâts en plus tous les N coups d'auto
 *   spellProc    dégâts déclenchés par un sort (sur la prochaine auto si Lame enchantée)
 *   active       actif lancé une fois par cooldown
 *   armorShred   réduction d'armure qui s'empile à chaque coup physique
 *   burn         brûlure par seconde tant que les sorts touchent
 *   statBonus    stat en plus (fixe, selon une autre stat, ou qui grandit avec le temps)
 *   stasis       stase : esquive le plus gros coup adverse
 *   revive       renaissance : rend une part des PV de base
 *   lifeline     bouclier sous un seuil de PV
 *   activeHeal   actif de soin (et dégâts)
 *   damageDelay  part des dégâts reçus différée
 *   thorns       dégâts renvoyés à chaque auto reçue
 *   grievous     blessures graves sur les soins adverses
 *   healShieldReceived  soins et boucliers reçus renforcés
 *   critReduction       dégâts critiques reçus réduits
 */
export const ITEM_MECHANICS: Record<string, ItemMechanic<ItemRef>[]> = {
  // --- À l'impact ---
  krakenslayer: [{
    kind: "onHit",
    type: "physical",
    every: { value: "AttackCount" },
    damage: { calc: "DamageAmount" },
  }],
  bladeoftheruinedking: [{
    kind: "onHit",
    type: "physical",
    damage: { calc: "MeleeItemCalcValue" },
    rangedDamage: { calc: "RangedItemCalcValue" },
    scale: "targetCurrentHp",
  }],
  nashorstooth: [{ kind: "onHit", type: "magic", damage: { calc: "TotalOnHitDamage" } }],
  witsend: [{ kind: "onHit", type: "magic", damage: { calc: "OnHitDamage" } }],

  // --- Lame enchantée : le sort charge la prochaine auto ---
  sheen: [{
    kind: "spellProc",
    type: "physical",
    damage: { calc: "SpellbladeDamage" },
    cooldown: { value: "SpellbladeCooldown" },
    needsAuto: true,
  }],
  trinityforce: [{
    kind: "spellProc",
    type: "physical",
    damage: { calc: "SpellbladeDamage" },
    cooldown: { value: "SpellbladeCooldown" },
    needsAuto: true,
  }],
  essencereaver: [{
    kind: "spellProc",
    type: "physical",
    damage: { calc: "SpellbladeDamage" },
    cooldown: { value: "SpellbladeCooldown" },
    needsAuto: true,
  }],
  lichbane: [{
    kind: "spellProc",
    type: "magic",
    damage: { calc: "SpellbladeDamage" },
    cooldown: { value: "SpellbladeCooldown" },
    needsAuto: true,
  }],

  // --- Déclenché par un sort ---
  ludensecho: [{
    // Les projectiles se concentrent sur une seule cible en duel : dégâts mono-cible max.
    kind: "spellProc",
    type: "magic",
    damage: { calc: "SingleTargetMax" },
    cooldown: { value: "Cooldown" },
    needsAuto: false,
  }],
  liandrystorment: [{
    kind: "burn",
    type: "magic",
    perSecond: { value: "BurnPercentHealthDamage" },
    scale: "targetMaxHp",
    duration: { value: "BurnDuration" },
  }],

  // --- Actifs ---
  stridebreaker: [{
    kind: "active",
    type: "physical",
    damage: { calc: "SlashDamage" },
    cooldown: { value: "Cooldown" },
  }],

  // --- Réduction d'armure ---
  blackcleaver: [{
    kind: "armorShred",
    perStack: { value: "ShredPerStack" },
    maxStacks: { value: "MaxStacks" },
  }],

  // --- Stats conditionnelles ---
  steraksgage: [
    // Les griffes qui agrippent : AD bonus = 50 % de l'AD de base.
    { kind: "statBonus", stat: "bonusAd", amount: { value: "ADtoAD", stat: "baseAd" } },
    // Ligne de vie : bouclier de 60 % des PV bonus sous 30 % de PV.
    { kind: "lifeline", shield: { value: "BaseShieldRatio", stat: "bonusHp" } },
  ],
  archangelsstaff: [{ kind: "statBonus", stat: "ap", amount: { value: "APFromMana", stat: "bonusMana" } }],
  manamune: [{ kind: "statBonus", stat: "bonusAd", amount: { calc: "BonusADFromMana" } }],
  rodofages: [
    {
      kind: "statBonus",
      stat: "hp",
      amount: { value: "HealthPerStack" },
      secondsPerStack: { value: "SecondsPerStack" },
      maxStacks: { value: "MaxStacks" },
    },
    {
      kind: "statBonus",
      stat: "mana",
      amount: { value: "ManaPerStack" },
      secondsPerStack: { value: "SecondsPerStack" },
      maxStacks: { value: "MaxStacks" },
    },
    {
      kind: "statBonus",
      stat: "ap",
      amount: { value: "APPerStack" },
      secondsPerStack: { value: "SecondsPerStack" },
      maxStacks: { value: "MaxStacks" },
    },
  ],

  // --- Défense ---
  zhonyashourglass: [{ kind: "stasis", duration: { value: "Duration" } }],
  // Renaissance : « restores 50% base Health » — la part n'existe que dans le texte du jeu,
  // le pipeline la lit dans la description de l'objet (Data Dragon, même patch).
  guardianangel: [{ kind: "revive", hpShare: { value: "ReviveBaseHealth" } }],
  immortalshieldbow: [{ kind: "lifeline", shield: { calc: "ShieldAmount" } }],
  mawofmalmortius: [{
    kind: "lifeline",
    shield: { calc: "MeleeItemCalcValue" },
    rangedShield: { calc: "RangedItemCalcValue" },
    magicOnly: true,
  }],
  deathsdance: [{
    kind: "damageDelay",
    share: { calc: "MeleeItemCalcValue" },
    rangedShare: { calc: "RangedItemCalcValue" },
    seconds: { value: "BleedDurationWorst" },
  }],
  thornmail: [
    { kind: "thorns", type: "magic", damage: { calc: "TotalDamage" } },
    { kind: "grievous", amount: { value: "GrievousAmount" }, whenStruck: true },
  ],
  bramblevest: [{ kind: "grievous", amount: { value: "GrievousAmount" }, whenStruck: true }],
  spiritvisage: [{
    kind: "healShieldReceived",
    heal: { value: "HealingIncrease" },
    shield: { value: "ShieldIncrease" },
  }],
  randuinsomen: [{ kind: "critReduction", amount: { value: "PercentCritDamageReduction" } }],
  redemption: [{
    kind: "activeHeal",
    heal: { calc: "HealAmount" },
    damage: { value: "DamageToChampions" },
    type: "true",
    scale: "targetMaxHp",
  }],

  // --- Blessures graves ---
  chempunkchainsword: [{ kind: "grievous", amount: { value: "GrievousAmount" } }],
  morellonomicon: [{ kind: "grievous", amount: { value: "GrievousAmount" } }],
  executionerscalling: [{ kind: "grievous", amount: { value: "GrievousAmount" } }],
  mortalreminder: [{ kind: "grievous", amount: { value: "GrievousAmount" } }],
  oblivionorb: [{ kind: "grievous", amount: { value: "GrievousAmount" } }],
};
