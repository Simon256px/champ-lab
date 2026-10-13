/**
 * Tests du rendu d'infobulles. Lancer : `deno task test`.
 */

import { assertEquals } from "@std/assert";
import type { KitSpell, StatRef } from "@/data/types.ts";
import { formatNumber, renderTooltip } from "@/lib/tooltip.ts";

const stats = Object.fromEntries(
  [
    "ap",
    "ad",
    "baseAd",
    "bonusAd",
    "maxHp",
    "baseHp",
    "bonusHp",
    "armor",
    "bonusArmor",
    "mr",
    "bonusMr",
    "attackSpeed",
    "bonusAttackSpeed",
    "critChance",
    "critDamage",
    "lethality",
  ].map((k) => [k, k === "ap" ? 100 : 0]),
) as Record<StatRef, number>;

const SPELL: KitSpell = {
  name: "Triggerseed",
  maxRank: 5,
  text: "Ivern grants <shield>@TotalShield@ Shield</shield>.<br><br>Slowing by @SlowAmount*100@% for " +
    "@SlowDuration@ seconds.@SpellModifierDescriptionAppend@ @Unknown@",
  values: { SlowAmount: [0.4, 0.45, 0.5, 0.55, 0.6], SlowDuration: [2, 2, 2, 2, 2] },
  calcs: {
    TotalShield: {
      op: "sum",
      of: [{ op: "rank", v: [75, 115, 155, 195, 235] }, { op: "stat", stat: "ap", f: { op: "num", n: 0.5 } }],
    },
  },
};

Deno.test("infobulle : calculs et valeurs au rang, multiplicateur, paragraphes, balises", () => {
  const r = renderTooltip(SPELL, { rank: 2, level: 1, stats });
  assertEquals(r.paragraphs.length, 2);
  const first = r.paragraphs[0];
  const shield = first.find((s) => s.value)!;
  assertEquals(shield.text, "165");
  assertEquals(shield.cls, "tt-shield");
  const second = r.paragraphs[1].filter((s) => s.value).map((s) => s.text);
  assertEquals(second, ["45", "2", "?"]);
  assertEquals(r.missing, ["Unknown"], "un placeholder inconnu est signalé, pas inventé");
});

Deno.test("infobulle : format français, une décimale au plus", () => {
  assertEquals(formatNumber(1.5), "1,5");
  assertEquals(formatNumber(222.54), "222,5");
  assertEquals(formatNumber(4400), "4 400");
});
