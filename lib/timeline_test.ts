/**
 * Tests de la timeline de matchup. Lancer : `deno task test`.
 *
 * Comme pour le moteur : des invariants (monotonie, symétrie, conservation de
 * l'or), pas des minutes exactes — la courbe de lane est un modèle réglable.
 */

import { assert, assertAlmostEquals, assertEquals } from "@std/assert";
import {
  defaultBuildOrder,
  findSpikes,
  goldAt,
  inventoryAt,
  levelAt,
  levelFromXp,
  matchupTimeline,
  purchasePlan,
  XP_TO_LEVEL,
} from "@/lib/timeline.ts";
import { CHAMPIONS } from "@/data/champions.ts";
import { ITEMS } from "@/data/items.ts";
import { RUNES } from "@/data/runes.ts";

Deno.test("XP : table officielle (280 pour le niveau 2, 18 360 pour le 18)", () => {
  assertEquals(XP_TO_LEVEL[2], 280);
  assertEquals(XP_TO_LEVEL[18], 18360);
  assertEquals(levelFromXp(0), 1);
  assertEquals(levelFromXp(279), 1);
  assertEquals(levelFromXp(280), 2);
  assertEquals(levelFromXp(1e9), 18);
});

Deno.test("niveau : croissant, niveau 6 dans une fenêtre réaliste (5–8 min)", () => {
  let prev = 0;
  for (let m = 0; m <= 40; m++) {
    const l = levelAt(m);
    assert(l >= prev && l <= 18);
    prev = l;
  }
  assert(levelAt(5) < 6 && levelAt(8) >= 6, "le niveau 6 doit tomber entre 5 et 8 minutes");
});

Deno.test("or : 500 au départ, puis croissant", () => {
  assertEquals(goldAt(0), 500);
  assert(goldAt(10) > goldAt(5) && goldAt(5) > goldAt(1));
});

Deno.test("plan d'achat : composants d'abord, et la somme des prix = prix de l'objet", () => {
  const plan = purchasePlan(["blackcleaver"], ITEMS);
  assertEquals(plan.at(-1)?.itemId, "blackcleaver");
  assert(plan.length > 1, "le Fendoir doit se construire en plusieurs achats");
  assertAlmostEquals(plan.reduce((a, s) => a + s.price, 0), ITEMS.blackcleaver.cost!);
  assert(plan.every((s) => s.price >= 0), "aucun prix de combinaison négatif");
});

Deno.test("inventaire : un objet terminé consomme ses composants", () => {
  const plan = purchasePlan(["blackcleaver"], ITEMS);
  assertEquals(inventoryAt(plan, 0, ITEMS), []);
  assertEquals(inventoryAt(plan, ITEMS.blackcleaver.cost!, ITEMS), ["blackcleaver"]);
  const partial = inventoryAt(plan, ITEMS.blackcleaver.cost! - 1, ITEMS);
  assert(!partial.includes("blackcleaver") && partial.length > 0, "à 1 or près : que des composants");
});

Deno.test("build par défaut : Doran adapté au profil, puis l'étagère", () => {
  assertEquals(defaultBuildOrder(CHAMPIONS.darius, ITEMS)[0], "doransblade");
  assertEquals(defaultBuildOrder(CHAMPIONS.ahri, ITEMS)[0], "doransring");
});

Deno.test("timeline : un point par minute, niveaux croissants", () => {
  const pts = matchupTimeline({ champion: CHAMPIONS.darius }, { champion: CHAMPIONS.ahri }, ITEMS, RUNES);
  assertEquals(pts.length, 25);
  assertEquals(pts[0].minute, 1);
  for (let i = 1; i < pts.length; i++) assert(pts[i].levelA >= pts[i - 1].levelA);
  assert(pts.at(-1)!.buildA.length > pts[0].buildA.length, "le build doit grossir avec le temps");
});

Deno.test("timeline : symétrique — inverser A et B inverse l'edge à chaque minute", () => {
  const a = { champion: CHAMPIONS.darius };
  const b = { champion: CHAMPIONS.ahri };
  const ab = matchupTimeline(a, b, ITEMS, RUNES);
  const ba = matchupTimeline(b, a, ITEMS, RUNES);
  ab.forEach((p, i) => assertAlmostEquals(p.edge, -ba[i].edge));
});

Deno.test("timeline : un retard d'XP coûte de l'edge", () => {
  const even = matchupTimeline({ champion: CHAMPIONS.darius }, { champion: CHAMPIONS.darius }, ITEMS, RUNES);
  const behind = matchupTimeline(
    { champion: CHAMPIONS.darius },
    { champion: CHAMPIONS.darius, lane: { xpPerMin: 380 } },
    ITEMS,
    RUNES,
  );
  even.forEach((p) => assertAlmostEquals(p.edge, 0));
  assert(behind.some((p) => p.edge > 0.05), "B en retard d'XP doit perdre l'échange à un moment");
});

Deno.test("spikes : le niveau 6 de Darius ressort, avec son ultime comme cause", () => {
  const darius = CHAMPIONS.darius;
  const garen = CHAMPIONS.garen;
  const pts = matchupTimeline({ champion: darius }, { champion: garen }, ITEMS, RUNES);
  const spikes = findSpikes(pts, darius, garen, ITEMS);
  const lvl6 = spikes.find((s) => s.causes.includes(`${darius.name} ultime rang 1`));
  assert(lvl6, "le passage au niveau 6 doit être un spike");
  assertEquals(lvl6.side, "A");
});

Deno.test("timeline all-in : symétrique, temps pour tuer renseignés", () => {
  const a = { champion: CHAMPIONS.darius };
  const b = { champion: CHAMPIONS.fiora };
  const ab = matchupTimeline(a, b, ITEMS, RUNES, { allIn: true });
  const ba = matchupTimeline(b, a, ITEMS, RUNES, { allIn: true });
  ab.forEach((p, i) => {
    assertAlmostEquals(p.edge, -ba[i].edge);
    assert(p.ttkA !== undefined && p.ttkB !== undefined);
  });
  const burst = matchupTimeline(a, b, ITEMS, RUNES);
  assertEquals(burst[0].ttkA, undefined, "pas de temps pour tuer en mode burst");
});
