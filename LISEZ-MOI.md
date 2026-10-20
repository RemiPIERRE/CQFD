# CQFD – version test (GitHub Pages)

## Publier (une seule fois, ~5 minutes)
1. Crée un compte sur github.com puis un **nouveau dépôt public** (ex. `cqfd`).
2. Bouton **Add file → Upload files** : glisse **tout le contenu** de ce dossier
   (y compris le dossier `fonts`, `icons` et le fichier caché `.nojekyll` si ton explorateur l'affiche), puis **Commit changes**.
3. **Settings → Pages** : *Source* = « Deploy from a branch », branche `main`, dossier `/ (root)` → **Save**.
4. Après ~1 minute, le jeu est en ligne sur `https://TON-PSEUDO.github.io/cqfd/`.

## Mettre à jour
Renvoie les fichiers modifiés par le même chemin (Upload files). `sw.js` change à chaque version,
donc les testeurs récupèrent la nouvelle version à leur prochaine ouverture (parfois au 2e lancement).

## Installer sur le téléphone
- **iPhone (Safari)** : Partager → *Sur l'écran d'accueil*.
- **Android (Chrome)** : menu ⋮ → *Installer l'application* / *Ajouter à l'écran d'accueil*.
Le jeu fonctionne ensuite hors ligne, en plein écran, avec son icône.

## Récupérer les retours
Sur l'accueil, en bas : **« Copier mon journal de jeu »**. Chaque ami t'envoie le texte
(niveau, temps, indices, abandons). Les données restent sur son téléphone, rien n'est envoyé automatiquement.

## Notes
- Les progrès sont enregistrés dans le navigateur : vider les données du site les efface.
- Les pubs sont simulées (3 secondes) : il n'y a aucun vrai SDK publicitaire.
