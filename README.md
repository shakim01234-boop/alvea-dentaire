# Alvéa — maquette de site dentaire 3D

Cabinet **fictif**. Maquette de démonstration : aucune information n'est réelle,
et le formulaire de rendez-vous est volontairement inactif.

**En ligne :** https://shakim01234-boop.github.io/alvea-dentaire/

```bash
npm install
npm run dev      # http://localhost:5370
npm run build
npm run models   # optimise les GLB déposés dans public/models/source/
npm run deploy   # construit et publie sur GitHub Pages
```

La publication passe par la branche `gh-pages` et non par GitHub Actions : le
jeton disponible sur ce poste n'a pas la portée `workflow` et ne peut donc pas
déposer de fichier dans `.github/workflows/`. Publier depuis une branche ne
demande que `repo`.

Le `base` de Vite vaut `/alvea-dentaire/` en production. Tous les chemins
statiques passent par `lib/asset.js` — un chemin absolu écrit en dur pointerait
vers la racine du domaine et renverrait 404 sans erreur visible, juste des
cadres vides.

---

## Le plan d'ouverture

Le site s'ouvrait directement sur une dent, c'est-à-dire sur la technique, sans
jamais dire pourquoi. Un plan vidéo le précède désormais — des gens qui rient,
un visage apaisé, un verre qu'on lève — et pose l'enjeu avant la démonstration.

Il est collant sur une hauteur et demie d'écran : en descendant, l'image
s'agrandit et s'efface pour découvrir la scène 3D qui l'attend derrière. Aucune
coupure entre les deux.

Le fichier source est en **HEVC**, que ni Chrome ni Firefox ne lisent de façon
fiable. Il est réencodé en H.264 à deux définitions (1600 et 960 px, 1,4 Mo et
0,5 Mo), sans piste audio, avec une affiche pour le premier affichage :

```bash
ffmpeg -i source.mp4 -an -vf scale=1600:-2 -c:v libx264 -crf 25 -preset slow \
  -pix_fmt yuv420p -movflags +faststart public/video/intro-1600.mp4
```

La lecture est coupée dès que le plan sort de l'écran : une vidéo qui tourne
hors champ continue de décoder pour rien.

## Le principe

Une seule scène 3D, fixe derrière toute la page. Le défilement ne fait pas
défiler des blocs : il déplace la caméra à l'intérieur de la scène, en un seul
plan-séquence de six actes.

| Acte | Progression | Ce qui se passe |
|---|---|---|
| Ouverture | 0 → 0,17 | Une molaire seule, en lévitation |
| Diagnostic | 0,17 → 0,33 | La caméra tourne autour |
| Le plan | 0,33 → 0,50 | L'arcade se compose autour d'elle, dent par dent |
| Implantologie | 0,50 → 0,67 | Un implant descend et se visse dans l'emplacement vide |
| Orthodontie | 0,67 → 0,83 | La gouttière se pose sur l'arcade |
| Esthétique | 0,83 → 1 | Balayage de lumière sur l'émail, puis plan large |

Les six actes occupent chacun exactement 1/6 de la hauteur de `#experience` :
l'index de l'acte et la progression lue par la scène coïncident, il n'y a aucune
synchronisation manuelle à maintenir entre le texte et la caméra.

Passé la séquence, la partie éditoriale défile normalement **par-dessus** le
canvas, avec un fond opaque. Le rendu GPU s'arrête dès que la séquence sort de
l'écran.

---

## Les modèles 3D

Le site fonctionne **sans aucun fichier 3D**. Toutes les dents sont générées en
code (`src/scene/geometry.js`) : une sphère unité dont le rayon est modulé pour
former une couronne, des racines, des cuspides et des sillons.

Dès qu'un GLB Meshy est déposé et optimisé, il prend automatiquement la place de
la doublure correspondante — rien à modifier dans le code.

| Fichier attendu | Remplace | Utile ? |
|---|---|---|
| `public/models/tooth-molar.glb` | la molaire héros | **oui** — elle est vue en très gros plan, c'est là que le micro-relief d'un maillage réel se voit |
| `public/models/arch-upper.glb` | l'arcade | facultatif — la version procédurale est régulière et propre |
| `public/models/aligner.glb` | la gouttière | facultatif — la coque calculée est plus nette qu'un maillage généré |

Voir **[MESHY-BRIEF.md](MESHY-BRIEF.md)** pour les prompts d'images de référence
et les réglages Meshy.

L'implant reste procédural par choix : son filetage est un hélicoïde, qui se
calcule exactement, alors que les générateurs IA le rendent irrégulier ou fondu.

### À l'import, deux corrections automatiques

- **La matière est réécrite.** Seule la carte de normales de Meshy est conservée ;
  l'émail translucide est recalculé en temps réel. La texture PBR d'origine rend
  la dent mate et crayeuse.
- **L'échelle et le centre sont normalisés** au gabarit de la doublure remplacée,
  pour que la chorégraphie de la caméra reste valable.

---

## Les deux ambiances

Le clair est l'ambiance par défaut — c'est le registre du cabinet dentaire. Le
sombre reste accessible par la bascule de la barre de navigation, ou d'emblée
avec `?theme=dark`.

Passer au blanc n'est pas une inversion de couleurs, c'est un autre problème
d'éclairage. Sur fond sombre une dent se détache par sa clarté ; sur fond blanc
elle a la valeur du fond et ne se lit plus que par l'ombre et le reflet. D'où,
en clair :

- **l'exposition descend à 0,66.** C'est le levier décisif : à 1, tous les hauts
  de gamme se collaient à 255 et la dent devenait une tache sans relief ;
- **la transmission baisse** au lieu d'augmenter — trop de lumière traversante
  inonde l'émail et efface ses cuspides ;
- **une lumière hémisphérique au sol foncé** creuse les dessous ;
- **le fond est en demi-teinte**, jamais blanc pur : la dent doit être plus
  claire que ce sur quoi elle se détache, comme sur un fond de studio en papier ;
- **le bloom tombe à presque rien** — sur blanc, il ferait fondre l'objet dans
  le fond.

La bascule est amortie image par image (`themeState.mix`) : couleurs, intensités,
brouillard, exposition et matières sont interpolés. Seul l'environnement est
recalculé d'un coup, à la bascule.

Les matières sont retrouvées dans la scène par un marqueur `userData.themed`,
ce qui fait fonctionner le changement d'ambiance aussi bien sur les doublures
procédurales que sur un GLB chargé.

## Le micro-relief de l'émail

Une dent parfaitement lisse ne rend rien en ambiance claire. Une carte de
normales est donc générée en mémoire (`scene/textures.js`) : trois octaves de
bruit plus de fines ondulations horizontales, à la manière des périkymaties.
Aucun fichier à charger. Elle s'efface dès qu'un GLB Meshy apporte sa propre
carte de normales, mesurée sur le maillage réel.

Réglage sensible : l'amplitude des ondulations. Au premier essai elle donnait de
la céramique tournée — l'accident doit se deviner, pas se compter.

## Animations de texte

Deux traitements, choisis selon la nature du texte (`site/Reveal.jsx`) :

- **Titres** — chaque ligne monte depuis un masque, décalée de la précédente.
  L'effet demande de connaître les lignes : les titres sont donc écrits ligne
  par ligne dans `acts.jsx` et dans l'éditorial, jamais laissés au retour à la
  ligne automatique.
- **Paragraphes** — mot à mot, en glissant et en se défloutant. Pas de masque,
  donc aucun risque de couper les jambages, et aucune mesure de ligne à faire.

Les deux ont trois états : au repos, entrant, sortant. **La sortie prolonge le
mouvement vers le haut au lieu de le rembobiner** — c'est ce détail qui
distingue une transition d'un fondu inversé.

Dans la séquence, l'entrée et la sortie sont pilotées par la **même progression
que la caméra**, pas par un observateur d'intersection : le texte et le
mouvement respirent sur la même horloge. Dans l'éditorial, où il n'y a pas de
séquence, l'observateur reprend la main.

Le titre d'ouverture, seul, ajoute un décalage **mot à mot à l'intérieur du
masque de ligne** : c'est le plus grand corps du site, il supporte cette
granularité que les autres titres n'accepteraient pas. L'espace entre les mots
est une vraie espace et non une marge — une marge gauche se transformerait en
indentation dès que la ligne se replie.

S'y ajoutent le trait du sur-titre qui se dessine, les chiffres qui défilent
jusqu'à leur valeur, le soulignement de navigation qui balaie, et le remplissage
de bouton qui monte par le bas.

## Typographie française

Les textes sont écrits au kilomètre dans les fichiers source, avec apostrophes
droites et espaces ordinaires. Les règles françaises sont appliquées à
l'affichage par `lib/typo.js` : apostrophe courbe, espace fine insécable avant
`: ; ! ?` et dans les guillemets, insécable entre un nombre et son unité pour
qu'un prix ne se coupe jamais en fin de ligne.

Écrire directement les caractères composés dans les sources serait invisible à
la relecture et impossible à maintenir ; les appliquer au rendu garde le contenu
lisible et la composition juste.

### Entrée dans le champ

`lib/inview.js` remplace IntersectionObserver, qui s'est révélé imprévisible
ici : certains éléments ne recevaient jamais la moindre entrée, y compris avec
un observateur témoin posé à la main sur le même nœud. Un seul relevé pour toute
la page, à 12 Hz — mesurer une quarantaine de rectangles douze fois par seconde
ne coûte rien, c'est le nombre de boucles qui coûte, pas leur contenu.

Sur une page pilotée par un défilement interpolé, mieux vaut une mesure dont on
maîtrise l'horloge qu'un mécanisme dont on subit la sienne.

## Navigation

Les ancres passent par Lenis. Sans ça, le saut natif du navigateur se dispute le
défilement avec l'interpolation en cours et l'atterrissage est sale.

La barre s'efface en descendant et revient en remontant : sur une page dont le
sujet est une séquence plein écran, un bandeau permanent mange l'image. Sous
820 px, les liens passent dans un volet plein écran — auparavant ils
disparaissaient purement et simplement.

## Décisions techniques

**Transmission réservée aux gros plans.** Chaque matériau transmissif coûte une
passe de rendu supplémentaire. La molaire héros et la gouttière en ont ; les
quinze autres dents utilisent une version sans transmission, visuellement
indiscernable à la distance où elles sont vues.

**Un contre-jour derrière la dent héros.** Sans lumière traversante, la
transmission n'a rien à transmettre et l'émail retombe en plastique opaque.

**Environnement construit à la main** avec des `Lightformer`, calculé une seule
fois (`frames={1}`). Aucun HDRI à télécharger, et un contrôle exact des reflets
qui dessinent le galbe de l'émail.

**meshopt plutôt que Draco.** Le décodeur Draco est téléchargé depuis un CDN
Google ; celui de meshopt est embarqué. Le site n'a aucune dépendance réseau
externe hors polices.

**Qualité des effets figée au démarrage.** Elle a d'abord été rendue adaptative :
changer les enfants d'un `EffectComposer` en marche le laissait rendre un écran
noir. Seule la résolution s'ajuste ensuite, via `PerformanceMonitor`.

**Pas de profondeur de champ.** Essayée à distance fixe puis asservie au point
visé : dans les deux cas elle effaçait l'image sur les plans rapprochés. Sur fond
noir avec des objets isolés, elle ne valait pas une passe de profondeur.

**Le texte reste lisible par le cadrage, pas par un calque.** À chaque acte, le
point visé par la caméra est décalé du côté du texte, ce qui repousse l'objet 3D
de l'autre côté. Un dégradé latéral ne sert que de filet de sécurité pendant les
transitions.

---

## Accessibilité et repli

- `prefers-reduced-motion` : défilement natif, apparitions désactivées.
- Pointeur grossier ou moins de 4 cœurs : pile d'effets allégée.
- `?fx=off`, `?fx=low`, `?fx=high` forcent le niveau de post-traitement — utile
  pour savoir si un défaut vient de la scène ou d'un effet.
- `?theme=dark` / `?theme=light` chargent directement une ambiance.

---

## Arborescence

```
src/
  scene/
    geometry.js     dents, implant et gouttière procéduraux
    Experience.jsx  canvas, caméra, lumières, actes, effets
    useModel.jsx    bascule doublure → GLB, matière et échelle
  site/
    Editorial.jsx   sections éditoriales, tarifs, rendez-vous
  lib/
    scroll.js       source unique de la progression (Lenis)
    acts.jsx        textes et découpage des six actes
    useReveal.js    apparitions à l'entrée dans le champ
scripts/
  optimize-models.mjs   chaîne glTF-Transform
```
