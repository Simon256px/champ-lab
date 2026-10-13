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
};
