# Blueprint — under construction

Une page, zéro dépendance. Ouvre `index.html` (ou sers le dossier tel quel).

## Réutiliser pour un autre site
1. **Texte** : le cartouche en bas à droite, dans `index.html` (Projet, Dessiné par, Statut, Rév., Contact) + `<title>` et `<meta description>`.
2. **Couleurs** : variables en haut de `style.css` (`--bp`, `--line`, `--signal`…).
3. **Titre animé** : remplace `assets/under-construction.webm` (WebM VP9 avec alpha, texte clair). Garde le même ratio, sinon ajuste `aspect-ratio` dans `.title video`.
4. **Rythme / densité** : objet `CONFIG` en haut de `main.js` (cellules, cadre, lignes, ondulation, cartouche, pause avant titre, pointeur, zones). `seed` change la répartition des carrés.

## Séquence
1. le cadre de planche se trace (sens horaire)
2. lignes maîtresses, puis lignes fines, tracées depuis le centre (trait blanc qui se pose)
3. carrés dans des carrés en ondulation, repères A–F / 1–4, cartouche qui se déplie
4. **quand tout est posé** → plaque + vidéo du titre

Le moment de départ du titre est calculé par `main.js` à partir de CONFIG : si tu changes une durée, le titre suit tout seul.
Clic sur le titre = rejoue la vidéo. Le pointeur (actif une fois la planche terminée) fait tourner les carrés et surligne la zone.

## Safari
Safari ne lit pas la transparence des WebM : la page affiche alors un titre texte de secours.
Pour avoir l'animation aussi sur Safari, exporte une version HEVC avec alpha (`.mov`) et ajoute sur la balise video :
`data-src-safari="assets/under-construction.mov"`

## Accessibilité
`prefers-reduced-motion` : pas d'intro, titre affiché sur sa dernière image. Le titre est un `<h1>` lisible par les lecteurs d'écran.
