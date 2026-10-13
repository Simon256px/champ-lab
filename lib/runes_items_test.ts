/**
 * Runes et objets — valeurs du jeu et effets dans le duel. Lancer : `deno task test`.
 */

import { assert, assertAlmostEquals, assertEquals } from "@std/assert";
import { CHAMPIONS } from "@/data/champions.ts";
import { ITEMS } from "@/data/items.ts";
import { RUNES } from "@/data/runes.ts";
import type { IncludeMap, RuneKind } from "@/data/types.ts";
import { computeCombo, computeDuel, computeStats, conquerorBonus, formulaStats } from "@/lib/engine.ts";
import type { ComboInput, DuelSide } from "@/lib/engine.ts";
import { evalFormula } from "@/lib/formula.ts";

const ALL_IN: IncludeMap = { Q: true, W: true, E: true, R: true, bleed: true, rune: true };
const TARGET = { armor: 60, mr: 40, hpMax: 2000, hpCur: 2000 };
const combo = (champ: string, over: Partial<ComboInput> = {}) =>
  computeCombo({
    champion: CHAMPIONS[champ],
    level: 11,
    itemIds: [],
    items: ITEMS,
    runes: RUNES,
    runeOn: true,
    target: TARGET,
    bleedStacks: 5,
    include: ALL_IN,
    ...over,
  });
const side = (id: string, itemIds: string[] = [], over: Partial<DuelSide> = {}): DuelSide => ({
  champion: CHAMPIONS[id],
  level: 11,
  itemIds,
  runeOn: true,
  ...over,
});
const naked = computeStats(CHAMPIONS.ahri, 1, [], ITEMS, RUNES, false);
const zero = { ...formulaStats(naked), ap: 0, bonusAd: 0 };

// --- Runes : valeurs du fichier des runes du jeu ---

Deno.test("runes : Électrocution 70 → 240 (jeu 16.20), plus 260", () => {
  const f = RUNES.electrocute.calcs!.TotalDamage!;
  assertEquals(evalFormula(f, { rank: 1, level: 1, stats: zero }), 70);
  assertEquals(evalFormula(f, { rank: 1, level: 18, stats: zero }), 240);
});

Deno.test("runes : Conquérant 1,8 → 4 de force par stack × 12 (AP 48 au niveau 18, AD 28,8)", () => {
  assertAlmostEquals(conquerorBonus(RUNES.conqueror, "AP", 18).ap, 48);
  assertAlmostEquals(conquerorBonus(RUNES.conqueror, "AD", 18).ad, 28.8);
  assertAlmostEquals(conquerorBonus(RUNES.conqueror, "AP", 1).ap, 21.6);
});

Deno.test("runes : chaque keystone a ses valeurs du jeu ; sans effet en duel = raison affichée", () => {
  for (const r of Object.values(RUNES)) {
    assert(r.values && Object.keys(r.values).length > 0, `${r.id} : pas de valeurs du jeu`);
    if (r.kind === "none") assert(r.noDuelEffect, `${r.id} : ni modèle ni raison`);
  }
});

/** Pour chaque rune modélisée, un champion qui la déclenche, et ce qu'elle doit produire. */
const CASES: [RuneKind, string, string, (r: ReturnType<typeof combo>) => boolean][] = [
  ["electro", "electrocute", "ahri", (r) => r.lines.some((l) => l.key === "✦")],
  ["aery", "summonaery", "ivern", (r) => r.lines.some((l) => l.key === "✦") && r.shield > 0],
  ["comet", "arcanecomet", "lux", (r) => r.lines.some((l) => l.key === "✦")],
  ["pta", "presstheattack", "jinx", (r) => r.lines.filter((l) => l.key === "✦").length >= 2],
  ["lethaltempo", "lethaltempo", "jinx", (r) => r.lines.some((l) => l.key === "✦")],
  ["hailofblades", "hailofblades", "zed", (r) => r.lines.some((l) => l.key === "✦")],
  ["grasp", "graspoftheundying", "garen", (r) => r.lines.some((l) => l.key === "✦") && r.heal > 0],
  ["aftershock", "aftershock", "leona", (r) => r.lines.some((l) => l.key === "✦") && !!r.resistBuff],
  ["fleet", "fleetfootwork", "jinx", (r) => r.heal > 0],
  ["firststrike", "firststrike", "ahri", (r) => r.lines.some((l) => l.key === "✦")],
  ["guardian", "guardian", "leona", (r) => r.shield > 0],
  ["deathfire", "deathfiretouch", "ahri", (r) => r.lines.some((l) => l.key === "✦")],
  ["conqueror", "conqueror", "darius", (r) => r.heal > 0],
];

for (const [kind, rune, champ, check] of CASES) {
  Deno.test(`runes : ${rune} (${kind}) agit sur ${champ} en trade`, () => {
    assertEquals(RUNES[rune].kind, kind);
    const r = combo(champ, { keystoneId: rune, window: 8 });
    assert(check(r), `${rune} sans effet visible`);
    const off = combo(champ, { keystoneId: rune, window: 8, runeOn: false });
    assert(r.total >= off.total, "une rune n'enlève pas de dégâts");
  });
}

Deno.test("runes : Moisson noire seulement sous 50 % de PV", () => {
  const big = combo("ahri", {
    keystoneId: "darkharvest",
    window: 10,
    target: { ...TARGET, hpMax: 900, hpCur: 900 },
  });
  const tank = combo("ahri", {
    keystoneId: "darkharvest",
    window: 1,
    target: { ...TARGET, hpMax: 90000, hpCur: 90000 },
  });
  assert(big.lines.some((l) => l.key === "✦"));
  assert(!tank.lines.some((l) => l.key === "✦"));
});

// --- Objets défensifs et utilitaires ---

Deno.test("objets : Sterak +50 % AD de base, Ange gardien rend 50 % des PV de base", () => {
  const darius = CHAMPIONS.darius;
  const s = computeStats(darius, 11, ["steraksgage"], ITEMS, RUNES, false);
  const bare = computeStats(darius, 11, [], ITEMS, RUNES, false);
  assertAlmostEquals(s.bonusAD - bare.bonusAD, 0.5 * bare.baseAD);
  const ga = combo("darius", { itemIds: ["guardianangel"], window: 6 });
  assertAlmostEquals(ga.extraHp, 0.5 * (ga.stats.maxHp - ga.stats.bonusHp));
});

Deno.test("objets : Baguette des âges grandit avec le temps porté", () => {
  const young = computeStats(CHAMPIONS.ahri, 11, ["rodofages"], ITEMS, RUNES, false, "electrocute", {
    rodofages: 0,
  });
  const old = computeStats(CHAMPIONS.ahri, 11, ["rodofages"], ITEMS, RUNES, false, "electrocute", {
    rodofages: 30,
  });
  assert(old.ap > young.ap && old.maxHp > young.maxHp && old.maxMana > young.maxMana);
});

Deno.test("objets : Archange donne de l'AP selon le mana", () => {
  const s = computeStats(CHAMPIONS.ahri, 11, ["archangelsstaff"], ITEMS, RUNES, false);
  assertAlmostEquals(s.ap, ITEMS.archangelsstaff.stats.ap! + 0.01 * s.bonusMana);
});

Deno.test("objets : Zhonya esquive le plus gros coup ; Danse de la mort diffère des dégâts", () => {
  const vsZhonya = computeDuel(side("zed"), side("ahri", ["zhonyashourglass"]), ITEMS, RUNES, { window: 6 });
  const vsNaked = computeDuel(side("zed"), side("ahri", ["amplifyingtome"]), ITEMS, RUNES, { window: 6 });
  assert(vsZhonya.blockedByB > vsNaked.blockedByB);
  const dd = computeDuel(side("darius"), side("jax", ["deathsdance"]), ITEMS, RUNES, { window: 6 });
  assert(dd.blockedByB > 0);
});

Deno.test("objets : blessures graves réduisent les soins ; Cotte épineuse renvoie des dégâts", () => {
  const healer = side("darius", ["stridebreaker"]);
  const plain = computeDuel(healer, side("garen", ["sheen"]), ITEMS, RUNES, { window: 10 });
  const wounds = computeDuel(healer, side("garen", ["chempunkchainsword"]), ITEMS, RUNES, { window: 10 });
  assert(wounds.sustainA <= plain.sustainA, "Chempunk réduit les soins de Darius");
  const thorns = computeDuel(side("jinx"), side("garen", ["thornmail"]), ITEMS, RUNES, { window: 6 });
  const noThorns = computeDuel(side("jinx"), side("garen", ["randuinsomen"]), ITEMS, RUNES, { window: 6 });
  assert(thorns.killPctB > noThorns.killPctB * 0.9, "la Cotte renvoie des dégâts à Jinx");
});

Deno.test("objets : Randuin réduit les crits reçus ; Visage spirituel renforce les soins", () => {
  const crit = ["infinityedge"];
  const vsRanduin = combo("jinx", { itemIds: crit, window: 6, target: { ...TARGET, critReduction: 0.3 } });
  const vsPlain = combo("jinx", { itemIds: crit, window: 6 });
  const aa = (r: typeof vsPlain) => r.lines.find((l) => l.key === "AA")!.damage;
  assert(aa(vsRanduin) < aa(vsPlain));
  // Même objet, avec et sans son effet : soins (dont le Q de Darius) +25 %.
  const noEffect = { ...ITEMS, spiritvisage: { ...ITEMS.spiritvisage, mechanics: [] } };
  const sv = combo("darius", { itemIds: ["spiritvisage"], window: 12 });
  const bare = combo("darius", { itemIds: ["spiritvisage"], window: 12, items: noEffect });
  assert(bare.missingHpHealRatio > 0, "Darius Q soigne en trade");
  assertAlmostEquals(sv.missingHpHealRatio, bare.missingHpHealRatio * 1.25);
  assertAlmostEquals(sv.heal, bare.heal * 1.25);
});

// --- Enracinements et ralentissements ---

Deno.test("contrôles de mouvement : enracinements et ralentissements lus dans le jeu", () => {
  assert(CHAMPIONS.ivern.abilities.Q.root, "Ivern Q enracine");
  const roots =
    Object.values(CHAMPIONS).flatMap((c) => Object.values(c.abilities)).filter((a) => a.root).length;
  const slows =
    Object.values(CHAMPIONS).flatMap((c) => Object.values(c.abilities)).filter((a) => a.slow).length;
  assert(roots > 15 && slows > 50, `${roots} enracinements, ${slows} ralentissements`);
});
