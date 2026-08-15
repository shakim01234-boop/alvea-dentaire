import { useEffect, useRef, useState } from 'react'
import { asset } from '../lib/asset'
import { scroll, scrollToTarget } from '../lib/scroll'
import { LineReveal } from './Reveal.jsx'

/**
 * Plan d'ouverture.
 *
 * Le site s'ouvrait directement sur une dent, c'est-à-dire sur la technique,
 * sans jamais dire pourquoi. Ces trois plans — des gens qui rient, un visage
 * apaisé, un verre qu'on lève — posent l'enjeu avant la démonstration.
 *
 * Le plan est collant (`sticky`) sur une hauteur et demie d'écran : en
 * descendant, l'image s'agrandit et s'efface pour laisser apparaître la scène
 * 3D qui l'attend derrière. Aucune coupure entre les deux.
 */
export default function Intro() {
  const wrap = useRef(null)
  const video = useRef(null)
  // Deux définitions : le plan est cadré en `cover`, une source légère suffit
  // largement sur un écran de téléphone.
  const [src] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth <= 820
      ? '/video/intro-960.mp4'
      : '/video/intro-1600.mp4',
  )

  useEffect(() => {
    const el = wrap.current
    if (!el) return undefined
    let raf = 0
    const tick = () => {
      const p = scroll.intro
      el.style.setProperty('--intro', p.toFixed(4))
      // On coupe la lecture une fois le plan passé : une vidéo qui tourne hors
      // écran continue de décoder pour rien.
      const v = video.current
      if (v) {
        if (p > 0.98 && !v.paused) v.pause()
        else if (p <= 0.98 && v.paused) v.play().catch(() => {})
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <section id="intro" ref={wrap}>
      <div className="intro-sticky">
        <video
          ref={video}
          className="intro-video"
          src={asset(src)}
          poster={asset('/video/intro-poster.jpg')}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <div className="intro-veil" />

        <div className="intro-body">
          <span className="kicker">Alvéa — Cabinet dentaire, Paris 7e</span>
          <LineReveal as="h1" lines={['On ne soigne pas', 'des dents.']} delay={0.15} perWord />
          <p className="intro-lede">On soigne des gens qui s’en servent.</p>
        </div>

        <button
          type="button"
          className="intro-next"
          onClick={() => {
            const el = document.getElementById('ouverture')
            if (el) scrollToTarget(el)
          }}
        >
          Découvrir le cabinet
        </button>
      </div>
    </section>
  )
}
