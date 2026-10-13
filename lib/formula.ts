/**
 * Évaluation des formules de jeu (data/types.ts, `Formula`) — pur, sans donnée.
 *
 * Les formules viennent des fichiers du jeu via CommunityDragon (scripts/cdragon.ts).
 * Le moteur les évalue avec les stats du lanceur, son niveau et le rang du sort.
 */

import type { Formula, StatRef } from "@/data/types.ts";

/** Ce dont une formule a besoin : rang du sort, niveau, stats du lanceur. */
export interface FormulaContext {
  rank: number;
  level: number;
  stats: Record<StatRef, number>;
}

export function evalFormula(f: Formula, ctx: FormulaContext): number {
  switch (f.op) {
    case "num":
      return f.n;
    case "rank":
      return f.v[Math.max(1, Math.min(ctx.rank, f.v.length)) - 1];
    case "lerp":
      return f.from + ((f.to - f.from) * (ctx.level - 1)) / 17;
    case "steps": {
      // Niveau 1 : l1. À chaque niveau suivant : palier éventuel (ajout + nouveau
      // gain par niveau), puis gain par niveau.
      let value = f.l1;
      let perLevel = f.perLevel;
      for (let lvl = 2; lvl <= ctx.level; lvl++) {
        const bp = f.bp.find((b) => b.level === lvl);
        if (bp) {
          value += bp.add;
          perLevel = bp.perLevel;
        }
        value += perLevel;
      }
      return value;
    }
    case "stat":
      return ctx.stats[f.stat] * evalFormula(f.f, ctx);
    case "sum":
      return f.of.reduce((a, g) => a + evalFormula(g, ctx), 0);
    case "mul":
      return f.of.reduce((a, g) => a * evalFormula(g, ctx), 1);
  }
}
