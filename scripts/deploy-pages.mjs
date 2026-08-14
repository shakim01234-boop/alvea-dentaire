/**
 * Publication sur GitHub Pages.
 *
 *   npm run deploy
 *
 * Construit le site puis pousse `dist/` sur la branche `gh-pages`.
 *
 * Pourquoi pas GitHub Actions : le jeton disponible sur ce poste n'a pas la
 * portée `workflow`, il ne peut donc pas déposer de fichier dans
 * .github/workflows/. Publier depuis une branche ne demande que `repo`.
 *
 * L'authentification passe par le gestionnaire d'identifiants de `gh`
 * (`gh auth setup-git`). Aucun jeton n'est écrit dans ce dépôt.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIST = join(ROOT, 'dist')
const REMOTE = 'https://github.com/shakim01234-boop/alvea-dentaire.git'
const BRANCH = 'gh-pages'

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/index.html est absent — lance `npm run build` d’abord.')
  process.exit(1)
}

const git = (...args) =>
  execFileSync('git', args, { cwd: DIST, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim()

// Dépôt jetable dans dist/ : on republie toujours un historique d'une seule
// révision, la branche de publication n'a pas à conserver de passé.
rmSync(join(DIST, '.git'), { recursive: true, force: true })
git('init', '-q', '-b', BRANCH)
git('add', '-A')
git(
  '-c',
  'user.name=Shakim01234-boop',
  '-c',
  'user.email=shakim01234@gmail.com',
  'commit',
  '-q',
  '-m',
  'deploy: build pour GitHub Pages',
)
git('push', '-q', '-f', REMOTE, BRANCH)

console.log('publié → https://shakim01234-boop.github.io/alvea-dentaire/')
console.log('(GitHub met environ une minute à servir la nouvelle version)')
