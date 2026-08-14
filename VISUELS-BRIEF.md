# Brief visuels — portraits de l'équipe

Quatre emplacements de portraits sont vides sur la page **L'équipe**, et ça se
voit : ce sont les seuls cadres du site qui ne contiennent rien.

Comme pour les modèles 3D, le site fonctionne sans eux (le cadre affiche
simplement « Portrait »). Dès qu'un fichier est déposé au bon nom, il apparaît.

**Où déposer :**

```
C:\Users\Hal\site web\creation\alvea-dentaire\public\images\team\
```

```
fontenoy.jpg
kerraoui.jpg
vasseur.jpg
prevot.jpg
```

Ce sont des **personnes fictives** pour une maquette de démonstration. Les
images doivent donc être générées, et ne ressembler à personne d'identifiable.

---

## Les six règles communes — c'est la cohérence qui fait le premium

Quatre beaux portraits qui ne vont pas ensemble sont pires que quatre portraits
moyens cohérents. Ce qui doit être **identique** d'une image à l'autre :

| # | Règle | Valeur |
|---|---|---|
| 1 | **Le fond** | Uni, gris-beige chaud **#EFE8DC** — c'est exactement le fond du site, les portraits doivent s'y fondre |
| 2 | **La lumière** | Une grande source douce à 45° venant de la **gauche du cadre**, léger remplissage à droite. Jamais de flash frontal |
| 3 | **Le cadrage** | Buste, 85 mm, f/2.8, yeux au tiers supérieur, format **3:4 vertical**, ≥ 1200 px de large |
| 4 | **La tenue** | Blouse ou tunique blanc cassé, sans logo, sans badge, sans stéthoscope |
| 5 | **L'expression** | Neutre et posée, regard caméra, **bouche fermée**. Un site dentaire rempli de sourires dents apparentes bascule immédiatement dans la banque d'images |
| 6 | **Le traitement** | Couleurs sourdes, contraste doux, grain fin. Pas de retouche lissée, pas de saturation |

Fin de prompt commune à coller à chaque fois :

> `plain seamless warm greige background #EFE8DC, large soft light from 45 degrees camera left, gentle fill on the right, 85mm lens, f/2.8, head and shoulders, eyes on upper third, 3:4 vertical portrait, off-white clinical tunic with no logo, calm neutral expression, closed mouth, direct gaze at camera, muted colours, soft contrast, fine grain, editorial portrait photography, no text, no watermark, not a stock photo smile`

---

## Les quatre portraits

### 1. `fontenoy.jpg` — Dr Léa Fontenoy, dentisterie restauratrice

> `editorial studio portrait of a woman in her early forties, dark hair pulled back, fine features, composed and attentive, slight forward lean as if listening,` + **fin de prompt commune**

L'idée : celle qui écoute. C'est elle qui fait les consultations longues.

### 2. `kerraoui.jpg` — Dr Samuel Kerraoui, implantologie

> `editorial studio portrait of a man in his mid forties, short greying hair, close-trimmed beard, steady calm gaze, square shoulders, quietly authoritative,` + **fin de prompt commune**

L'idée : le chirurgien. Assurance tranquille, pas de démonstration.

### 3. `vasseur.jpg` — Dr Anne-Claire Vasseur, orthodontie

> `editorial studio portrait of a woman in her mid thirties, shoulder-length light brown hair, fine metal-frame glasses, open and precise expression,` + **fin de prompt commune**

L'idée : la précision. Les lunettes fines suffisent à la dire.

### 4. `prevot.jpg` — Yannis Prévôt, prothésiste

> `editorial studio portrait of a man in his early thirties, short dark curly hair, sleeves rolled up, hands relaxed, the look of someone who works with his hands,` + **fin de prompt commune**

L'idée : l'artisan. C'est le seul non-praticien de la page, il doit se distinguer
sans rompre la série — les manches retroussées suffisent.

---

## Deux images optionnelles, si tu veux aller plus loin

Elles n'ont pas d'emplacement prévu pour l'instant ; je les intégrerai si tu les
produis.

**`cabinet.jpg` — la salle de soins**

> `interior photograph of a modern dental treatment room, warm oak and off-white surfaces, large window with soft daylight, one empty treatment chair seen at an angle, no people, no visible branding, minimal and uncluttered, warm neutral palette, architectural photography, wide shot, muted colours, soft contrast, no text`

Attention au piège : la plupart des générateurs sortent un cabinet **bleu et
chromé**, façon clinique des années 2000. Insiste sur `warm oak`, `off-white`,
`daylight`, et refuse tout ce qui est bleu clinique — ça casserait la palette du
site en deux secondes.

**`laboratoire.jpg` — le plan de travail du prothésiste**

> `close-up photograph of a dental technician's workbench, ceramic crowns on a plaster model, fine sculpting tools laid in a row, warm task lighting, shallow depth of field, no people, no branding, muted warm palette, editorial detail shot, no text`

C'est l'image qui prouve le « laboratoire intégré » du discours. Un détail vaut
mieux qu'une vue large du local.
