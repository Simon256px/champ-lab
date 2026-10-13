/**
 * Tests de l'évaluateur de formules de jeu. Lancer : `deno task test`.
 */

import { assertAlmostEquals, assertEquals } from "@std/assert";
import { evalFormula } from "@/lib/formula.ts";
import type { Formula, StatRef } from "@/data/types.ts";

const stats = {
  ap: 100,
  ad: 150,
  baseAd: 100,
  bonusAd: 50,
  maxHp: 2000,
  baseHp: 1500,
  bonusHp: 500,
  armor: 80,
  bonusArmor: 30,
  mr: 50,
  bonusMr: 10,
  attackSpeed: 1,
  bonusAttackSpeed: 0.4,
  critChance: 0.25,
  critDamage: 1.75,
  lethality: 10,
} satisfies Record<StatRef, number>;
const at = (f: Formula, rank = 1, level = 1) => evalFormula(f, { rank, level, stats });

Deno.test("formule : valeur par rang, bornée au dernier rang", () => {
  const f: Formula = { op: "rank", v: [50, 80, 110] };
  assertEquals(at(f, 1), 50);
  assertEquals(at(f, 3), 110);
  assertEquals(at(f, 5), 110);
});

Deno.test("formule : base par rang + % AD total (forme du Q de Darius)", () => {
  const f: Formula = {
    op: "sum",
    of: [{ op: "rank", v: [50, 80] }, { op: "stat", stat: "ad", f: { op: "rank", v: [1, 1.1] } }],
  };
  assertEquals(at(f, 1), 50 + 150);
  assertAlmostEquals(at(f, 2), 80 + 165);
});

Deno.test("formule : interpolation niveau 1 → 18", () => {
  const f: Formula = { op: "lerp", from: 35, to: 100 };
  assertEquals(at(f, 1, 1), 35);
  assertEquals(at(f, 1, 18), 100);
});

Deno.test("formule : paliers par niveau (forme du passif de Jax)", () => {
  const f: Formula = {
    op: "steps",
    l1: 0.05,
    perLevel: 0,
    bp: [4, 7, 10, 13, 16].map((level) => ({ level, add: 0.015, perLevel: 0 })),
  };
  assertAlmostEquals(at(f, 1, 3), 0.05);
  assertAlmostEquals(at(f, 1, 4), 0.065);
  assertAlmostEquals(at(f, 1, 18), 0.125);
});

Deno.test("formule : gain par niveau qui s'arrête à un palier", () => {
  const f: Formula = { op: "steps", l1: 1, perLevel: 1, bp: [{ level: 4, add: 0, perLevel: 0 }] };
  assertEquals(at(f, 1, 3), 3);
  assertEquals(at(f, 1, 10), 3);
});
