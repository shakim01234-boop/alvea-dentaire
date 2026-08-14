import * as THREE from 'three'

/**
 * Carte de normales de l'émail.
 *
 * En ambiance claire, une dent parfaitement lisse ne rend rien : le fond est
 * clair, la dent est claire, et sans micro-relief il n'y a aucun accident de
 * lumière pour révéler la forme. Le vrai émail a des périkymaties — de fines
 * ondulations horizontales — et un grain irrégulier. On les fabrique ici.
 *
 * Générée en mémoire, sans fichier : rien à charger, rien à recompresser.
 * Elle est remplacée par la carte de normales du GLB dès qu'un modèle Meshy
 * est présent, celle-ci étant mesurée sur le maillage réel.
 */

// Générateur déterministe : deux chargements donnent la même surface.
function lcg(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function smoothNoise(size, cells, rand) {
  const grid = new Float32Array(cells * cells)
  for (let i = 0; i < grid.length; i++) grid[i] = rand()

  const out = new Float32Array(size * size)
  const scale = cells / size
  const fade = (t) => t * t * (3 - 2 * t)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = x * scale
      const fy = y * scale
      const x0 = Math.floor(fx)
      const y0 = Math.floor(fy)
      const tx = fade(fx - x0)
      const ty = fade(fy - y0)
      // Modulo sur la grille : la texture se répète sans couture.
      const i00 = (y0 % cells) * cells + (x0 % cells)
      const i10 = (y0 % cells) * cells + ((x0 + 1) % cells)
      const i01 = ((y0 + 1) % cells) * cells + (x0 % cells)
      const i11 = ((y0 + 1) % cells) * cells + ((x0 + 1) % cells)
      const top = grid[i00] + (grid[i10] - grid[i00]) * tx
      const bottom = grid[i01] + (grid[i11] - grid[i01]) * tx
      out[y * size + x] = top + (bottom - top) * ty
    }
  }
  return out
}

let cached = null

export function enamelNormalMap(size = 256) {
  if (cached) return cached

  const rand = lcg(20260813)
  const height = new Float32Array(size * size)

  // Grain fin sur trois octaves.
  let amplitude = 1
  let cells = 8
  for (let o = 0; o < 3; o++) {
    const layer = smoothNoise(size, cells, rand)
    for (let i = 0; i < height.length; i++) height[i] += layer[i] * amplitude
    amplitude *= 0.5
    cells *= 2
  }

  // Ondulations horizontales, serrées et de très faible amplitude : elles
  // donnent le glissé de la lumière sur une dent. Un premier réglage plus
  // généreux transformait l'émail en céramique tournée — l'accident doit se
  // deviner, pas se compter.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      height[i] += Math.sin((y / size) * Math.PI * 2 * 48 + height[i] * 3.4) * 0.03
    }
  }

  const data = new Uint8Array(size * size * 4)
  const at = (x, y) => height[((y + size) % size) * size + ((x + size) % size)]

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Différences centrées : la pente locale donne la normale.
      const dx = at(x + 1, y) - at(x - 1, y)
      const dy = at(x, y + 1) - at(x, y - 1)
      const n = new THREE.Vector3(-dx, -dy, 0.6).normalize()
      const i = (y * size + x) * 4
      data[i] = (n.x * 0.5 + 0.5) * 255
      data[i + 1] = (n.y * 0.5 + 0.5) * 255
      data[i + 2] = (n.z * 0.5 + 0.5) * 255
      data[i + 3] = 255
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 2)
  texture.needsUpdate = true
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter

  cached = texture
  return texture
}
