/**
 * Îlot MATCHUP — deux champions, la courbe d'avantage minute par minute, les spikes.
 *
 * Tout le calcul est dans lib/timeline.ts (pur, testé) ; ici on ne fait que
 * choisir les camps, régler la lane et dessiner. Le choix est reflété dans l'URL
 * (?a=…&b=…) pour pouvoir partager un matchup.
 */
import { useMemo, useState } from "preact/hooks";
import { CHAMPION_LIST, CHAMPIONS } from "@/data/champions.ts";
import { ITEMS } from "@/data/items.ts";
import { RUNES } from "@/data/runes.ts";
import { DEFAULT_LANE, findSpikes, matchupTimeline } from "@/lib/timeline.ts";
import type { MatchupPoint, Spike, TimelineOptions } from "@/lib/timeline.ts";

const pct = (n: number) => `${Math.round(n * 100)}%`;
const signed = (n: number) => `${n > 0 ? "+" : ""}${Math.round(n * 100)}`;

/** Temps pour tuer lisible : « 6,1 s », « — » au-delà de la limite. */
const secs = (n?: number) =>
  n === undefined || !Number.isFinite(n) ? "—" : `${n.toFixed(1).replace(".", ",")} s`;

type Mode = "burst" | "trade" | "allin";

interface Timeline {
  points: MatchupPoint[];
  spikes: Spike[];
}

/**
 * Timelines déjà calculées pour les mêmes champions et réglages. Le calcul est
 * déterministe (données figées par patch) : le serveur ne refait pas celui d'une
 * page déjà rendue, le navigateur pas celui d'un réglage déjà essayé. Les plus
 * anciennes sortent au-delà de CACHE_MAX.
 */
const CACHE = new Map<string, Timeline>();
const CACHE_MAX = 64;

function cachedTimeline(key: string, compute: () => Timeline): Timeline {
  const hit = CACHE.get(key);
  if (hit) {
    CACHE.delete(key);
    CACHE.set(key, hit);
    return hit;
  }
  const value = compute();
  CACHE.set(key, value);
  if (CACHE.size > CACHE_MAX) CACHE.delete(CACHE.keys().next().value!);
  return value;
}

/** Les trois façons de faire l'échange, et comment lire l'edge dans chacune. */
const MODES: Record<Mode, { label: string; hint: string; edge: string; opts: TimelineOptions }> = {
  burst: {
    label: "BURST",
    hint: "une rotation",
    edge: "edge = % PV retirés par A − par B, une rotation de sorts",
    opts: {},
  },
  trade: {
    label: "TRADE 3 S",
    hint: "sorts + autos",
    edge: "edge = % PV retirés par A − par B sur 3 s (sorts selon cooldown + autos)",
    opts: { window: 3 },
  },
  allin: {
    label: "ALL-IN",
    hint: "jusqu'au premier mort",
    edge: "edge = % PV retirés par A − par B à l'instant du premier kill",
    opts: { allIn: true },
  },
};

/** Nom court d'un objet pour les listes de build. */
const itemName = (id: string) => ITEMS[id]?.name ?? id;

function syncUrl(a: string, b: string) {
  try {
    const url = new URL(globalThis.location.href);
    url.searchParams.set("a", a);
    url.searchParams.set("b", b);
    globalThis.history.replaceState(null, "", url);
  } catch { /* rendu serveur ou sandbox : on ignore */ }
}

interface Props {
  initialA: string;
  initialB: string;
}

export default function Matchup({ initialA, initialB }: Props) {
  const [aId, setAId] = useState(initialA);
  const [bId, setBId] = useState(initialB);
  const [csA, setCsA] = useState(DEFAULT_LANE.csPerMin);
  const [csB, setCsB] = useState(DEFAULT_LANE.csPerMin);
  const [xpGapB, setXpGapB] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [hover, setHover] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("allin");

  const a = CHAMPIONS[aId];
  const b = CHAMPIONS[bId];

  // Recalculé seulement quand un réglage change — pas quand la souris survole la courbe.
  const key = JSON.stringify([aId, bId, csA, csB, xpGapB, accuracy, mode]);
  const { points, spikes } = useMemo(
    () =>
      cachedTimeline(key, () => {
        const points = matchupTimeline(
          { champion: a, lane: { csPerMin: csA } },
          { champion: b, lane: { csPerMin: csB, xpPerMin: DEFAULT_LANE.xpPerMin * (1 - xpGapB / 100) } },
          ITEMS,
          RUNES,
          { ...MODES[mode].opts, accuracy: accuracy / 100 },
        );
        return { points, spikes: findSpikes(points, a, b, ITEMS) };
      }),
    [key],
  );
  const timed = mode !== "burst";

  const pick = (side: "a" | "b", id: string) => {
    const nextA = side === "a" ? id : aId;
    const nextB = side === "b" ? id : bId;
    setAId(nextA);
    setBId(nextB);
    syncUrl(nextA, nextB);
  };
  const swap = () => {
    setAId(bId);
    setBId(aId);
    setCsA(csB);
    setCsB(csA);
    syncUrl(bId, aId);
  };

  const wins = points.filter((p) => p.edge > 0.02).length;
  const loses = points.filter((p) => p.edge < -0.02).length;
  const best = points.reduce((m, p) => (p.edge > m.edge ? p : m), points[0]);
  const worst = points.reduce((m, p) => (p.edge < m.edge ? p : m), points[0]);
  const focus = hover !== null ? points[hover] : null;

  return (
    <div class="mu">
      <div class="mu-pick panel">
        <div class="pbody mu-pickrow">
          <SidePicker label="A" value={aId} onPick={(id) => pick("a", id)} />
          <button type="button" class="cta small" onClick={swap} title="Inverser A et B">⇄</button>
          <SidePicker label="B" value={bId} onPick={(id) => pick("b", id)} />
        </div>
        <div class="pbody mu-modes" role="radiogroup" aria-label="Type d'échange">
          {(Object.keys(MODES) as Mode[]).map((m) => (
            <button
              type="button"
              key={m}
              role="radio"
              aria-checked={mode === m}
              class={mode === m ? "on" : ""}
              onClick={() => setMode(m)}
            >
              <b>{MODES[m].label}</b>
              <span>{MODES[m].hint}</span>
            </button>
          ))}
        </div>
        <div class="pbody mu-lane">
          <Slider label={`CS/MIN · ${a.name}`} value={csA} min={3} max={11} step={0.5} onInput={setCsA} />
          <Slider label={`CS/MIN · ${b.name}`} value={csB} min={3} max={11} step={0.5} onInput={setCsB} />
          <Slider
            label={`RETARD D'XP · ${b.name}`}
            value={xpGapB}
            min={-30}
            max={30}
            step={5}
            unit="%"
            onInput={setXpGapB}
          />
          <Slider
            label="PRÉCISION DES SORTS À VISER"
            value={accuracy}
            min={30}
            max={100}
            step={5}
            unit="%"
            onInput={setAccuracy}
          />
        </div>
      </div>

      <div class="panel">
        <div class="phead">
          <span class="tag">AVANTAGE · {a.name.toUpperCase()} vs {b.name.toUpperCase()}</span>
          <span class="st">{MODES[mode].edge}</span>
        </div>
        <div class="pbody">
          <div class="mu-summary">
            <span>
              <b class="mu-a">{a.name}</b> devant <b>{wins}</b> min · <b class="mu-b">{b.name}</b> devant{" "}
              <b>{loses}</b> min
            </span>
            <span>
              {best.edge > 0.02 ? <Peak name={a.name} edge={best.edge} minute={best.minute} /> : null}
              {best.edge > 0.02 && worst.edge < -0.02 ? " · " : null}
              {worst.edge < -0.02 ? <Peak name={b.name} edge={-worst.edge} minute={worst.minute} /> : null}
            </span>
          </div>
          <EdgeChart points={points} spikes={spikes} hover={hover} onHover={setHover} />
          <div class="mu-focus" aria-live="polite">
            {focus
              ? (
                <>
                  <b>{focus.minute}'</b> · niv {focus.levelA}/{focus.levelB} · {a.name} retire{" "}
                  <b>{pct(focus.killPctA)}</b> · {b.name} retire <b>{pct(focus.killPctB)}</b> · edge{" "}
                  <b>{signed(focus.edge)}</b>
                  {timed && (
                    <>
                      {" "}· tue en <b>{secs(focus.ttkA)}</b> / <b>{secs(focus.ttkB)}</b>
                    </>
                  )}
                  {(focus.sustainA > 0 || focus.sustainB > 0) && (
                    <>
                      {" "}· boucliers + soins <b>+{Math.round(focus.sustainA)}</b> /{" "}
                      <b>+{Math.round(focus.sustainB)}</b> PV
                    </>
                  )}
                  {(focus.ccOnA > 0 || focus.ccOnB > 0) && (
                    <>
                      {" "}· contrôlé <b>{secs(focus.ccOnA)}</b> / <b>{secs(focus.ccOnB)}</b>
                    </>
                  )}
                  {(focus.approachA > 0 || focus.approachB > 0) && (
                    <>
                      {" "}· rapprochement <b>{secs(focus.approachA)}</b> / <b>{secs(focus.approachB)}</b>
                    </>
                  )}
                </>
              )
              : <span class="dim">Survole la courbe pour le détail d'une minute.</span>}
          </div>
        </div>
      </div>

      <div class="mu-cols">
        <div class="panel">
          <div class="phead">
            <span class="tag">SPIKES</span>
            <span class="st">sauts d'edge ≥ 10 pts</span>
          </div>
          <div class="pbody">
            {spikes.length === 0 && <p class="dim">Aucun saut net : les deux courbes montent ensemble.</p>}
            {spikes.map((s) => (
              <div class="mu-spike" key={s.minute}>
                <span class="mu-min">{s.minute}'</span>
                <span class={s.side === "A" ? "mu-a" : "mu-b"}>
                  {s.side === "A" ? a.name : b.name} {signed(Math.abs(s.delta))}
                </span>
                <span class="mu-causes">{s.causes.join(" · ") || "—"}</span>
              </div>
            ))}
          </div>
        </div>

        <div class="panel">
          <div class="phead">
            <span class="tag">MODÈLE</span>
            <span class="st">ce qui est (et n'est pas) simulé</span>
          </div>
          <div class="pbody mu-notes">
            <p>
              Niveau et or déduits de la minute (courbe d'XP de solo lane, or passif + farm). Build : Doran
              puis l'étagère du champion, composants achetés dès que l'or suffit (pas de timing de recall).
            </p>
            <p>
              Burst : une rotation Q/W/E/R + rune. Trade et all-in : sorts relancés selon leur cooldown
              (ability haste comprise), auto-attaques à la vitesse d'attaque, crits en espérance. L'all-in
              s'arrête au premier mort. Résistances et PV du niveau et des objets compris.
            </p>
            <p>
              Kits : dégâts en % des PV, ratios par rang, boucliers et soins des sorts, vol de vie et
              omnivampirisme, qui s'ajoutent aux PV du camp qui les porte. Passifs de Darius, Fiora, Jax et
              Vayne tirés des fichiers du jeu (CommunityDragon), au patch près, comme les cooldowns.
            </p>
            <p class="dim">
              Interactions : les contrôles (étourdissement, projection, peur, charme…) lus dans les fichiers
              du jeu font perdre ce temps d'action à la cible (la ténacité les réduit, sauf projections et
              suppressions) ; la parade de Fiora bloque le plus gros coup et le plus long contrôle ; l'esquive
              de Jax annule les autos pendant sa durée. Le camp à moins de portée perd le temps de combler
              l'écart, sauf s'il a un dash ou une attraction. Les sorts à viser sont pondérés par la
              précision.
            </p>
            <p class="dim">
              Aussi : les 17 keystones (valeurs du jeu ; Rush de phase, Glacial et Grimoire n'agissent pas
              dans un duel immobile), les effets défensifs d'objets (Zhonya, Ange gardien, Sterak, Danse de la
              mort, Cotte épineuse, blessures graves…), les enracinements et ralentissements sur l'approche,
              et un familier que l'adversaire peut tuer d'abord. Les passifs sont saisis champion par champion
              (liste sur la page Méthode). Les autos et les sorts s'enchaînent sans temps mort : c'est un
              plafond de dégâts, pas un replay de partie (pas de kite après l'approche, pas d'animations).
            </p>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="phead">
          <span class="tag">MINUTE PAR MINUTE</span>
          <span class="st">la courbe en tableau</span>
        </div>
        <div class="pbody mu-tablewrap">
          <table class="mu-table">
            <thead>
              <tr>
                <th>min</th>
                <th>niv</th>
                <th>{a.name}</th>
                <th>{b.name}</th>
                <th>edge</th>
                {timed && <th>tue en</th>}
                <th class="mu-build">build {a.name}</th>
                <th class="mu-build">build {b.name}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p, i) => (
                <tr key={p.minute} class={hover === i ? "on" : ""}>
                  <td>{p.minute}'</td>
                  <td>{p.levelA}/{p.levelB}</td>
                  <td>{pct(p.killPctA)}</td>
                  <td>{pct(p.killPctB)}</td>
                  <td class={p.edge > 0.02 ? "mu-a" : p.edge < -0.02 ? "mu-b" : ""}>{signed(p.edge)}</td>
                  {timed && <td>{secs(p.ttkA)} / {secs(p.ttkB)}</td>}
                  <td class="mu-build">{p.buildA.map(itemName).join(", ")}</td>
                  <td class="mu-build">{p.buildB.map(itemName).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Peak({ name, edge, minute }: { name: string; edge: number; minute: number }) {
  return (
    <>
      pic {name} : <b>{signed(edge)}</b> à {minute}'
    </>
  );
}

function SidePicker(
  { label, value, onPick }: { label: string; value: string; onPick: (id: string) => void },
) {
  return (
    <label class={`mu-side mu-side-${label.toLowerCase()}`}>
      <span class="mu-sidelabel">{label}</span>
      <select value={value} onChange={(e) => onPick(e.currentTarget.value)}>
        {CHAMPION_LIST.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </label>
  );
}

function Slider(
  { label, value, min, max, step, unit = "", onInput }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit?: string;
    onInput: (v: number) => void;
  },
) {
  return (
    <div class="field">
      <div class="flabel">
        <span>{label}</span>
        <span class="v">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={(e) => onInput(+e.currentTarget.value)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Courbe d'edge — SVG inline, une seule échelle, zéro au milieu.
// ---------------------------------------------------------------------------

const W = 720;
const H = 240;
const PAD = { l: 40, r: 12, t: 14, b: 26 };

function EdgeChart(
  { points, spikes, hover, onHover }: {
    points: MatchupPoint[];
    spikes: Spike[];
    hover: number | null;
    onHover: (i: number | null) => void;
  },
) {
  // Échelle symétrique autour de 0, arrondie à 20 pts, au moins ±40.
  const maxAbs = Math.max(0.4, ...points.map((p) => Math.abs(p.edge)));
  const span = Math.ceil(maxAbs * 5) / 5;
  const n = points.length;
  const x = (i: number) => PAD.l + (i / Math.max(1, n - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + ((span - v) / (2 * span)) * (H - PAD.t - PAD.b);
  const zero = y(0);

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.edge).toFixed(1)}`).join("");
  const area = `${line}L${x(n - 1).toFixed(1)},${zero}L${x(0).toFixed(1)},${zero}Z`;
  const ticks = [-span, -span / 2, 0, span / 2, span];

  const onMove = (e: PointerEvent) => {
    const svg = e.currentTarget as SVGSVGElement;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (n - 1));
    // Graphique sans taille (onglet masqué, rendu en cours) : pas de survol plutôt qu'un index NaN.
    if (!Number.isFinite(i)) return onHover(null);
    onHover(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <svg
      class="mu-chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Avantage de A sur B par minute"
      onPointerMove={onMove}
      onPointerLeave={() => onHover(null)}
    >
      <defs>
        <clipPath id="mu-above">
          <rect x="0" y="0" width={W} height={zero} />
        </clipPath>
        <clipPath id="mu-below">
          <rect x="0" y={zero} width={W} height={H - zero} />
        </clipPath>
      </defs>

      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} class={t === 0 ? "mu-zero" : "mu-grid"} />
          <text x={PAD.l - 6} y={y(t) + 3} class="mu-tick" text-anchor="end">{signed(t)}</text>
        </g>
      ))}
      {points.map((p, i) =>
        p.minute % 5 === 0 || i === 0
          ? <text key={p.minute} x={x(i)} y={H - 8} class="mu-tick" text-anchor="middle">{p.minute}'</text>
          : null
      )}
      <text x={PAD.l + 4} y={PAD.t + 10} class="mu-zone mu-a">A gagne ↑</text>
      <text x={PAD.l + 4} y={H - PAD.b - 4} class="mu-zone mu-b">B gagne ↓</text>

      <path d={area} class="mu-area-a" clip-path="url(#mu-above)" />
      <path d={area} class="mu-area-b" clip-path="url(#mu-below)" />
      <path d={line} class="mu-line" />

      {spikes.map((sp) => {
        const i = points.findIndex((p) => p.minute === sp.minute);
        return i < 0 ? null : (
          <circle
            key={sp.minute}
            cx={x(i)}
            cy={y(points[i].edge)}
            r={4.5}
            class={`mu-dot ${sp.side === "A" ? "a" : "b"}`}
          />
        );
      })}

      {hover !== null && (
        <g>
          <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} class="mu-cross" />
          <circle cx={x(hover)} cy={y(points[hover].edge)} r={4} class="mu-hoverdot" />
        </g>
      )}
    </svg>
  );
}
