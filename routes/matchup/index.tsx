import { define } from "@/utils.ts";
import { CHAMPIONS } from "@/data/champions.ts";
import Matchup from "@/islands/Matchup.tsx";

/** Matchup par défaut : un classique de top lane. Surchargeable via ?a=…&b=… */
const DEFAULT_A = "darius";
const DEFAULT_B = "garen";

export default define.page(function MatchupPage(ctx) {
  const q = ctx.url.searchParams;
  const a = CHAMPIONS[q.get("a") ?? ""] ? q.get("a")! : DEFAULT_A;
  const b = CHAMPIONS[q.get("b") ?? ""] ? q.get("b")! : DEFAULT_B;

  return (
    <main>
      <div class="divider">
        &gt;<b>MATCHUP</b>&lt;
      </div>
      <Matchup initialA={a} initialB={b} />
    </main>
  );
});
