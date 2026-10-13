import type { Mechanic } from "@/data/types.ts";

/**
 * Mécaniques de kit saisies À LA MAIN — ce que Meraki n'expose pas en chiffres.
 *
 * Les passifs de Fiora, Jax, Aatrox… n'ont aucune ligne de dégâts exploitable
 * côté Meraki. On les décrit ici avec un petit vocabulaire typé (data/types.ts,
 * `Mechanic`), appliqué génériquement par lib/engine.ts en mode trade / all-in :
 *
 *   onHit                dégâts en plus tous les N coups d'auto
 *   abilityOnHit         un sort qui se déclenche sur les autos au lieu d'être lancé
 *   periodic             dégâts (et soin) toutes les X secondes
 *   stackingAttackSpeed  VA bonus qui s'empile à chaque auto
 *
 * Valeurs reprises des descriptions de kit officielles ; elles bougent avec les
 * patchs — à recroiser comme le reste (deno task audit). Voir
 * docs/adding-a-champion.md pour en ajouter.
 */
export const MECHANICS: Record<string, Mechanic[]> = {
  fiora: [
    {
      // Danse du duelliste : frapper un point vital inflige 3 % (+4 % par 100 AD
      // bonus) des PV max de la cible en dégâts bruts et soigne Fiora. Un nouveau
      // point apparaît peu après : on compte un point toutes les 2,25 s.
      kind: "periodic",
      name: "Point vital",
      type: "true",
      interval: 2.25,
      ratios: { targetMaxHp: 0.03 },
      targetMaxHpPerBonusAd: 0.0004,
      heal: { from: 40, to: 115 },
    },
  ],
  jax: [
    {
      // Assaut implacable : chaque auto donne un stack de VA (8 max).
      kind: "stackingAttackSpeed",
      name: "Assaut implacable",
      perStack: { from: 0.035, to: 0.11 },
      maxStacks: 8,
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
};
