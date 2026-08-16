/**
 * Deux ambiances, un seul système.
 *
 * Le passage au blanc n'est pas une inversion de couleurs : c'est un autre
 * problème d'éclairage. Sur fond sombre, une dent se détache par sa clarté ;
 * sur fond blanc, elle a exactement la valeur du fond et ne se lit plus que par
 * l'ombre, le galbe et le reflet. D'où, en clair : une clé beaucoup plus forte,
 * une lumière hémisphérique au sol foncé pour creuser les dessous, une
 * transmission poussée pour que l'intérieur de l'émail s'allume en ambre contre
 * le blanc — et presque plus de bloom, qui ferait fondre l'objet dans le fond.
 */

export const THEMES = {
  dark: {
    backdropTop: '#0d1219',
    backdropBottom: '#04060a',
    fog: '#06080b',
    fogRange: [9, 22],
    exposure: 1,
    ambient: 0.16,
    hemi: { sky: '#ffffff', ground: '#000000', intensity: 0 },
    key: { color: '#e9f1ff', intensity: 1.25 },
    fill: { color: '#ffcf9a', intensity: 0.7 },
    back: { color: '#ffb974', intensity: 9 },
    sweep: { color: '#fff2d8', intensity: 26 },
    env: { inner: '#0a0d12', top: 5, warm: 3, cool: 2.2, ring: 2.6 },
    enamel: { color: '#f7eddf', attenuation: '#d9a86f', transmission: 0.62, roughness: 0.13 },
    enamelLight: { color: '#ece0cd', roughness: 0.24 },
    aligner: { color: '#f2f7fb' },
    titanium: { color: '#b9bcc2', roughness: 0.28 },
    bloom: { intensity: 0.38, threshold: 0.88 },
    vignette: { offset: 0.22, darkness: 0.8 },
    grain: 0.022,
  },
  light: {
    // Le bas du fond est nettement plus soutenu que le haut : c'est contre lui
    // que se détache le bas des dents, sinon la silhouette se dissout.
    // Fond en demi-teinte, pas en blanc pur : la dent doit être plus claire que
    // ce sur quoi elle se détache, comme sur un fond de studio en papier.
    backdropTop: '#efe8dc',
    backdropBottom: '#b7ab96',
    fog: '#ded6c8',
    fogRange: [14, 34],
    // L'exposition est le vrai levier du blanc : à 1, tous les hauts de gamme
    // se collaient à 255 et la dent devenait une tache sans relief.
    exposure: 0.66,
    // Ambiante volontairement basse. Le premier réglage, plus généreux, noyait
    // les cuspides et les sillons : sur fond clair, c'est l'ombre qui dessine.
    ambient: 0.3,
    // Ciel clair, sol foncé : ce dégradé vertical redonne un modelé aux dents
    // quand le fond est aussi clair qu'elles.
    hemi: { sky: '#ffffff', ground: '#5f5648', intensity: 0.95 },
    key: { color: '#fff8ee', intensity: 1.5 },
    fill: { color: '#9dbde8', intensity: 0.7 },
    back: { color: '#ffbe79', intensity: 2.8 },
    sweep: { color: '#ffc98a', intensity: 10 },
    env: { inner: '#cfc5b4', top: 2.6, warm: 1.6, cool: 1.2, ring: 0.9 },
    // Transmission réduite, pas augmentée : dans un environnement lumineux,
    // trop de transmission inonde la dent et efface tout son relief.
    // Atténuation adoucie depuis l'arrivée du maillage réel : ses parois sont
    // plus épaisses que celles de la doublure, le trajet optique est plus long,
    // et une atténuation trop orangée virait franchement au rose.
    enamel: { color: '#f9f3e8', attenuation: '#dcb68a', transmission: 0.3, roughness: 0.2 },
    enamelLight: { color: '#eee3d1', roughness: 0.3 },
    aligner: { color: '#f6fafd' },
    titanium: { color: '#8f949c', roughness: 0.22 },
    bloom: { intensity: 0.07, threshold: 0.97 },
    vignette: { offset: 0.4, darkness: 0.55 },
    grain: 0.014,
  },
}

export const DEFAULT_THEME = 'light'

/**
 * État partagé avec la scène 3D.
 * `mix` va de 0 (sombre) à 1 (clair) et est amorti image par image : la bascule
 * est un fondu, pas une coupure.
 */
export const themeState = {
  name: DEFAULT_THEME,
  mix: DEFAULT_THEME === 'light' ? 1 : 0,
}

export function applyTheme(name) {
  themeState.name = name
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = name
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      name === 'light' ? '#f4f1ea' : '#06080b',
    )
  }
}
