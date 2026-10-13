/**
 * Rendu des infobulles du jeu avec des nombres calculés — pur, sans DOM.
 *
 * Le client du jeu écrit ses infobulles avec des balises (<magicDamage>, <status>…)
 * et des @placeholders@ qui renvoient aux valeurs et calculs du sort. On remplace
 * chaque placeholder par sa valeur au rang, au niveau et aux stats donnés, et on
 * découpe le texte en segments typés que l'interface colore. Aucun HTML n'est
 * réinjecté : seules les balises connues deviennent des classes.
 */

import type { KitSpell } from "@/data/types.ts";
import { evalFormula, type FormulaContext } from "@/lib/formula.ts";

export interface TooltipSegment {
  text: string;
  /** classe d'affichage : dégâts magiques, statut, bouclier… */
  cls?: string;
  /** nombre calculé depuis un placeholder */
  value?: boolean;
}

export interface RenderedTooltip {
  /** paragraphes (séparés par <br> dans le jeu), chacun une suite de segments */
  paragraphs: TooltipSegment[][];
  /** placeholders sans valeur ni calcul connus (doit rester vide) */
  missing: string[];
}

/** Balises du client → classe d'affichage. Les autres balises sont ignorées (texte gardé). */
const TAG_CLASS: Record<string, string> = {
  magicdamage: "tt-magic",
  physicaldamage: "tt-phys",
  truedamage: "tt-true",
  shield: "tt-shield",
  healing: "tt-heal",
  status: "tt-status",
  keywordmajor: "tt-key",
  spellname: "tt-spell",
  recast: "tt-label",
  spellpassive: "tt-label",
  spellactive: "tt-label",
  rules: "tt-rules",
  attackspeed: "tt-stat",
  speed: "tt-stat",
};

/** Placeholders du client qui ne portent pas de valeur (modificateurs de mode de jeu). */
const SILENT = new Set(["SpellModifierDescriptionAppend"]);

/** 1,5 · 35 · 1 234 — une décimale au plus, format français. */
export function formatNumber(n: number): string {
  const r = Math.round(n * 10) / 10;
  return r.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

/** Valeur d'un placeholder : calcul du sort, sinon valeur brute au rang. Null si inconnu. */
export function placeholderValue(spell: KitSpell, name: string, ctx: FormulaContext): number | null {
  const calc = spell.calcs[name];
  if (calc) return evalFormula(calc, ctx);
  const raw = spell.values[name];
  if (raw?.length) return raw[Math.max(1, Math.min(ctx.rank, raw.length)) - 1];
  return null;
}

export function renderTooltip(spell: KitSpell, ctx: FormulaContext): RenderedTooltip {
  const missing: string[] = [];
  const paragraphs: TooltipSegment[][] = [];
  for (const chunk of spell.text.split(/(?:<br\s*\/?>\s*)+/i)) {
    const segments: TooltipSegment[] = [];
    const stack: string[] = [];
    const cls = () => {
      for (let i = stack.length - 1; i >= 0; i--) if (TAG_CLASS[stack[i]]) return TAG_CLASS[stack[i]];
      return undefined;
    };
    const token = /<(\/?)([a-zA-Z]+)[^>]*>|@([A-Za-z0-9_]+)(?:\*([\d.]+))?@|[^<@]+|[<@]/g;
    for (const m of chunk.matchAll(token)) {
      if (m[2]) {
        const tag = m[2].toLowerCase();
        if (m[1]) {
          const i = stack.lastIndexOf(tag);
          if (i >= 0) stack.splice(i, 1);
        } else stack.push(tag);
      } else if (m[3]) {
        if (SILENT.has(m[3])) continue;
        const v = placeholderValue(spell, m[3], ctx);
        if (v === null) {
          missing.push(m[3]);
          segments.push({ text: "?", cls: cls(), value: true });
        } else {
          segments.push({ text: formatNumber(v * Number(m[4] ?? 1)), cls: cls(), value: true });
        }
      } else {
        segments.push({ text: m[0], cls: cls() });
      }
    }
    if (segments.some((s) => s.text.trim())) paragraphs.push(segments);
  }
  return { paragraphs, missing };
}
