/**
 * Passifs lus sur le wiki officiel : la description rendue (valeurs exactes par
 * niveau, ratios) est traduite en mécaniques que le moteur sait jouer.
 *
 * Règle : on ne modélise que ce qui se lit sans ambiguïté — des dégâts à chaque
 * coup, tous les N coups (« At 2 stacks, … next basic attack »), ou sur l'auto qui
 * suit un sort. Tout passif conditionnel (cible isolée, PV bas, sbires, furtivité,
 * cumul par stack…) est classé « non modélisé » avec sa raison, jamais deviné.
 */

import type { DamageType, Formula, HpScale, Mechanic, StatRef } from "../data/types.ts";
import type { PpValue } from "./wiki.ts";
import { levelSeries } from "./wiki.ts";

export interface PassiveRow {
  /** nom du passif (boîte du wiki) */
  name: string;
  text: string;
  pp: PpValue[];
}

export type PassiveVerdict =
  /** au moins une mécanique de dégâts modélisée */
  | "modeled"
  /** aucun dégât à infliger (vitesse, furtivité, soin, ressource…) */
  | "utility"
  /** des dégâts, mais sous condition qu'un duel ne reproduit pas fidèlement */
  | "conditional";

export interface PassiveReading {
  verdict: PassiveVerdict;
  mechanics: Mechanic[];
  /** phrase du wiki d'où vient la mécanique, ou raison de l'exclusion */
  note: string;
}

const ORDINAL: Record<string, number> = {
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
};

/** Unité d'un ratio du wiki → stat du lanceur (null : non modélisable). */
function statOf(unit: string): StatRef | null {
  const u = unit.trim().toLowerCase().replace(/\s+/g, " ");
  if (u === "ap") return "ap";
  if (u === "ad") return "ad";
  if (u === "bonus ad") return "bonusAd";
  if (u === "base ad") return "baseAd";
  if (/^(of (his|her|its|their) )?bonus health$/.test(u)) return "bonusHp";
  if (/^(of (his|her|its|their) )?maximum health$/.test(u)) return "maxHp";
  if (u === "bonus armor") return "bonusArmor";
  if (u === "armor") return "armor";
  if (u === "bonus magic resistance") return "bonusMr";
  if (u === "magic resistance") return "mr";
  return null;
}

const num = (n: number): Formula => ({ op: "num", n });
const round = (n: number) => Math.round(n * 1e6) / 1e6;

/** « ⟦0⟧ » ou « 50% » / « 20 » → formule (par niveau si c'est une infobulle de niveau). */
function quantityFormula(token: string, pp: PpValue[]): { f: Formula; percent: boolean } | null {
  const t = /^⟦(\d+)⟧$/.exec(token);
  if (t) {
    const v = pp[Number(t[1])];
    if (!v) return null;
    if (v.label !== undefined && !/level/i.test(v.label)) return null; // dépend d'autre chose que le niveau
    const percent = v.key === "%";
    const series = levelSeries(v).map((x) => round(percent ? x / 100 : x));
    const f: Formula = series.every((x) => x === series[0]) ? num(series[0]) : { op: "byLevel", v: series };
    return { f, percent };
  }
  const m = /^(-?\d+(?:\.\d+)?)(%?)$/.exec(token);
  if (!m) return null;
  return { f: num(m[2] ? round(Number(m[1]) / 100) : Number(m[1])), percent: !!m[2] };
}

export interface DamagePhrase {
  damage: Formula;
  type: DamageType;
  scale?: HpScale;
  /** le texte reconnu */
  match: string;
}

const QTY = String.raw`(⟦\d+⟧|\d+(?:\.\d+)?%?)`;
const RATIO = String.raw`\(\+ ([^()]*(?:\([^()]*\)[^()]*)*)\)`;
const TYPE = String.raw`(?:bonus |additional )*(magic|physical|true) damage`;
// « 130% AD (+ 30% AP) magic damage », « ⟦0⟧ (+ 50% AP) bonus magic damage »
// Unité d'une quantité qui est elle-même un ratio (« ⟦0⟧ AD », « 130% AD »).
const UNIT = String.raw`( (?:bonus |base |total )?(?:AD|AP|armor|magic resistance|maximum health|health))?`;
const FORWARD = new RegExp(String.raw`${QTY}${UNIT}((?: ${RATIO})*) ${TYPE}`, "g");
// « bonus physical damage equal to ⟦0⟧ AD », « … equal to 1% (+ 0.6% per 100 AP) of the target's maximum health »
const BACKWARD = new RegExp(
  String
    .raw`${TYPE} equal to ${QTY}${UNIT}((?: ${RATIO})*)( of (?:the )?target's (?:maximum|missing|current) health)?`,
  "g",
);

/** Ratios « (+ 50% AP) (+ 20% bonus AD) » → parties de formule ; null si l'un est illisible. */
function ratioParts(groups: string, pp: PpValue[]): Formula[] | null {
  const parts: Formula[] = [];
  for (const m of groups.matchAll(new RegExp(RATIO, "g"))) {
    const inner = m[1].trim();
    // « 0.6% per 100 AP » : ratio d'un pourcentage de PV, par tranche de 100.
    const per = /^(\d+(?:\.\d+)?)% per 100 (AP|bonus AD|AD)$/.exec(inner);
    if (per) {
      const stat = statOf(per[2]);
      if (!stat) return null;
      parts.push({ op: "stat", stat, f: num(round(Number(per[1]) / 100 / 100)) });
      continue;
    }
    // « 1.25% AP per 100 bonus health » : produit de deux stats.
    const cross = /^(\d+(?:\.\d+)?)% ([A-Za-z ]+?) per 100 ([A-Za-z ]+)$/.exec(inner);
    if (cross) {
      const a = statOf(cross[2]);
      const b = statOf(cross[3]);
      if (!a || !b) return null;
      parts.push({
        op: "mul",
        of: [{ op: "stat", stat: a, f: num(1) }, {
          op: "stat",
          stat: b,
          f: num(round(Number(cross[1]) / 100 / 100)),
        }],
      });
      continue;
    }
    const r = /^(⟦\d+⟧|\d+(?:\.\d+)?%?)\s*(.*)$/.exec(inner);
    if (!r) return null;
    const q = quantityFormula(r[1], pp);
    const stat = statOf(r[2]);
    if (!q || !stat) return null;
    parts.push({
      op: "stat",
      stat,
      f: q.percent || r[1].includes("⟦") ? q.f : num(round((q.f as { n: number }).n / 100)),
    });
  }
  return parts;
}

function scaleOf(text: string | undefined): HpScale | undefined | null {
  if (!text) return undefined;
  if (/maximum health/.test(text)) return "targetMaxHp";
  if (/missing health/.test(text)) return "targetMissingHp";
  if (/current health/.test(text)) return "targetCurrentHp";
  return null;
}

/** Premier montant de dégâts lisible d'une phrase. */
export function parseDamagePhrase(sentence: string, pp: PpValue[]): DamagePhrase | null {
  for (const re of [BACKWARD, FORWARD]) {
    re.lastIndex = 0;
    for (const m of sentence.matchAll(re)) {
      const backward = re === BACKWARD;
      const type = (backward ? m[1] : m[m.length - 1]) as DamageType;
      const token = backward ? m[2] : m[1];
      const unit = (backward ? m[3] : m[2])?.trim() ?? "";
      const groups = (backward ? m[4] : m[3]) ?? "";
      const scale = scaleOf(backward ? m[m.length - 1] : undefined);
      if (scale === null) continue;
      const q = quantityFormula(token, pp);
      if (!q) continue;
      const ratios = ratioParts(groups, pp);
      if (!ratios) continue;
      let head: Formula = q.f;
      if (unit) {
        // « ⟦0⟧ AD », « 130% AD » : la quantité est elle-même un ratio.
        const stat = statOf(unit);
        if (!stat) continue;
        const f = q.percent || token.includes("⟦") ? q.f : num(round((q.f as { n: number }).n / 100));
        head = { op: "stat", stat, f };
      } else if (q.percent && !scale) continue; // « 270% damage » sans base : pas un montant
      const damage: Formula = ratios.length ? { op: "sum", of: [head, ...ratios] } : head;
      return { damage, type, ...(scale ? { scale } : {}), match: m[0] };
    }
  }
  return null;
}

/** Phrases d'un paragraphe (les points des nombres décimaux ne coupent pas). */
export function sentences(text: string): string[] {
  return text.replace(/\n/g, " ").split(/(?<=[.!?])\s+(?=[A-Z«⟦])/).map((s) => s.trim()).filter(Boolean);
}

/** Conditions qu'un duel 1 contre 1 immobile ne reproduit pas fidèlement. */
export const CONDITIONAL =
  /\b(if|unless|while|whenever \w+ (?:is|retrieves|kills)|below|above|isolated|marked|unmarked|takedowns?|kills?|killing|dies|death|executes?|stealth|invisib\w*|unseen|behind|brush|minions?|monsters?|structures?|turrets?|wards?|non-champions?|per second|over the duration|poison|for each|per stack|per \w+ stacks?|each stack|allies|ally|allied|clones?|out of combat|secondary targets?|marks?|alternat\w*|other enemies|overheat\w*|periodically)\b/i;

/**
 * Variantes contre les sbires / monstres / bâtiments accolées à la phrase principale
 * (« , increased to 100% AD against minions ») : retirées avant le test des conditions.
 */
export const VARIANT_CLAUSE =
  /,?\s*(?:(?:increased|reduced|halved|capped|modified)[^,.;]*?against (?:minions|monsters|structures|turrets|non-champions)[^,.;]*|including against structures)/gi;

/** Passifs dont l'effet ne frappe la même cible qu'une fois toutes les quelques secondes. */
const PER_TARGET_COOLDOWN = /(more than once every|once every few seconds|per-target cooldown)/i;

/**
 * Lit les paragraphes du passif. Retourne les mécaniques sûres, ou la raison pour
 * laquelle il n'y en a pas.
 */
export function readPassive(rows: PassiveRow[], champion: string): PassiveReading {
  const r = readPassiveRaw(rows, champion);
  return { ...r, note: readable(r.note, rows) };
}

/** Remplace les jetons ⟦n⟧ d'une phrase par leurs valeurs (« 20–220 »), d'après son paragraphe. */
export function readable(sentence: string, rows: PassiveRow[]): string {
  const row = rows.find((r) => r.text.includes(sentence.slice(0, 40)));
  const fmt = (n: number) => String(Math.round(n * 100) / 100);
  return sentence.replace(/⟦(\d+)⟧/g, (_, i: string) => {
    const v = row?.pp[Number(i)];
    if (!v) return "?";
    const series = /level/i.test(v.label ?? "level") ? levelSeries(v) : v.values;
    const lo = series[0], hi = series[series.length - 1];
    const key = v.key ?? "";
    return lo === hi ? `${fmt(lo)}${key}` : `${fmt(lo)}${key}–${fmt(hi)}${key}`;
  }).replace(/[「」]/g, "").replace(/\s+/g, " ").trim();
}

function readPassiveRaw(rows: PassiveRow[], champion: string): PassiveReading {
  const mechanics: Mechanic[] = [];
  const notes: string[] = [];
  let sawDamage = false;
  let conditional = "";
  let unreadable = "";
  const all = rows.map((r) => r.text).join(" ");

  if (PER_TARGET_COOLDOWN.test(all)) {
    const s = sentences(all).find((x) => PER_TARGET_COOLDOWN.test(x))!;
    return { verdict: "conditional", mechanics: [], note: s };
  }
  for (const row of rows) {
    const list = sentences(row.text);
    // Paragraphe réservé à un palier de niveau (« Level 11 - Aflame: … »).
    const levelGated = /^Level \d+/.test(row.text);
    list.forEach((raw, i) => {
      const s = raw.replace(VARIANT_CLAUSE, "");
      const d = parseDamagePhrase(s, row.pp);
      if (!d) {
        if (/(magic|physical|true) damage/i.test(s) && /⟦\d+⟧|\d%/.test(s)) unreadable ||= raw;
        return;
      }
      sawDamage = true;
      // Contexte : la phrase et celles qui la précèdent dans le paragraphe.
      const context = list.slice(0, i + 1).join(" ");
      // « alternate between … » : l'effet ne remplace qu'une auto sur deux, sans s'y ajouter.
      if (levelGated || CONDITIONAL.test(s) || /alternat/i.test(context)) {
        conditional ||= raw;
        return;
      }
      const label = /^([A-Z][\w' -]+?):/.exec(row.text)?.[1];
      // Paragraphe « Headshot: … » : son déclencheur est décrit ailleurs (« … to become a Headshot »).
      const origin = label && !/^Innate/.test(label)
        ? sentences(all).find((x) => x.includes(label) && !x.startsWith(`${label}:`)) ?? ""
        : "";
      const trigger = triggerOf(`${origin} ${context}`, s, all);
      if (!trigger) {
        conditional ||= s;
        return;
      }
      const name = row.name;
      if (trigger.kind === "afterAbility") {
        mechanics.push({
          kind: "afterAbility",
          name,
          type: d.type,
          damage: trigger.projectiles > 1
            ? { op: "mul", of: [num(trigger.projectiles), d.damage] }
            : d.damage,
          ...(trigger.hits > 1 ? { hits: trigger.hits } : {}),
          ...(d.scale ? { scale: d.scale } : {}),
        });
      } else {
        mechanics.push({
          kind: "onHit",
          name,
          type: d.type,
          damage: d.damage,
          ...(trigger.every > 1 ? { every: num(trigger.every) } : {}),
          ...(d.scale ? { scale: d.scale } : {}),
        });
      }
      notes.push(s);
    });
  }
  if (mechanics.length) {
    // Un seul effet par passif : la première lecture sûre (les suivantes décrivent
    // en général des variantes — contre les monstres, renforcé…).
    return { verdict: "modeled", mechanics: [mechanics[0]], note: notes[0] };
  }
  if (sawDamage) {
    return {
      verdict: "conditional",
      mechanics: [],
      note: conditional || `${champion} : déclencheur illisible`,
    };
  }
  if (unreadable) return { verdict: "conditional", mechanics: [], note: unreadable };
  return { verdict: "utility", mechanics: [], note: rows[0]?.text.split(/(?<=\.)\s/)[0] ?? "" };
}

type Trigger = { kind: "onHit"; every: number } | { kind: "afterAbility"; hits: number; projectiles: number };

const COUNT: Record<string, number> = { two: 2, three: 3, four: 4 };

/** Déclencheur d'un dégât, d'après la phrase et son contexte. */
export function triggerOf(context: string, sentence: string, passive = context): Trigger | null {
  const c = context.replace(/\s+/g, " ");
  // Auto renforcée après un sort (Riven, Sylas, Lux).
  if (
    /(casts? an ability|ability casts|after (?:casting|using) an ability|abilities apply a mark)/i.test(c) &&
    /(next (?:two |three )?basic attacks?|basic attacks?.{0,60}(consume|empowered))/i.test(c)
  ) {
    // « next two basic attacks » (Taric) : deux autos renforcées par sort.
    const two = /next (two|three) basic attacks/i.exec(c);
    // « casts each generate 3 stacks » + « fire an equal number of projectiles » (Mel).
    const stacks = /casts? each generates? (\d+) stacks/i.exec(c);
    const projectiles = stacks && /equal number of/i.test(c) && /each projectile/i.test(sentence)
      ? Number(stacks[1])
      : 1;
    return { kind: "afterAbility", hits: two ? COUNT[two[1].toLowerCase()] : 1, projectiles };
  }
  // « every third basic attack »
  const ord = /every (second|third|fourth|fifth|sixth|seventh|eighth) (?:basic )?attack/i.exec(c);
  if (ord) return { kind: "onHit", every: ORDINAL[ord[1].toLowerCase()] };
  // Stacks générés par les autos, puis « At N stacks … next basic attack » : N + 1.
  const at = /At (\d+) stacks?,[^.]*?next basic attack/i.exec(c);
  if (at && /basic attacks?[^.]*generates? a stack/i.test(c) && !/abilit/i.test(c.slice(0, at.index))) {
    return { kind: "onHit", every: Number(at[1]) + 1 };
  }
  // « The third stack consumes them all to deal » (stacks posés par les autos seulement).
  const nth = /The (second|third|fourth|fifth|sixth) stack(?: against a target)? consumes/i.exec(c);
  if (
    nth && /basic attacks?[^.]*(?:appl(?:y|ies)|generates?) a stack/i.test(c) &&
    !/abilit/i.test(c.slice(0, nth.index))
  ) {
    return { kind: "onHit", every: ORDINAL[nth[1].toLowerCase()] };
  }
  // Dernière balle d'un chargeur (Jhin : « within 4 rounds » … « final round »).
  // Le chargeur est décrit dans un autre paragraphe du passif.
  const rounds = /within (\d+) rounds/i.exec(passive);
  if (rounds && /final round/i.test(sentence)) return { kind: "onHit", every: Number(rounds[1]) };
  // Chaque auto, sans compteur : « basic attacks on-hit … deal », « deals … on-hit ».
  // Effet réservé à certaines autos (compteur, auto renforcée suivante, recharge).
  if (
    /At (?:\d+|max(?:imum)?) stacks|stacks? consumes?|consumes? (?:a|the|all|them|one) stacks?|next basic attack|periodically/i
      .test(c)
  ) {
    return null;
  }
  // Le sujet doit être l'auto elle-même (pas « applique les effets à l'impact »).
  if (/basic attacks?[^.]*\b(on-hit|deals?)\b|damage on-hit/i.test(sentence.replace(/on-hit effects/g, ""))) {
    return { kind: "onHit", every: 1 };
  }
  return null;
}
