import { define } from "@/utils.ts";
import { DATA_META } from "@/data/generated/meta.gen.ts";

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
            <h3>D'où viennent les chiffres — 3 sources</h3>
            <ul>
              <li>
                <b>Data Dragon</b> (Riot) — liste des champions, objets, runes, disponibilité en classé et
                {" "}
                <b>images officielles</b>. Fiable pour les stats plates.
              </li>
              <li>
                <b>Community Dragon</b> — assets et ressources graphiques supplémentaires.
              </li>
              <li>
                <b>Meraki (lolstaticdata)</b>{" "}
                — données détaillées des compétences et calculs (ratios AP / AD), que Data Dragon n'expose pas
                proprement.
              </li>
            </ul>
            <p>
              Le pipeline est <b>branché</b> : <code>deno task data</code> récupère tout le roster et génère
              {" "}
              <code>data/generated/</code>. Roster actuel : <b>{DATA_META.champions} champions</b>,{" "}
              <b>{DATA_META.items} objets</b> et <b>{DATA_META.runes} runes</b> (généré le{" "}
              {DATA_META.generatedAt}).
            </p>
            <p>
              <b>Provenance honnête.</b> Liste, runes et icônes : Data Dragon{" "}
              <b>{DATA_META.patch}</b>. Stats & ratios champions : Meraki, patch <b>{DATA_META.statsPatch}</b>
              {" "}
              — Meraki peut être en retard sur le patch courant. Un audit croisé (<code>
                deno task audit
              </code>) mesure la concordance avec Data Dragon et signale les écarts.
            </p>
            <p>
              ⚠ Le pipeline n'extrait que ce que le moteur sait modéliser : stats de base, ratios AP / AD / AD
              bonus et par rang, dégâts en % des PV, boucliers et soins des sorts, cooldowns, stats plates
              d'objets (dont VA, crit, vol de vie). Les passifs et mécaniques conditionnelles ne sont{" "}
              <b>pas inventés</b> — ils se saisissent à la main dans <code>data/mechanics.ts</code>{" "}
              (Fiora, Jax, Vayne pour l'instant) ou <code>lib/engine.ts</code>, champion par champion.
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
