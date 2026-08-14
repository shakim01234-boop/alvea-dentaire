# Brief Meshy — assets 3D pour le site Alvéa

Tu génères dans l'**interface web Meshy**, je m'occupe de tout le reste.
Tu déposes les `.glb` dans `public/models/` avec **exactement les noms indiqués**.
Tant qu'un fichier est absent, le site tourne quand même : une version procédurale
prend sa place automatiquement. Tu peux donc livrer les assets un par un, dans
n'importe quel ordre.

---

# PARTIE 1 — Les images de référence

C'est ici que tout se joue. Un image-to-3D ne corrige jamais une mauvaise image
de départ : il la sculpte telle quelle, défauts compris.

## Les 7 règles, valables pour toutes les images

| # | Règle | Pourquoi |
|---|---|---|
| 1 | **Un seul objet, entier, centré**, avec ~15 % de marge tout autour | Un objet coupé au bord du cadre sort tronqué en 3D, sans rattrapage possible |
| 2 | **Fond uni parfaitement plat** (gris clair ~#EDEDED ou blanc) | Le détourage est automatique : un fond dégradé ou texturé se retrouve collé sur le maillage |
| 3 | **Aucune ombre portée au sol, aucun reflet de sol** | L'ombre est interprétée comme de la matière et devient une excroissance sous l'objet |
| 4 | **Lumière douce et enveloppante**, venant du haut-avant | Une lumière dure crée des zones noires bouchées, que le modèle lit comme des creux |
| 5 | **Pas de gros reflet spéculaire blanc** sur la surface | Les reflets sont *cuits* dans la texture : tu te retrouves avec une tache brillante figée qui bouge avec l'objet. C'est l'erreur la plus fréquente |
| 6 | **Netteté partout, aucun flou d'arrière-plan** | Une zone floue devient une zone molle et fondue en 3D |
| 7 | **Rien d'autre dans le cadre** : pas de main, pas d'instrument, pas de texte, pas de watermark, pas d'échelle | Tout ce qui est visible est modélisé |

**Format :** carré (1:1), au moins 1024 × 1024. Angle de prise de vue : **3/4, légèrement
en plongée** — c'est l'angle qui donne le plus d'information volumétrique à l'IA.

## Une image ou plusieurs ?

Meshy accepte 2 à 4 vues du même objet (mode multi-image), et c'est effectivement
plus précis — **mais seulement si les vues sont réellement cohérentes entre elles**.
Deux générations séparées d'un même prompt donnent deux objets différents, et le
résultat 3D est alors pire qu'avec une seule image.

**Donc, dans l'ordre :**

1. **Commence en image unique** (vue 3/4). C'est le chemin le plus fiable.
2. Passe en multi-vues **uniquement** si tu obtiens les autres angles en *éditant*
   la première image (« same object, rotated to front view, identical lighting »),
   pas en relançant le prompt de zéro.
3. Si les vues divergent (proportions, teinte, nombre de racines), reviens à l'image unique.

## Comment juger une image avant de la passer en 3D

Regarde-la et pose-toi ces trois questions :

- **Est-ce que je vois le relief ?** Si la surface est plate et laiteuse, il n'y a
  rien à sculpter — la 3D sortira lisse comme un galet. Il faut voir les creux.
- **Est-ce que le contour est net sur 360° ?** Un bord qui se fond dans le fond
  clair (blanc sur blanc) donne une bosse ou un trou.
- **Est-ce qu'il y a une tache blanche brillante ?** Si oui, relance : elle restera.

Deux ou trois relances par asset, c'est normal. C'est l'étape où il faut être exigeant.

---

# PARTIE 2 — Les assets, un par un

> **Mise à jour après le passage en ambiance claire.** Un seul asset vaut
> réellement le détour : **`tooth-molar.glb`**. En blanc, les surfaces se lisent
> par l'ombre et non par la valeur, et c'est la molaire — vue en très gros plan
> — qui gagne à avoir du micro-relief et une carte de normales mesurée.
> L'arcade et la gouttière procédurales sont régulières et propres ; un maillage
> généré ne les améliorerait pas et risquerait de les salir. **Fais la molaire,
> laisse tomber le reste** (les consignes restent ci-dessous si tu changes d'avis).

## 1. `tooth-molar.glb` ★★★ le plus important

**C'est l'objet héros.** Il est seul à l'écran, en très gros plan, pendant les
premières secondes du site. Tout le reste peut être moyen, pas lui.

> **Prompt image :**
> `single human upper first molar tooth, complete with three separate roots, anatomically accurate occlusal surface with four distinct cusps and deep central fissure grooves, isolated on a plain flat light grey background, three-quarter view from slightly above, soft diffuse studio lighting from above front, natural ivory white enamel, matte finish, medical illustration reference, sharp focus throughout, no shadow, no reflection, no specular highlight, no text, object fully in frame and centered`

**Ce que je regarde en priorité :** le **dessus de la dent**. Les quatre bosses
(cuspides) et les sillons en croix entre elles. C'est ce relief-là qui accroche la
lumière rasante dans la scène — un dôme lisse ne rendra strictement rien à l'écran.
Si sur ton image le dessus est plat ou brillant, relance.

**Second point :** les **trois racines doivent être séparées**, pas fusionnées en un
seul cône. Elles s'écartent en descendant.

**À rejeter :** dent parfaitement blanche et laquée (aspect dentifrice), racine
unique, dent vue de face uniquement (on ne voit pas le dessus).

---

## 2. `arch-upper.glb` ★★

L'arcade complète, qui se compose autour de la molaire quand la caméra recule.

> **Prompt image :**
> `complete human upper dental arch, sixteen teeth arranged in a horseshoe curve, teeth only with no gums and no jaw bone, viewed from below at a three-quarter angle showing both the chewing surfaces and the front teeth, plain flat light grey background, soft diffuse studio lighting, natural ivory enamel, dental anatomy model, sharp focus, no shadow, no specular highlight, no text, fully in frame and centered`

⚠️ **Le piège :** Meshy ajoute presque toujours une **gencive rose et un os de
mâchoire**. Ça alourdit l'objet et ça rend l'image médicalement anxiogène — on
perd tout le côté épuré. Insiste : `teeth only`, `no gums`, `no jaw bone`, `no pink tissue`.
Si la gencive revient malgré tout, relance plutôt que de garder.

**Second piège :** une arcade vue strictement de face ne montre aucune surface de
mastication → l'IA improvise le dessus des molaires. Il faut l'angle en contre-plongée.

---

## 3. `aligner.glb` ★

La gouttière transparente qui vient se poser sur l'arcade.

> **Prompt image :**
> `transparent clear plastic dental aligner tray, horseshoe shape, thin glossy shell with visible tooth-shaped cavities moulded into it, empty with no teeth inside, floating, plain flat light grey background, soft diffuse studio lighting, product photography, sharp focus, no shadow, no text, fully in frame and centered`

**Bonne nouvelle :** ne te bats pas avec la transparence. Meshy ne la restituera pas
et ça n'a aucune importance — je remplace entièrement le matériau par du verre
calculé en temps réel dans la scène. **Seule la forme de la coque m'intéresse.**

Si l'IA te sort une gouttière opaque blanche mais bien formée : **c'est bon, garde-la.**

---

## 4. `veneer.glb` — optionnel

Une facette céramique isolée, pour la section esthétique.

> **Prompt image :**
> `single dental porcelain veneer, thin curved ceramic laminate shell shaped like the front surface of a tooth, glossy white, floating at a three-quarter angle showing both the front face and the hollow inner side, plain flat light grey background, soft diffuse studio lighting, sharp focus, no shadow, no text, fully in frame and centered`

Ce qui compte : qu'on voie que c'est une **coque creuse et fine**, pas une dent
pleine. L'angle 3/4 doit laisser apparaître l'intérieur concave.

---

## Pas la peine de générer l'implant

Je le fabrique en code : le filetage est un hélicoïde, il se calcule exactement.
Les générateurs IA ratent systématiquement les vis — pas de filetage irrégulier,
spires fondues entre elles. En procédural il est net, et il peut se visser
réellement dans l'os pendant le défilement.

---

# PARTIE 3 — Les réglages Meshy

Une fois l'image validée, dans l'interface :

| Réglage | Valeur | Pourquoi |
|---|---|---|
| Mode | **Image to 3D** (jamais Text to 3D) | La géométrie dentaire est trop spécifique pour du texte seul |
| Modèle | **Meshy 6** | Le seul en qualité production |
| Symétrie | Auto | — |
| Texture | PBR activé, **2K suffit** | Je recompresse en KTX2 de toute façon |
| **Remesh avant export** | **Triangle**, `target polycount` = **40 000** | Obligatoire, voir ci-dessous |
| Export | **GLB** | Seul format chargeable directement par un navigateur |

⚠️ **Ne saute pas l'étape Remesh.** Un export brut sort entre 200 000 et 300 000
triangles avec des textures 4K : plusieurs dizaines de Mo, inexploitable sur le web.
Je redescends ensuite à 15–25 k triangles avec compression Draco + KTX2, pour arriver
à ~1–2 Mo par asset.

---

# Où déposer

Les GLB **bruts**, tels que Meshy te les donne, vont ici :

```
C:\Users\Hal\site web\creation\alvea-dentaire\public\models\source\
```

Noms exacts :

```
tooth-molar.glb     ← commence par celui-là
arch-upper.glb
aligner.glb
veneer.glb          (optionnel)
```

Ce dossier `source\` n'est jamais servi au navigateur : c'est l'entrée de la
chaîne d'optimisation. Une seule commande produit ensuite les versions web dans
`public\models\`, et le site les prend automatiquement :

```bash
npm run models
```

Elle affiche pour chaque fichier le nombre de triangles avant/après et le poids
gagné. Les originaux ne sont pas touchés : on peut relancer autant de fois qu'on
veut. Rien d'autre à faire de ton côté — dépose et dis-le-moi.

---

## Ce qui se passe automatiquement à l'import

Deux corrections sont appliquées à chaque modèle, sans quoi le remplacement ne
serait pas transparent :

- **La matière est réécrite.** On ne garde de Meshy que la carte de normales
  (le relief mesuré) ; l'émail translucide est recalculé en temps réel. La
  texture PBR d'origine, qui rend la dent mate et crayeuse, est écartée.
- **L'échelle et le centre sont normalisés.** Un modèle généré arrive à une
  taille arbitraire : il est recentré et remis au gabarit de la doublure qu'il
  remplace, pour que les mouvements de caméra restent justes.

Seul cas qui demanderait une retouche : si un modèle sort **couché** plutôt que
debout. Ça se règle en une ligne, dis-le-moi si tu le vois.
