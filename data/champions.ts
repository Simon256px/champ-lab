import type { Champion } from "@/data/types.ts";
import { GENERATED_CHAMPIONS } from "@/data/generated/champions.gen.ts";
import { MANUAL_CHAMPIONS } from "@/data/manual.ts";
import { GENERATED_MECHANICS } from "@/data/generated/mechanics.gen.ts";

/**
 * Champions — roster complet généré depuis Meraki + Data Dragon, complété par
 * quelques champions saisis à la main (trop récents pour Meraki).
 *
 * >>> ON N'ÉDITE PAS data/generated/. <<<
 * Les données brutes sont régénérées par `deno task data`. Les réglages de
 * théorycraft (étagères, rune, ordre de compétences, corrections de ratios)
 * vivent dans data/overrides.ts. Les champions non encore dans Meraki sont dans
 * data/manual.ts. Voir docs/adding-a-champion.md.
 */
export const CHAMPIONS: Record<string, Champion> = withMechanics({
  ...MANUAL_CHAMPIONS,
  ...GENERATED_CHAMPIONS,
});

/**
 * Greffe les passifs (data/mechanics.ts, valeurs résolues depuis les fichiers du
 * jeu dans data/generated/mechanics.gen.ts). Un `abilityDamage` donne directement
 * sa formule au sort concerné (Fiora R) : le moteur le traite comme un sort normal.
 */
function withMechanics(roster: Record<string, Champion>): Record<string, Champion> {
  const out: Record<string, Champion> = {};
  for (const [id, c] of Object.entries(roster)) {
    const mechanics = GENERATED_MECHANICS[id];
    if (!mechanics) {
      out[id] = c;
      continue;
    }
    const abilities = { ...c.abilities };
    for (const m of mechanics) {
      if (m.kind !== "abilityDamage") continue;
      abilities[m.key] = { ...abilities[m.key], type: m.type, formula: m.damage, formulaScale: m.scale };
    }
    out[id] = { ...c, abilities, mechanics };
  }
  return out;
}

/** Liste triée alphabétiquement (généré + manuel confondus), pour le roster. */
export const CHAMPION_LIST = Object.values(CHAMPIONS).sort((a, b) => a.name.localeCompare(b.name, "fr"));

/** Slugs disponibles (pour valider une route /lab/[champion]). */
export const CHAMPION_IDS = CHAMPION_LIST.map((c) => c.id);
