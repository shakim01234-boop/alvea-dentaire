import { lazy, Suspense, useEffect, useState } from 'react'
import Editorial from './site/Editorial.jsx'
import { LineReveal, WordReveal } from './site/Reveal.jsx'
import { ACTS, actWindow } from './lib/acts.jsx'
import { destroyScroll, initScroll, useScrollProgress } from './lib/scroll'
import { useReveal } from './lib/useReveal'
import { applyTheme, DEFAULT_THEME } from './lib/theme'

// three.js, drei et la pile d'effets pèsent l'essentiel du bundle. En les
// chargeant à part, le texte s'affiche sans attendre le moteur 3D.
const Experience = lazy(() => import('./scene/Experience.jsx'))

export default function App() {
  const [booted, setBooted] = useState(false)
  // ?theme=dark permet de charger directement l'autre ambiance (captures, revue).
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME
    const asked = new URLSearchParams(window.location.search).get('theme')
    return asked === 'dark' || asked === 'light' ? asked : DEFAULT_THEME
  })
  const progress = useScrollProgress()

  useEffect(() => {
    initScroll()
    applyTheme(theme)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Laisse le temps à la première image 3D d'être calculée avant de lever le
    // voile : on ne montre jamais un canvas vide.
    const t = setTimeout(() => setBooted(true), 1500)
    return () => {
      clearTimeout(t)
      destroyScroll()
    }
  }, [])

  // Apparition des blocs (cartes, lignes de tarifs, chiffres) — les textes,
  // eux, ont leur propre traitement dans Reveal.jsx.
  useReveal()

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    applyTheme(next)
  }

  return (
    <>
      <div className="boot" data-done={booted}>
        <div className="boot-inner">
          <div className="boot-mark">
            Alvé<span className="accent">a</span>
          </div>
          <div className="boot-bar">
            <i />
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <Experience theme={theme} />
      </Suspense>

      <header className="nav">
        <a href="#top" className="wordmark">
          Alvé<span className="accent">a</span>
        </a>
        <nav className="nav-links">
          <a href="#cabinet">Le cabinet</a>
          <a href="#equipe">L'équipe</a>
          <a href="#soins">Soins et honoraires</a>
          <a href="#rendez-vous" className="nav-cta">
            Rendez-vous
          </a>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-pressed={theme === 'dark'}
            aria-label={theme === 'light' ? 'Passer en ambiance sombre' : 'Passer en ambiance claire'}
            title={theme === 'light' ? 'Ambiance sombre' : 'Ambiance claire'}
          >
            <span className="theme-toggle-track">
              <span className="theme-toggle-knob" />
            </span>
            <span className="theme-toggle-label">{theme === 'light' ? 'Clair' : 'Sombre'}</span>
          </button>
        </nav>
      </header>

      <Rail progress={progress} />

      <main id="top">
        <div id="experience">
          {ACTS.map((act, i) => {
            const [from, to] = actWindow(i)
            const on = progress >= from && progress <= to
            return (
              <section className="act" key={act.id} id={act.id} data-align={act.align}>
                <div className="act-body" data-state={on ? 'in' : 'out'}>
                  <span className="kicker">{act.kicker}</span>
                  <LineReveal
                    as={act.hero ? 'h1' : 'h2'}
                    lines={act.title}
                    active={on}
                    delay={0.06}
                  />
                  <WordReveal text={act.body} active={on} delay={0.28} />
                </div>
                {act.hero && <div className="hint">Faites défiler</div>}
              </section>
            )
          })}
        </div>

        <Editorial />
      </main>
    </>
  )
}

/** Chapitrage discret : indique où l'on se trouve dans la séquence. */
function Rail({ progress }) {
  const index = Math.min(ACTS.length - 1, Math.floor(progress * ACTS.length))
  const hidden = progress >= 0.999

  return (
    <div className="rail" data-hidden={hidden}>
      {ACTS.map((act, i) => (
        <a className="rail-item" data-on={i === index} href={`#${act.id}`} key={act.id}>
          <span>{act.rail}</span>
          <span className="rail-tick" />
        </a>
      ))}
    </div>
  )
}
