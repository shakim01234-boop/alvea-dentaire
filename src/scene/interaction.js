import { consumeScrolled } from '../lib/scroll'

/**
 * Manipulation directe de la scène.
 *
 * On peut attraper le modèle et le faire tourner, à la souris comme au doigt.
 * Tout le problème est de ne pas voler son geste au défilement :
 *
 *   - à la souris, aucun conflit : un cliquer-glisser ne fait jamais défiler ;
 *   - au doigt, seul un geste **horizontal** prend la main. Un geste vertical
 *     reste au défilement, sans exception. La décision se prend au premier
 *     mouvement significatif et ne se rejuge plus jusqu'au relâchement, sinon
 *     un doigt qui dérive change d'avis en cours de route ;
 *   - pendant la descente, la rotation acquise se dissipe : la chorégraphie a
 *     besoin de son cadrage, et une scène laissée de travers fausserait tous
 *     les plans suivants.
 *
 * L'état est volontairement hors de React : il est lu image par image par la
 * scène, jamais rendu.
 */
export const drag = {
  yaw: 0,
  pitch: 0,
  /** vitesse résiduelle, pour l'inertie au relâchement */
  vYaw: 0,
  vPitch: 0,
  active: false,
}

const SENSITIVITY = 0.0055
const PITCH_LIMIT = 0.5
// Au doigt : au-delà de ce seuil on tranche, horizontal ou vertical.
const DECISION = 9

let listeners = null

export function initInteraction() {
  if (listeners || typeof window === 'undefined') return

  let lastX = 0
  let lastY = 0
  let startX = 0
  let startY = 0
  let mode = null // null (indécis) | 'rotate' | 'scroll'

  const begin = (x, y, decided) => {
    startX = lastX = x
    startY = lastY = y
    mode = decided
    if (decided === 'rotate') {
      drag.active = true
      drag.vYaw = 0
      drag.vPitch = 0
    }
  }

  const move = (x, y) => {
    if (mode === 'scroll') return false

    if (mode === null) {
      const dx = Math.abs(x - startX)
      const dy = Math.abs(y - startY)
      if (Math.max(dx, dy) < DECISION) return false
      // Horizontal franc, sinon le défilement garde la main.
      mode = dx > dy * 1.4 ? 'rotate' : 'scroll'
      if (mode === 'scroll') return false
      drag.active = true
      lastX = x
      lastY = y
    }

    const dx = (x - lastX) * SENSITIVITY
    const dy = (y - lastY) * SENSITIVITY
    lastX = x
    lastY = y

    drag.yaw += dx
    drag.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, drag.pitch + dy))
    drag.vYaw = dx
    drag.vPitch = dy
    return true
  }

  const end = () => {
    drag.active = false
    mode = null
  }

  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    // Un clic sur un lien, un bouton ou un champ n'est pas une prise en main.
    if (e.target.closest('a, button, input, select, textarea, label')) return
    begin(e.clientX, e.clientY, 'rotate')
  }
  const onPointerMove = (e) => {
    if (e.pointerType !== 'mouse' || !drag.active) return
    move(e.clientX, e.clientY)
  }

  const onTouchStart = (e) => {
    if (e.touches.length !== 1) return
    if (e.target.closest('a, button, input, select, textarea, label')) return
    begin(e.touches[0].clientX, e.touches[0].clientY, null)
  }
  const onTouchMove = (e) => {
    if (e.touches.length !== 1) return
    const rotated = move(e.touches[0].clientX, e.touches[0].clientY)
    // On ne bloque le défilement qu'une fois la rotation engagée, et jamais
    // avant : bloquer par précaution rendrait la page collante.
    if (rotated && e.cancelable) e.preventDefault()
  }

  window.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', end)
  window.addEventListener('pointercancel', end)
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', end)
  window.addEventListener('touchcancel', end)
  window.addEventListener('blur', end)

  // Exposé pour l'inspection et les tests automatisés.
  window.__drag = drag

  listeners = () => {
    window.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', end)
    window.removeEventListener('pointercancel', end)
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('touchend', end)
    window.removeEventListener('touchcancel', end)
    window.removeEventListener('blur', end)
    listeners = null
  }
}

export function destroyInteraction() {
  listeners?.()
  drag.yaw = 0
  drag.pitch = 0
  drag.vYaw = 0
  drag.vPitch = 0
  drag.active = false
}

/**
 * Fait évoluer la rotation d'une image à l'autre : inertie au relâchement, et
 * retour au cadrage d'origine dès que la page défile.
 */
export function stepInteraction(dt) {
  // La distance parcourue est consommée dans tous les cas, y compris pendant
  // une prise en main : sans ça elle s'accumulerait et la scène se remettrait
  // d'aplomb d'un coup au relâchement.
  const scrolled = consumeScrolled()
  if (drag.active) return

  // Inertie : le geste se prolonge puis s'éteint.
  drag.yaw += drag.vYaw
  drag.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, drag.pitch + drag.vPitch))
  const friction = Math.exp(-6 * dt)
  drag.vYaw *= friction
  drag.vPitch *= friction

  // Reprise du défilement : la scène se remet d'aplomb, à mesure de la distance
  // parcourue et non de la vitesse. Environ un demi-écran suffit à effacer les
  // deux tiers de la rotation — la chorégraphie récupère son cadrage sans que
  // le retour se remarque.
  if (scrolled > 0.5) {
    const back = Math.exp(-scrolled / 420)
    drag.yaw *= back
    drag.pitch *= back
    drag.vYaw *= back
    drag.vPitch *= back
  }
}
