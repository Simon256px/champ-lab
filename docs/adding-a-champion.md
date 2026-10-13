# Ajouter / affiner un champion

Le roster de base (≈ 170 champions) est **généré** depuis le wiki officiel, les fichiers du jeu et Data Dragon
par `deno task data` et vit dans `data/generated/` — **on ne l'édite pas à la main**. La contribution consiste
donc surtout à **affiner** un champion dont une mécanique n'est pas bien couverte par le modèle générique.

Trois niveaux, du plus simple au plus profond.

## 0. Régénérer les données (le point de départ)

```bash
deno task data          # patch courant (Data Dragon "latest")
deno task data -- 15.24.1   # patch figé
```

Cela réécrit `data/generated/champions.gen.ts`, `items.gen.ts` et `meta.gen.ts`, puis les formate. Le pipeline
extrait ce que le moteur sait modéliser : stats de base, ratios `ap` / `totalAd` / `bonusAd`, stats plates
d'objets. Le reste (passifs conditionnels, dégâts en % PV…) n'est pas deviné.

## 1. Affiner via `data/overrides.ts` (le cas courant)

C'est ici qu'on ajuste un champion **sans toucher au généré**. Ajoute une entrée dans `CHAMPION_OVERRIDES` :

```ts
export const CHAMPION_OVERRIDES: Record<string, ChampionOverride> = {
  // …existant…

  monchamp: {
    // adaptive: "AP",          // force AP/AD si le pipeline se trompe
    // hasBleed: true,          // active un DoT/exécution type Darius
    keystone: "electrocute", // rune keystone par défaut (id de data/runes.ts)
    // ordre de montée des sorts (18 entrées) : déduit le rang au niveau N
    skillOrder: ["Q", "W", "E", "Q", "Q", "R", "Q", "E", "Q", "E", "R", "E", "E", "W", "W", "R", "W", "W"],
    // étagère d'objets recommandés (ids de data/items.ts, tels que slugifiés)
    shelf: ["sorcerersshoes", "ludensecho", "shadowflame", "rabadonsdeathcap", "voidstaff"],
    abilities: {
      // corrige un ratio ou un type mal déduit par le pipeline :
      Q: { ratios: { ap: 0.75 } },
      R: { type: "true" },
    },
  },
};
```

Tout est optionnel : un champ absent garde la valeur générée. Puis relance `deno task data` (les overrides
sont appliqués à la génération).

> **Trouver le bon `id`.** Le slug est le nom Data Dragon en minuscules sans caractères spéciaux : `Lee Sin` →
> `leesin`, `Kai'Sa` → `kaisa`. Idem pour les ids d'objets de l'étagère.

## 2. Ajouter un objet à l'étagère

Si l'objet voulu n'existe pas encore dans `data/generated/items.gen.ts`, c'est qu'il a été filtré (le pipeline
ne garde que les légendaires/bottes portant une stat modélisée). Deux leviers dans `data/overrides.ts` :

- `ITEM_WHITELIST` — force l'inclusion d'un objet même sans stat plate exploitable.
- `ITEM_OVERRIDES` — réinjecte un passif que le moteur sait modéliser mais que le wiki ne donne pas en stat
  plate (ex. Rabadon `apAmp: 0.30`, Fendoir noir `armorPenPercent: 0.30`) et fige un libellé court.

## 2 bis. Champion pas encore sur le wiki

Un champion qui sortirait dans le jeu avant d'être sur le wiki serait **généré depuis les fichiers du jeu** :
stats de base (Data Dragon), sorts et cooldowns (CommunityDragon), type de dégâts et calcul principal
(infobulle : premier calcul cité dans une balise de dégâts), profil AD/AP d'après ce sur quoi scalent les
sorts. `data/manual.ts` ne sert plus que de secours si les fichiers du jeu manquent.

## 2 ter. Passifs : wiki d'abord, `data/mechanics.ts` pour aller plus loin

Le pipeline lit le passif de **chaque** champion sur le wiki (`scripts/passives.ts`) : dégâts à chaque coup,
tous les N coups (« At 2 stacks, … next basic attack »), sur l'auto qui suit un sort, dernière balle d'un
chargeur. Un passif sous condition (PV bas, cible isolée ou marquée, une fois par cible, recharge réduite par
les coups, palier de niveau…) n'est **pas joué** : son statut et la phrase du wiki qui l'explique sont dans
`data/generated/passives.gen.ts`, affichés sur /methode et sous le labo.

Pour modéliser un passif plus finement, on le décrit dans `data/mechanics.ts` par des références aux fichiers
du jeu — il l'emporte alors sur la lecture du wiki (un test vérifie que les deux concordent quand le wiki le
lit aussi). Le moteur l'applique en mode trade / all-in :

| `kind`                | Pour                                                  | Exemple                    |
| --------------------- | ----------------------------------------------------- | -------------------------- |
| `onHit`               | dégâts en plus tous les N coups d'auto                | passif à l'impact          |
| `afterAbility`        | auto renforcée après chaque sort (`hits` : combien)   | Riven, Lux, Taric (2)      |
| `abilityOnHit`        | un sort qui frappe sur les autos au lieu d'être lancé | Vayne W (tous les 3 coups) |
| `periodic`            | dégâts (et soin) toutes les X secondes                | points vitaux de Fiora     |
| `stackingAttackSpeed` | VA bonus qui s'empile à chaque auto                   | Jax                        |
| `missingHpHeal`       | soin en % des PV manquants à chaque lancer            | Darius Q                   |
| `abilityDamage`       | dégâts d'un sort que le wiki laisse utilitaire        | Fiora R                    |
| `parry`               | bloque le plus gros coup et le plus long contrôle     | Fiora W                    |
| `dodgeAutos`          | esquive les autos adverses pendant X secondes         | Jax E                      |
| `pet`                 | familier : attaques, onde de choc tous les N coups    | Daisy (Ivern R)            |

Un familier lit ses stats dans le sort qui l'invoque (`{ slot: "R", calc: "TotalDaisyAD" }`) et, si besoin,
dans son propre fichier : `{ slot: "R", character: "ivernminion", field: "attackSpeedModifiable" }`.

**Page dédiée.** Ajouter un champion à `KIT_SHEETS` (`scripts/fetch-data.ts`) génère sa fiche de kit complète
(infobulles, valeurs, calculs) ; `islands/KitSheet.tsx` la rend telle quelle. Voir `routes/ivern/index.tsx`.

**Contrôles.** Leur durée est lue automatiquement dans les fichiers du jeu (`StunDuration`, `KnockupDuration`,
`CharmDuration`…) : seuls ceux qui empêchent d'agir comptent, pas les enracinements ni les variantes (sbires,
contre un mur, charge max). Le jeu donne la durée, pas la condition : le pipeline la lit dans **l'infobulle**
du sort. Un contrôle cité seulement dans une phrase en « If… » (« If the target collides with terrain… ») est
écarté, famille par famille (Vayne E : la projection compte, l'étourdissement au mur non). La liste des
contrôles écartés s'affiche à chaque `deno task data`. Si la lecture se trompe, corrige-la dans
`data/overrides.ts` : `conditionalCc: true` pour ignorer, `false` pour compter.

**On ne saisit pas de chiffres.** Chaque valeur est une référence aux fichiers du jeu (CommunityDragon),
résolue au patch courant par `deno task data` dans `data/generated/mechanics.gen.ts` :

```ts
damage: { slot: "P", calc: "PassiveDamageTotal" },             // un calcul du passif
maxStacks: { slot: "P", value: "MaxStacks" },                  // une valeur brute
pct: { slot: "Q", value: "MissingHealthHeal", times: 0.01 },   // une valeur en %, ramenée en fraction
```

Pour trouver les noms : ouvre `https://raw.communitydragon.org/latest/game/data/characters/<id>/<id>.bin.json`
et cherche le sort (`mSpell` → `mSpellCalculations` pour les calculs, `DataValues` pour les valeurs). Si une
référence ne se résout pas (sort renommé, formule non convertible), le pipeline le signale et écarte la
mécanique. Ajoute un test qui vérifie qu'elle s'applique (voir les tests « passif » de `lib/engine_test.ts`).

## 2 quater. Effets d'objets → `data/item-mechanics.ts`

Même principe que les passifs : des références au fichier des objets du jeu
(`https://raw.communitydragon.org/latest/game/items.cdtb.bin.json`, entrée `Items/<id Riot>` → `mDataValues`
pour les valeurs, `mItemCalculations` pour les calculs), jamais de chiffres.

| `kind`       | Pour                                                     | Exemple                   |
| ------------ | -------------------------------------------------------- | ------------------------- |
| `onHit`      | dégâts tous les N coups d'auto (`every`)                 | Kraken, Lame du roi déchu |
| `spellProc`  | dégâts déclenchés par un sort (`needsAuto` : Lame ench.) | Trinité, Luden            |
| `active`     | actif lancé une fois par cooldown                        | Brise-pas                 |
| `armorShred` | réduction d'armure qui s'empile                          | Fendoir noir              |
| `burn`       | brûlure par seconde entretenue par les sorts             | Liandry                   |

Les variantes mêlée / distance sont résolues toutes les deux (calcul conditionnel du jeu, multiplicateur à
distance) ; `rangedDamage` permet d'indiquer un calcul distinct (Lame du roi déchu).

## 3. Cas complexes → moteur

Si le champion a une mécanique que ni le modèle générique ni `data/mechanics.ts` ne couvrent (exécution, cumul
conditionnel, transformation…), modélise-la dans `lib/engine.ts` :

- ajoute un champ optionnel dans les types si nécessaire (ex. `hasBleed`),
- gère le cas dans `computeCombo()`,
- **ajoute un invariant** dans `lib/engine_test.ts`.

Garde ces cas isolés et commentés : c'est ce qui rend le patch mensuel relisible en PR.

## 4. Vérifier

```bash
deno task test    # invariants moteur + invariants sur TOUT le roster
deno task check   # fmt + lint + types
```

Les tests valident des invariants (plus d'objets ⇒ plus de dégâts, l'armure réduit le physique, l'ultime «
vrai » ignore les résistances, chaque champion se calcule sans planter, chaque étagère référence un objet
existant…), pas des chiffres exacts.

## 5. PR

Un champion (ou un lot cohérent d'affinages) par PR. Indique le patch de référence dans la description. Merci
!
