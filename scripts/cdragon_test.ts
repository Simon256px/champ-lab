/**
 * Tests de la conversion des formules CommunityDragon, sur des extraits
 * reproduits des fichiers du jeu (pas de réseau). Lancer : `deno task test`.
 */

import { assert, assertAlmostEquals, assertEquals } from "@std/assert";
import { ccDuration, cooldowns, resolveRef, spellSlots, toFormula } from "./cdragon.ts";
import { evalFormula } from "../lib/formula.ts";

const stats = {
  ap: 0,
  ad: 150,
  baseAd: 100,
  bonusAd: 50,
  maxHp: 2000,
  baseHp: 1500,
  bonusHp: 500,
  armor: 0,
  bonusArmor: 0,
  mr: 0,
  bonusMr: 0,
  attackSpeed: 1,
  bonusAttackSpeed: 0.4,
  critChance: 0,
  critDamage: 1.75,
  lethality: 0,
};

// Forme réelle du Q de Darius (16.20) : BaseDamage + AD total × TotalADRatio × 0,01.
const dariusQ = {
  DataValues: [
    { name: "TotalADRatio", values: [90, 100, 110, 120, 130, 140, 150] },
    { name: "BaseDamage", values: [10, 50, 80, 110, 140, 170, 200] },
    { name: "MissingHealthHeal", values: [17, 17, 17, 17, 17, 17, 17] },
  ],
  mSpellCalculations: {
    BladeDamage: {
      mFormulaParts: [
        { mDataValue: "BaseDamage", __type: "NamedDataValueCalculationPart" },
        {
          mStat: 2,
          mSubpart: {
            mPart1: { mDataValue: "TotalADRatio", __type: "NamedDataValueCalculationPart" },
            mPart2: { mNumber: 0.009999999776482582, __type: "NumberCalculationPart" },
            __type: "ProductOfSubPartsCalculationPart",
          },
          __type: "StatBySubPartCalculationPart",
        },
      ],
      __type: "GameCalculation",
    },
    HandleDamage: {
      mMultiplier: { mNumber: 0.35, __type: "NumberCalculationPart" },
      mModifiedGameCalculation: "BladeDamage",
      __type: "GameCalculationModified",
    },
    Stacky: {
      mFormulaParts: [{ mBuffName: "x", __type: "BuffCounterByCoefficientCalculationPart" }],
      __type: "GameCalculation",
    },
  },
  cooldownTime: [10, 9, 8, 7, 6, 5, 5],
};

Deno.test("cdragon : Q de Darius — index 0 = rang 0 ignoré, AD total × ratio", () => {
  const f = toFormula(dariusQ, "BladeDamage", 5)!;
  assert(f, "la formule doit se convertir");
  const at = (rank: number) => evalFormula(f, { rank, level: 9, stats });
  assertEquals(Math.round(at(1)), 50 + 150);
  assertEquals(Math.round(at(5)), 170 + 210);
});

Deno.test("cdragon : calcul modifié (poignée = 35 % de la lame)", () => {
  const blade = toFormula(dariusQ, "BladeDamage", 5)!;
  const handle = toFormula(dariusQ, "HandleDamage", 5)!;
  const ctx = { rank: 3, level: 9, stats };
  assertEquals(Math.round(evalFormula(handle, ctx) * 100), Math.round(evalFormula(blade, ctx) * 35));
});

Deno.test("cdragon : une brique inconnue (cumul de buff) donne null, pas une valeur inventée", () => {
  assertEquals(toFormula(dariusQ, "Stacky", 5), null);
  assertEquals(toFormula(dariusQ, "Absent", 5), null);
});

Deno.test("cdragon : cooldowns par rang, sorts retrouvés, valeur brute avec facteur", () => {
  assertEquals(cooldowns(dariusQ, 5), [9, 8, 7, 6, 5]);
  const bin = {
    "Characters/Darius/CharacterRecords/Root": {
      spellNames: ["DariusCleaveAbility/DariusCleave"],
      mCharacterPassiveSpell: "Characters/Darius/Spells/P/P",
    },
    "Characters/Darius/Spells/DariusCleaveAbility/DariusCleave": { mSpell: dariusQ },
  };
  const slots = spellSlots(bin);
  assert(slots.Q, "le Q doit être retrouvé via spellNames");
  const heal = resolveRef(slots, { slot: "Q", value: "MissingHealthHeal", times: 0.01 }, 5)!;
  assertEquals(evalFormula(heal, { rank: 1, level: 1, stats }), 0.17);
});

Deno.test("cdragon : contrôle — la durée la plus longue, sans variantes ni enracinement", () => {
  const spell = {
    DataValues: [
      { name: "StunDuration", values: [0.75, 0.75, 0.75, 0.75, 0.75, 0.75, 0.75] },
      { name: "KnockUpDuration", values: [1, 1, 1, 1, 1, 1, 1] },
      { name: "MinionStunDuration", values: [3, 3, 3, 3, 3, 3, 3] },
      { name: "WallStunDuration", values: [2, 2, 2, 2, 2, 2, 2] },
      { name: "RootDuration", values: [2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5] },
      { name: "MaxStunDuration", values: [3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5] },
    ],
  };
  assertEquals(ccDuration(spell, 5), { op: "num", n: 1 });
  assertEquals(ccDuration({ DataValues: [{ name: "RootDuration", values: [1, 1] }] }, 5), null);
  assertEquals(
    ccDuration({ DataValues: [{ name: "CharmDuration", values: [0, 1.2, 1.35, 1.5, 1.65, 1.8, 1.8] }] }, 5),
    { op: "rank", v: [1.2, 1.35, 1.5, 1.65, 1.8] },
  );
});

Deno.test("cdragon : stats VA, crit, létalité reconnues", () => {
  const spell = {
    mSpellCalculations: {
      X: {
        mFormulaParts: [
          { mStat: 4, mStatFormula: 2, mCoefficient: 0.3, __type: "StatByCoefficientCalculationPart" },
          { mStat: 8, mCoefficient: 100, __type: "StatByCoefficientCalculationPart" },
          { mStat: 29, mCoefficient: 2, __type: "StatByCoefficientCalculationPart" },
        ],
        __type: "GameCalculation",
      },
      Y: {
        mFormulaParts: [{ mStat: 7, mCoefficient: 1, __type: "StatByCoefficientCalculationPart" }],
        __type: "GameCalculation",
      },
    },
  };
  const f = toFormula(spell, "X", 5)!;
  const v = evalFormula(f, { rank: 1, level: 1, stats: { ...stats, critChance: 0.25, lethality: 10 } });
  assertAlmostEquals(v, 45.12, 1e-9);
  assertEquals(toFormula(spell, "Y", 5), null, "vitesse de déplacement : non modélisée");
});
