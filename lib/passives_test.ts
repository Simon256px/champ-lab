/**
 * Passifs saisis par référence aux fichiers du jeu. Lancer : `deno task test`.
 */

import { assert, assertEquals } from "@std/assert";
import { CHAMPIONS } from "@/data/champions.ts";
import { ITEMS } from "@/data/items.ts";
import { RUNES } from "@/data/runes.ts";
import { MECHANICS } from "@/data/mechanics.ts";
import type { IncludeMap } from "@/data/types.ts";
import { abilityRaw, computeCombo, computeStats, formulaAt } from "@/lib/engine.ts";
import { GENERATED_PASSIVES } from "@/data/generated/passives.gen.ts";
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

Deno.test("passifs : chaque champion a un statut (modélisé, conditionnel, sans dégâts) et sa raison", () => {
  for (const id of Object.keys(CHAMPIONS)) {
    const p = GENERATED_PASSIVES[id];
    assert(p, `${id} : passif sans statut`);
    assert(p.note.length > 0, `${id} : statut sans explication`);
    if (p.verdict === "modeled") assert(CHAMPIONS[id].mechanics?.length, `${id} : modélisé sans mécanique`);
  }
});

Deno.test("passifs : le wiki et les fichiers du jeu donnent les mêmes valeurs (niveaux 1, 11, 18)", () => {
  const stats = {
    ...computeStats(CHAMPIONS.ahri, 11, [], ITEMS, RUNES, false),
    ap: 150,
    totalAD: 180,
    bonusAD: 60,
  };
  let compared = 0;
  for (const [id, p] of Object.entries(GENERATED_PASSIVES)) {
    if (!p.wiki) continue;
    const wiki = p.wiki[0];
    const game = CHAMPIONS[id].mechanics!.find((m) => m.kind === wiki.kind);
    if (!game || !("damage" in game) || !("damage" in wiki)) continue;
    for (const level of [1, 11, 18]) {
      const w = formulaAt(wiki.damage, 1, level, stats);
      const g = formulaAt(game.damage, 1, level, stats);
      assert(
        Math.abs(w - g) <= Math.max(0.01, Math.abs(g) * 0.005),
        `${id} niveau ${level} : wiki ${w} / jeu ${g}`,
      );
    }
    compared++;
  }
  assert(compared >= 5, `seulement ${compared} passifs comparés`);
});

Deno.test("passifs : chaque passif lu sur le wiki produit une ligne en trade", () => {
  let n = 0;
  for (const [id, p] of Object.entries(GENERATED_PASSIVES)) {
    if (p.verdict !== "modeled" || p.source !== "wiki") continue;
    const r = trade(id);
    assert(r.lines.some((l) => l.key === "P"), `${id} : passif absent du combo`);
    n++;
  }
  assert(n >= 10, `seulement ${n} passifs du wiki`);
});

Deno.test("sorts : part de base qui suit le niveau (Mordekaiser Q, à rang égal)", () => {
  const q = CHAMPIONS.mordekaiser.abilities.Q;
  const ranks = { Q: 5, W: 0, E: 0, R: 0 };
  const s = { ...computeStats(CHAMPIONS.mordekaiser, 1, [], ITEMS, RUNES, false), ap: 0, bonusAD: 0 };
  const dmg = (level: number) => abilityRaw(CHAMPIONS.mordekaiser, "Q", level, s, ranks);
  if (q.formula) assert(dmg(18) > dmg(9), "formule du jeu : la base suit le niveau");
  else {
    assert(q.levelBase, "Mordekaiser Q : part par niveau lue sur le wiki");
    assertEquals(dmg(18) - dmg(9), q.levelBase![17] - q.levelBase![8]);
  }
});
