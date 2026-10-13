/**
 * Ivern — fiche complète vérifiée. Lancer : `deno task test`.
 *
 * Les valeurs attendues ci-dessous ont été lues dans les fichiers du jeu
 * (CommunityDragon, patch 16.20) ET recoupées avec le wiki officiel de League.
 * Si Riot modifie Ivern, ce test échoue exprès : re-vérifier les valeurs (fichiers
 * du jeu + wiki) puis mettre ce fichier à jour.
 */

import { assert, assertAlmostEquals, assertEquals } from "@std/assert";
import { CHAMPIONS } from "@/data/champions.ts";
import { ITEMS } from "@/data/items.ts";
import { KITS } from "@/data/kits.ts";
import { RUNES } from "@/data/runes.ts";
import type { Formula, IncludeMap } from "@/data/types.ts";
import { computeCombo, computeStats, formulaAt, formulaStats } from "@/lib/engine.ts";
import { evalFormula } from "@/lib/formula.ts";
import { renderTooltip } from "@/lib/tooltip.ts";

const ivern = CHAMPIONS.ivern;
const kit = KITS.ivern;
const ALL_IN: IncludeMap = { Q: true, W: true, E: true, R: true, bleed: true, rune: true };
const naked = (level = 11) => computeStats(ivern, level, [], ITEMS, RUNES, false);
/** Valeur d'un calcul de la fiche à 0 AP (base pure), au rang et au niveau donnés. */
const base = (f: Formula, rank: number, level = 1) =>
  evalFormula(f, { rank, level, stats: { ...formulaStats(naked(level)), ap: 0 } });

Deno.test("Ivern : chaque nombre de chaque infobulle se résout, à tous les rangs et niveaux", () => {
  assert(kit, "fiche de kit d'Ivern générée");
  for (const [key, spell] of Object.entries(kit.spells)) {
    for (let rank = 1; rank <= spell.maxRank; rank++) {
      for (const level of [1, 6, 11, 18]) {
        const tip = renderTooltip(spell, { rank, level, stats: formulaStats(naked(level)) });
        assertEquals(tip.missing, [], `${key} rang ${rank} niveau ${level}`);
        for (const p of tip.paragraphs) {
          for (const s of p) if (s.value) assert(!s.text.includes("NaN"), `${key} : ${s.text}`);
        }
      }
    }
  }
});

Deno.test("Ivern Q : 80 → 260 (+70 % AP), racine 1,6 → 2 s, recharge 14 → 10 s", () => {
  const q = kit.spells.Q!;
  assertEquals([1, 2, 3, 4, 5].map((r) => base(q.calcs.TotalDamage!, r)), [80, 125, 170, 215, 260]);
  assertEquals(q.values.RootDuration, [1.6, 1.7, 1.8, 1.9, 2]);
  assertEquals(q.cooldown, [14, 13, 12, 11, 10]);
  assertEquals(ivern.abilities.Q.type, "magic");
  assert(ivern.abilities.Q.mobility, "la relance de Q est un dash d'Ivern");
});

Deno.test("Ivern W : 20 → 50 (+20 % AP) sur les autos, 10 → 30 (+10 % AP) pour les alliés, 3 charges", () => {
  const w = kit.spells.W!;
  assertEquals([1, 2, 3, 4, 5].map((r) => base(w.calcs.TotalDamage!, r)), [20, 27.5, 35, 42.5, 50]);
  assertEquals([1, 2, 3, 4, 5].map((r) => base(w.calcs.TotalAllyDamage!, r)), [10, 15, 20, 25, 30]);
  assertEquals(w.ammo, { max: 3, recharge: 20 });
});

Deno.test("Ivern E : bouclier 75 → 235 (+50 % AP), explosion 70 → 150 (+80 % AP), recharge 11 → 7 s", () => {
  const e = kit.spells.E!;
  assertEquals([1, 2, 3, 4, 5].map((r) => base(e.calcs.TotalShield!, r)), [75, 115, 155, 195, 235]);
  assertEquals([1, 2, 3, 4, 5].map((r) => base(e.calcs.TotalDamage!, r)), [70, 90, 110, 130, 150]);
  assertEquals(e.cooldown, [11, 10, 9, 8, 7]);
});

Deno.test("Daisy : PV 1000 → 4400, AD 70/100/130, VA 0,975/1,088/1,2, onde 90/140/190, résistances 30 → 90", () => {
  const pet = ivern.mechanics!.find((m) => m.kind === "pet");
  assert(pet?.kind === "pet", "Daisy résolue depuis les fichiers du jeu");
  const s1 = { ...naked(1), ap: 0 };
  const s18 = { ...naked(18), ap: 0 };
  assertEquals(formulaAt(pet.hp, 1, 1, s1), 1000);
  assertEquals(formulaAt(pet.hp, 1, 18, s18), 4400);
  assertEquals([1, 2, 3].map((r) => formulaAt(pet.ad, r, 1, s1)), [70, 100, 130]);
  const as = (r: number) =>
    formulaAt(pet.baseAttackSpeed, r, 1, s1) * (1 + formulaAt(pet.bonusAttackSpeed, r, 1, s1));
  assertAlmostEquals(as(1), 0.975);
  assertAlmostEquals(as(2), 1.0875);
  assertAlmostEquals(as(3), 1.2);
  assertEquals([1, 2, 3].map((r) => formulaAt(pet.slamDamage!, r, 1, s1)), [90, 140, 190]);
  assertEquals(formulaAt(pet.slamCc!, 1, 1, s1), 1);
  assertEquals(formulaAt(pet.slamCooldown!, 1, 1, s1), 3);
  assertEquals(formulaAt(pet.duration, 1, 1, s1), 45);
  const resists = kit.spells.R!.calcs.TotalBonusResists!;
  assertEquals(base(resists, 1, 1), 30);
  assertEquals(base(resists, 1, 18), 90);
  assertEquals(kit.spells.R!.cooldown, [140, 130, 120]);
});

Deno.test("Ivern R : Daisy saute, pas Ivern — pas de mobilité, contrôle compté une fois via Daisy", () => {
  assert(!ivern.abilities.R.mobility);
  const trade = computeCombo({
    champion: ivern,
    level: 11,
    itemIds: [],
    items: ITEMS,
    runes: RUNES,
    runeOn: false,
    target: { armor: 60, mr: 40, hpMax: 2000, hpCur: 2000 },
    bleedStacks: 0,
    include: ALL_IN,
    window: 6,
  });
  const slam = trade.lines.find((l) => l.name.startsWith("Daisy — onde de choc"))!;
  assert(slam, "l'onde de choc tombe sur 6 s");
  assertEquals(trade.ccDuration, slam.hits! * 1, "une projection de 1 s par onde, pas une de plus au lancer");
  assertEquals(trade.ccIrreducible, trade.ccDuration, "la projection ignore la ténacité");
});

Deno.test("Ivern : W frappe sur chaque auto, Daisy n'agit qu'en trade, le bouclier profite des objets", () => {
  const combo = (window: number | undefined, itemIds: string[] = []) =>
    computeCombo({
      champion: ivern,
      level: 11,
      itemIds,
      items: ITEMS,
      runes: RUNES,
      runeOn: false,
      target: { armor: 60, mr: 40, hpMax: 2000, hpCur: 2000 },
      bleedStacks: 0,
      include: ALL_IN,
      window,
    });
  const burst = combo(undefined);
  assertEquals(
    burst.lines.find((l) => l.name.startsWith("Daisy")),
    undefined,
    "burst : pas d'attaque de Daisy",
  );
  const trade = combo(6);
  const autos = trade.lines.find((l) => l.key === "AA")!.hits!;
  assertEquals(trade.lines.find((l) => l.key === "W")!.hits, autos, "W sur chaque auto");
  assert(combo(6, ["staffofflowingwater"]).shield > combo(6, ["amplifyingtome"]).shield);
});

Deno.test("Ivern : réglages d'enchanteur (Aery, build de soutien, E au max)", () => {
  assertEquals(ivern.keystone, "summonaery");
  assert(ivern.shelf.includes("moonstonerenewer"));
  assertEquals(ivern.skillOrder.filter((k) => k === "E").length, 5);
  assertEquals(
    ivern.skillOrder.slice(0, 9).filter((k) => k === "E").length,
    5,
    "E au max en premier (niveau 9)",
  );
});
