import { define } from "@/utils.ts";
import { DATA_META } from "@/data/generated/meta.gen.ts";
import { GENERATED_PASSIVES } from "@/data/generated/passives.gen.ts";
import { CHAMPION_LIST } from "@/data/champions.ts";
import { RUNE_LIST } from "@/data/runes.ts";

const RUNES_MODELED = RUNE_LIST.filter((r) => r.kind !== "none").length;
const byVerdict = (v: "modeled" | "conditional" | "utility") =>
  CHAMPION_LIST.filter((c) => GENERATED_PASSIVES[c.id]?.verdict === v);
const MODELED = byVerdict("modeled");
const CONDITIONAL = byVerdict("conditional");
const UTILITY = byVerdict("utility");

export default define.page(function Methode() {
  return (
    <main>
      <div class="divider">
        &gt;<b>MÉTHODE</b>&lt;
      </div>

      <div class="prose">
        <section class="panel doc">
          <div class="phead">
            <span class="tag">DONNÉES</span>
          </div>
          <div class="pbody">
            <h3>D'où viennent les chiffres — 3 sources, toutes à jour au patch</h3>
            <ul>
              <li>
                <b>Wiki officiel League of Legends</b> (<code>wiki.leagueoflegends.com</code>, API publique)
                {" "}
                — stats de base de chaque champion, sorts rendus par le wiki lui-même (valeurs par rang et par
                niveau, ratios), descriptions des passifs et stats des objets. Dernier changement de champion
                noté : patch <b>{DATA_META.statsPatch}</b>.
              </li>
              <li>
                <b>Community Dragon</b>{" "}
                — les fichiers du jeu convertis en JSON, au patch près : formules exactes des sorts,
                cooldowns, contrôles, runes, effets d'objets et passifs saisis par référence.
              </li>
              <li>
                <b>Data Dragon</b>{" "}
                (Riot) — liste des champions, objets disponibles en classé, prix, recettes et{" "}
                <b>images officielles</b>.
              </li>
            </ul>
            <p>
              Le pipeline est <b>branché</b> : <code>deno task data</code> récupère tout le roster et génère
              {" "}
              <code>data/generated/</code>. Roster actuel : <b>{DATA_META.champions} champions</b>,{" "}
              <b>{DATA_META.items} objets</b> et <b>{DATA_META.runes} runes</b> (patch{" "}
              {DATA_META.patch}, généré le {DATA_META.generatedAt}).
            </p>
            <p>
              <b>Double vérification.</b>{" "}
              Les nombres des sorts viennent des fichiers du jeu quand leur formule concorde avec le wiki à
              ×/÷ 1,3 près : <b>{DATA_META.gameFormulas.damage} sorts de dégâts</b>,{" "}
              {DATA_META.gameFormulas.shield} boucliers et {DATA_META.gameFormulas.heal}{" "}
              soins. Les autres gardent la valeur du wiki : {DATA_META.gameFormulas.keptPercent}{" "}
              en % des PV (le sens du pourcentage n'est pas dans la formule du jeu),{" "}
              {DATA_META.gameFormulas.keptNone} sans calcul exploitable dans le jeu et{" "}
              {DATA_META.gameFormulas.keptMismatch}{" "}
              dont le calcul du jeu ne correspond à aucune ligne du wiki.
            </p>
            <p>
              <b>Passifs — les {CHAMPION_LIST.length} champions ont un statut.</b>{" "}
              <b>{MODELED.length} modélisés</b>{" "}
              (dégâts à chaque coup, tous les N coups ou sur l'auto qui suit un sort) :{" "}
              {MODELED.map((c) => c.name).join(", ")}. Valeurs des fichiers du jeu quand le passif est saisi
              dans{" "}
              <code>data/mechanics.ts</code>, sinon lues sur le wiki — les deux concordent là où elles se
              recoupent (testé). <b>{CONDITIONAL.length} conditionnels</b>{" "}
              (PV bas, cible isolée ou marquée, une fois par cible, recharge réduite par les coups…) : non
              joués, pour ne rien inventer. <b>{UTILITY.length} sans dégâts</b>{" "}
              (vitesse, furtivité, ressource, soin…). Runes :{" "}
              <b>{RUNES_MODELED} keystones sur {RUNE_LIST.length}</b> ont un effet dans le duel.
            </p>
            <details>
              <summary>Pourquoi chaque passif conditionnel n'est pas joué</summary>
              <ul class="small">
                {CONDITIONAL.map((c) => (
                  <li key={c.id}>
                    <b>{c.name}</b> — <i>{GENERATED_PASSIVES[c.id].note}</i>
                  </li>
                ))}
              </ul>
            </details>
            <p class="small">
              Textes des passifs cités depuis le wiki League of Legends (CC BY-SA).
            </p>
          </div>
        </section>

        <section class="panel doc">
          <div class="phead">
            <span class="tag">ARCHITECTURE</span>
          </div>
          <div class="pbody">
            <h3>Data-driven, donc contribuable</h3>
            <p>
              Le moteur (<code>lib/engine.ts</code>) ne contient aucune donnée : il reçoit un champion et un
              contexte, il renvoie des dégâts. Les champions, objets et runes vivent dans <code>data/</code>
              {" "}
              sous forme d'objets typés.
            </p>
            <p>
              Les données brutes sont générées (<code>data/generated/</code>) ; on ne les édite pas à la main.
              Affiner un champion = ajuster <code>data/overrides.ts</code>{" "}
              (étagère d'objets, rune, ordre de compétences, correction de ratio) puis relancer{" "}
              <code>deno task data</code>. Les interactions vraiment complexes (passifs d'objets, effets de
              runes) se modélisent au cas par cas dans le moteur. Guide&nbsp;:{" "}
              <code>docs/adding-a-champion.md</code>.
            </p>
          </div>
        </section>

        <section class="panel doc">
          <div class="phead">
            <span class="tag">SOBRIÉTÉ</span>
          </div>
          <div class="pbody">
            <h3>Pourquoi c'est léger</h3>
            <p>Choix alignés sur l'éco-conception (esprit RGESN / loi REEN) :</p>
            <ul>
              <li>
                <b>Îlots Fresh</b>{" "}
                — le serveur rend du HTML, seul le calculateur est hydraté. La plupart des pages n'envoient
                aucun JavaScript.
              </li>
              <li>
                <b>Données statiques par patch</b>{" "}
                — immuables entre deux patchs, donc cachables agressivement. Aucun backend qui agrège des
                millions de parties en direct.
              </li>
              <li>
                <b>Esthétique 100% CSS</b>{" "}
                — cadres, grille, dithering et scanlines sans une seule image lourde.
              </li>
              <li>
                <b>Calcul côté client</b>{" "}
                — quelques formules, pas de serveur sollicité à chaque réglage de slider.
              </li>
            </ul>
          </div>
        </section>

        <section class="panel doc">
          <div class="phead">
            <span class="tag">LÉGAL</span>
          </div>
          <div class="pbody">
            <p class="small">
              CHAMP LAB n'est ni approuvé par Riot Games ni affilié à Riot Games. League of Legends et Riot
              Games sont des marques ou marques déposées de Riot Games, Inc. Tout usage de l'API Riot est
              soumis aux Developer Policies de Riot.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
});
