/**
 * Typographie française.
 *
 * Les textes sont écrits au kilomètre dans les fichiers source, avec des
 * apostrophes droites et des espaces ordinaires — c'est confortable à écrire et
 * à relire. Les règles françaises sont appliquées ici, à l'affichage.
 *
 * Ce que ça corrige, et que l'œil remarque même sans savoir pourquoi :
 *   - l'apostrophe courbe ’ au lieu de la quote droite ' (le signe le plus
 *     fréquent d'un texte non composé) ;
 *   - l'espace fine insécable avant : ; ! ? et à l'intérieur des guillemets ;
 *   - l'insécable entre un nombre et son unité, pour qu'un prix ne se retrouve
 *     jamais coupé en fin de ligne.
 */

const NARROW = ' ' // espace fine insécable
const NBSP = ' ' // espace insécable

export function typo(input) {
  if (typeof input !== 'string') return input

  return (
    input
      // Apostrophe courbe entre deux lettres (accents compris).
      .replace(/(\p{L})'(\p{L})/gu, `$1’$2`)
      // Ponctuation double : espace fine insécable avant.
      .replace(/\s*([;:!?])/g, `${NARROW}$1`)
      // Guillemets français.
      .replace(/«\s*/g, `«${NARROW}`)
      .replace(/\s*»/g, `${NARROW}»`)
      // Séparateur de milliers : 1 800 ne doit pas se couper.
      .replace(/(\d)\s(?=\d{3}\b)/g, `$1${NARROW}`)
      // Nombre et unité.
      .replace(/(\d)\s*(€|%|h\b|min\b|mm\b|cm\b|m²)/g, `$1${NBSP}$2`)
      // Tiret demi-cadratin entouré d'insécables dans les fourchettes de prix.
      .replace(/(\d)\s*–\s*(\d)/g, `$1${NBSP}–${NBSP}$2`)
  )
}

/** Applique `typo` à toutes les chaînes d'une structure de données. */
export function typoDeep(value) {
  if (typeof value === 'string') return typo(value)
  if (Array.isArray(value)) return value.map(typoDeep)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = typoDeep(v)
    return out
  }
  return value
}
