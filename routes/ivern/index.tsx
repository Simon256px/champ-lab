import { define } from "@/utils.ts";
import KitSheet from "@/islands/KitSheet.tsx";
import Matchup from "@/islands/Matchup.tsx";

/** Adversaire par défaut : un jungler classique face à Ivern. Surchargeable via ?vs=… */
const DEFAULT_TARGET = "leesin";

export default define.page(function IvernPage(ctx) {
  const vs = ctx.url.searchParams.get("vs") ?? DEFAULT_TARGET;
  return (
    <main>
      <div class="divider">
        &gt;<b>IVERN</b>&lt;
      </div>
      <KitSheet championId="ivern" initialTarget={vs} />
      <div class="divider">
        &gt;<b>IVERN DANS LE TEMPS</b>&lt;
      </div>
      <Matchup initialA="ivern" initialB={vs} />
    </main>
  );
});
