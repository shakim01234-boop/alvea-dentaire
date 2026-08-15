import { useEffect, useRef, useState } from 'react'
import { scroll, scrollToTarget } from '../lib/scroll'

const LINKS = [
  { href: '#cabinet', label: 'Le cabinet' },
  { href: '#equipe', label: 'L’équipe' },
  { href: '#soins', label: 'Soins et honoraires' },
  { href: '#rendez-vous', label: 'Rendez-vous', cta: true },
]

/**
 * Barre de navigation.
 *
 * Trois comportements qui ne se voient que quand ils manquent :
 *   - les ancres passent par Lenis, sinon le saut natif se dispute le
 *     défilement avec l'interpolation en cours ;
 *   - la barre s'efface en descendant et revient en remontant — sur une page
 *     dont le sujet est une séquence plein écran, un bandeau permanent mange
 *     l'image ;
 *   - en dessous de 820 px les liens passent dans un volet plein écran, au lieu
 *     de disparaître purement et simplement comme c'était le cas.
 */
export default function Nav({ theme, onToggleTheme }) {
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const y = window.scrollY || 0
      const goingDown = y > lastY.current + 4
      const goingUp = y < lastY.current - 4
      if (goingDown && y > window.innerHeight * 0.6) setHidden(true)
      else if (goingUp) setHidden(false)
      if (goingDown || goingUp) lastY.current = y
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Volet ouvert : on gèle le défilement de la page derrière.
  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : ''
    return () => {
      document.documentElement.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (e, href) => {
    e.preventDefault()
    setOpen(false)
    if (href === '#top') {
      scrollToTarget(0)
      return
    }
    const el = document.querySelector(href)
    if (el) scrollToTarget(el)
  }

  return (
    <>
      <header className="nav" data-hidden={hidden && !open}>
        <a href="#top" className="wordmark" onClick={(e) => go(e, '#top')}>
          Alvé<span className="accent">a</span>
        </a>

        <nav className="nav-links">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={l.cta ? 'nav-cta' : undefined}
              onClick={(e) => go(e, l.href)}
            >
              {l.label}
            </a>
          ))}

          <ThemeToggle theme={theme} onToggle={onToggleTheme} />

          <button
            type="button"
            className="burger"
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        </nav>
      </header>

      <div className="menu" id="menu-mobile" data-open={open} aria-hidden={!open}>
        <nav>
          {LINKS.map((l, i) => (
            <a key={l.href} href={l.href} style={{ transitionDelay: `${0.06 + i * 0.06}s` }} onClick={(e) => go(e, l.href)}>
              <span className="menu-index">{String(i + 1).padStart(2, '0')}</span>
              {l.label}
            </a>
          ))}
        </nav>
        <p className="menu-foot">12 rue de Verneuil, 75007 Paris — 01 45 00 00 00</p>
      </div>
    </>
  )
}

function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-pressed={theme === 'dark'}
      aria-label={theme === 'light' ? 'Passer en ambiance sombre' : 'Passer en ambiance claire'}
      title={theme === 'light' ? 'Ambiance sombre' : 'Ambiance claire'}
    >
      <span className="theme-toggle-track">
        <span className="theme-toggle-knob" />
      </span>
      <span className="theme-toggle-label">{theme === 'light' ? 'Clair' : 'Sombre'}</span>
    </button>
  )
}

/** Rail de chapitrage, aligné sur les actes de la séquence. */
export function Rail({ acts, progress, intro = 1 }) {
  const index = Math.min(acts.length - 1, Math.floor(progress * acts.length))
  // Masqué tant que le plan d'ouverture occupe l'écran : un chapitrage qui
  // désigne un acte avant que la séquence ait commencé ne veut rien dire.
  const hidden = progress >= 0.999 || intro < 0.85

  return (
    <div className="rail" data-hidden={hidden}>
      {acts.map((act, i) => (
        <a
          className="rail-item"
          data-on={i === index}
          href={`#${act.id}`}
          key={act.id}
          onClick={(e) => {
            e.preventDefault()
            const el = document.getElementById(act.id)
            if (el) scrollToTarget(el)
          }}
        >
          <span>{act.rail}</span>
          <span className="rail-tick" />
        </a>
      ))}
    </div>
  )
}

export { scroll }
