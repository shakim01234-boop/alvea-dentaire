import { lazy, Suspense, useEffect, useState } from 'react'
import Boundary from './site/Boundary.jsx'
import Editorial from './site/Editorial.jsx'
import Intro from './site/Intro.jsx'
import Nav, { Rail } from './site/Nav.jsx'
import { LineReveal, WordReveal } from './site/Reveal.jsx'
import { ACTS, actWindow } from './lib/acts.jsx'
import { destroyScroll, initScroll, useIntroProgress, useScrollProgress } from './lib/scroll'
import { useReveal } from './lib/useReveal'
import { applyTheme, DEFAULT_THEME } from './lib/theme'
import { typo } from './lib/typo'

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
  const intro = useIntroProgress()

  useEffect(() => {
    initScroll()
    applyTheme(theme)
    // Laisse le temps à la première image 3D d'être calculée avant de lever le
    // voile : on ne montre jamais un canvas vide.
    const t = setTimeout(() => setBooted(true), 1500)
    return () => {
      clearTimeout(t)
      destroyScroll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      <Boundary label="scène 3D">
        <Suspense fallback={null}>
          <Experience theme={theme} />
        </Suspense>
      </Boundary>

      <Nav theme={theme} onToggleTheme={toggleTheme} />
      <Rail acts={ACTS} progress={progress} intro={intro} />

      <main id="top">
        <Intro />

        <div id="experience">
          {ACTS.map((act, i) => {
            const [from, to] = actWindow(i)
            const on = progress >= from && progress <= to
            return (
              <section
                className="act"
                key={act.id}
                id={act.id}
                data-align={act.align}
              >
                <div className="act-body" data-state={on ? 'in' : 'out'}>
                  <span className="kicker">{typo(act.kicker)}</span>
                  <LineReveal as="h2" lines={act.title} active={on} delay={0.06} />
                  <WordReveal text={act.body} active={on} delay={0.28} />
                  {act.hint && <span className="act-hint">{typo(act.hint)}</span>}
                </div>
              </section>
            )
          })}
        </div>

        <Editorial />
      </main>
    </>
  )
}
