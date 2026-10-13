import type { KitSheet } from "@/data/types.ts";
import { GENERATED_KITS } from "@/data/generated/kits.gen.ts";

/**
 * Fiches de kit complètes (infobulles, valeurs et calculs du jeu) pour les
 * champions qui ont une page dédiée. Générées par `deno task data` (KIT_SHEETS
 * dans scripts/fetch-data.ts). Ne pas éditer data/generated/.
 */
export const KITS: Record<string, KitSheet> = GENERATED_KITS;
