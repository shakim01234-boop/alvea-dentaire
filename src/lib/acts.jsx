/**
 * Les six actes de la séquence.
 *
 * Chaque acte occupe exactement 1/6 de la hauteur de #experience, ce qui fait
 * correspondre l'index de l'acte et la progression lue par la scène 3D :
 * pas de synchronisation manuelle à maintenir entre le texte et la caméra.
 *
 * Les titres sont écrits **ligne par ligne** : c'est ce qui permet de masquer
 * et de décaler chaque ligne à l'apparition. Un titre laissé au retour à la
 * ligne automatique ne peut pas recevoir ce traitement.
 */
export const ACTS = [
  {
    id: 'ouverture',
    rail: 'Le principe',
    align: 'left',
    // Le titre de niveau 1 et la ligne de marque sont désormais portés par le
    // plan d'ouverture vidéo : cet acte redevient un chapitre comme les autres.
    kicker: '00 — Le principe',
    title: ["Une dent n'est pas", 'une pièce détachée.'],
    body: "Dentisterie restauratrice, implantologie et orthodontie de l'adulte. Douze praticiens et prothésistes sous le même toit, un seul plan de traitement.",
    // Sans cette ligne, personne ne devine que la scène se manipule.
    hint: 'Glissez pour faire tourner',
  },
  {
    id: 'diagnostic',
    rail: 'Diagnostic',
    align: 'right',
    kicker: '01 — Le diagnostic',
    title: ["On regarde d'abord.", 'On agit ensuite.'],
    body: "Empreinte optique, imagerie 3D à faible dose, analyse de l'occlusion. Le premier rendez-vous ne comporte aucun soin : il sert à comprendre ce que vos dents subissent, et pourquoi.",
  },
  {
    id: 'plan',
    rail: 'Le plan',
    align: 'left',
    kicker: '02 — Le plan de traitement',
    title: ['Chaque dent tient', 'par ses voisines.'],
    body: 'Vous repartez avec un document écrit et chiffré, hiérarchisé en trois colonnes : ce qui est urgent, ce qui peut attendre, et ce que nous ne ferons pas.',
  },
  {
    id: 'implant',
    rail: 'Implantologie',
    align: 'right',
    kicker: '03 — Implantologie',
    title: ['Remplacer une racine,', 'pas seulement une dent.'],
    body: "Implant titane posé sous guide chirurgical imprimé d'après votre scanner. La couronne définitive arrive après l'ostéo-intégration, entre huit et douze semaines plus tard.",
  },
  {
    id: 'alignement',
    rail: 'Orthodontie',
    align: 'left',
    kicker: '04 — Orthodontie de l’adulte',
    title: ['Aligner sans', 'se cacher.'],
    body: 'Gouttières transparentes renouvelées toutes les deux semaines, et la simulation du résultat avant même le premier port. Durée moyenne chez l’adulte : neuf mois.',
  },
  {
    id: 'esthetique',
    rail: 'Esthétique',
    align: 'center',
    kicker: '05 — Esthétique',
    title: ['Le blanc qui reste', { text: 'crédible.', em: true }],
    body: "Éclaircissement au fauteuil, facettes céramique de trois dixièmes de millimètre collées sans mutiler l'émail. Nous nous arrêtons toujours une teinte avant la limite : c'est ce qui sépare un sourire soigné d'un sourire refait.",
  },
]

/** Fenêtre de progression pendant laquelle le texte d'un acte est à l'écran. */
export function actWindow(index) {
  const span = 1 / ACTS.length
  return [index * span - 0.06, (index + 1) * span + 0.02]
}
