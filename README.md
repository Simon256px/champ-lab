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
│   │   ├── mechanics.gen.ts #   passifs résolus depuis les fichiers du jeu
│   │   └── meta.gen.ts   #     patch + compteurs
│   ├── overrides.ts      #   >>> réglages à la main : étagères, runes, passifs
│   ├── mechanics.ts      #   >>> passifs de kit : références aux fichiers du jeu (Fiora, Jax…)
│   ├── item-mechanics.ts #   >>> effets d'objets : Kraken, Lame enchantée, Fendoir, Liandry…
│   ├── champions.ts      #   ré-exporte le généré
│   ├── items.ts          #   ré-exporte le généré + itemStatLine
│   └── runes.ts          #   runes keystone (kinds modélisés dans le moteur)
├── scripts/
│   ├── fetch-data.ts     # PIPELINE Meraki + Data Dragon + CommunityDragon → data/generated/
│   └── cdragon.ts        #   fichiers du jeu : sorts, cooldowns, formules → Formula
├── lib/
│   ├── engine.ts         # MOTEUR pur & typé (aucune donnée en dur)
│   ├── formula.ts        #   évalue les formules du jeu (Formula)
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
│   ├── ivern/index.tsx      # page dédiée à Ivern : fiche de kit complète + matchup (?vs=…)
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

### Page Ivern (`/ivern`)

Fiche complète, générée depuis les fichiers du jeu (`data/generated/kits.gen.ts`, champions listés dans
`KIT_SHEETS` de `scripts/fetch-data.ts`) : les infobulles du client sont rendues avec chaque nombre calculé au
niveau, aux rangs et au build choisis (`lib/tooltip.ts`) — aucun chiffre saisi à la main. S'y ajoutent les
stats de Daisy (familier : PV, AD, VA, résistances, onde de choc), le combo face à une cible (burst / trade /
all-in, avec ou sans Daisy) et la timeline de matchup. Les valeurs sont recoupées avec le wiki officiel et
figées dans `lib/ivern_test.ts` : si Riot modifie Ivern, le test échoue pour forcer une re-vérification.

### Matchup

`computeDuel()` prend deux champions (niveau + build chacun) : la cible n'est plus un profil manuel mais le
vrai adversaire (PV, armure et RM du niveau et des objets). Chaque camp place son combo sur l'autre ;
`edge = %PV retirés par A − %PV retirés par B`.

`lib/timeline.ts` déduit niveau, or et inventaire de la minute (courbe d'XP de solo lane, or passif + farm,
ordre de build déroulé composant par composant) et calcule le duel à chaque minute. `findSpikes()` repère les
sauts nets de la courbe (niveau 6, objet terminé…) et leur cause.

Trois façons de faire l'échange :

- **burst** : une rotation Q/W/E/R + rune, sans auto-attaque ;
- **trade** (`window: 3`) : sur T secondes, chaque sort relancé selon son cooldown (ability haste comprise),
  auto-attaques à la vitesse d'attaque (`base + ratio × VA bonus`, plafond 2,5), crits en espérance ;
- **all-in** (`allIn: true`) : le trade prolongé jusqu'au premier mort. `timeToKill()` donne le temps pour
  tuer de chaque camp, et l'edge se lit à l'instant du premier kill (PV retirés plafonnés à 100 %).

Kits et survie : dégâts en % des PV (cible ou lanceur), ratios par rang, boucliers et soins des sorts, vol de
vie et omnivampirisme, qui s'ajoutent aux PV effectifs du camp qui les porte (un soin ne rend que ce qui a été
perdu). Les passifs absents de Meraki se décrivent dans `data/mechanics.ts` (voir
`docs/adding-a-champion.md`).

Effets d'objets (`data/item-mechanics.ts`, valeurs du fichier des objets du jeu) : à l'impact (Kraken, Lame du
roi déchu, Nashor, Fin de l'esprit), Lame enchantée (Brillance, Trinité, Lich Bane, Faucheuse d'essence),
déclenchés par un sort (Luden), actifs (Brise-pas), réduction d'armure (Fendoir noir), brûlure (Liandry).
Variantes mêlée / distance du jeu respectées ; dégâts critiques (IE) et ténacité lus aussi.

Interactions : les contrôles lus dans les fichiers du jeu font perdre ce temps d'action à la cible ; la
ténacité (objets) les réduit, sauf projections et suppressions. La parade de Fiora bloque le plus gros coup et
le plus long contrôle adverses ; l'esquive de Jax annule les autos pendant sa durée.

Portée et déplacement : en trade / all-in, le camp qui a moins de portée perd le temps de combler l'écart
(différence de portée / vitesse de déplacement, plafonné à 2 s), sauf s'il a appris un sort de mobilité (dash,
saut, téléportation ou attraction, d'après l'infobulle). Précision : les sorts à viser (type de ciblage du
jeu) voient leurs dégâts et contrôles pondérés par un taux de réussite réglable (100 % par défaut). Les
enracinements et ralentissements du camp à portée allongent l'approche (un enracinement bloque aussi les
dashs).

Runes : les 17 keystones lisent leurs valeurs dans le fichier des runes du jeu (`perks.cdtb.bin.json`) ; 14
ont un effet modélisé (Électrocution, Conquérant et son soin, Aery, Comète, Attaque soutenue, Tempo mortel,
Grêle de lames, Poigne, Répercussion, Jeu de jambes, Moisson noire, Frappe initiale, Gardien, Toucher de feu
mortel), les 3 autres n'agissent pas dans un duel immobile (la raison est affichée).

Objets défensifs et utilitaires (valeurs du jeu) : Zhonya, Ange gardien, Sterak, Arc-bouclier, Gueule de
Malmortius, Danse de la mort, Cotte épineuse, blessures graves (Chempunk, Morellonomicon, Rappel mortel…),
Visage spirituel, Présage de Randuin, Rédemption, mana et objets à mana (Archange, Manamune, Baguette des
âges, qui grandit avec le temps porté dans la timeline). Familiers : l'adversaire peut tuer le familier
d'abord si ça l'arrange.

Passifs : saisis champion par champion dans `data/mechanics.ts` par références aux fichiers du jeu (la liste à
jour est sur la page Méthode). Indicateur théorique : autos et sorts s'enchaînent sans temps mort, sans kite
après l'approche ni animations : c'est un plafond de dégâts, pas un replay de partie.

## Ajouter / affiner un champion

Le roster de base est généré. Le geste de contribution est désormais l'**affinage** : un champion dont une
mécanique de kit n'est pas couverte par le modèle générique se corrige dans `data/overrides.ts` (étagère
d'objets, rune keystone, ordre de compétences, correction de ratio) puis `deno task data`. Guide détaillé :
**[docs/adding-a-champion.md](docs/adding-a-champion.md)**.

Les interactions vraiment complexes (passifs d'objets, effets de runes, particularités de kit) se modélisent
au cas par cas dans `lib/engine.ts` — c'est assumé : chaque cas devient un bout de code relisible en PR, et la
maintenance du patch se répartit.

## Sources de données

Le pipeline (`scripts/fetch-data.ts`, lancé par `deno task data`) combine trois sources :

- **[Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon)** (Riot) — résolution du patch et
  liste des champions ; portraits carrés via **Community Dragon**.
- **[Meraki / lolstaticdata](https://github.com/meraki-analytics/lolstaticdata)** — stats de base, ratios de
  sorts (AP / AD / AD bonus) et stats plates d'objets, parsés du wiki. Peut avoir plusieurs patchs de retard.
- **[CommunityDragon](https://raw.communitydragon.org/)** — les fichiers du jeu convertis en JSON, au patch
  près (`scripts/cdragon.ts`). Font foi pour les **cooldowns**, les **passifs** de `data/mechanics.ts`, et les
  **nombres des sorts** (dégâts, boucliers, soins) quand la formule du jeu concorde avec Meraki à ×/÷ 1,3
  près. Meraki garde la structure (type de dégâts, effets présents) ; au-delà de l'écart toléré, on soupçonne
  un autre calcul (deux passages, charge max, par seconde…) et on garde Meraki en le signalant. Les formules
  sont converties en `Formula` et évaluées par le moteur (`lib/formula.ts`).

Les objets sont filtrés sur la **Faille de l'invocateur** (classé) via Data Dragon (`maps["11"]`) : objets
complets et bottes (y compris améliorées), pas de composants ni d'objets ARAM/Arena. Les champions absents de
Meraki (Locke, Yunara, Zaahen) sont générés depuis les fichiers du jeu ; `data/manual.ts` reste en secours.

Les **infobulles** du client (CommunityDragon) donnent le sens que les formules n'ont pas : type de dégâts de
chaque calcul, contrôles posés seulement sous condition (« If the target collides with terrain… », écartés),
sorts de mobilité (dash, saut, téléportation). Le type de ciblage des fichiers du jeu dit quels sorts se
visent.

**Honnêteté :** le pipeline n'extrait que ce que le moteur sait déjà modéliser. Une formule de jeu qui utilise
une brique non reconnue (cumul de buff, condition, stat au sens non vérifié) n'est **pas devinée** : elle est
écartée et signalée. Les passifs se décrivent dans `data/mechanics.ts` par des références aux fichiers du jeu,
sans chiffre saisi à la main. C'est un travail continu, idéal pour contribuer.

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
