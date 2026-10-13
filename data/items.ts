import type { Item } from "@/data/types.ts";
import { GENERATED_ITEMS } from "@/data/generated/items.gen.ts";

/**
 * Objets — générés depuis Meraki à chaque patch (`deno task data`).
 *
 * Les stats plates viennent de Meraki ; les passifs que le moteur sait modéliser
 * (Rabadon %AP, Fendoir %pén.) sont réinjectés via data/overrides.ts. On ne
 * garde que les objets légendaires + bottes portant une stat exploitable.
 *
 * >>> Ne pas éditer à la main : data/generated/items.gen.ts est régénéré. <<<
 */
export const ITEMS: Record<string, Item> = GENERATED_ITEMS;

/** Résumé lisible des stats d'un objet, pour l'affichage. */
export function itemStatLine(id: string): string {
  const s = ITEMS[id].stats;
  const parts: string[] = [];
  if (s.ad) parts.push(`${s.ad} AD`);
  if (s.ap) parts.push(`${s.ap} AP`);
  if (s.apAmp) parts.push(`+${Math.round(s.apAmp * 100)}% AP`);
  if (s.magicPenFlat) parts.push(`${s.magicPenFlat} pén.M`);
  if (s.magicPenPercent) parts.push(`${Math.round(s.magicPenPercent * 100)}% pén.M`);
  if (s.armorPenPercent) parts.push(`${Math.round(s.armorPenPercent * 100)}% pén.A`);
  if (s.lethality) parts.push(`${s.lethality} létal.`);
  if (s.hp) parts.push(`${s.hp} PV`);
  if (s.armor) parts.push(`${s.armor} arm`);
  if (s.mr) parts.push(`${s.mr} RM`);
  if (s.abilityHaste) parts.push(`${s.abilityHaste} AH`);
  return parts.join(" · ");
}
