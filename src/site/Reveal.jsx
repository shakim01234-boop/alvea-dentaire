import { useEffect, useRef, useState } from 'react'

/**
 * Apparitions de texte.
 *
 * Deux traitements, choisis selon la nature du texte :
 *
 *   LineReveal — pour les grands titres. Chaque ligne monte depuis un masque,
 *     décalée de la précédente. C'est l'effet le plus coûteux à réussir et le
 *     plus lisible : il demande de connaître les lignes, donc les titres sont
 *     écrits ligne par ligne dans acts.jsx plutôt que laissés au retour à la
 *     ligne automatique.
 *
 *   WordReveal — pour les paragraphes, dont on ne peut pas connaître les
 *     lignes à l'avance. Chaque mot se dévoile en glissant et en se
 *     défloutant. Aucun masque, donc aucun risque de couper les jambages.
 *
 * Les deux ont trois états : au repos, entrant, sortant. La sortie prolonge le
 * mouvement d'entrée vers le haut au lieu de le rembobiner — c'est ce détail
 * qui distingue une transition d'un simple fondu inversé.
 */

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function useRevealState(ref, controlled) {
  const [visible, setVisible] = useState(false)
  const hasEntered = useRef(false)

  useEffect(() => {
    if (controlled !== undefined) return undefined
    const el = ref.current
    if (!el) return undefined
    if (reduced()) {
      setVisible(true)
      return undefined
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, controlled])

  const on = controlled !== undefined ? controlled : visible
  if (on) hasEntered.current = true
  if (on) return 'in'
  return hasEntered.current ? 'out' : 'idle'
}

export function LineReveal({
  as: Tag = 'h2',
  lines,
  active,
  delay = 0,
  stagger = 0.09,
  className = '',
  ...rest
}) {
  const ref = useRef(null)
  const state = useRevealState(ref, active)

  return (
    <Tag ref={ref} className={`reveal-lines ${className}`.trim()} data-state={state} {...rest}>
      {lines.map((line, i) => {
        const text = typeof line === 'string' ? line : line.text
        const emphasised = typeof line === 'object' && line.em
        return (
          <span className="line" key={i}>
            <span className="line-i" style={{ transitionDelay: `${delay + i * stagger}s` }}>
              {emphasised ? <em>{text}</em> : text}
            </span>
          </span>
        )
      })}
    </Tag>
  )
}

export function WordReveal({
  as: Tag = 'p',
  text,
  active,
  delay = 0,
  stagger = 0.018,
  className = '',
  ...rest
}) {
  const ref = useRef(null)
  const state = useRevealState(ref, active)
  const words = text.split(' ')

  return (
    <Tag ref={ref} className={`reveal-words ${className}`.trim()} data-state={state} {...rest}>
      {words.map((w, i) => (
        <span className="w" key={i} style={{ transitionDelay: `${delay + i * stagger}s` }}>
          {w}
        </span>
      ))}
    </Tag>
  )
}

/**
 * Compteur. Le décompte ne part que lorsque le chiffre entre à l'écran, et il
 * conserve exactement le format d'origine (espaces insécables compris) :
 * « 2 400 » ne doit pas devenir « 2400 » en cours d'animation.
 */
export function Counter({ value, duration = 1400, className = '' }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(null)
  const target = Number(String(value).replace(/[^\d]/g, ''))

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (reduced() || !Number.isFinite(target)) {
      setShown(target)
      return undefined
    }

    let raf = 0
    let start = 0
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        const step = (now) => {
          if (!start) start = now
          const t = Math.min(1, (now - start) / duration)
          // Décélération franche : le chiffre file puis se pose.
          const eased = 1 - Math.pow(1 - t, 4)
          setShown(Math.round(target * eased))
          if (t < 1) raf = requestAnimationFrame(step)
        }
        raf = requestAnimationFrame(step)
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [target, duration])

  const display = shown === null ? '0' : shown.toLocaleString('fr-FR').replace(/ | /g, ' ')

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  )
}
