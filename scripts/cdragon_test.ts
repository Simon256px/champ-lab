/**
 * Tests de la conversion des formules CommunityDragon, sur des extraits
 * reproduits des fichiers du jeu (pas de réseau). Lancer : `deno task test`.
 */

import { assert, assertAlmostEquals, assertEquals } from "@std/assert";
import {
  ccDuration,
  ccKind,
  cooldowns,
  itemExtraStats,
  parseTooltip,
  resolveItemRef,
  resolveRef,
  spellSlots,
  toFormula,
} from "./cdragon.ts";
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

// --- Infobulles (extraits réels du client, 16.20) ---

const VAYNE_E =
  "Vayne fires a bolt that <status>Knocks Back</status> and deals <physicalDamage>@TotalDamage@ " +
  "physical damage</physicalDamage>. If the target collides with terrain, they take <physicalDamage>" +
  "@EmpoweredDamageTT@ bonus physical damage</physicalDamage> and become <status>Stunned</status> for " +
  "@StunDuration@ seconds. @SpellModifierDescriptionAppend@";
const LULU_W = "When used on an ally, Lulu grants @MS@ Move Speed.<br><br>When used on an enemy, Lulu " +
  "<status>Polymorphs</status> them for @PolymorphDuration@ seconds.";
const AHRI_Q =
  "Ahri throws then pulls back her orb, dealing <magicDamage>@TotalDamage@ magic damage</magicDamage> " +
  "on the way out and <trueDamage>@TotalDamage@ true damage</trueDamage> on the way back.";
const LOCKE_E =
  "Locke teleports to a location, dealing <magicDamage>@OnHitDamage@ magic damage</magicDamage>.";

Deno.test("infobulle : contrôle conditionnel par famille (Vayne E : projection sûre, étourdissement au mur)", () => {
  const f = parseTooltip(VAYNE_E);
  assert(f.ccUnconditional.has("knock"));
  assert(f.ccConditional.has("stun") && !f.ccUnconditional.has("stun"));
});

Deno.test("infobulle : « When used on an enemy » est un choix, pas une condition (Lulu W)", () => {
  const f = parseTooltip(LULU_W);
  assert(f.ccUnconditional.has("polymorph"));
  assertEquals(f.ccConditional.size, 0);
});

Deno.test("infobulle : type de dégâts par calcul, premier cité retenu en premier", () => {
  const f = parseTooltip(AHRI_Q);
  assertEquals(f.damageCalcs, ["TotalDamage"]);
  assertEquals(f.damageTypes.get("TotalDamage"), "magic");
  assertEquals(parseTooltip(LOCKE_E).damageTypes.get("OnHitDamage"), "magic");
});

Deno.test("infobulle : mobilité (téléportation, dash)", () => {
  assert(parseTooltip(LOCKE_E).mobility);
  assert(!parseTooltip(AHRI_Q).mobility);
});

Deno.test("cdragon : familles de contrôle d'après les noms internes", () => {
  assertEquals(ccKind("StunDuration"), "stun");
  assertEquals(ccKind("KnockupDuration"), "knock");
  assertEquals(ccKind("CharmDuration"), "charm");
  assertEquals(ccKind("CCDuration"), null);
});

// --- Objets (extraits réels de items.cdtb.bin.json, 16.20) ---

const KRAKEN = {
  mDataValues: [
    { mName: "AttackCount", mValue: 3 },
    { mName: "RangedDamageMultiplier", mValue: 0.800000011920929 },
  ],
  mItemCalculations: {
    DamageAmount: {
      mFormulaParts: [{
        mLevel1Value: 150,
        mBreakpoints: [{ mLevel: 9, mBonusPerLevelAtAndAfter: 5, __type: "Breakpoint" }],
        __type: "ByCharLevelBreakpointsCalculationPart",
      }],
      mRangedMultiplier: { mDataValue: "RangedDamageMultiplier", __type: "NamedDataValueCalculationPart" },
      __type: "{e9a3c91d}",
    },
  },
};
const HYDRA = {
  mItemCalculations: {
    ChampRange: {
      mDefaultGameCalculation: "{792cf56b}",
      mConditionalGameCalculation: "{06387172}",
      mConditionalCalculationRequirements: { __type: "IsRangedCastRequirement" },
      __type: "GameCalculationConditional",
    },
    "{792cf56b}": {
      mFormulaParts: [{ mNumber: 1, __type: "NumberCalculationPart" }],
      __type: "GameCalculation",
    },
    "{06387172}": {
      mFormulaParts: [{ mNumber: 2, __type: "NumberCalculationPart" }],
      __type: "GameCalculation",
    },
  },
  mFlatCritDamageMod: 0.30000001192092896,
  mPercentTenacityItemMod: 0.30000001192092896,
};

Deno.test("cdragon : objet — paliers par niveau et multiplicateur à distance (Kraken)", () => {
  const melee = resolveItemRef(KRAKEN, { calc: "DamageAmount" })!;
  const ranged = resolveItemRef(KRAKEN, { calc: "DamageAmount" }, true)!;
  const at = (f: typeof melee, level: number) => evalFormula(f, { rank: 1, level, stats });
  assertEquals(at(melee, 8), 150);
  assertEquals(at(melee, 18), 200);
  assertAlmostEquals(at(ranged, 18), 160, 1e-9);
  assertEquals(
    evalFormula(resolveItemRef(KRAKEN, { value: "AttackCount" })!, { rank: 1, level: 1, stats }),
    3,
  );
});

Deno.test("cdragon : objet — calcul conditionnel mêlée / distance, stats en plus", () => {
  const at = (ranged: boolean) =>
    evalFormula(resolveItemRef(HYDRA, { calc: "ChampRange" }, ranged)!, { rank: 1, level: 1, stats });
  assertEquals(at(false), 1);
  assertEquals(at(true), 2);
  assertEquals(itemExtraStats(HYDRA), { critDamage: 0.3, tenacity: 0.3 });
});
