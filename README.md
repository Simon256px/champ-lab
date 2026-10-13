# CHAMP LAB

> Vois ce que tes runes et tes objets font **vraiment** — champion par champion.

Les sites de stats (OP.GG, U.GG, Mobalytics…) sont des agrégateurs : ils te disent **quoi** builder parce que
la masse le build. Aucun ne te montre ce qu'un objet ou une rune change **mécaniquement** sur un champion
précis, contre une cible précise.

**CHAMP LAB** est un labo de théorycraft par champion : un simulateur de dégâts pédagogique.

- **Mode impact** — chaque objet affiche en direct le Δ (gain de dégâts) qu'il ajoute à _ton_ combo, sur _ta_
  cible.
- **Breakpoints** — les seuils qui décident d'un kill : « ton combo tue en dessous de X PV », « l'ultime
  exécute à ≤ Y ».
- **Sobre par conception** — calcul côté client sur données statiques versionnées par patch, îlots Fresh (≈ 0
  JS ailleurs), esthétique 100% CSS.

<img width="1060" height="935" alt="champ" src="https://github.com/user-attachments/assets/305a20a5-d85f-48eb-99c0-1821097c1084" />

## ⚠ Statut

Version **0.2**. Le **pipeline de données est branché** : tout le roster (≈ 170 champions + objets) est
**généré** depuis **Meraki (lolstaticdata) + Data Dragon**, versionné par patch — voir
[Sources de données](#sources-de-données). Portraits réels via Community Dragon.

Le pipeline n'extrait que ce que le moteur sait modéliser (stats de base, ratios AP / AD / AD bonus, stats
plates d'objets). Les mécaniques vraiment complexes (dégâts en % des PV, passifs conditionnels, cumuls) ne
sont **pas inventées** : elles restent à modéliser à la main dans `lib/engine.ts` et affinées via
`data/overrides.ts`, champion par champion — c'est le travail continu de la communauté.

---

## Démarrage

Prérequis : [Deno](https://deno.com) **2.x**.

```bash
deno task dev      # serveur de dev + rechargement à chaud
deno task check    # deno fmt --check && deno lint && deno check
deno task test     # tests du moteur (+ invariants sur tout le roster)
deno task build    # build de production (génère _fresh/)
deno task start    # lance le build de production
deno task data     # (re)génère data/generated/ depuis Meraki + Data Dragon
```

Le roster généré (`data/generated/`) est **versionné dans le repo** : l'app tourne sans lancer
`deno task data`. On ne relance le pipeline que pour rafraîchir un patch.

Puis ouvre l'URL affichée dans le terminal.

> **Note versions.** Fresh évolue vite (Fresh 2.x). Les fichiers d'amorçage — `deno.json`, `dev.ts`,
> `main.ts`, `utils.ts` — ciblent Fresh 2.x en mode _Builder_. Si l'API a bougé chez toi, régénère une base
> propre avec l'initialiseur officiel puis recopie les dossiers `routes/`, `islands/`, `components/`, `lib/`,
> `data/`, `static/` :
>
> ```bash
> deno run -Ar jsr:@fresh/init .
> ```

---

## Structure

```
champ-lab/
├── data/                 # DONNÉES (typées, contribuables)
│   ├── types.ts          #   interfaces du domaine
│   ├── generated/        #   >>> GÉNÉRÉ par `deno task data` (ne pas éditer)
│   │   ├── champions.gen.ts
│   │   ├── items.gen.ts
│   │   └── meta.gen.ts   #     patch + compteurs
│   ├── overrides.ts      #   >>> réglages à la main : étagères, runes, passifs
│   ├── champions.ts      #   ré-exporte le généré
│   ├── items.ts          #   ré-exporte le généré + itemStatLine
│   └── runes.ts          #   runes keystone (kinds modélisés dans le moteur)
├── scripts/
│   └── fetch-data.ts     # PIPELINE Meraki + Data Dragon → data/generated/
├── lib/
│   ├── engine.ts         # MOTEUR pur & typé (aucune donnée en dur)
│   ├── engine_test.ts    #   tests d'invariants
│   ├── timeline.ts       # MATCHUP dans le temps : niveau/or/build à la minute T, spikes
│   └── timeline_test.ts
├── islands/
│   ├── ChampLab.tsx      # îlot du labo
│   └── Matchup.tsx       # îlot du matchup (courbe d'avantage + spikes)
├── components/
│   └── Chrome.tsx        # barre HUD, nav, pied (composants serveur)
├── routes/               # routing par fichiers (Fresh)
│   ├── _app.tsx          #   coquille HTML
│   ├── _layout.tsx       #   chrome partagé
│   ├── index.tsx         #   accueil
│   ├── champions/index.tsx  # roster
│   ├── lab/[champion].tsx   # labo d'un champion
│   ├── lab/index.tsx        # redirige vers le premier champion
│   ├── matchup/index.tsx    # A vs B minute par minute (?a=…&b=…)
│   └── methode.tsx          # sources, éco, légal
├── static/styles.css     # design system, 100% CSS
├── deno.json             # dépendances + tâches
├── dev.ts / main.ts      # entrées dev / prod
└── utils.ts              # helper `define`
```

## Comment marche le moteur

`lib/engine.ts` ne contient **aucune donnée** : il reçoit un champion + un contexte (niveau, build, rune,
cible) et renvoie des dégâts. Modèle simplifié mais cohérent :

```
stat(N)   = base + croissance * (N-1) * (0.7025 + 0.0175*(N-1))
dégâts    = base[rang] + Σ(ratio * stat correspondante)
effectif  = dégâts * 100 / (100 + résistance après pénétration)   // "vrai" ignore les résistances
```

Les pénétrations en % s'empilent multiplicativement. La fonction signature est `itemImpact()` : la différence
de dégâts totaux si on ajoutait un objet au build — c'est le **mode impact**.

### Matchup

`computeDuel()` prend deux champions (niveau + build chacun) : la cible n'est plus un profil manuel mais le
vrai adversaire (PV, armure et RM du niveau et des objets). Chaque camp place son combo sur l'autre ;
`edge = %PV retirés par A − %PV retirés par B`.

`lib/timeline.ts` déduit niveau, or et inventaire de la minute (courbe d'XP de solo lane, or passif + farm,
ordre de build déroulé composant par composant) et calcule le duel à chaque minute. `findSpikes()` repère les
sauts nets de la courbe (niveau 6, objet terminé…) et leur cause. Indicateur théorique : ni auto-attaques, ni
cooldowns, ni soins, boucliers, portée ou contrôles.

## Ajouter / affiner un champion

Le roster de base est généré. Le geste de contribution est désormais l'**affinage** : un champion dont une
mécanique de kit n'est pas couverte par le modèle générique se corrige dans `data/overrides.ts` (étagère
d'objets, rune keystone, ordre de compétences, correction de ratio) puis `deno task data`. Guide détaillé :
**[docs/adding-a-champion.md](docs/adding-a-champion.md)**.

Les interactions vraiment complexes (passifs d'objets, effets de runes, particularités de kit) se modélisent
au cas par cas dans `lib/engine.ts` — c'est assumé : chaque cas devient un bout de code relisible en PR, et la
maintenance du patch se répartit.

## Sources de données

Le pipeline (`scripts/fetch-data.ts`, lancé par `deno task data`) combine deux sources :

- **[Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon)** (Riot) — résolution du patch et
  liste des champions ; portraits carrés via **Community Dragon**.
- **[Meraki / lolstaticdata](https://github.com/meraki-analytics/lolstaticdata)** — stats de base, ratios de
  sorts (AP / AD / AD bonus) et stats plates d'objets, parsés du wiki et versionnés par patch.

Les objets sont filtrés sur la **Faille de l'invocateur** (classé) via Data Dragon (`maps["11"]`) : objets
complets et bottes (y compris améliorées), pas de composants ni d'objets ARAM/Arena. Les champions non encore
présents dans Meraki (ex. Locke) sont saisis à la main dans `data/manual.ts` et fusionnés au roster.

**Honnêteté :** le pipeline n'extrait que ce que le moteur sait déjà modéliser. Ce que Meraki encode en texte
(passifs conditionnels, dégâts en % PV, cumuls) n'est **pas deviné** : ces cas restent à coder à la main dans
`lib/engine.ts` et à réinjecter via `data/overrides.ts`. C'est un travail continu, idéal pour contribuer.

Régénérer un patch précis :

```bash
deno task data -- 15.24.1
```

## Sobriété

Choix alignés sur l'éco-conception (esprit RGESN / loi REEN) : îlots Fresh (la plupart des pages n'envoient
aucun JS), données statiques cachables par patch, aucun backend qui agrège des parties en direct, esthétique
sans images, calcul côté client.

## Contribuer

Voir **[CONTRIBUTING.md](CONTRIBUTING.md)**. En bref : `deno task check` doit passer, la donnée va dans
`data/`, chaque champion/objet/rune est une config relisible.

## Légal

CHAMP LAB n'est ni approuvé par Riot Games ni affilié à Riot Games. League of Legends et Riot Games sont des
marques de Riot Games, Inc. Tout usage de l'API Riot est soumis aux Developer Policies de Riot.

## Licence

[MIT](LICENSE).
