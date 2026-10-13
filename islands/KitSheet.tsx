/**
 * Îlot FICHE DE KIT — la page dédiée d'un champion (Ivern).
 *
 * Tout vient des fichiers du jeu : infobulles rendues avec des nombres calculés au
 * niveau, aux rangs et au build choisis (lib/tooltip.ts), stats du familier, et le
 * moteur pour les combos face à une cible. Rien n'est saisi à la main ici.
 */
import { useState } from "preact/hooks";
import { CHAMPION_LIST, CHAMPIONS } from "@/data/champions.ts";
import { isLabItem, ITEMS } from "@/data/items.ts";
import { KITS } from "@/data/kits.ts";
import { RUNES } from "@/data/runes.ts";
import type { AbilityKey, Champion, IncludeMap, KitSpell } from "@/data/types.ts";
import { computeDuel, computeStats, cooldownOf, formulaAt, formulaStats, rankOf } from "@/lib/engine.ts";
import type { DerivedStats } from "@/lib/engine.ts";
import { evalFormula } from "@/lib/formula.ts";
import { formatNumber, renderTooltip } from "@/lib/tooltip.ts";

const KEYS: AbilityKey[] = ["Q", "W", "E", "R"];
const SLOTS = 6;
const CATALOG = Object.values(ITEMS).filter(isLabItem).sort((a, b) => a.name.localeCompare(b.name, "fr"));
const ALL_IN: IncludeMap = { Q: true, W: true, E: true, R: true, bleed: true, rune: true };

type Mode = "burst" | "trade" | "allin";
const MODES: Record<Mode, { label: string; opts: { window?: number; allIn?: boolean } }> = {
  burst: { label: "BURST", opts: {} },
  trade: { label: "TRADE 3 S", opts: { window: 3 } },
  allin: { label: "ALL-IN", opts: { allIn: true } },
};

const n = formatNumber;
const secs = (v?: number) => (v === undefined || !Number.isFinite(v) ? "—" : `${n(v)} s`);

function ranksAt(c: Champion, level: number): Record<AbilityKey, number> {
  return {
    Q: rankOf(c, "Q", level),
    W: rankOf(c, "W", level),
    E: rankOf(c, "E", level),
    R: rankOf(c, "R", level),
  };
}

interface Props {
  championId: string;
  initialTarget: string;
}

export default function KitSheet({ championId, initialTarget }: Props) {
  const champion = CHAMPIONS[championId];
  const kit = KITS[championId];
  const [level, setLevel] = useState(11);
  const [ranks, setRanks] = useState(() => ranksAt(champion, 11));
  const [items, setItems] = useState<string[]>(() => champion.shelf.slice(0, 3));
  const [targetId, setTargetId] = useState(initialTarget);
  const [mode, setMode] = useState<Mode>("allin");
  const [daisy, setDaisy] = useState(true);

  if (!kit) return <p class="dim">Pas de fiche de kit générée pour {champion.name}.</p>;

  const stats = computeStats(champion, level, items, ITEMS, RUNES, false);
  const ctxFor = (rank: number) => ({ rank: Math.max(1, rank), level, stats: formulaStats(stats) });
  const pointsUsed = KEYS.reduce((a, k) => a + ranks[k], 0);

  const changeLevel = (lv: number) => {
    setLevel(lv);
    setRanks(ranksAt(champion, lv));
  };
  const setRank = (key: AbilityKey, r: number) =>
    setRanks({ ...ranks, [key]: Math.max(0, Math.min(champion.abilities[key].maxRank, r)) });
  const setItem = (slot: number, id: string) => {
    const next = [...items];
    if (id) next[slot] = id;
    else next.splice(slot, 1);
    setItems(next.filter(Boolean).slice(0, SLOTS));
  };

  const target = CHAMPIONS[targetId];
  const include = daisy ? ALL_IN : { ...ALL_IN, R: false };
  const duel = computeDuel(
    { champion, level, itemIds: items, runeOn: false, ranks, include },
    { champion: target, level, itemIds: target.shelf.slice(0, items.length), runeOn: true },
    ITEMS,
    RUNES,
    MODES[mode].opts,
  );

  return (
    <div class="kit">
      <div class="panel">
        <div class="phead">
          <span class="tag">{champion.name.toUpperCase()} · {champion.title}</span>
          <span class="st">valeurs des fichiers du jeu · patch {kit.patch}</span>
        </div>
        <div class="pbody kit-controls">
          <div class="field">
            <div class="flabel">
              <span>NIVEAU</span>
              <span class="v">{level}</span>
            </div>
            <input
              type="range"
              min={1}
              max={18}
              value={level}
              onInput={(e) => changeLevel(+e.currentTarget.value)}
            />
          </div>
          <div class="kit-ranks">
            {KEYS.map((key) => (
              <div class="kit-rank" key={key}>
                <span class="kit-key">{key}</span>
                <button
                  type="button"
                  onClick={() => setRank(key, ranks[key] - 1)}
                  aria-label={`baisser ${key}`}
                >
                  −
                </button>
                <b>{ranks[key]}</b>/{champion.abilities[key].maxRank}
                <button
                  type="button"
                  onClick={() => setRank(key, ranks[key] + 1)}
                  aria-label={`monter ${key}`}
                >
                  +
                </button>
              </div>
            ))}
            <span class={pointsUsed > level ? "kit-warn" : "dim"}>
              {pointsUsed} point{pointsUsed > 1 ? "s" : ""} / {level}
            </span>
          </div>
          <div class="kit-items">
            {Array.from({ length: SLOTS }, (_, i) => (
              <select
                key={i}
                value={items[i] ?? ""}
                onChange={(e) => setItem(i, e.currentTarget.value)}
              >
                <option value="">— emplacement {i + 1} —</option>
                {CATALOG.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
              </select>
            ))}
          </div>
          <div class="kit-stats">
            <Stat label="PV" v={stats.maxHp} />
            <Stat label="AP" v={stats.ap} />
            <Stat label="AD" v={stats.totalAD} />
            <Stat label="Armure" v={stats.armor} />
            <Stat label="RM" v={stats.mr} />
            <Stat label="VA" v={stats.attackSpeed} dec />
            <Stat label="Accélération" v={stats.abilityHaste} />
            <Stat label="Soins et boucliers" v={stats.healShieldPower * 100} unit="%" />
          </div>
        </div>
      </div>

      <div class="kit-spells">
        {(["P", ...KEYS] as const).map((key) => {
          const spell = kit.spells[key];
          if (!spell) return null;
          const rank = key === "P" ? 1 : ranks[key];
          return (
            <SpellCard
              key={key}
              slot={key}
              spell={spell}
              rank={rank}
              // Sort à charges (W) : son « cooldown » n'est qu'un délai de relance, on montre les charges.
              cooldown={key === "P" || spell.ammo
                ? undefined
                : cooldownOf(champion, key, Math.max(1, rank), stats.abilityHaste)}
              ctx={ctxFor(rank)}
              healShieldPower={stats.healShieldPower}
            />
          );
        })}
      </div>

      <PetPanel champion={champion} rank={ranks.R} level={level} stats={stats} kit={kit} />

      <div class="panel">
        <div class="phead">
          <span class="tag">COMBO FACE À UNE CIBLE</span>
          <span class="st">même niveau, autant d'objets de son étagère</span>
        </div>
        <div class="pbody">
          <div class="kit-duelbar">
            <label class="mu-side">
              <span class="mu-sidelabel" style="background:var(--enemy)">CIBLE</span>
              <select value={targetId} onChange={(e) => setTargetId(e.currentTarget.value)}>
                {CHAMPION_LIST.filter((c) => c.id !== championId).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <div class="mu-modes kit-modes">
              {(Object.keys(MODES) as Mode[]).map((m) => (
                <button
                  type="button"
                  key={m}
                  class={mode === m ? "on" : ""}
                  onClick={() => setMode(m)}
                >
                  <b>{MODES[m].label}</b>
                </button>
              ))}
            </div>
            <label class="kit-toggle">
              <input type="checkbox" checked={daisy} onChange={(e) => setDaisy(e.currentTarget.checked)} />
              {" "}
              avec Daisy (R)
            </label>
          </div>
          <div class="kit-duel">
            <div>
              <h4>{champion.name} → {target.name}</h4>
              <Lines lines={duel.aToB.lines} />
              <p>
                total <b>{n(duel.aToB.total)}</b> · retire <b>{Math.round(duel.killPctA * 100)} %</b> des PV
                {" "}
                {duel.ttkA !== undefined && (
                  <>
                    · tue en <b>{secs(duel.ttkA)}</b>
                  </>
                )}
              </p>
              <p class="dim">
                boucliers + soins <b>+{n(duel.sustainA)}</b> PV · contrôle infligé <b>{secs(duel.ccOnB)}</b>
              </p>
            </div>
            <div>
              <h4>{target.name} → {champion.name}</h4>
              <Lines lines={duel.bToA.lines} />
              <p>
                total <b>{n(duel.bToA.total)}</b> · retire <b>{Math.round(duel.killPctB * 100)} %</b> des PV
                {" "}
                {duel.ttkB !== undefined && (
                  <>
                    · tue en <b>{secs(duel.ttkB)}</b>
                  </>
                )}
              </p>
              <p class="dim">
                rapprochement <b>{secs(duel.approachB)}</b> · contrôle infligé <b>{secs(duel.ccOnA)}</b>
              </p>
            </div>
          </div>
          <p class={duel.edge > 0.02 ? "mu-a" : duel.edge < -0.02 ? "mu-b" : "dim"}>
            edge <b>{duel.edge > 0 ? "+" : ""}{Math.round(duel.edge * 100)}</b> {duel.edge > 0.02
              ? `— ${champion.name} gagne`
              : duel.edge < -0.02
              ? `— ${target.name} gagne`
              : "— égal"}
          </p>
        </div>
      </div>

      <div class="panel">
        <div class="phead">
          <span class="tag">CE QUI EST MODÉLISÉ</span>
          <span class="st">fidélité de la fiche</span>
        </div>
        <div class="pbody mu-notes">
          <p>
            <b>Exact, au patch :</b>{" "}
            toutes les valeurs des infobulles ci-dessus (rendues depuis les fichiers du jeu, aucun nombre
            saisi), cooldowns et charges, stats de Daisy, bonus de soins et boucliers des objets.
          </p>
          <p>
            <b>Dans le duel :</b>{" "}
            Q (dégâts), W en passif sur chaque auto (Ivern se bat dans son buisson), E (bouclier sur lui, puis
            explosion), Daisy (attaques, onde de choc tous les 3 coups au plus une fois toutes les 3 s,
            projection de 1 s qui ignore la ténacité).
          </p>
          <p class="dim">
            <b>Pas dans le duel :</b>{" "}
            le passif (jungle uniquement), les effets sur les alliés (W, E, dash des alliés sur Q),
            l'enracinement de Q (le duel est sans déplacement), le ralentissement de E, le second bouclier de
            E, Aery et les passifs d'aide des objets d'enchanteur. Daisy n'est jamais prise pour cible : c'est
            un plafond, l'adversaire peut s'éloigner d'elle ou la tuer en jeu — décoche « avec Daisy » pour
            comparer.
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat(
  { label, v, unit = "", dec = false }: { label: string; v: number; unit?: string; dec?: boolean },
) {
  return (
    <div class="kit-stat">
      <span>{label}</span>
      <b>{dec ? v.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) : n(v)}{unit}</b>
    </div>
  );
}

function SpellCard(
  { slot, spell, rank, cooldown, ctx, healShieldPower }: {
    slot: "P" | AbilityKey;
    spell: KitSpell;
    rank: number;
    cooldown?: number;
    ctx: { rank: number; level: number; stats: ReturnType<typeof formulaStats> };
    healShieldPower: number;
  },
) {
  const tip = renderTooltip(spell, ctx);
  // Le bouclier de l'infobulle est la valeur de base ; les objets d'enchanteur le renforcent.
  const shieldCalc = spell.calcs.TotalShield;
  const boosted = shieldCalc && healShieldPower > 0 && rank > 0
    ? evalFormula(shieldCalc, ctx) * (1 + healShieldPower)
    : null;
  return (
    <div class="panel kit-spell">
      <div class="phead">
        <span class="tag">
          <span class="kit-key">{slot === "P" ? "P" : slot}</span> {spell.name}
        </span>
        <span class="st">
          {slot !== "P" && (rank > 0 ? `rang ${rank}` : "pas appris")}
          {cooldown !== undefined && rank > 0 && ` · ${secs(cooldown)}`}
          {spell.ammo && ` · ${spell.ammo.max} charges, 1 / ${spell.ammo.recharge} s`}
        </span>
      </div>
      <div class={`pbody kit-tip${slot !== "P" && rank < 1 ? " dim" : ""}`}>
        {tip.paragraphs.map((p, i) => (
          <p key={i}>
            {p.map((s, j) => (
              <span key={j} class={[s.cls, s.value ? "tt-val" : ""].join(" ").trim()}>{s.text}</span>
            ))}
          </p>
        ))}
        {boosted !== null && (
          <p class="tt-shield">
            Avec +{Math.round(healShieldPower * 100)} % de soins et boucliers : bouclier <b>{n(boosted)}</b>
          </p>
        )}
        {tip.missing.length > 0 && <p class="kit-warn">Valeurs introuvables : {tip.missing.join(", ")}</p>}
      </div>
    </div>
  );
}

function PetPanel(
  { champion, rank, level, stats, kit }: {
    champion: Champion;
    rank: number;
    level: number;
    stats: DerivedStats;
    kit: { spells: { R?: KitSpell } };
  },
) {
  const pet = champion.mechanics?.find((m) => m.kind === "pet");
  if (!pet || pet.kind !== "pet") return null;
  const r = Math.max(1, rank);
  const at = (f: Parameters<typeof formulaAt>[0]) => formulaAt(f, r, level, stats);
  const as = at(pet.baseAttackSpeed) * (1 + at(pet.bonusAttackSpeed));
  // Résistances du familier : calcul du sort R s'il existe (Daisy : 30 → 90 selon le niveau).
  const resistCalc = kit.spells.R?.calcs.TotalBonusResists;
  const resists = resistCalc ? evalFormula(resistCalc, { rank: r, level, stats: formulaStats(stats) }) : null;
  return (
    <div class="panel">
      <div class="phead">
        <span class="tag">{pet.name.toUpperCase()}</span>
        <span class="st">
          {rank < 1 ? "R pas appris — valeurs au rang 1" : `R rang ${rank}`} · niveau {level}
        </span>
      </div>
      <div class="pbody kit-stats">
        <Stat label="PV" v={at(pet.hp)} />
        <Stat label="AD" v={at(pet.ad)} />
        <Stat label="VA" v={as} dec />
        {resists !== null && <Stat label="Armure et RM" v={resists} />}
        <Stat label="Durée" v={at(pet.duration)} unit=" s" />
        {pet.slamDamage && <Stat label="Onde de choc" v={at(pet.slamDamage)} />}
        {pet.slamCc && <Stat label="Projection" v={at(pet.slamCc)} unit=" s" />}
        {pet.slamCooldown && <Stat label="Recharge onde" v={at(pet.slamCooldown)} unit=" s" />}
        {pet.slamEvery && <Stat label="Onde tous les" v={pet.slamEvery} unit=" coups" />}
      </div>
    </div>
  );
}

function Lines({ lines }: { lines: { name: string; damage: number; type: string }[] }) {
  if (!lines.length) return <p class="dim">aucun dégât</p>;
  return (
    <ul class="kit-lines">
      {lines.map((l, i) => (
        <li key={i}>
          <span class={l.type === "magic" ? "tt-magic" : l.type === "physical" ? "tt-phys" : "tt-true"}>
            {l.name}
          </span>
          <b>{n(l.damage)}</b>
        </li>
      ))}
    </ul>
  );
}
