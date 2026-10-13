# Déploiement — lol.simoncourtois.com

CHAMP LAB tourne sur un serveur **Fedora** derrière **nginx**, comme service **systemd** Deno. Les fichiers de
configuration sont dans [`deploy/`](deploy/) : c'est exactement ce qui est installé sur le serveur.

```
Internet ─► nginx :443 (Let's Encrypt, HSTS, CSP) ─► 127.0.0.1:8040 ─► deno serve _fresh/server.js
                                                                        (service champ-lab, user champlab)
```

| Fichier                             | Installé dans                  | Rôle                                          |
| ----------------------------------- | ------------------------------ | --------------------------------------------- |
| `deploy/champ-lab.service`          | `/etc/systemd/system/`         | le site (port 8040, local uniquement, durci)  |
| `deploy/lol.simoncourtois.com.conf` | `/etc/nginx/conf.d/`           | proxy HTTPS, en-têtes de sécurité, CSP        |
| `deploy/champ-lab-deploy`           | `/usr/local/bin/` (exécutable) | mise à jour : pull, build, cache, redémarrage |
| `deploy/champ-lab-deploy.*`         | `/etc/systemd/system/`         | vérifie GitHub toutes les 5 min et redéploie  |

## Mise à jour

**Automatique.** Une fusion dans `main` (CI verte) est en ligne en moins de 5 minutes : le timer
`champ-lab-deploy.timer` lance `champ-lab-deploy --if-changed`, qui ne reconstruit que si `main` a bougé et
vérifie que le site répond 200 après le redémarrage.

**À la main**, sur le serveur :

```bash
sudo champ-lab-deploy
```

Suivre les déploiements et le site :

```bash
journalctl -u champ-lab-deploy -n 20      # dernières mises à jour
journalctl -u champ-lab -f                # journal du site
systemctl list-timers champ-lab-deploy    # prochaine vérification
```

## Installation depuis zéro

Prérequis sur le serveur : Deno 2 dans `/usr/local/bin/deno`, nginx, certbot, git, et l'enregistrement DNS
(A + AAAA) de `lol.simoncourtois.com` vers le serveur.

```bash
# 1. Utilisateur et code
sudo useradd --system --no-create-home --home-dir /srv/champ-lab --shell /sbin/nologin champlab
sudo git clone https://github.com/Simon256px/champ-lab.git /srv/champ-lab
sudo chown -R champlab:champlab /srv/champ-lab

# 2. Services et script
sudo install -m 755 /srv/champ-lab/deploy/champ-lab-deploy /usr/local/bin/
sudo cp /srv/champ-lab/deploy/champ-lab*.service /srv/champ-lab/deploy/champ-lab-deploy.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo champ-lab-deploy                          # build + démarrage
sudo systemctl enable --now champ-lab champ-lab-deploy.timer

# 3. nginx + HTTPS : poser le vhost sans ses lignes « managed by Certbot », puis
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d lol.simoncourtois.com --redirect
```

Le service n'a le droit que d'écouter sur `127.0.0.1:8040` et de lire `/srv/champ-lab` ; les dépendances sont
mises en cache au déploiement (`--cached-only`), rien n'est téléchargé au démarrage. Le certificat se
renouvelle avec le timer `certbot-renew` du système.
