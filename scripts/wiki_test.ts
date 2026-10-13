/**
 * Lecture du wiki officiel (rendu HTML, tables Lua). Lancer : `deno task test`.
 */

import { assertEquals } from "@std/assert";
import {
  arithmetic,
  htmlToText,
  itemsFromTable,
  levelSeries,
  numberList,
  parseAbilityBoxes,
  parseLevelingValue,
  parseLua,
} from "./wiki.ts";

Deno.test("wiki : tables Lua (nombres, expressions, listes, clés)", () => {
  const t = parseLua(`-- <pre>
return {
  ["Ahri"] = {
    ["id"] = 103,
    ["stats"] = { ["hp_base"] = 590, ["as_ratio"] = 1000+1000/17, },
    ["skills"] = {[1] = "Essence Theft", [2] = "Orb of Deception"},
    ["role"] = {"Burst"},
    ["ranged"] = true,
  },
}`) as Record<string, Record<string, unknown>>;
  assertEquals(t.Ahri.id, 103);
  assertEquals((t.Ahri.stats as Record<string, number>).as_ratio, 1000 + 1000 / 17);
  assertEquals(t.Ahri.skills, ["Essence Theft", "Orb of Deception"]);
  assertEquals(t.Ahri.role, ["Burst"]);
  assertEquals(t.Ahri.ranged, true);
  assertEquals(arithmetic("(2+3)*4-6/3"), 18);
});

Deno.test("wiki : ligne de progression → base par rang et ratios (Darius Q)", () => {
  const dd =
    `50 / 80 / 110 / 140 / 170 <span style="color:orange">(+ 100 / 110 / 120 / 130 / 140% AD)</span>`;
  assertEquals(parseLevelingValue(dd), [
    { units: [""], values: [50, 80, 110, 140, 170] },
    { units: ["% AD"], values: [100, 110, 120, 130, 140] },
  ]);
  // Décimales en <small>, ratio fixe.
  assertEquals(parseLevelingValue(`17.<small>5</small> / 28 <span>(+ 35% AP)</span>`), [
    { units: [""], values: [17.5, 28] },
    { units: ["% AP"], values: [35] },
  ]);
  // Complément entre crochets (Tahm Kench Q) : hors valeur principale.
  assertEquals(parseLevelingValue(`75 / 120 + [ 5 ] (+ 100% AP)`)[0], { units: [""], values: [75, 120] });
});

Deno.test("wiki : valeur par niveau aux paliers irréguliers + part par rang (Mordekaiser Q)", () => {
  const pp = `<span class="pp-tooltip" data-bot-values="0;7;14;21;28;35;42;49;56;63;70;77" ` +
    `data-top-values="1;10;11;12;13;14;15;16;17;18;19;20">0 – 77 (based on level)</span>`;
  const mods = parseLevelingValue(`${pp} (+ 80 / 115 / 150 / 185 / 220) <span>(+ 70% AP)</span>`);
  assertEquals(mods[0].units, ["by level"]);
  // Constant à 0 jusqu'au niveau 9, puis +7 par niveau.
  assertEquals(mods[0].values.slice(0, 10), [0, 0, 0, 0, 0, 0, 0, 0, 0, 7]);
  assertEquals(mods[0].values[17], 63);
  assertEquals(mods[1], { units: [""], values: [80, 115, 150, 185, 220] });
  assertEquals(mods[2], { units: ["% AP"], values: [70] });
  assertEquals(levelSeries({ values: [1, 2, 3] }).length, 18);
});

Deno.test("wiki : texte rendu, jetons de progression, listes", () => {
  const { text, pp } = htmlToText(
    `Deals <span class="pp-tooltip" data-bot-values="20;25;30" data-bot-key="%">20% – 30%</span> &amp; more<br/>Next`,
  );
  assertEquals(text, "Deals ⟦0⟧ & more\nNext");
  assertEquals(pp[0], { values: [20, 25, 30], key: "%" });
  assertEquals(numberList("9 / 8 / 7"), [9, 8, 7]);
  assertEquals(numberList("none"), null);
});

Deno.test("wiki : boîte de sort rendue → nom, temps de recharge, lignes", () => {
  const html = `<div class="skill skill&#95;q"><div class="ability-info-stats&#95;&#95;ability">Decimate</div>
<div class="ability-info-stats&#95;&#95;stat"><div class="ability-info-stats&#95;&#95;stat-label">COOLDOWN:</div><div class="ability-info-stats&#95;&#95;stat-value">9 / 8 / 7 / 6 / 5</div></div>
<div class="ability-info-content"><div class="ability-info-row">
<div class="ability-info-description">Swings his axe.</div>
<div class="ability-info-stats"><dl class="skill-tabs"><dt><b>Physical Damage:</b></dt><dd>50 / 80 <span>(+ 100% AD)</span></dd></dl></div>
</div></div></div>`;
  const [box] = parseAbilityBoxes(html);
  assertEquals(box.name, "Decimate");
  assertEquals(box.stats.COOLDOWN, "9 / 8 / 7 / 6 / 5");
  assertEquals(box.rows[0].text, "Swings his axe.");
  assertEquals(box.rows[0].leveling, [{
    attribute: "Physical Damage",
    modifiers: [{ units: [""], values: [50, 80] }, { units: ["% AD"], values: [100] }],
  }]);
});

Deno.test("wiki : objets — les renvois « =>Autre objet » sont résolus (Manamune → Muramana)", () => {
  const items = itemsFromTable({
    Muramana: { id: 3042, type: ["Legendary"], stats: { ad: 35, ah: 15 }, modes: { "classic sr 5v5": true } },
    Manamune: { id: 3004, type: "=>Muramana", stats: { ad: 35, mana: 500 }, modes: "=>Muramana" },
    Armguard: { id: 2421, type: "=>Muramana", stats: { ap: "=>Muramana", armor: 25 } },
  });
  const by = Object.fromEntries(items.map((i) => [i.name, i]));
  assertEquals(by.Manamune.type, ["Legendary"]);
  assertEquals(by.Manamune.modes, { "classic sr 5v5": true });
  assertEquals(by.Manamune.stats, { ad: 35, mana: 500 });
  assertEquals(by.Armguard.stats, { armor: 25 });
});
