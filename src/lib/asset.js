/**
 * Résout un chemin de fichier statique.
 *
 * Le site est servi à la racine en développement, mais sous un sous-chemin sur
 * GitHub Pages (`/alvea-dentaire/`). Un chemin absolu écrit en dur pointerait
 * alors vers la racine du domaine : les modèles 3D et les portraits
 * renverraient 404, sans la moindre erreur visible à part des cadres vides.
 *
 *   asset('/models/tooth-molar.glb')  →  '/alvea-dentaire/models/tooth-molar.glb'
 */
export function asset(path) {
  const base = import.meta.env.BASE_URL || '/'
  return `${base.replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`
}
