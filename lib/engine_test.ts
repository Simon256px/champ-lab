/**
 * Tests du moteur. Lancer : `deno task test`.
 *
 * On teste des invariants (monotonie, mitigation, exécution), pas des chiffres
 * exacts — les valeurs sont illustratives et bougeront avec les patchs.
 */

import { assert, assertAlmostEquals, assertEquals } from "@std/assert";
import {
  computeCombo,
  computeDefenses,
  computeDuel,
  damageMultiplier,
  growth,
  rankOf,
  stackPercent,
  targetFromChampion,
} from "@/lib/engine.ts";
import { CHAMPIONS } from "@/data/champions.ts";
import { ITEMS } from "@/data/items.ts";
import { RUNES } from "@/data/runes.ts";
import type { ComboInput, DuelSide } from "@/lib/engine.ts";
import type { IncludeMap, TargetProfile } from "@/data/types.ts";

const ALL_IN: IncludeMap = { Q: true, W: true, E: true, R: true, bleed: true, rune: true };
const TARGET: TargetProfile = { armor: 60, mr: 40, hpMax: 2000, hpCur: 2000 };

function input(champId: string, itemIds: string[], overrides: Partial<ComboInput> = {}): ComboInput {
  return {
    champion: CHAMPIONS[champId],
    level: 11,
    itemIds,
    items: ITEMS,
    runes: RUNES,
    runeOn: true,
    target: TARGET,
    bleedStacks: 5,
    include: ALL_IN,
    ...overrides,
  };
}

Deno.test("growth: niveau 1 = base", () => {
  assertAlmostEquals(growth(100, 10, 1), 100);
});

Deno.test("growth: croissant avec le niveau", () => {
  assert(growth(100, 10, 18) > growth(100, 10, 5));
});

Deno.test("stackPercent: empilement multiplicatif", () => {
  // 40% puis 40% ne font pas 80%
  assertAlmostEquals(stackPercent([0.4, 0.4]), 0.64);
});

Deno.test("rankOf: respecte l'ordre et le rang max", () => {
  const ahri = CHAMPIONS.ahri;
  assertEquals(rankOf(ahri, "Q", 1), 1);
  assertEquals(rankOf(ahri, "R", 5), 0); // ultime indisponible avant 6
  assert(rankOf(ahri, "R", 11) >= 2);
  assert(rankOf(ahri, "Q", 18) <= ahri.abilities.Q.maxRank);
});

Deno.test("mitigation: l'armure réduit les dégâts physiques", () => {
  const s = {
    baseAD: 0,
    bonusAD: 0,
    totalAD: 0,
    ap: 0,
    magicPenFlat: 0,
    magicPenPct: 0,
    lethality: 0,
    armorPenPct: 0,
  };
  assertEquals(damageMultiplier("true", s, TARGET), 1);
  assert(damageMultiplier("physical", s, TARGET) < 1);
});

Deno.test("plus d'objets => plus de dégâts", () => {
  const few = computeCombo(input("ahri", ["sorcerersshoes", "ludensecho"])).total;
  const many =
    computeCombo(input("ahri", ["sorcerersshoes", "ludensecho", "rabadonsdeathcap", "shadowflame"])).total;
  assert(many > few, "un build plus fourni doit taper plus fort");
});

Deno.test("Darius : l'ultime est du vrai dégât et pose un seuil d'exécution", () => {
  const res = computeCombo(input("darius", ["ionianbootsoflucidity", "stridebreaker", "blackcleaver"]));
  assert(res.execHP > 0, "execHP doit être renseigné pour Darius");
  const rLine = res.lines.find((l) => l.key === "R");
  assertEquals(rLine?.type, "true");
});

Deno.test("couper la rune réduit (ou n'augmente pas) le combo", () => {
  const withRune = computeCombo(input("ahri", ["ludensecho"], { runeOn: true })).total;
  const without = computeCombo(input("ahri", ["ludensecho"], { runeOn: false })).total;
  assert(withRune >= without);
});

// --- Invariants sur TOUT le roster généré (filet de sécurité du pipeline). ---

Deno.test("roster : chaque champion se calcule sans planter, à tous les niveaux", () => {
  for (const id of Object.keys(CHAMPIONS)) {
    for (const level of [1, 6, 11, 18]) {
      const res = computeCombo(input(id, CHAMPIONS[id].shelf.slice(0, 3), { level }));
      assert(Number.isFinite(res.total), `total non fini pour ${id} niv ${level}`);
      assert(res.total >= 0, `total négatif pour ${id} niv ${level}`);
    }
  }
});

Deno.test("roster : chaque objet d'étagère existe dans data/items.ts", () => {
  for (const c of Object.values(CHAMPIONS)) {
    for (const itemId of c.shelf) {
      assert(ITEMS[itemId], `étagère de ${c.id} référence un objet inconnu : ${itemId}`);
    }
  }
});

Deno.test("roster : la keystone de chaque champion est modélisée", () => {
  for (const c of Object.values(CHAMPIONS)) {
    assert(RUNES[c.keystone], `keystone inconnue pour ${c.id} : ${c.keystone}`);
  }
});

Deno.test("rangs manuels : un rang de Q plus élevé => plus de dégâts", () => {
  const low = computeCombo(input("ahri", ["ludensecho"], { ranks: { Q: 1, W: 0, E: 0, R: 0 } })).total;
  const high = computeCombo(input("ahri", ["ludensecho"], { ranks: { Q: 5, W: 0, E: 0, R: 0 } })).total;
  assert(high > low, "monter le rang de Q doit augmenter les dégâts");
});

Deno.test("rangs manuels : un sort au rang 0 n'apparaît pas dans le combo", () => {
  const res = computeCombo(input("ahri", ["ludensecho"], { ranks: { Q: 0, W: 0, E: 0, R: 0 } }));
  assertEquals(res.lines.find((l) => l.key === "Q"), undefined);
});

Deno.test("keystone au choix : override change la rune appliquée", () => {
  // Ahri par défaut = electro (ligne ✦). Forcer conqueror retire cette ligne.
  const electro = computeCombo(input("ahri", ["ludensecho"], { keystoneId: "electrocute" }));
  const conq = computeCombo(input("ahri", ["ludensecho"], { keystoneId: "conqueror" }));
  assert(electro.lines.some((l) => l.key === "✦"), "electro doit poser une ligne de burst");
  assert(!conq.lines.some((l) => l.key === "✦"), "conquérant ne pose pas de ligne electro");
});

Deno.test("champion manuel (Locke) est présent et se calcule", () => {
  assert(CHAMPIONS.locke, "Locke doit être dans le roster");
  const res = computeCombo(input("locke", ["ludensecho", "rabadonsdeathcap"]));
  assert(res.total > 0, "le combo de Locke doit produire des dégâts");
});

// --- Passifs & runes : les mécaniques modélisées doivent être EFFECTIVES. ---

Deno.test("hémorragie : le saignement croît avec les stacks, et ×0 = pas de ligne", () => {
  const items = ["stridebreaker", "blackcleaver"];
  const one = computeCombo(input("darius", items, { bleedStacks: 1 }));
  const five = computeCombo(input("darius", items, { bleedStacks: 5 }));
  const zero = computeCombo(input("darius", items, { bleedStacks: 0 }));
  const bleedOf = (r: typeof one) => r.lines.find((l) => l.key === "P")?.damage ?? 0;
  assert(bleedOf(five) > bleedOf(one), "5 stacks doivent saigner plus qu'un seul");
  assertAlmostEquals(bleedOf(five), 5 * bleedOf(one), 0.001, "le saignement est linéaire en stacks");
  assertEquals(zero.lines.find((l) => l.key === "P"), undefined, "0 stack = pas de saignement");
});

Deno.test("guillotine : +20 %/stack, doublée à 5 stacks d'hémorragie", () => {
  const items = ["stridebreaker", "blackcleaver"];
  const r0 = computeCombo(input("darius", items, { bleedStacks: 0 })).lines.find((l) => l.key === "R");
  const r5 = computeCombo(input("darius", items, { bleedStacks: 5 })).lines.find((l) => l.key === "R");
  assert(r0 && r5, "l'ultime doit produire une ligne");
  assertAlmostEquals(r5.damage, 2 * r0.damage, 0.001, "5 stacks = dégâts d'ultime doublés");
});

Deno.test("conquérant : effectif aussi pour un champion AP (force adaptative)", () => {
  const on = computeCombo(input("ahri", ["ludensecho"], { keystoneId: "conqueror", runeOn: true })).total;
  const off = computeCombo(input("ahri", ["ludensecho"], { keystoneId: "conqueror", runeOn: false })).total;
  assert(on > off, "Conquérant doit augmenter les dégâts d'un champion AP");
});

Deno.test("conquérant : la force adaptative croît avec le niveau", () => {
  const lvl6 = computeCombo(input("darius", [], { keystoneId: "conqueror", level: 6 }));
  const lvl18 = computeCombo(input("darius", [], { keystoneId: "conqueror", level: 18 }));
  assert(lvl18.stats.bonusAD > lvl6.stats.bonusAD, "l'AD bonus de Conquérant doit croître avec le niveau");
});

Deno.test("électrocution : adaptative — physique pour un profil AD équipé", () => {
  const res = computeCombo(input("darius", ["stridebreaker"], { keystoneId: "electrocute" }));
  const line = res.lines.find((l) => l.key === "✦");
  assertEquals(line?.type, "physical", "avec de l'AD bonus et 0 AP, le burst doit être physique");
  const ahri = computeCombo(input("ahri", ["ludensecho"], { keystoneId: "electrocute" }));
  assertEquals(ahri.lines.find((l) => l.key === "✦")?.type, "magic", "profil AP → burst magique");
});

// --- Cible champion & duel symétrique. ---

function side(champId: string, itemIds: string[], overrides: Partial<DuelSide> = {}): DuelSide {
  return { champion: CHAMPIONS[champId], level: 11, itemIds, runeOn: true, ...overrides };
}

Deno.test("défenses : niveau 1 sans objet = stats de base du champion", () => {
  const darius = CHAMPIONS.darius;
  const d = computeDefenses(darius, 1, [], ITEMS);
  assertAlmostEquals(d.hp, darius.base.hp);
  assertAlmostEquals(d.armor, darius.base.armor);
  assertAlmostEquals(d.mr, darius.base.mr);
});

Deno.test("défenses : les PV, l'armure et la RM des objets s'ajoutent", () => {
  const naked = computeDefenses(CHAMPIONS.darius, 11, [], ITEMS);
  const tank = computeDefenses(CHAMPIONS.darius, 11, ["randuinsomen", "mercurystreads"], ITEMS);
  assertAlmostEquals(tank.hp - naked.hp, ITEMS.randuinsomen.stats.hp!);
  assertAlmostEquals(tank.armor - naked.armor, ITEMS.randuinsomen.stats.armor!);
  assertAlmostEquals(tank.mr - naked.mr, ITEMS.mercurystreads.stats.mr!);
});

Deno.test("cible champion : PV pleins, et croît avec le niveau", () => {
  const t6 = targetFromChampion(CHAMPIONS.ahri, 6, [], ITEMS);
  const t11 = targetFromChampion(CHAMPIONS.ahri, 11, [], ITEMS);
  assertEquals(t6.hpCur, t6.hpMax);
  assert(t11.hpMax > t6.hpMax && t11.armor > t6.armor);
});

Deno.test("duel : symétrique — inverser A et B inverse l'avantage", () => {
  const a = side("darius", ["stridebreaker"]);
  const b = side("ahri", ["ludensecho"], { level: 9 });
  const ab = computeDuel(a, b, ITEMS, RUNES);
  const ba = computeDuel(b, a, ITEMS, RUNES);
  assertAlmostEquals(ab.killPctA, ba.killPctB);
  assertAlmostEquals(ab.killPctB, ba.killPctA);
  assertAlmostEquals(ab.edge, -ba.edge);
});

Deno.test("duel : un miroir à niveau et build égaux est neutre", () => {
  const res = computeDuel(side("ahri", ["ludensecho"]), side("ahri", ["ludensecho"]), ITEMS, RUNES);
  assertAlmostEquals(res.edge, 0);
});

Deno.test("duel : un avantage de niveau donne l'avantage", () => {
  const res = computeDuel(side("darius", [], { level: 9 }), side("darius", [], { level: 6 }), ITEMS, RUNES);
  assert(res.edge > 0, "le Darius niveau 9 doit gagner l'échange contre le niveau 6");
});

Deno.test("duel : la RM de la cible réduit les dégâts magiques reçus", () => {
  const ahri = side("ahri", ["ludensecho"]);
  const naked = computeDuel(ahri, side("darius", []), ITEMS, RUNES);
  const mr = computeDuel(ahri, side("darius", ["mercurystreads"]), ITEMS, RUNES);
  assert(mr.aToB.total < naked.aToB.total, "Mercury's Treads doit réduire le combo d'Ahri");
});

Deno.test("duel : l'armure de la cible réduit les dégâts physiques reçus", () => {
  const darius = side("darius", ["stridebreaker"]);
  const naked = computeDuel(darius, side("ahri", []), ITEMS, RUNES);
  const armored = computeDuel(darius, side("ahri", ["frozenheart"]), ITEMS, RUNES);
  const q = (r: typeof naked) => r.aToB.lines.find((l) => l.key === "Q")?.damage ?? 0;
  assert(q(armored) < q(naked), "Frozen Heart doit réduire le Q de Darius");
});

Deno.test("roster : chaque champion se duelle contre tout le roster sans planter", () => {
  const ids = Object.keys(CHAMPIONS);
  for (const a of ids) {
    for (const b of ids) {
      const res = computeDuel(
        side(a, CHAMPIONS[a].shelf.slice(0, 2)),
        side(b, CHAMPIONS[b].shelf.slice(0, 2)),
        ITEMS,
        RUNES,
      );
      assert(Number.isFinite(res.edge), `edge non fini pour ${a} vs ${b}`);
      assert(res.targetA.hpMax > 0 && res.targetB.hpMax > 0, `PV nuls pour ${a} vs ${b}`);
    }
  }
});
