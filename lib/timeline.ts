/**
 * Timeline de matchup — l'état de la game à la minute T, et le duel qui en découle.
 *
 * Au lieu de choisir un niveau et un build à la main, on les déduit du temps :
 *   niveau(T) = courbe d'XP de solo lane (XP/min constante après l'arrivée des vagues)
 *   or(T)     = 500 de départ + or passif + farm (CS/min × or moyen par CS)
 *   build(T)  = ordre de build déroulé composant par composant, acheté dès que
 *               l'or cumulé le permet (pas de timing de recall).
 *
 * Puis computeDuel à chaque pas. Sur la courbe edge(T), un spike est un saut net :
 * niveau 2, niveau 6, objet terminé, composant clé. Tout est théorique : ni kills,
 * ni plates, ni roams, ni retard d'XP — les paramètres de lane sont réglables.
 */

import type { Champion, IncludeMap, Item, RuneDef } from "@/data/types.ts";
import { computeDuel, rankOf } from "@/lib/engine.ts";

// ---------------------------------------------------------------------------
// Niveau
// ---------------------------------------------------------------------------

/** XP cumulée pour atteindre chaque niveau. index = niveau (1..18). */
export const XP_TO_LEVEL: number[] = (() => {
  const out = [0, 0];
  for (let level = 2; level <= 18; level++) out[level] = out[level - 1] + 280 + 100 * (level - 2);
  return out;
})();

/** Niveau atteint avec une XP cumulée donnée. */
export function levelFromXp(xp: number): number {
  let level = 1;
  while (level < 18 && xp >= XP_TO_LEVEL[level + 1]) level++;
  return level;
}

// ---------------------------------------------------------------------------
// Modèle de lane
// ---------------------------------------------------------------------------

export interface LaneModel {
  /** XP par minute en lane, une fois les vagues arrivées. ~470 ≈ niveau 6 vers 6:00. */
  xpPerMin: number;
  /** minute d'arrivée de la première vague (début de l'XP et du farm) */
  laneStart: number;
  /** CS par minute */
  csPerMin: number;
  /** or moyen par CS (mêlée 21, caster 14, canon 60+ → ~21 en moyenne) */
  goldPerCs: number;
}

export const DEFAULT_LANE: LaneModel = { xpPerMin: 470, laneStart: 1, csPerMin: 7, goldPerCs: 21 };

/** Or de départ et or passif (20,4 / 10 s à partir de 1:05). */
const START_GOLD = 500;
const PASSIVE_GOLD_PER_MIN = 122.4;
const PASSIVE_GOLD_START = 65 / 60;

export function levelAt(minute: number, lane: LaneModel = DEFAULT_LANE): number {
  return levelFromXp(lane.xpPerMin * Math.max(0, minute - lane.laneStart));
}

/** Or total gagné depuis le début de la partie (dépensé ou non). */
export function goldAt(minute: number, lane: LaneModel = DEFAULT_LANE): number {
  return START_GOLD +
    PASSIVE_GOLD_PER_MIN * Math.max(0, minute - PASSIVE_GOLD_START) +
    lane.csPerMin * lane.goldPerCs * Math.max(0, minute - lane.laneStart);
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

/** Un achat : l'objet et ce qu'il coûte une fois ses composants déjà en poche. */
export interface PurchaseStep {
  itemId: string;
  price: number;
}

/**
 * Déroule un ordre de build en achats unitaires : chaque objet est précédé de
 * ses composants (récursivement), et ne coûte plus que son prix de combinaison.
 * Un objet sans prix connu bloque la suite (coût infini) plutôt que d'être offert.
 */
export function purchasePlan(buildOrder: string[], items: Record<string, Item>): PurchaseStep[] {
  const steps: PurchaseStep[] = [];
  const costOf = (id: string) => items[id]?.cost ?? Infinity;
  const expand = (id: string) => {
    const from = items[id]?.from ?? [];
    for (const c of from) expand(c);
    steps.push({ itemId: id, price: costOf(id) - from.reduce((a, c) => a + costOf(c), 0) });
  };
  for (const id of buildOrder) expand(id);
  return steps;
}

/**
 * Inventaire après avoir dépensé `gold` en suivant le plan dans l'ordre. Un
 * objet combiné consomme ses composants. On s'arrête au premier achat trop cher
 * (on économise pour lui, on ne saute pas devant).
 */
export function inventoryAt(plan: PurchaseStep[], gold: number, items: Record<string, Item>): string[] {
  const inventory: string[] = [];
  let spent = 0;
  for (const step of plan) {
    if (spent + step.price > gold) break;
    spent += step.price;
    for (const c of items[step.itemId]?.from ?? []) {
      const i = inventory.indexOf(c);
      if (i >= 0) inventory.splice(i, 1);
    }
    inventory.push(step.itemId);
  }
  return inventory;
}

/**
 * Ordre de build par défaut, tiré de l'étagère du champion : Doran adapté au
 * profil, premier légendaire, bottes, puis le reste de l'étagère.
 */
export function defaultBuildOrder(champion: Champion, items: Record<string, Item>): string[] {
  const starter = champion.adaptive === "AD" ? "doransblade" : "doransring";
  const shelf = champion.shelf.filter((id) => items[id]);
  const boots = shelf.filter((id) => items[id].tier === "boots").slice(0, 1);
  const rest = shelf.filter((id) => items[id].tier !== "boots");
  return [...(items[starter] ? [starter] : []), ...rest.slice(0, 1), ...boots, ...rest.slice(1)];
}

// ---------------------------------------------------------------------------
// Matchup dans le temps
// ---------------------------------------------------------------------------

export interface TimelineSide {
  champion: Champion;
  /** ordre de build (objets finaux, composants déduits). Défaut : defaultBuildOrder. */
  build?: string[];
  runeOn?: boolean;
  keystoneId?: string;
  bleedStacks?: number;
  include?: IncludeMap;
  lane?: Partial<LaneModel>;
}

export interface SideState {
  level: number;
  gold: number;
  items: string[];
}

export function sideStateAt(side: TimelineSide, minute: number, items: Record<string, Item>): SideState {
  const lane = { ...DEFAULT_LANE, ...side.lane };
  const gold = goldAt(minute, lane);
  const plan = purchasePlan(side.build ?? defaultBuildOrder(side.champion, items), items);
  return { level: levelAt(minute, lane), gold, items: inventoryAt(plan, gold, items) };
}

export interface MatchupPoint {
  minute: number;
  levelA: number;
  levelB: number;
  buildA: string[];
  buildB: string[];
  /** part des PV de B retirée par A sur la fenêtre (> 1 = overkill ; plafonnée à 1 en all-in) */
  killPctA: number;
  /** l'inverse */
  killPctB: number;
  /** killPctA - killPctB (> 0 = A gagne l'échange) */
  edge: number;
  /** mode trade : secondes pour que A tue B (Infinity = pas de kill) */
  ttkA?: number;
  /** mode trade : secondes pour que B tue A */
  ttkB?: number;
}

export interface TimelineOptions {
  /** dernière minute simulée (incluse). Défaut 25. */
  until?: number;
  /** pas en minutes. Défaut 1. */
  step?: number;
  /** fenêtre de trade (s). Absent = burst (une rotation, sans auto). */
  window?: number;
  /** all-in jusqu'au premier kill (prioritaire sur window) */
  allIn?: boolean;
}

export function matchupTimeline(
  a: TimelineSide,
  b: TimelineSide,
  items: Record<string, Item>,
  runes: Record<string, RuneDef>,
  opts: TimelineOptions = {},
): MatchupPoint[] {
  const until = opts.until ?? 25;
  const step = opts.step ?? 1;
  const points: MatchupPoint[] = [];
  for (let minute = step; minute <= until + 1e-9; minute += step) {
    const sa = sideStateAt(a, minute, items);
    const sb = sideStateAt(b, minute, items);
    const duel = computeDuel(
      { ...a, level: sa.level, itemIds: sa.items, runeOn: a.runeOn ?? true },
      { ...b, level: sb.level, itemIds: sb.items, runeOn: b.runeOn ?? true },
      items,
      runes,
      { window: opts.window, allIn: opts.allIn },
    );
    points.push({
      minute,
      levelA: sa.level,
      levelB: sb.level,
      buildA: sa.items,
      buildB: sb.items,
      killPctA: duel.killPctA,
      killPctB: duel.killPctB,
      edge: duel.edge,
      ...(duel.ttkA !== undefined ? { ttkA: duel.ttkA, ttkB: duel.ttkB } : {}),
    });
  }
  return points;
}

// ---------------------------------------------------------------------------
// Spikes
// ---------------------------------------------------------------------------

export interface Spike {
  minute: number;
  /** camp qui profite du saut d'edge */
  side: "A" | "B";
  /** variation d'edge depuis le point précédent (positive = vers A) */
  delta: number;
  /** ce qui a changé chez le camp gagnant : niveaux, rangs d'ultime, objets */
  causes: string[];
}

function changes(
  champion: Champion,
  prevLevel: number,
  level: number,
  prevItems: string[],
  curItems: string[],
  items: Record<string, Item>,
): string[] {
  const out: string[] = [];
  if (level > prevLevel) {
    out.push(`${champion.name} niveau ${level}`);
    const r0 = rankOf(champion, "R", prevLevel);
    const r1 = rankOf(champion, "R", level);
    if (r1 > r0) out.push(`${champion.name} ultime rang ${r1}`);
  }
  const before = [...prevItems];
  for (const id of curItems) {
    const i = before.indexOf(id);
    if (i >= 0) before.splice(i, 1);
    else out.push(`${champion.name} ${items[id]?.name ?? id}`);
  }
  return out;
}

/**
 * Sauts d'edge d'au moins `threshold` (0,1 = 10 points de % de PV) entre deux
 * points consécutifs. Un saut vers A est un spike de A — et une fenêtre de
 * faiblesse de B, et inversement.
 */
export function findSpikes(
  points: MatchupPoint[],
  a: Champion,
  b: Champion,
  items: Record<string, Item>,
  threshold = 0.1,
): Spike[] {
  const spikes: Spike[] = [];
  for (let i = 1; i < points.length; i++) {
    const p = points[i - 1];
    const c = points[i];
    const delta = c.edge - p.edge;
    if (Math.abs(delta) < threshold) continue;
    const side = delta > 0 ? "A" : "B";
    const ofA = changes(a, p.levelA, c.levelA, p.buildA, c.buildA, items);
    const ofB = changes(b, p.levelB, c.levelB, p.buildB, c.buildB, items);
    // Le saut vient d'abord de ce qu'a gagné le camp qui en profite ; s'il n'a
    // rien gagné, c'est l'adversaire qui a perdu en valeur relative.
    const own = side === "A" ? ofA : ofB;
    spikes.push({ minute: c.minute, side, delta, causes: own.length ? own : side === "A" ? ofB : ofA });
  }
  return spikes;
}
