import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Le site est servi depuis un sous-chemin sur GitHub Pages
// (https://<compte>.github.io/alvea-dentaire/). Sans ce `base`, tous les
// chemins absolus — bundles, modèles 3D, portraits — pointeraient vers la
// racine du domaine et la page arriverait vide.
// En développement, `base` reste '/' pour ne rien changer aux habitudes.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/alvea-dentaire/' : '/',
  plugins: [react()],
}))
