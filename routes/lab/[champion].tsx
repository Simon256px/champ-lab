import { page } from "fresh";
import { define } from "@/utils.ts";
import { CHAMPION_LIST, CHAMPIONS } from "@/data/champions.ts";
import { GENERATED_PASSIVES } from "@/data/generated/passives.gen.ts";
import ChampLab from "@/islands/ChampLab.tsx";

const VERDICT = {
  modeled: "MODÉLISÉ",
  conditional: "NON JOUÉ — CONDITIONNEL",
  utility: "SANS DÉGÂTS",
} as const;

// Champion inconnu : la page d'erreur est rendue avec le statut HTTP 404.
export const handler = define.handlers({
  GET(ctx) {
    return page(undefined, CHAMPIONS[ctx.params.champion] ? undefined : { status: 404 });
  },
});

export default define.page<typeof handler>(function LabPage(ctx) {
  const id = ctx.params.champion;
  const champion = CHAMPIONS[id];

  // Champion inconnu : message + retour au roster (pas de 500).
  if (!champion) {
    return (
      <main>
        <div class="divider">
          &gt;<b>INCONNU</b>&lt;
        </div>
        <div class="panel" style="max-width:520px;margin:0 auto">
          <div class="phead">
            <span class="tag">404</span>
          </div>
          <div class="pbody">
            <p>Aucun champion « {id} » n'est câblé pour l'instant.</p>
            <p style="margin-top:10px">
              <a href="/champions" class="cta small">← Retour au roster</a>
            </p>
          </div>
        </div>
      </main>
    );
  }

  const passive = GENERATED_PASSIVES[champion.id];

  return (
    <main>
      <div class="divider">
        &gt;<b>LABO&nbsp;·&nbsp;{champion.name.toUpperCase()}</b>&lt;
      </div>

      {
        /* Sélecteur de champion = liens serveur (aucun JS). Bande défilable ;
          le picker principal reste /champions. Chaque champion est sa propre route. */
      }
      <nav class="chswitch" aria-label="Changer de champion">
        <a href="/champions" class="chswitch-all">◄ ROSTER</a>
        {CHAMPION_LIST.map((c) => (
          <a href={`/lab/${c.id}`} class={`chswitch-btn${c.id === champion.id ? " on" : ""}`}>
            {c.name.toUpperCase()}
          </a>
        ))}
      </nav>

      {/* Tout l'interactif est dans cet unique îlot : c'est le seul JS hydraté de la page. */}
      <ChampLab champion={champion} />

      {passive && (
        <section class="panel passive-status">
          <div class="phead">
            <span class="tag">PASSIF</span>
            <span class="small">
              {VERDICT[passive.verdict]} · {passive.source === "game" ? "valeurs du jeu" : "wiki officiel"}
            </span>
          </div>
          <div class="pbody">
            <p class="small">
              <i>{passive.note}</i>
            </p>
            {passive.verdict === "conditional" && (
              <p class="small">
                Ce passif inflige des dégâts sous une condition qu'un duel immobile ne reproduit pas
                fidèlement : il n'est pas compté dans le combo plutôt que deviné.
              </p>
            )}
          </div>
        </section>
      )}
    </main>
  );
});
