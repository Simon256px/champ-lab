import { define } from "@/utils.ts";
import { CHAMPION_LIST } from "@/data/champions.ts";
import { DATA_META } from "@/data/generated/meta.gen.ts";

export default define.page(function Champions() {
  return (
    <main>
      <div class="divider">
        &gt;<b>ROSTER</b>&lt;
      </div>

      <p class="page-lede">
        Choisis un champion pour ouvrir son labo. Le roster complet est généré depuis{" "}
        <a href="/methode">wiki officiel + fichiers du jeu</a> (patch {DATA_META.patch}) —{" "}
        {DATA_META.champions}{" "}
        champions. Stats, sorts et passifs sont réels ; un passif conditionnel n'est pas joué, et{" "}
        <a href="/methode">la page Méthode</a> dit pourquoi.
      </p>

      <section class="roster">
        {CHAMPION_LIST.map((c) => (
          <a href={`/lab/${c.id}`} class="rtile">
            <div class="pface">
              <span class="init">{c.initial}</span>
            </div>
            <div class="rt-name">{c.name}</div>
            <div class="rt-sub">{c.adaptive}</div>
          </a>
        ))}
      </section>
    </main>
  );
});
