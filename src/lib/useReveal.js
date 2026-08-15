import { useEffect } from 'react'
import { onEnterView } from './inview'

/**
 * Apparition des blocs (cartes, chiffres, lignes de tarifs) à l'entrée dans le
 * champ. Les textes, eux, ont leur propre traitement dans Reveal.jsx.
 *
 * Passe par le relevé partagé de `inview.js` plutôt que par
 * IntersectionObserver, pour la même raison : une horloge que l'on maîtrise.
 */
export function useReveal() {
  useEffect(() => {
    const nodes = [...document.querySelectorAll('.reveal')]
    if (!nodes.length) return undefined

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      nodes.forEach((n) => n.classList.add('in'))
      return undefined
    }

    const stops = nodes.map((n) => onEnterView(n, () => n.classList.add('in')))
    return () => stops.forEach((stop) => stop())
  }, [])
}
