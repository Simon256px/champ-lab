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
 *   parry                parade : bloque le plus gros coup et le plus long contrôle adverses
 *   dodgeAutos           esquive les autos adverses pendant X secondes
 *
 * Pour trouver le nom d'un calcul : ouvrir
 * https://raw.communitydragon.org/latest/game/data/characters/<id>/<id>.bin.json
 * et chercher le sort (mSpell → mSpellCalculations / DataValues). Voir
 * docs/adding-a-champion.md.
 */
export const MECHANICS: Record<string, Mechanic<GameRef>[]> = {
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
  darius: [
    {
      // Décimation : la lame soigne d'une part des PV manquants par champion touché.
      kind: "missingHpHeal",
      key: "Q",
      pct: { slot: "Q", value: "MissingHealthHeal", times: 0.01 },
    },
  ],
};
