# Contribuer à CHAMP LAB

Merci d'y jeter un œil. Le roster est **généré** depuis le wiki officiel, les fichiers du jeu et Data Dragon :
contribuer, ce n'est pas saisir des chiffres, c'est affiner ce que le modèle générique couvre mal.

## Signaler un problème

Ouvre une [issue](https://github.com/Simon256px/champ-lab/issues) en précisant :

- la page et le champion concernés (l'URL suffit, elle contient le build et l'adversaire) ;
- le chiffre affiché et celui que tu attendais ;
- d'où vient ton chiffre (wiki, test en jeu, infobulle du client) et le patch.

Un écart chiffré et sourcé se corrige vite ; « X est trop fort » beaucoup moins.

## Mettre en place l'environnement

Prérequis : [Deno](https://deno.com) 2.x.

```bash
git clone https://github.com/Simon256px/champ-lab.git
cd champ-lab
deno task dev
```

Les données générées sont versionnées : pas besoin de lancer `deno task data` pour travailler.

## Où va quoi

| Tu veux…                                            | Fichier                                    |
| --------------------------------------------------- | ------------------------------------------ |
| Régler un champion (étagère, rune, ordre des sorts) | `data/overrides.ts` (`CHAMPION_OVERRIDES`) |
| Ajouter un objet à une étagère                      | `data/overrides.ts`                        |
| Modéliser un passif conditionnel                    | `data/mechanics.ts`                        |
| Modéliser un effet d'objet                          | `data/item-mechanics.ts`                   |
| Ajouter une mécanique générique                     | `lib/engine.ts`, avec son test             |
| Changer l'interface du labo                         | `islands/`                                 |
| Changer l'apparence                                 | `static/styles.css`                        |

`data/generated/` est réécrit par `deno task data` : ne l'édite jamais à la main.

Le guide pas à pas est dans **[docs/adding-a-champion.md](docs/adding-a-champion.md)**.

## Principes

- **Rien n'est inventé.** Les réglages et passifs saisis désignent des lignes du wiki ou des calculs des
  fichiers du jeu, jamais des valeurs tapées à la main. Si une condition ne peut pas être reproduite dans un
  duel, le passif n'est pas joué et sa raison est affichée.
- **Data-driven.** La logique générique vit dans le moteur ; les chiffres viennent des sources. Un cas très
  spécifique doit être isolé clairement et testé.
- **Sobriété.** Pas d'image, pas de dépendance superflue, pas de JavaScript hydraté hors des îlots sans
  raison.
- **Un sujet par pull request.** Un champion, un objet, un correctif : plus facile à relire.

## Avant d'ouvrir une pull request

La CI lance les mêmes vérifications :

```bash
deno task check   # deno fmt --check, deno lint, deno check
deno task test    # tests du moteur, des sources et invariants sur tout le roster
deno task build   # build Fresh
```

`deno fmt` corrige le format. Les tests vérifient surtout des **invariants** (monotonie, mitigation,
exécution) plutôt que des chiffres exacts, qui bougent à chaque patch : si tu ajoutes une mécanique, ajoute
l'invariant correspondant.

Si tu as régénéré les données, lance aussi `deno task audit` et joins le résultat à la pull request.

## Légal

N'ajoute au dépôt aucun asset sous copyright Riot (icônes, splash arts, sons).

En contribuant, tu acceptes que ton apport soit distribué sous la [licence MIT](LICENSE) du projet.

## Soutenir le projet

Pas le temps de contribuer ? Tu peux aussi soutenir CHAMP LAB sur
[ko-fi.com/simon256px](https://ko-fi.com/simon256px).
