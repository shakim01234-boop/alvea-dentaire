import Lenis from 'lenis'
import { useEffect, useState } from 'react'

/**
 * Une seule source de vérité pour le défilement.
 *
 * `scroll.progress` va de 0 à 1 sur la hauteur de la séquence 3D uniquement
 * (pas sur la page entière) : la partie éditoriale qui suit défile normalement
 * par-dessus le canvas, qui reste fixe.
 *
 * La scène lit cette valeur dans useFrame — jamais via un state React, pour ne
 * pas déclencher un rendu React à chaque pixel défilé.
 */
export const scroll = {
  progress: 0,
  velocity: 0,
  /** true tant que la séquence 3D est à l'écran (sert à couper le rendu GPU) */
  active: true,
}

let lenis = null

export function initScroll() {
  if (lenis) return lenis

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  lenis = new Lenis({
    autoRaf: true,
    // Sans lissage si l'utilisateur a demandé moins d'animation : le défilement
    // redevient natif, la séquence reste pilotable mais ne « glisse » plus.
    lerp: reduced ? 1 : 0.09,
    wheelMultiplier: 0.9,
  })

  const update = () => {
    const el = document.getElementById('experience')
    if (!el) return
    const span = el.offsetHeight - window.innerHeight
    const y = window.scrollY || window.pageYOffset
    scroll.progress = span > 0 ? Math.min(1, Math.max(0, y / span)) : 0
    scroll.velocity = lenis.velocity || 0
    // Marge d'un demi-écran : on garde le rendu allumé un peu au-delà pour
    // éviter un gel visible quand on remonte.
    scroll.active = y < span + window.innerHeight * 0.5
  }

  lenis.on('scroll', update)
  window.addEventListener('resize', update)
  update()

  // Exposé pour l'inspection et les captures automatisées.
  window.__lenis = lenis
  window.__scroll = scroll

  return lenis
}

export function destroyScroll() {
  lenis?.destroy()
  lenis = null
}

/**
 * Version React de la progression, échantillonnée à ~15 Hz.
 * Réservée à l'habillage HTML (chapitrage, barre de progression) — surtout pas
 * à la scène 3D.
 */
export function useScrollProgress(sampleMs = 66) {
  const [p, setP] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setP(scroll.progress), sampleMs)
    return () => clearInterval(id)
  }, [sampleMs])
  return p
}

/** Interpolation clampée + lissée entre deux bornes de progression. */
export function range(p, a, b) {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Fenêtre : monte de a→b, reste à 1, redescend de c→d. */
export function window4(p, a, b, c, d) {
  return range(p, a, b) * (1 - range(p, c, d))
}
