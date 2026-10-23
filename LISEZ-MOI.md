# CQFD – version test 2 (GitHub Pages)

## Publier (une seule fois, ~5 minutes)
1. Crée un compte sur github.com puis un **nouveau dépôt public** (ex. `cqfd`).
2. Bouton **Add file → Upload files** : glisse **tout le contenu** de ce dossier
   (y compris les dossiers `fonts` et `icons`, et le fichier caché `.nojekyll` si ton explorateur l'affiche), puis **Commit changes**.
3. **Settings → Pages** : *Source* = « Deploy from a branch », branche `main`, dossier `/ (root)` → **Save**.
4. Après ~1 minute, le jeu est en ligne sur `https://TON-PSEUDO.github.io/cqfd/`.

## Mettre à jour (de la version 1 à la version 2)
Dépose les nouveaux fichiers **dans le même dépôt, aux mêmes endroits** (Upload files remplace ceux qui existent).
Ne change surtout pas le nom du dépôt : la progression des joueurs est liée à l'adresse du site.
Les testeurs reçoivent la nouvelle version à leur prochaine ouverture (parfois à la suivante). Leur niveau, leurs étoiles,
leur série et leur journal sont conservés ; ils reçoivent 500 gommettes de départ.

## Ce que contient la version 2
- Courbe de niveaux adoucie : 3 maisons jusqu'au niveau 14, une catégorie de plus par palier, un niveau « Souffle » tous les 4 niveaux.
- La grille en cours est sauvegardée à chaque action et se reprend après fermeture de l'appli (bouton « Reprendre »). Le chrono s'arrête quand on quitte.
- Gommettes (monnaie) : gagnées en résolvant des grilles ; un indice coûte 500, puis 750, puis 1000 par grille ; sinon, pub volontaire gratuite.
- Cadeau du jour : une pub volontaire = 1 000 gommettes, une fois par jour.
- Pub passable (de démonstration) tous les 5 niveaux gagnés à partir du niveau 10, entre deux niveaux, jamais dans le défi du jour ni la partie rapide.
- Le défi du jour est inchangé.

## Réglages (en haut du fichier `app.js`)
`ECON` : prix des indices, cadeau, gommettes de départ, gains. `ADS` : durée des pubs de démonstration, délai avant « Passer », fréquence, niveau de départ.
En ajoutant `?fast` à l'adresse du jeu, les pubs durent 2 secondes (pratique pour tester).

## Installer sur le téléphone
- **iPhone (Safari)** : Partager → *Sur l'écran d'accueil*.
- **Android (Chrome)** : menu ⋮ → *Installer l'application* / *Ajouter à l'écran d'accueil*.
Sur iPhone, la version « écran d'accueil » et la version Safari ont chacune leur propre sauvegarde : mieux vaut en choisir une.

## Récupérer les retours
Sur l'accueil, en bas : **« Copier mon journal de jeu »**. Chaque ami t'envoie le texte
(niveau, temps, indices, pauses, abandons, gommettes). Les données restent sur son téléphone, rien n'est envoyé automatiquement.

## Notes
- Les progrès sont enregistrés dans le navigateur : vider les données du site les efface.
- Les pubs sont simulées : il n'y a aucun vrai SDK publicitaire, et aucun achat.
