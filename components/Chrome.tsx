/**
 * Chrome du site — composants serveur (0 JS envoyé au client).
 * La barre HUD, la nav et le pied reprennent l'esthétique terminal/HUD.
 */

interface NavItem {
  href: string;
  label: string;
}

const NAV: NavItem[] = [
  { href: "/", label: "ACCUEIL" },
  { href: "/champions", label: "CHAMPIONS" },
  { href: "/matchup", label: "MATCHUP" },
  { href: "/methode", label: "MÉTHODE" },
];

export function TopBar() {
  return (
    <div class="hud">
      <a class="cell logo" href="/" aria-label="Accueil CHAMP LAB">
        <div class="mark">
          <div class="eye"></div>
          <div class="sq"></div>
        </div>
        <div class="brand">
          <b>CHAMP</b>_LAB<br />
          // v0.1
        </div>
      </a>
      <div class="cell title-cell">
        <div class="t">CE QUE FONT VRAIMENT TES RUNES &amp; OBJETS.</div>
        <div class="s">simulateur de dégâts par champion — open source</div>
      </div>
      <div class="cell globes">
        <div class="globe"></div>
        <div class="globe"></div>
        <div class="globe"></div>
      </div>
    </div>
  );
}

export function Nav({ active }: { active: string }) {
  return (
    <nav class="mainnav" aria-label="Navigation principale">
      {NAV.map((item) => {
        const on = item.href === "/" ? active === "/" : active.startsWith(item.href);
        return (
          <a href={item.href} class={`navlink${on ? " on" : ""}`} aria-current={on ? "page" : undefined}>
            {item.label}
          </a>
        );
      })}
      <a
        href="https://champ-lab.simon256px.deno.net/"
        class="navlink ghost"
        target="_blank"
        rel="noopener noreferrer"
      >
        SITE ↗
      </a>
    </nav>
  );
}

export function Footer() {
  return (
    <footer class="foot">
      <span class="warn">⚠ DONNÉES ILLUSTRATIVES</span>
      <span>
        Les valeurs viendraient de Meraki (lolstaticdata), rafraîchies à chaque patch. CHAMP LAB n'est pas
        affilié à Riot Games.
      </span>
      <span>MIT · look 100% CSS</span>
    </footer>
  );
}
