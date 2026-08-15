/**
 * Détection d'entrée dans le champ.
 *
 * Remplace IntersectionObserver, qui s'est révélé imprévisible ici : certains
 * éléments ne recevaient jamais la moindre entrée, y compris avec un
 * observateur témoin posé à la main sur le même nœud. Sur une page pilotée par
 * un défilement interpolé, on préfère une mesure explicite dont on maîtrise
 * l'horloge à un mécanisme dont on subit la sienne.
 *
 * Un seul relevé pour toute la page, à 12 Hz. Mesurer une quarantaine de
 * rectangles douze fois par seconde ne coûte rien ; c'est le nombre de boucles
 * qui coûte, pas leur contenu.
 */

const watched = new Set()
let raf = 0
let last = 0

const INTERVAL = 84 // ms
const MARGIN = 0.08 // fraction de la hauteur d'écran retirée en bas

function tick(now) {
  raf = requestAnimationFrame(tick)
  if (now - last < INTERVAL) return
  last = now

  const height = window.innerHeight
  const limit = height * (1 - MARGIN)

  for (const item of watched) {
    const rect = item.el.getBoundingClientRect()
    // Visible dès qu'une part suffisante du bloc entre dans le champ.
    const seuil = Math.min(rect.height * 0.2, height * 0.25)
    const visible = rect.top + seuil < limit && rect.bottom - seuil > 0
    if (visible) {
      item.cb()
      watched.delete(item)
    }
  }

  if (!watched.size) {
    cancelAnimationFrame(raf)
    raf = 0
  }
}

/**
 * Appelle `cb` une seule fois, dès que l'élément entre dans le champ.
 * Renvoie une fonction d'annulation.
 */
export function onEnterView(el, cb) {
  if (!el || typeof window === 'undefined') return () => {}
  const item = { el, cb }
  watched.add(item)
  if (!raf) raf = requestAnimationFrame(tick)
  return () => watched.delete(item)
}
