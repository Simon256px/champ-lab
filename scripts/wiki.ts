/**
 * Wiki officiel de League of Legends (wiki.leagueoflegends.com) : la source
 * lisible et à jour qui remplace Meraki (abandonné, bloqué au patch 25.08).
 *
 * - `Module:ChampionData/data` : stats de base de chaque champion (Lua).
 * - `Template:Data <Champion>/<I|Q|W|E|R>` : chaque sort, rendu par le wiki
 *   lui-même (les valeurs par rang sont calculées par ses modèles) puis lu ici :
 *   descriptions, lignes de progression (« Magic Damage: 75 / 125 / 175
 *   (+ 35% AP) »), temps de recharge, et valeurs par niveau des passifs.
 *
 * Le rendu produit des objets au format de Meraki (attribut + modificateurs),
 * pour que le reste du pipeline ne change pas.
 */

export const WIKI_API = "https://wiki.leagueoflegends.com/en-us/api.php";
const USER_AGENT = "champ-lab/1.0 (https://github.com/Simon256px/champ-lab)";

// ---------------------------------------------------------------------------
// Client API
// ---------------------------------------------------------------------------

async function cacheKey(params: Record<string, string>): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(params));
  const hash = await crypto.subtle.digest("SHA-1", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Appel à l'API MediaWiki (POST, nouvelle tentative sur 429/5xx). Avec la variable
 * d'environnement WIKI_CACHE (un dossier), les réponses sont gardées sur disque
 * pour ne pas solliciter le wiki à chaque essai en développement.
 */
// deno-lint-ignore no-explicit-any
export async function wikiApi(params: Record<string, string>): Promise<any> {
  const body = new URLSearchParams({ ...params, format: "json", formatversion: "2" });
  const cacheDir = Deno.env.get("WIKI_CACHE");
  const file = cacheDir ? `${cacheDir}/${await cacheKey(params)}.json` : null;
  if (file) {
    try {
      return JSON.parse(await Deno.readTextFile(file));
    } catch { /* pas en cache */ }
  }
  for (let attempt = 0;; attempt++) {
    const res = await fetch(WIKI_API, {
      method: "POST",
      headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (res.ok) {
      const json = await res.json();
      if (json.error) throw new Error(`wiki : ${json.error.code} — ${json.error.info}`);
      if (file) {
        await Deno.mkdir(cacheDir!, { recursive: true });
        await Deno.writeTextFile(file, JSON.stringify(json));
      }
      return json;
    }
    await res.body?.cancel();
    if (attempt >= 4 || (res.status !== 429 && res.status < 500)) {
      throw new Error(`wiki : ${res.status} ${res.statusText}`);
    }
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
}

/** Contenu wikitext/Lua d'une page. */
export async function wikiSource(title: string): Promise<string> {
  const json = await wikiApi({
    action: "query",
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
    titles: title,
  });
  const page = json.query.pages[0];
  if (page.missing) throw new Error(`wiki : page absente — ${title}`);
  return page.revisions[0].slots.main.content;
}

/** Rendu HTML d'un wikitext par le wiki. */
export async function wikiRender(text: string): Promise<string> {
  const json = await wikiApi({
    action: "parse",
    text,
    prop: "text",
    contentmodel: "wikitext",
    disablelimitreport: "1",
  });
  return json.parse.text;
}

// ---------------------------------------------------------------------------
// Lua (tables de données du wiki)
// ---------------------------------------------------------------------------

/** Évalue une expression arithmétique simple (+ − × ÷, parenthèses). */
export function arithmetic(src: string): number {
  const t = src.replace(/\s+/g, "");
  let i = 0;
  const num = (): number => {
    if (t[i] === "(") {
      i++;
      const v = sum();
      i++; // )
      return v;
    }
    if (t[i] === "-") {
      i++;
      return -num();
    }
    const m = /^\d+(?:\.\d+)?(?:e-?\d+)?/.exec(t.slice(i));
    if (!m) throw new Error(`expression illisible : ${src}`);
    i += m[0].length;
    return Number(m[0]);
  };
  const product = (): number => {
    let v = num();
    while (t[i] === "*" || t[i] === "/") v = t[i++] === "*" ? v * num() : v / num();
    return v;
  };
  const sum = (): number => {
    let v = product();
    while (t[i] === "+" || t[i] === "-") v = t[i++] === "+" ? v + product() : v - product();
    return v;
  };
  const v = sum();
  if (i !== t.length) throw new Error(`expression illisible : ${src}`);
  return v;
}

/** Lit une table Lua littérale (`return { ["a"] = 1, … }`) : chaînes, nombres, booléens, tables. */
export function parseLua(src: string): unknown {
  const s = src.replace(/--\[\[[\s\S]*?\]\]/g, "").replace(/--[^\n]*/g, "");
  let i = s.indexOf("return");
  if (i < 0) throw new Error("table Lua : « return » absent");
  i += 6;
  const ws = () => {
    while (i < s.length && /\s/.test(s[i])) i++;
  };
  const value = (): unknown => {
    ws();
    const ch = s[i];
    if (ch === "{") return table();
    if (ch === '"' || ch === "'") return str();
    const kw = /^(true|false|nil)\b/.exec(s.slice(i, i + 6));
    if (kw) {
      i += kw[0].length;
      return kw[0] === "true" ? true : kw[0] === "false" ? false : null;
    }
    // Nombre ou expression arithmétique (« 1000+1000/17 »).
    const m = /^[-+*/().\d\se]+?(?=\s*[,;}\]])/.exec(s.slice(i, i + 80));
    if (!m) throw new Error(`table Lua : valeur illisible à ${i} : ${s.slice(i, i + 30)}`);
    i += m[0].length;
    return arithmetic(m[0]);
  };
  const str = (): string => {
    const q = s[i++];
    let out = "";
    while (s[i] !== q) {
      if (s[i] === "\\") {
        i++;
        out += s[i] === "n" ? "\n" : s[i];
      } else out += s[i];
      i++;
    }
    i++;
    return out;
  };
  const table = (): unknown => {
    i++; // {
    const obj: Record<string, unknown> = {};
    const arr: unknown[] = [];
    let keyed = false;
    for (;;) {
      ws();
      if (s[i] === "}") {
        i++;
        break;
      }
      if (s[i] === "[") {
        i++;
        const k = value();
        ws();
        i++; // ]
        ws();
        i++; // =
        const v = value();
        if (typeof k === "number") arr[k - 1] = v;
        else {
          obj[String(k)] = v;
          keyed = true;
        }
      } else {
        const m = /^([A-Za-z_]\w*)\s*=/.exec(s.slice(i, i + 80));
        if (m) {
          i += m[0].length;
          obj[m[1]] = value();
          keyed = true;
        } else arr.push(value());
      }
      ws();
      if (s[i] === "," || s[i] === ";") i++;
    }
    return keyed ? (arr.length ? Object.assign(obj, { ...arr }) : obj) : arr;
  };
  return value();
}

// ---------------------------------------------------------------------------
// Stats de base : Module:ChampionData/data
// ---------------------------------------------------------------------------

export interface WikiChampionData {
  /** nom affiché, clé du wiki (« Kai'Sa ») */
  name: string;
  /** clé numérique Riot */
  id: number;
  /** id Data Dragon (« KSante ») */
  apiname: string;
  title: string;
  adaptivetype?: string;
  rangetype?: string;
  /** dernier patch où le wiki a noté un changement (« V26.16 ») */
  changes?: string;
  stats: Record<string, number>;
}

export async function fetchChampionData(): Promise<WikiChampionData[]> {
  const table = parseLua(await wikiSource("Module:ChampionData/data")) as Record<
    string,
    Record<string, unknown>
  >;
  return Object.entries(table)
    // Les variantes (« Kled & Skaarl », id 240.1) partagent l'apiname : on les écarte.
    .filter(([, c]) => Number.isInteger(c?.id) && c.stats)
    .map(([name, c]) => ({
      name,
      id: c.id as number,
      apiname: String(c.apiname ?? name),
      title: String(c.title ?? ""),
      adaptivetype: c.adaptivetype as string | undefined,
      rangetype: c.rangetype as string | undefined,
      changes: c.changes as string | undefined,
      stats: Object.fromEntries(
        Object.entries(c.stats as Record<string, unknown>).filter(([, v]) => typeof v === "number"),
      ) as Record<string, number>,
    }));
}

// ---------------------------------------------------------------------------
// HTML rendu → texte, valeurs
// ---------------------------------------------------------------------------

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  nbsp: " ",
  "#160": " ",
  "#39": "'",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e in ENTITIES) return ENTITIES[e];
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return String.fromCodePoint(code);
    }
    return m;
  });
}

/** Valeur « pp » du wiki (infobulle de progression) : liste par niveau, rang, cible… */
export interface PpValue {
  values: number[];
  /** étiquettes du haut (« 1;2;…;18 » pour les niveaux) */
  top?: string[];
  /** ce qui fait varier la valeur (« level », « number of targets hit… ») */
  label?: string;
  /** suffixe (« % ») */
  key?: string;
}

const PP_RE = /<span class="pp-tooltip"([^>]*)>((?:(?!<\/span>)[\s\S])*)<\/span>/g;

function attr(attrs: string, name: string): string | undefined {
  const m = new RegExp(`${name}="([^"]*)"`).exec(attrs);
  return m ? decodeEntities(m[1]) : undefined;
}

function ppFrom(attrs: string): PpValue | null {
  const bot = attr(attrs, "data-bot-values");
  if (!bot) return null;
  const values = bot.split("|")[0].split(";").map((v) => Number(v.trim()));
  if (!values.length || values.some((v) => !Number.isFinite(v))) return null;
  const top = attr(attrs, "data-top-values")?.split("|")[0].split(";");
  const label = attr(attrs, "data-top-label");
  const key = attr(attrs, "data-bot-key");
  return { values, ...(top ? { top } : {}), ...(label ? { label } : {}), ...(key ? { key } : {}) };
}

/**
 * HTML → texte lisible. Les infobulles de progression deviennent des jetons
 * `⟦n⟧` (n = indice dans `pp`) pour garder leurs valeurs exactes.
 */
export function htmlToText(html: string): { text: string; pp: PpValue[] } {
  const pp: PpValue[] = [];
  const withTokens = html.replace(PP_RE, (whole, attrs: string) => {
    const v = ppFrom(attrs);
    if (!v) return whole;
    pp.push(v);
    return `⟦${pp.length - 1}⟧`;
  });
  const text = decodeEntities(
    withTokens
      .replace(/<small>([\s\S]*?)<\/small>/g, "$1")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
  return { text, pp };
}

/** « 50 / 80 / 110 » → [50, 80, 110] ; null si ce n'est pas une liste de nombres. */
export function numberList(s: string): number[] | null {
  const parts = s.trim().split(/\s*\/\s*/);
  const out = parts.map((p) => Number(p.replace(/,/g, "")));
  return out.length && out.every((n) => Number.isFinite(n)) && parts.every((p) => p !== "") ? out : null;
}

// ---------------------------------------------------------------------------
// Lignes de progression (« leveling ») au format Meraki
// ---------------------------------------------------------------------------

export interface WikiModifier {
  units: string[];
  values: number[];
}
export interface WikiLeveling {
  attribute: string;
  modifiers: WikiModifier[];
}

/** Sépare « 50 / 80 (+ 100% AD) (+ 4% (+ 1% per 100 AP) of target's maximum health) » en tête + groupes (+ …). */
function splitGroups(text: string): { head: string; groups: string[] } {
  const groups: string[] = [];
  let head = "";
  let i = 0;
  while (i < text.length) {
    if (text.startsWith("(+", i)) {
      let depth = 0;
      let j = i;
      for (; j < text.length; j++) {
        if (text[j] === "(") depth++;
        else if (text[j] === ")" && --depth === 0) break;
      }
      groups.push(text.slice(i + 2, j).trim());
      i = j + 1;
    } else head += text[i++];
  }
  return { head: head.trim(), groups };
}

/**
 * Valeurs d'une infobulle « based on level » ramenées aux niveaux 1 à 18. Les
 * étiquettes du haut peuvent sauter des niveaux (« 1;10;11;… » = constant jusqu'au 9).
 */
export function levelSeries(v: PpValue): number[] {
  const tops = v.top?.map((t) => Number(t));
  if (!tops || tops.length !== v.values.length || tops.some((t) => !Number.isFinite(t))) {
    return Array.from({ length: 18 }, (_, i) => v.values[Math.min(i, v.values.length - 1)]);
  }
  return Array.from({ length: 18 }, (_, i) => {
    let k = 0;
    while (k + 1 < tops.length && tops[k + 1] <= i + 1) k++;
    return v.values[k];
  });
}

/** Une quantité : nombres par rang (ou valeurs d'une infobulle) suivis d'une unité. */
function quantity(text: string, pp: PpValue[]): WikiModifier | null {
  // Les parenthèses internes (« (+ 1% per 100 AP) », « (based on level) ») ne font pas l'unité.
  const clean = text
    .replace(/\([^()]*\)/g, " ")
    // Compléments entre crochets (« + [ 5% par stack ] ») : hors valeur principale.
    .replace(/\+?\s*\[[^\]]*\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const tok = /^⟦(\d+)⟧\s*(.*)$/.exec(clean);
  if (tok) {
    const v = pp[Number(tok[1])];
    const byLevel = v.label === undefined || /level/i.test(v.label);
    // Une valeur par niveau n'est pas une valeur par rang : unité dédiée, que le
    // mapping des sorts ignore (les passifs la lisent).
    const unit = `${v.key ?? ""} ${tok[2]}`.trim();
    return byLevel
      ? { units: [`by level${unit ? " " + unit : ""}`], values: levelSeries(v) }
      : { units: [`by ${v.label}`], values: v.values };
  }
  const m = /^(-?\d[\d.,]*(?:\s*\/\s*-?\d[\d.,]*)*)\s*(.*)$/.exec(clean);
  if (!m) return null;
  const values = numberList(m[1]);
  if (!values) return null;
  return { units: [m[2].trim()], values };
}

/** Une ligne « dd » de progression → modificateurs (fixe puis ratios). */
export function parseLevelingValue(html: string): WikiModifier[] {
  const { text, pp } = htmlToText(html);
  const { head, groups } = splitGroups(text.replace(/\n/g, " "));
  const mods: WikiModifier[] = [];
  const flat = head ? quantity(head, pp) : null;
  if (flat) mods.push(flat);
  for (const g of groups) {
    const q = quantity(g, pp);
    if (!q) continue;
    // « (+ 80 / 115 / 150) » sans unité : part fixe par rang qui s'ajoute à la tête
    // (Mordekaiser Q : base par niveau + base par rang).
    if (q.units[0] === "" && mods.some((m) => m.units[0] === "")) continue;
    mods.push(q);
  }
  return mods;
}

// ---------------------------------------------------------------------------
// Boîtes de sorts rendues
// ---------------------------------------------------------------------------

export interface WikiRow {
  /** description en texte, jetons ⟦n⟧ pour les valeurs de progression */
  text: string;
  pp: PpValue[];
  leveling: WikiLeveling[];
}
export interface WikiAbility {
  name: string;
  /** COOLDOWN, COST… tels qu'affichés */
  stats: Record<string, string>;
  rows: WikiRow[];
}

const between = (s: string, start: number, endRe: RegExp): string => {
  endRe.lastIndex = start;
  const m = endRe.exec(s);
  return s.slice(start, m ? m.index : s.length);
};

/** Lit les boîtes de sorts (« skill ») d'un HTML rendu. */
export function parseAbilityBoxes(html: string): WikiAbility[] {
  const out: WikiAbility[] = [];
  const starts = [...html.matchAll(/<div class="skill skill&#95;\w+"/g)].map((m) => m.index!);
  starts.forEach((start, n) => {
    const box = html.slice(start, starts[n + 1] ?? html.length);
    const name = decodeEntities(/ability-info-stats&#95;&#95;ability">([^<]*)</.exec(box)?.[1] ?? "").trim();
    const stats: Record<string, string> = {};
    for (
      const m of box.matchAll(
        /stat-label">([\s\S]*?)<\/div><div class="ability-info-stats&#95;&#95;stat-value">([\s\S]*?)<\/div><\/div>/g,
      )
    ) {
      const label = htmlToText(m[1]).text.replace(/:$/, "").trim().toUpperCase();
      stats[label] = htmlToText(m[2]).text;
    }
    const rows: WikiRow[] = [];
    const rowStarts = [...box.matchAll(/<div class="ability-info-row">/g)].map((m) => m.index!);
    rowStarts.forEach((rs, k) => {
      const row = box.slice(rs, rowStarts[k + 1] ?? box.length);
      const descStart = row.indexOf('<div class="ability-info-description');
      const desc = descStart >= 0
        ? between(row, row.indexOf(">", descStart) + 1, /<\/div>\s*<div class="ability-info-stats/g)
        : "";
      const { text, pp } = htmlToText(desc);
      const leveling: WikiLeveling[] = [];
      for (const m of row.matchAll(/<dt>([\s\S]*?)<\/dt><dd>([\s\S]*?)<\/dd>/g)) {
        const attribute = htmlToText(m[1]).text.replace(/:$/, "").trim();
        const modifiers = parseLevelingValue(m[2]);
        if (attribute && modifiers.length) leveling.push({ attribute, modifiers });
      }
      rows.push({ text, pp, leveling });
    });
    out.push({ name, stats, rows });
  });
  return out;
}

export const WIKI_KEYS = ["I", "Q", "W", "E", "R"] as const;
export type WikiKey = typeof WIKI_KEYS[number];

/** Sorts d'un champion, rendus par le wiki (une requête), par touche. */
export async function fetchWikiAbilities(name: string): Promise<Partial<Record<WikiKey, WikiAbility[]>>> {
  const text = WIKI_KEYS.map((k) => `<div>@@CLAB ${k}@@</div>\n{{Data ${name}/${k}|Ability}}`).join("\n");
  const html = await wikiRender(text);
  const out: Partial<Record<WikiKey, WikiAbility[]>> = {};
  WIKI_KEYS.forEach((k, n) => {
    const start = html.indexOf(`@@CLAB ${k}@@`);
    if (start < 0) return;
    const next = n + 1 < WIKI_KEYS.length ? html.indexOf(`@@CLAB ${WIKI_KEYS[n + 1]}@@`, start) : -1;
    const boxes = parseAbilityBoxes(html.slice(start, next < 0 ? undefined : next));
    if (boxes.length) out[k] = boxes;
  });
  return out;
}

/**
 * Types de dégâts déclarés par le wiki (`damagetype` des modèles de données),
 * par champion puis touche : « Magic », « Physical », « Magic True »…
 */
export async function fetchDamageTypes(
  names: string[],
): Promise<Map<string, Partial<Record<WikiKey, string>>>> {
  const out = new Map<string, Partial<Record<WikiKey, string>>>();
  const titles = names.flatMap((n) => WIKI_KEYS.map((k) => ({ n, k, title: `Template:Data ${n}/${k}` })));
  for (let i = 0; i < titles.length; i += 50) {
    const slice = titles.slice(i, i + 50);
    const json = await wikiApi({
      action: "query",
      prop: "revisions",
      rvprop: "content",
      rvslots: "main",
      redirects: "1",
      titles: slice.map((t) => t.title).join("|"),
    });
    const norm = new Map<string, string>();
    for (const r of json.query.normalized ?? []) norm.set(r.from, r.to);
    const redir = new Map<string, string>();
    for (const r of json.query.redirects ?? []) redir.set(r.from, r.to);
    const byTitle = new Map<string, string>();
    for (const p of json.query.pages ?? []) {
      const content: string | undefined = p.revisions?.[0]?.slots?.main?.content;
      if (content) byTitle.set(p.title, content);
    }
    for (const t of slice) {
      let title = norm.get(t.title) ?? t.title;
      title = redir.get(title) ?? title;
      const m = /\|\s*damagetype\s*=\s*([^\n|]*)/.exec(byTitle.get(title) ?? "");
      if (!m || !m[1].trim()) continue;
      const entry = out.get(t.n) ?? {};
      entry[t.k] = m[1].trim();
      out.set(t.n, entry);
    }
  }
  return out;
}

/** Exécute `fn` sur chaque élément avec au plus `limit` appels simultanés. */
export async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

// ---------------------------------------------------------------------------
// Objets : Module:ItemData/data
// ---------------------------------------------------------------------------

export interface WikiItem {
  name: string;
  /** id Riot (identique à la clé Data Dragon) */
  id: number;
  /** « Legendary », « Boots », « Epic », « Basic », « Starter », « Distributed »… */
  type: string[];
  /** champion requis (Gangplank, Kalista…) */
  champion?: string;
  /** ad, ap, hp, armor, mr, ah, as, crit, lethality, mpen, mpenflat, armpen, lifesteal, omnivamp, mana… */
  stats: Record<string, number>;
  modes: Record<string, boolean>;
}

export async function fetchItemData(): Promise<WikiItem[]> {
  const table = parseLua(await wikiSource("Module:ItemData/data")) as Record<string, Record<string, unknown>>;
  return itemsFromTable(table);
}

/**
 * Objets d'une table ItemData. Le wiki factorise les variantes par renvoi :
 * `["type"] = "=>Muramana"` veut dire « même valeur que l'entrée Muramana » —
 * pour un champ entier comme pour une stat.
 */
export function itemsFromTable(table: Record<string, Record<string, unknown>>): WikiItem[] {
  const resolve = (value: unknown, field: string[], depth = 0): unknown => {
    if (typeof value !== "string" || !value.startsWith("=>") || depth > 5) return value;
    let v: unknown = table[value.slice(2).trim()];
    for (const f of field) v = (v as Record<string, unknown> | undefined)?.[f];
    return resolve(v, field, depth + 1);
  };
  const field = (it: Record<string, unknown>, name: string) => resolve(it[name], [name]);
  return Object.entries(table)
    .filter(([, it]) => typeof it?.id === "number")
    .map(([name, it]) => {
      const type = field(it, "type");
      const stats = (field(it, "stats") ?? {}) as Record<string, unknown>;
      return {
        name,
        id: it.id as number,
        type: Array.isArray(type) ? type.map(String) : [],
        ...(it.champion ? { champion: String(it.champion) } : {}),
        stats: Object.fromEntries(
          Object.entries(stats)
            .map(([k, v]) => [k, resolve(v, ["stats", k])])
            .filter(([, v]) => typeof v === "number"),
        ) as Record<string, number>,
        modes: (field(it, "modes") ?? {}) as Record<string, boolean>,
      };
    });
}
