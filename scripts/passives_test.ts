/**
 * Passifs lus sur le wiki : déclencheurs, montants, exclusions. Lancer : `deno task test`.
 */

import { assert, assertEquals } from "@std/assert";
import type { Formula, Mechanic } from "../data/types.ts";
import { evalFormula } from "../lib/formula.ts";
import { type PassiveRow, readPassive } from "./passives.ts";

const LEVELS = Array.from({ length: 18 }, (_, i) => String(i + 1));
const byLevel = (from: number, to: number) => ({
  values: LEVELS.map((_, i) => from + ((to - from) * i) / 17),
  top: LEVELS,
});
const row = (text: string, pp: PassiveRow["pp"] = []): PassiveRow => ({ name: "Passif", text, pp });
const STATS = { ap: 100, ad: 200, bonusAd: 80 } as Record<string, number>;
const at = (f: Formula, level = 1) => evalFormula(f, { rank: 1, level, stats: STATS as never });
const only = (rows: PassiveRow[]) => {
  const r = readPassive(rows, "Test");
  assertEquals(r.verdict, "modeled", r.note);
  return r.mechanics[0] as Extract<Mechanic, { kind: "onHit" | "afterAbility" }>;
};

Deno.test("passifs wiki : « At 2 stacks … next basic attack » = toutes les 3 autos (Diana)", () => {
  const m = only([row(
    "Innate - Moonsilver Blade: Diana's basic attacks on-hit generate a stack of Moonsilver Blade for 5 seconds, " +
      "refreshing on subsequent attacks and stacking up to 2 times. At 2 stacks, Diana empowers her next basic attack " +
      "to consume the stacks on-hit to additionally cleave nearby enemies, dealing them ⟦0⟧ (+ 50% AP) magic damage. " +
      "Moonsilver Blade deals 270% damage against monsters.",
    [byLevel(20, 220)],
  )]);
  assertEquals(m.kind, "onHit");
  assert(m.kind === "onHit" && m.every);
  assertEquals(at(m.every!), 3);
  assertEquals(m.type, "magic");
  assertEquals(at(m.damage, 1), 20 + 50);
  assertEquals(at(m.damage, 18), 220 + 50);
});

Deno.test("passifs wiki : chaque auto, après un sort, dernière balle, ratios croisés", () => {
  const warwick = only([
    row("Innate: Warwick deals ⟦0⟧ (+ 15% bonus AD) (+ 10% AP) bonus magic damage on-hit.", [byLevel(6, 55)]),
  ]);
  assertEquals(warwick.kind === "onHit" && warwick.every, undefined);
  assertEquals(at(warwick.damage), 6 + 0.15 * 80 + 0.1 * 100);

  const taric = only([row(
    "Innate: After casting an ability, Taric empowers his next two basic attacks within 5 seconds to each gain 100% " +
      "total attack speed, deal ⟦0⟧ (+ 15% bonus armor) bonus magic damage on-attack.",
    [byLevel(25, 93)],
  )]);
  assertEquals(taric.kind, "afterAbility");
  assertEquals(taric.kind === "afterAbility" && taric.hits, 2);

  const jhin = only([
    row("Innate - Death In 4 Acts: Jhin's basic attacks consume ammunition within 4 rounds."),
    row(
      "Jhin's final round attack has an uncancellable windup, always critically strikes, including against structures, " +
        "and deals bonus physical damage equal to ⟦0⟧ of the target's missing health.",
      [{ values: [15, 20, 25], top: ["1", "6", "11"], key: "%" }],
    ),
  ]);
  assertEquals(jhin.kind === "onHit" && at(jhin.every!), 4);
  assertEquals(jhin.scale, "targetMissingHp");
  assertEquals([at(jhin.damage, 5), at(jhin.damage, 6), at(jhin.damage, 18)], [0.15, 0.2, 0.25]);

  const tahm = only([row(
    "Innate: Tahm Kench's basic attacks on-hit and Tongue Lash are empowered to deal ⟦0⟧ (+ 1.25% AP per 100 bonus health) " +
      "(+ 4% of his bonus health) bonus magic damage and apply a stack of An Acquired Taste.",
    [byLevel(5, 60)],
  )]);
  const s = { ap: 100, bonusHp: 1000 } as Record<string, number>;
  assertEquals(
    evalFormula(tahm.damage, { rank: 1, level: 1, stats: s as never }),
    5 + 0.0125 * 100 * (1000 / 100) + 0.04 * 1000,
  );
});

Deno.test("passifs wiki : plusieurs projectiles par sort (Mel : 3 stacks → 3 projectiles)", () => {
  const mel = only([row(
    "Innate - Searing Brilliance: Mel's ability casts each generate 3 stacks of Searing Brilliance for 5 seconds. " +
      "Her next basic attack consumes all stacks of Searing Brilliance to additionally fire an equal number of blazing " +
      "projectiles at the target. Each projectile deals ⟦0⟧ (+ 4% AP) magic damage.",
    [byLevel(8, 30)],
  )]);
  assertEquals(mel.kind, "afterAbility");
  assertEquals(at(mel.damage), 3 * (8 + 4));
});

Deno.test("passifs wiki : conditions qu'un duel ne reproduit pas → non modélisé, avec la raison", () => {
  const cases: [string, PassiveRow[]][] = [
    ["Zed (PV bas)", [
      row(
        "Innate: Zed's basic attacks on-hit against targets below 50% maximum health deal 10 bonus magic damage.",
      ),
    ]],
    ["Yone (alterne)", [
      row(
        "Innate - Steel and Spirit: Yone's basic attacks alternate between his Steel Sword and Azakana Sword on-attack. " +
          "Yone begins attacking with Steel Sword, and basic attacks with Azakana Sword deal 50% AD physical damage and 50% AD magic damage.",
      ),
    ]],
    ["Qiyana (une fois par cible)", [
      row(
        "Innate: Qiyana's basic attacks on-hit and basic abilities deal 15 (+ 30% AP) additional physical damage.  " +
          "This effect cannot occur on the same target more than once every few seconds.",
      ),
    ]],
    ["Kayle (niveau 11)", [
      row(
        "Level 11 - Aflame: While Kayle is Exalted, her basic attacks on-attack also launch a wave that deals 20 magic damage.",
      ),
    ]],
    ["Nunu (cibles secondaires)", [
      row("Willump's basic attacks additionally deal 30% AD physical damage to secondary targets in a cone."),
    ]],
    ["Nocturne (recharge réduite par les coups)", [
      row(
        "Innate: Periodically, Nocturne empowers his next basic attack to slash in a circle, dealing 120% AD physical damage.",
      ),
    ]],
  ];
  for (const [label, rows] of cases) {
    const r = readPassive(rows, label);
    assertEquals(r.verdict, "conditional", label);
    assertEquals(r.mechanics, [], label);
    assert(r.note.length > 0, label);
  }
  // Déclenché par autre chose qu'une auto (Katarina : ramasser une dague).
  const kata = readPassive(
    [row(
      "Innate - Sinister Steel: Whenever Katarina retrieves a Dagger, she slashes around herself to deal 68 (+ 60% bonus AD) magic damage to nearby enemies, apply on-hit effects to enemy champions hit.",
    )],
    "Katarina",
  );
  assertEquals(kata.mechanics, []);
  // Sans dégâts : vitesse, furtivité…
  assertEquals(
    readPassive([
      row("Innate: Vayne gains 30 bonus movement speed while facing a nearby visible enemy champion."),
    ], "Vayne").verdict,
    "utility",
  );
});

Deno.test("passifs wiki : la note affiche les valeurs (pas les jetons)", () => {
  const r = readPassive([
    row("Innate: Warwick deals ⟦0⟧ (+ 10% AP) bonus magic damage on-hit.", [byLevel(6, 55)]),
  ], "Warwick");
  assertEquals(r.note, "Innate: Warwick deals 6–55 (+ 10% AP) bonus magic damage on-hit.");
});
