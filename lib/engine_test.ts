/**
 * Tests du moteur. Lancer : `deno task test`.
 *
 * On teste des invariants (monotonie, mitigation, exécution), pas des chiffres
 * exacts — les valeurs sont illustratives et bougeront avec les patchs.
 */

import { assert, assertAlmostEquals, assertEquals } from "@std/assert";
import {
  ATTACK_SPEED_CAP,
  attackSpeedOf,
  autosIn,
  castsIn,
  computeCombo,
  computeDefenses,
  computeDuel,
  cooldownOf,
  damageMultiplier,
  growth,
  rankOf,
  stackPercent,
  targetFromChampion,
  timeToKill,
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
    attackSpeed: 0.625,
    critChance: 0,
    critDamage: 1.75,
    abilityHaste: 0,
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

// --- Trade sur une durée : auto-attaques, vitesse d'attaque, cooldowns, crits. ---

Deno.test("vitesse d'attaque : base au niveau 1 sans objet, plafonnée à 2,5", () => {
  const fiora = CHAMPIONS.fiora;
  assertAlmostEquals(attackSpeedOf(fiora, 1, 0), fiora.base.attackSpeed!);
  assert(attackSpeedOf(fiora, 18, 0) > attackSpeedOf(fiora, 1, 0), "la VA croît avec le niveau");
  assertEquals(attackSpeedOf(fiora, 18, 10), ATTACK_SPEED_CAP);
});

Deno.test("roster : chaque champion a une vitesse d'attaque exploitable", () => {
  for (const c of Object.values(CHAMPIONS)) {
    const as = attackSpeedOf(c, 1, 0);
    assert(as > 0.4 && as < 1, `VA de base suspecte pour ${c.id} : ${as}`);
  }
});

Deno.test("cooldowns : 100 d'ability haste divisent le cooldown par deux", () => {
  const darius = CHAMPIONS.darius;
  const cd = cooldownOf(darius, "Q", 1, 0)!;
  assertAlmostEquals(cooldownOf(darius, "Q", 1, 100)!, cd / 2);
  assertEquals(cooldownOf(darius, "Q", 0, 0), undefined, "sort pas appris : pas de cooldown");
});

Deno.test("lancers et autos sur une fenêtre : premier à t = 0", () => {
  assertEquals(castsIn(0, 5), 1);
  assertEquals(castsIn(10, 5), 3);
  assertEquals(castsIn(10, undefined), 1, "cooldown inconnu : un seul lancer");
  assertEquals(castsIn(10, 0.9), 1, "posture / toggle : un seul lancer");
  assertEquals(autosIn(0, 1), 1);
  assertEquals(autosIn(3, 1), 4);
});

Deno.test("trade : le burst n'a pas d'auto, le trade en a, et une fenêtre plus longue fait plus mal", () => {
  const burst = computeCombo(input("fiora", ["stridebreaker"]));
  const t0 = computeCombo(input("fiora", ["stridebreaker"], { window: 0 }));
  const t3 = computeCombo(input("fiora", ["stridebreaker"], { window: 3 }));
  const t6 = computeCombo(input("fiora", ["stridebreaker"], { window: 6 }));
  assertEquals(burst.lines.find((l) => l.key === "AA"), undefined);
  assert(t0.lines.some((l) => l.key === "AA"), "le mode trade ajoute les auto-attaques");
  assert(t0.total > burst.total && t6.total > t3.total && t3.total >= t0.total);
});

Deno.test("trade : la VA bonus ajoute des autos, le crit renforce chaque auto", () => {
  const aa = (items: string[]) =>
    computeCombo(input("jinx", items, { window: 6 })).lines.find((l) => l.key === "AA")!;
  const naked = aa([]);
  const greaves = aa(["berserkersgreaves"]);
  const ie = aa(["infinityedge"]);
  assert(greaves.name !== naked.name, "Berserker doit changer le nombre d'autos");
  assert(greaves.damage > naked.damage);
  assert(ie.damage > naked.damage);
});

Deno.test("trade : l'ability haste permet de relancer plus souvent", () => {
  const casts = (items: string[]) =>
    computeCombo(input("darius", items, { window: 8, level: 9 })).lines.find((l) => l.key === "Q")!.damage;
  assert(casts(["ionianbootsoflucidity"]) >= casts([]));
  // À haste énorme, au moins un lancer de plus sur la fenêtre.
  const fast = computeCombo(input("darius", [], { window: 8, level: 9 }));
  const q = fast.lines.find((l) => l.key === "Q")!;
  assert(q.name.includes("×"), "sur 8 s, le Q de Darius doit être relancé");
});

Deno.test("temps pour tuer : 0 si le burst suffit, Infinity si jamais, sinon le premier palier", () => {
  const steps = (w: number) => 100 * (1 + Math.floor(w));
  assertEquals(timeToKill(steps, 50), 0);
  assertEquals(timeToKill(steps, 1e9), Infinity);
  assertAlmostEquals(timeToKill(steps, 250), 2, 0.011);
});

Deno.test("all-in : symétrique, plafonné à 100 %, le plus rapide gagne", () => {
  const a = side("darius", ["stridebreaker"]);
  const b = side("ahri", ["ludensecho"]);
  const ab = computeDuel(a, b, ITEMS, RUNES, { allIn: true });
  const ba = computeDuel(b, a, ITEMS, RUNES, { allIn: true });
  assertAlmostEquals(ab.edge, -ba.edge);
  assert(ab.killPctA <= 1 && ab.killPctB <= 1);
  assert(ab.ttkA !== undefined && ab.ttkB !== undefined);
  if (ab.ttkA < ab.ttkB) {
    assertAlmostEquals(ab.killPctA, 1);
    assert(ab.edge >= 0);
  } else if (ab.ttkB < ab.ttkA) {
    assertAlmostEquals(ab.killPctB, 1);
    assert(ab.edge <= 0);
  }
  assertAlmostEquals(ab.window!, Math.min(ab.ttkA, ab.ttkB, 20));
});

Deno.test("roster : l'all-in se calcule contre un adversaire de référence", () => {
  const ref = side("garen", CHAMPIONS.garen.shelf.slice(0, 2));
  for (const id of Object.keys(CHAMPIONS)) {
    const res = computeDuel(side(id, CHAMPIONS[id].shelf.slice(0, 2)), ref, ITEMS, RUNES, { allIn: true });
    assert(Number.isFinite(res.edge), `edge non fini pour ${id}`);
    assert(res.ttkA! >= 0 && res.ttkB! >= 0, `temps pour tuer négatif pour ${id}`);
  }
});
