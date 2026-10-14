# CHAMP LAB

> Vois ce que tes runes et tes objets font vraiment — champion par champion, contre un vrai adversaire.

Les sites de stats (OP.GG, U.GG, Mobalytics…) agrègent des parties : ils te disent quoi builder parce que la
masse le build. Aucun ne montre ce qu'un objet ou une rune change mécaniquement sur un champion précis, face à
une cible précise. CHAMP LAB est un labo de théorycraft pour League of Legends : un simulateur de dégâts et de
duels, calculé avec les chiffres du patch en cours.

En ligne sur **[lol.simoncourtois.com](https://lol.simoncourtois.com)**.

## Sommaire

- [Ce que fait le site](#ce-que-fait-le-site)
- [Couverture](#couverture-patch-1620)
- [Démarrage](#démarrage)
- [Sources de données](#sources-de-données)
- [Le moteur](#le-moteur)
- [Structure](#structure)
- [Contribuer](#contribuer)
- [Soutenir le projet](#soutenir-le-projet)
- [Licence](#licence)

## Ce que fait le site

| Page               | Pour quoi faire                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| `/lab/<champion>`  | Combo d'un champion contre une cible : chaque objet affiche le gain de dégâts qu'il t'apporte    |
| `/matchup?a=…&b=…` | Duel A contre B minute par minute : niveau, or, build, avantage, temps pour tuer, spikes         |
| `/ivern`           | Fiche complète d'Ivern : infobulles du jeu calculées, stats de Daisy, combo et matchup (`?vs=…`) |
| `/champions`       | Roster complet                                                                                   |
| `/methode`         | D'où viennent les chiffres, ce qui est modélisé, et pourquoi le reste ne l'est pas               |

Trois façons de combattre : **burst** (une rotation de sorts), **trade** (quelques secondes de sorts relancés
et d'autos) et **all-in** (jusqu'au premier mort).

## Couverture (patch 16.20)

- **173 champions**, **202 objets**, **17 keystones**, générés : rien n'est saisi à la main.
- **421 sorts** utilisent la formule exacte des fichiers du jeu, recoupée avec le wiki officiel.
- **Chaque passif a un statut** : 29 modélisés, 68 conditionnels (non joués, raison affichée), 76 sans dégâts.
- **Runes** : 14 keystones sur 17 ont un effet dans le duel ; les 3 autres n'agissent pas dans un 1 contre 1
  immobile, et le site le dit.
- **Audit** : 100 % de concordance des stats de base avec Data Dragon (`deno task audit`).

## Démarrage

Prérequis : [Deno](https://deno.com) 2.x.

```bash
git clone https://github.com/Simon256px/champ-lab.git
cd champ-lab
deno task dev
```

| Commande          | Rôle                                                   |
| ----------------- | ------------------------------------------------------ |
| `deno task dev`   | serveur de développement avec rechargement à chaud     |
| `deno task test`  | tests (moteur, sources, invariants sur tout le roster) |
| `deno task check` | `deno fmt --check`, `deno lint` et `deno check`        |
| `deno task build` | build de production dans `_fresh/`                     |
| `deno task start` | lance le build de production                           |
| `deno task data`  | régénère `data/generated/` depuis les sources          |
| `deno task audit` | recroise les stats générées avec Data Dragon           |

Les données générées (`data/generated/`) sont versionnées : le site tourne sans lancer `deno task data`. On ne
relance le pipeline que pour passer à un nouveau patch.

Une fusion dans `main` est déployée automatiquement en moins de 5 minutes : voir [DEPLOY.md](DEPLOY.md).

## Sources de données

Le pipeline (`scripts/fetch-data.ts`) croise trois sources, toutes à jour au patch :

| Source                                                                | Ce qu'on y lit                                                                                    |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [Wiki officiel League of Legends](https://wiki.leagueoflegends.com/)  | stats de base, sorts rendus par le wiki (valeurs par rang et par niveau, ratios), passifs, objets |
| [CommunityDragon](https://raw.communitydragon.org/) (fichiers du jeu) | formules exactes des sorts, cooldowns, contrôles, runes, effets d'objets, infobulles du client    |
| [Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon)   | patch, liste des champions, objets achetables en classé, prix, recettes                           |

Règles du pipeline :

- **Double vérification.** Un sort prend la formule du jeu quand elle concorde avec une ligne du wiki à ×/÷
  1,3 près ; sinon il garde la valeur du wiki, et l'écart est signalé.
- **Rien n'est inventé.** Une formule du jeu illisible est écartée ; un passif dont le wiki pose une condition
  qu'un duel ne reproduit pas (PV bas, cible marquée, une fois par cible…) n'est pas joué, et sa raison est
  affichée sous le labo et sur `/methode`.
- **Pas de chiffres à la main.** Les réglages (`data/overrides.ts`) et les passifs saisis
  (`data/mechanics.ts`) désignent des lignes du wiki ou des calculs du jeu, jamais des valeurs.

```bash
deno task data                          # patch courant
deno task data -- 16.20.1               # patch figé
WIKI_CACHE=.cache/wiki deno task data   # garde les réponses du wiki sur disque
```

## Le moteur

`lib/engine.ts` ne contient aucune donnée : il reçoit un champion et un contexte (niveau, build, rune, cible
ou adversaire) et renvoie des dégâts.

```
stat(N)   = base + croissance × (N−1) × (0,7025 + 0,0175 × (N−1))
dégâts    = base[rang] (+ part par niveau) + Σ ratio × stat     — ou la formule du jeu
effectif  = dégâts × 100 / (100 + résistance après pénétration)   — les vrais dégâts l'ignorent
```

Ce qui est modélisé :

- **Sorts** : ratios fixes ou par rang, dégâts en % des PV, boucliers et soins, cooldowns avec ability haste,
  sorts à viser pondérés par un taux de réussite réglable.
- **Autos** : vitesse d'attaque (plafond 2,5), critiques en espérance, effets à l'impact.
- **Passifs** : à chaque coup, tous les N coups, sur l'auto qui suit un sort ; familier (Daisy) que
  l'adversaire peut tuer d'abord si ça l'arrange.
- **Objets** : effets à l'impact, actifs, brûlures, réduction d'armure, blessures graves, objets défensifs
  (Zhonya, Ange gardien, Sterak…), objets à mana.
- **Duel** : contrôles réduits par la ténacité, parade et esquive, temps d'approche selon la portée et la
  vitesse, vol de vie, omnivampirisme, PV effectifs.
- **Timeline** : niveau et or à la minute, build déroulé composant par composant, spikes.

C'est un **plafond théorique** : autos et sorts s'enchaînent sans temps mort, sans kite après l'approche ni
animations. Ça mesure ce que permet un build, pas ce qu'un joueur en fera.

## Structure

```
champ-lab/
├── data/
│   ├── generated/        # GÉNÉRÉ par `deno task data` — ne pas éditer
│   ├── overrides.ts      # réglages : étagères d'objets, rune, ordre des sorts, ligne du wiki
│   ├── mechanics.ts      # passifs saisis par références aux fichiers du jeu
│   ├── item-mechanics.ts # effets d'objets par références aux fichiers du jeu
│   └── types.ts          # types du domaine
├── scripts/              # pipeline de données et audit
├── lib/                  # moteur, formules, timeline, infobulles (+ tests)
├── islands/              # ChampLab, Matchup, KitSheet : seul JS envoyé au client
├── routes/               # pages Fresh
├── components/           # barre, navigation, pied de page
├── static/styles.css     # design 100 % CSS
├── deploy/               # service systemd, vhost nginx, script de mise à jour
└── docs/                 # adding-a-champion.md, audit.md
```

## Sobriété

Îlots Fresh (la plupart des pages n'envoient aucun JavaScript), données statiques cachables par patch, aucun
backend qui agrège des parties, interface sans images, calcul côté client.

## Contribuer

Le roster est généré ; contribuer, c'est l'affiner : un réglage de champion, un passif conditionnel à
modéliser, une nouvelle mécanique. Tout est expliqué dans [CONTRIBUTING.md](CONTRIBUTING.md) et
[docs/adding-a-champion.md](docs/adding-a-champion.md).

## Soutenir le projet

CHAMP LAB est gratuit et sans publicité. Si le labo t'aide à mieux builder, tu peux me soutenir sur
[ko-fi.com/simon256px](https://ko-fi.com/simon256px).

## Mentions légales

CHAMP LAB n'est ni approuvé par Riot Games ni affilié à Riot Games. League of Legends et Riot Games sont des
marques de Riot Games, Inc. Textes des passifs cités depuis le wiki League of Legends (CC BY-SA).

## Licence

Code distribué sous [licence MIT](LICENSE).
