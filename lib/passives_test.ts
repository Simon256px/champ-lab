/**
 * Passifs saisis par référence aux fichiers du jeu. Lancer : `deno task test`.
 */

import { assert, assertEquals } from "@std/assert";
import { CHAMPIONS } from "@/data/champions.ts";
import { ITEMS } from "@/data/items.ts";
import { RUNES } from "@/data/runes.ts";
import { MECHANICS } from "@/data/mechanics.ts";
import type { IncludeMap } from "@/data/types.ts";
import { computeCombo, computeStats, formulaAt } from "@/lib/engine.ts";
import { evalFormula } from "@/lib/formula.ts";

const ALL_IN: IncludeMap = { Q: true, W: true, E: true, R: true, bleed: true, rune: true };
const trade = (id: string, window = 8) =>
  computeCombo({
    champion: CHAMPIONS[id],
    level: 11,
    itemIds: [],
    items: ITEMS,
    runes: RUNES,
    runeOn: false,
    target: { armor: 60, mr: 40, hpMax: 2000, hpCur: 2000 },
    bleedStacks: 5,
    include: ALL_IN,
    window,
  });

Deno.test("passifs : chaque mécanique saisie est résolue depuis les fichiers du jeu", () => {
  for (const [id, list] of Object.entries(MECHANICS)) {
    assertEquals(CHAMPIONS[id].mechanics?.length, list.length, `${id} : mécanique écartée par le pipeline`);
  }
});

Deno.test("passifs : chaque passif à l'impact ou après sort produit une ligne en trade", () => {
  for (const [id, list] of Object.entries(MECHANICS)) {
    const named = list.filter((m) => m.kind === "onHit" || m.kind === "afterAbility") as { name: string }[];
    if (!named.length) continue;
    const r = trade(id);
    for (const m of named) {
      assert(r.lines.some((l) => l.name.startsWith(m.name)), `${id} : « ${m.name} » absent`);
    }
  }
});

Deno.test("passifs : cadences lues dans le jeu (Diana 3, Master Yi 4, Caitlyn 5 + 1)", () => {
  const every = (id: string) => {
    const m = CHAMPIONS[id].mechanics!.find((x) => x.kind === "onHit");
    assert(m?.kind === "onHit" && m.every);
    return formulaAt(m.every, 1, 11, computeStats(CHAMPIONS[id], 11, [], ITEMS, RUNES, false));
  };
  assertEquals(every("diana"), 3);
  assertEquals(every("masteryi"), 4);
  assertEquals(every("caitlyn"), 6);
});

Deno.test("passifs : Riven et Lux — une auto chargée par sort, pas plus que d'autos", () => {
  for (const id of ["riven", "lux"]) {
    const r = trade(id);
    const p = r.lines.find((l) => l.key === "P")!;
    const autos = r.lines.find((l) => l.key === "AA")!.hits!;
    const casts = r.lines.filter((l) => ["Q", "W", "E", "R"].includes(l.key)).reduce(
      (a, l) => a + (l.hits ?? 1),
      0,
    );
    assertEquals(p.hits, Math.min(casts, autos), id);
  }
});

Deno.test("passifs : Lux 20 → 190 selon le niveau (table du jeu), Locke 5 → 40", () => {
  const lux = CHAMPIONS.lux.mechanics!.find((m) => m.kind === "afterAbility");
  assert(lux?.kind === "afterAbility");
  const s = { ...computeStats(CHAMPIONS.lux, 1, [], ITEMS, RUNES, false), ap: 0 };
  assertEquals(formulaAt(lux.damage, 1, 1, s), 20);
  assertEquals(formulaAt(lux.damage, 1, 18, s), 190);
  const locke = CHAMPIONS.locke.mechanics!.find((m) => m.kind === "onHit");
  assert(locke?.kind === "onHit");
  assertEquals(formulaAt(locke.damage, 1, 1, s), 5);
  assertEquals(formulaAt(locke.damage, 1, 18, s), 40);
  assertEquals(evalFormula({ op: "byLevel", v: [1, 2, 3] }, { rank: 1, level: 30, stats: {} as never }), 3);
});
