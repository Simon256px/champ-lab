# CHAMP LAB

> Vois ce que tes runes et tes objets font **vraiment** — champion par champion, contre un vrai adversaire.

Les sites de stats (OP.GG, U.GG, Mobalytics…) agrègent des parties : ils te disent **quoi** builder parce que
la masse le build. Aucun ne montre ce qu'un objet ou une rune change **mécaniquement** sur un champion précis,
face à une cible précise. **CHAMP LAB** est un labo de théorycraft : un simulateur de dégâts et de duels,
calculé avec les chiffres du patch en cours.

<img width="1060" height="935" alt="champ" src="https://github.com/user-attachments/assets/305a20a5-d85f-48eb-99c0-1821097c1084" />

## Ce que fait le site

| Page               | Pour quoi faire                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| `/lab/<champion>`  | Combo d'un champion contre une cible : chaque objet affiche le **gain de dégâts** qu'il t'apporte |
| `/matchup?a=…&b=…` | Duel A contre B **minute par minute** : niveau, or, build, avantage, temps pour tuer, spikes      |
| `/ivern`           | Fiche complète d'Ivern : infobulles du jeu calculées, stats de Daisy, combo et matchup (`?vs=…`)  |
| `/champions`       | Roster des 173 champions                                                                          |
| `/methode`         | D'où viennent les chiffres, ce qui est modélisé, et pourquoi le reste ne l'est pas                |

Trois façons de combattre : **burst** (une rotation de sorts), **trade** (quelques secondes de sorts relancés
et d'autos) et **all-in** (jusqu'au premier mort).

## Couverture (patch 16.20)

- **173 champions**, **202 objets**, **17 keystones** — générés, rien n'est saisi à la main.
- **421 sorts** utilisent la formule exacte des fichiers du jeu, recoupée avec le wiki officiel.
- **Passifs : chaque champion a un statut.** 29 modélisés, 68 conditionnels (non joués, raison affichée), 76
  sans dégâts. Là où le wiki et les fichiers du jeu se recoupent, les valeurs sont identiques (testé).
- **Runes :** 14 keystones sur 17 ont un effet dans le duel ; les 3 autres n'agissent pas dans un 1 contre 1
  immobile, et le site le dit.
- **Audit :** 100 % de concordance des stats de base avec Data Dragon (`deno task audit`).

## Démarrage

Prérequis : [Deno](https://deno.com) **2.x**.

```bash
deno task dev      # serveur de dev + rechargement à chaud
deno task test     # tests (moteur, sources, invariants sur tout le roster)
deno task check    # deno fmt --check && deno lint && deno check
deno task build    # build de production (_fresh/)
deno task start    # lance le build de production
deno task data     # régénère data/generated/ depuis les sources
deno task audit    # recroise les stats générées avec Data Dragon
```

Les données générées (`data/generated/`) sont **versionnées** : le site tourne sans lancer `deno task data`.
On ne relance le pipeline que pour passer à un nouveau patch.

En ligne sur **[lol.simoncourtois.com](https://lol.simoncourtois.com)** : une fusion dans `main` y est
déployée automatiquement en moins de 5 minutes — voir [DEPLOY.md](DEPLOY.md).

## Sources de données

Le pipeline (`scripts/fetch-data.ts`) croise trois sources, toutes à jour au patch :

| Source                                                                    | Ce qu'on y lit                                                                                                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **[Wiki officiel League of Legends](https://wiki.leagueoflegends.com/)**  | Stats de base, sorts **rendus par le wiki** (valeurs par rang et par niveau, ratios), passifs, stats des objets — API publique |
| **[CommunityDragon](https://raw.communitydragon.org/)** (fichiers du jeu) | Formules exactes des sorts, cooldowns, contrôles, runes, effets d'objets, infobulles du client                                 |
| **[Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon)**   | Patch, liste des champions, objets achetables en classé, prix, recettes, images                                                |

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
WIKI_CACHE=.cache/wiki deno task data   # garde les réponses du wiki sur disque (développement)
```

Meraki (lolstaticdata), l'ancienne source, n'est plus utilisé : il est abandonné et bloqué au patch 25.08.

## Le moteur

`lib/engine.ts` ne contient **aucune donnée** : il reçoit un champion et un contexte (niveau, build, rune,
cible ou adversaire) et renvoie des dégâts.

```
stat(N)   = base + croissance × (N−1) × (0,7025 + 0,0175 × (N−1))
dégâts    = base[rang] (+ part par niveau) + Σ ratio × stat     — ou la formule du jeu
effectif  = dégâts × 100 / (100 + résistance après pénétration)   — les vrais dégâts l'ignorent
```

Ce qui est modélisé :

- **Sorts** : ratios fixes ou par rang, dégâts en % des PV (cible ou lanceur), boucliers et soins, cooldowns
  avec ability haste, sorts à viser pondérés par un taux de réussite réglable.
- **Autos** : vitesse d'attaque (plafond 2,5), critiques en espérance, effets à l'impact.
- **Passifs** : à chaque coup, tous les N coups, sur l'auto qui suit un sort ; familier (Daisy) que
  l'adversaire peut tuer d'abord si ça l'arrange.
- **Objets** : effets à l'impact, Lame enchantée, actifs, brûlures, réduction d'armure, blessures graves,
  Zhonya, Ange gardien, Sterak, Arc-bouclier, Danse de la mort, Cotte épineuse, objets à mana (Archange,
  Manamune, Baguette des âges qui grandit avec le temps).
- **Duel** : contrôles (réduits par la ténacité, sauf projections et suppressions), parade et esquive, temps
  d'approche selon la portée et la vitesse (allongé par les ralentissements et enracinements, annulé par un
  dash), vol de vie, omnivampirisme, PV effectifs.
- **Timeline** : niveau et or à la minute, build déroulé composant par composant, spikes (niveau 6, objet
  fini…).

C'est un **plafond théorique** : autos et sorts s'enchaînent sans temps mort, sans kite après l'approche ni
animations. Ça mesure ce que permet un build, pas ce qu'un joueur en fera.

## Structure

```
champ-lab/
├── data/
│   ├── generated/        # GÉNÉRÉ par `deno task data` — ne pas éditer
│   │   ├── champions.gen.ts, items.gen.ts, runes.gen.ts
│   │   ├── mechanics.gen.ts   # passifs résolus (fichiers du jeu, sinon wiki)
│   │   ├── passives.gen.ts    # statut du passif de chaque champion et sa raison
│   │   ├── kits.gen.ts        # fiches de kit complètes (Ivern)
│   │   └── meta.gen.ts        # patch et compteurs
│   ├── overrides.ts      # réglages : étagères d'objets, rune, ordre des sorts, ligne du wiki à retenir
│   ├── mechanics.ts      # passifs saisis par références aux fichiers du jeu
│   ├── item-mechanics.ts # effets d'objets par références aux fichiers du jeu
│   ├── types.ts          # types du domaine
│   └── champions.ts, items.ts, runes.ts, kits.ts, manual.ts
├── scripts/
│   ├── fetch-data.ts     # pipeline → data/generated/
│   ├── wiki.ts           # wiki officiel : API, tables Lua, sorts rendus
│   ├── passives.ts       # passifs du wiki → mécaniques du moteur (ou raison de l'exclusion)
│   ├── cdragon.ts        # fichiers du jeu → formules (Formula)
│   └── audit-stats.ts    # recoupement avec Data Dragon
├── lib/
│   ├── engine.ts         # moteur : combo, duel, temps pour tuer
│   ├── formula.ts        # évalue les formules du jeu
│   ├── timeline.ts       # matchup minute par minute, spikes
│   └── tooltip.ts        # infobulles du jeu avec leurs nombres calculés
├── islands/              # ChampLab, Matchup, KitSheet (seul JS envoyé au client)
├── routes/               # pages Fresh (lab, matchup, ivern, champions, methode)
├── components/Chrome.tsx # barre, navigation, pied de page
├── static/styles.css     # design 100 % CSS
├── deploy/               # service systemd, vhost nginx, script de mise à jour du serveur
└── docs/                 # adding-a-champion.md, audit.md
```

## Contribuer

Le roster est généré ; contribuer, c'est **affiner** :

- un réglage de champion (étagère, rune, ordre des sorts) → `data/overrides.ts` ;
- un passif conditionnel à modéliser → `data/mechanics.ts`, par références aux fichiers du jeu ;
- une nouvelle mécanique (effet de rune, d'objet, de kit) → `lib/engine.ts`, avec son test.

Puis `deno task data`, `deno task check` et `deno task test`. Guide détaillé :
**[docs/adding-a-champion.md](docs/adding-a-champion.md)** · règles : **[CONTRIBUTING.md](CONTRIBUTING.md)**.

## Sobriété

Choix alignés sur l'éco-conception (esprit RGESN / loi REEN) : îlots Fresh (la plupart des pages n'envoient
aucun JavaScript), données statiques cachables par patch, aucun backend qui agrège des parties, esthétique
sans images, calcul côté client.

## Légal

CHAMP LAB n'est ni approuvé par Riot Games ni affilié à Riot Games. League of Legends et Riot Games sont des
marques de Riot Games, Inc. Textes des passifs cités depuis le wiki League of Legends (CC BY-SA).

## Licence

[MIT](LICENSE).
