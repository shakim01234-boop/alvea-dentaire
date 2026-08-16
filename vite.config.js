import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Le site est servi depuis un sous-chemin sur GitHub Pages
// (https://<compte>.github.io/alvea-dentaire/). Sans ce `base`, tous les
// chemins absolus — bundles, modèles 3D, portraits — pointeraient vers la
// racine du domaine et la page arriverait vide.
//
// `isPreview` compte autant que `build` : l'aperçu ne sert à vérifier une
// version de production que s'il la sert dans les mêmes conditions, sous-chemin
// compris. Sans ça, il chargeait la racine et ne prouvait rien.
// En développement, `base` reste '/' pour ne rien changer aux habitudes.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/alvea-dentaire/' : '/',
  plugins: [react()],
}))
