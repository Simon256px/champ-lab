# Auto-évaluation — stats & code

Deux évaluations automatiques, lancées à la demande.

## 1. Exactitude des stats (`deno task audit`)

Le script `scripts/audit-stats.ts` croise ce que l'app utilise réellement (généré depuis le wiki officiel et
les fichiers du jeu) avec une source indépendante (Data Dragon), et vérifie les assets.

| Source               | Rôle                                                  | Ce qu'on en vérifie                         |
| -------------------- | ----------------------------------------------------- | ------------------------------------------- |
| **Data Dragon**      | liste, stats plates, runes, icônes officielles        | source de référence du croisement           |
| **Community Dragon** | fichiers du jeu (formules), assets graphiques         | présence des icônes                         |
| **Wiki officiel**    | stats de base, sorts rendus, passifs, objets (à jour) | ce que l'app utilise (via `data/generated`) |

### Résultat de la dernière passe (patch DD 16.20.1, wiki au patch 26.20)

- **Concordance 100 %** sur les stats de base croisables (1433/1433).
- Avant (source Meraki, abandonnée au patch 25.08) : ≈ 87 %, les écarts venant tous du décalage de patch. Le
  passage au wiki officiel les a supprimés.
- **Non recroisé :** `attackdamageperlevel`, que Data Dragon renvoie à 0 pour **tous** les champions (bug DD
  connu) — le wiki fait foi.
- **Ratios de sorts :** Data Dragon ne les expose pas ; le pipeline les recoupe avec les **formules des
  fichiers du jeu** (voir `/methode` : sorts dont la formule du jeu concorde avec le wiki à ×/÷ 1,3 près).

## 2. Optimisation du code

Revue des chemins chauds (calcul client, à chaque réglage de slider).

- **Mode impact — corrigé.** Le catalogue calcule le Δ de chaque objet (~115). L'ancienne `itemImpact`
  recalculait le combo « avant » à **chaque** objet. Nouvelle `itemImpactFrom(base, before, id)` : le total «
  avant » (déjà connu via `result.total`) est réutilisé → **~22 % de calcul en moins**.
- **Coût mesuré : ~0,1 ms/rendu** pour 115 objets (benchmark). Le calcul client n'est pas un goulot ;
  mémoïsation ou calcul paresseux seraient **prématurés**. On s'arrête là volontairement.
- **Moteur** (`lib/engine.ts`) : pur, sans allocation superflue dans les boucles, testé par invariants sur
  tout le roster. `computeCombo` d'un champion : quelques microsecondes.
- **Sobriété préservée** : un seul îlot hydraté, données statiques cachables, calcul côté client. Les icônes
  sont chargées en `loading="lazy"`.

### Verdict

Bien optimisé pour son échelle. La seule redondance réelle (recalcul du « avant ») est éliminée ; le reste
serait de la sur-ingénierie au vu des mesures.
