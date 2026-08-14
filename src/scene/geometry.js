import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

/**
 * Dents procédurales.
 *
 * Chaque dent est une sphère unité dont on module le rayon en fonction de la
 * direction du vertex. Le rayon est l'union lissée de deux volumes implicites :
 *   - la couronne  : une superellipsoïde (boîte arrondie, sommet plat)
 *   - les racines  : des lobes coniques orientés vers le bas
 * On sculpte ensuite le relief occlusal (cuspides en bosses, sillons en creux),
 * qui est ce qui accroche la lumière rasante à l'écran.
 *
 * Ces maillages sont des doublures : ils s'effacent dès qu'un GLB Meshy du même
 * nom est déposé dans public/models/ (voir useModel.js).
 */

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// Union lissée polynomiale — évite l'arête vive à la jonction couronne/racines.
const smax = (a, b, k) => {
  const h = Math.max(0, k - Math.abs(a - b)) / k
  return Math.max(a, b) + h * h * k * 0.25
}

/**
 * @param {THREE.Vector3} dir direction unitaire du vertex
 * @param {object} p préréglage de dent
 */
function toothRadius(dir, p) {
  const [ax, ay, az] = p.crown
  const e = p.exponent

  // Couronne : superellipsoïde. e élevé => sommet plat et flancs verticaux.
  const crown = Math.pow(
    Math.pow(Math.abs(dir.x) / ax, e) +
      Math.pow(Math.abs(dir.y) / ay, e) +
      Math.pow(Math.abs(dir.z) / az, e),
    -1 / e,
  )

  // Racines : un lobe par axe, fusionnés entre eux puis avec la couronne.
  let root = 0
  for (const axis of p.rootAxes) {
    const c = dir.dot(axis)
    if (c > 0) {
      root = smax(root, p.rootLength * Math.pow(c, p.rootSharpness), 0.22)
    }
  }

  let r = p.rootAxes.length ? smax(crown, root, p.blend) : crown

  // Relief de la face occlusale.
  if (dir.y > 0) {
    const a = Math.atan2(dir.z, dir.x)
    const top = smoothstep(0.28, 0.85, dir.y)

    if (p.cuspHeight) {
      r += p.cuspHeight * top * Math.pow(Math.abs(Math.sin(p.cuspCount * a)), 3)
    }
    if (p.apex) {
      // Pointe centrale (canines) : bombement indépendant de l'azimut.
      r += p.apex * smoothstep(0.42, 1, dir.y)
    }
    if (p.fissureDepth) {
      // Sillon en croix, aux azimuts 0°/90°/180°/270°.
      r -= p.fissureDepth * smoothstep(0.6, 1, dir.y) * Math.pow(Math.abs(Math.cos(2 * a)), 6)
    }
    if (p.edge) {
      // Bord libre des incisives : arête droite le long de l'axe mésio-distal.
      r -= p.edge * smoothstep(0.55, 1, dir.y) * Math.pow(Math.abs(Math.sin(a)), 2)
    }
  }

  return r
}

const DEFAULTS = {
  crown: [0.58, 0.5, 0.54],
  exponent: 3.4,
  rootAxes: [],
  rootLength: 1.15,
  rootSharpness: 5,
  blend: 0.26,
  cuspHeight: 0,
  cuspCount: 2,
  apex: 0,
  fissureDepth: 0,
  edge: 0,
}

const v = (x, y, z) => new THREE.Vector3(x, y, z).normalize()

export const TOOTH_PRESETS = {
  // Molaire : 4 cuspides, sillon en croix, 3 racines. C'est l'objet héros.
  // blend élevé : sans lui, le raccord entre la couronne et les racines creuse
  // un pli qui se lit comme une carie en gros plan.
  molar: {
    ...DEFAULTS,
    crown: [0.6, 0.52, 0.56],
    exponent: 3.6,
    rootAxes: [v(0.24, -1, 0.18), v(-0.24, -1, 0.18), v(0, -1, -0.26)],
    rootLength: 1.12,
    rootSharpness: 3.2,
    blend: 0.62,
    cuspHeight: 0.06,
    cuspCount: 2,
    fissureDepth: 0.052,
  },
  // Prémolaire : 2 cuspides, 1 racine élancée.
  premolar: {
    ...DEFAULTS,
    crown: [0.46, 0.54, 0.5],
    exponent: 3.2,
    rootAxes: [v(0.06, -1, 0.04)],
    rootLength: 1.32,
    rootSharpness: 5.5,
    cuspHeight: 0.075,
    cuspCount: 1,
    fissureDepth: 0.04,
  },
  // Canine : une seule pointe, racine la plus longue de l'arcade.
  canine: {
    ...DEFAULTS,
    crown: [0.4, 0.66, 0.44],
    exponent: 2.7,
    rootAxes: [v(0.04, -1, 0.02)],
    rootLength: 1.45,
    rootSharpness: 5.5,
    apex: 0.16,
  },
  // Incisive : lame plate à bord droit.
  incisor: {
    ...DEFAULTS,
    crown: [0.5, 0.68, 0.24],
    exponent: 3.4,
    rootAxes: [v(0, -1, 0.05)],
    rootLength: 1.3,
    rootSharpness: 6,
    edge: 0.05,
  },
  // Couronne seule (sans racine) : sert à l'aligneur et à l'implant.
  crownOnly: {
    ...DEFAULTS,
    crown: [0.58, 0.44, 0.54],
    exponent: 3.8,
    cuspHeight: 0.05,
    cuspCount: 2,
    fissureDepth: 0.045,
  },
}

const cache = new Map()

/**
 * Construit (et met en cache) la géométrie d'une dent.
 * detail 5 ≈ 20k triangles, detail 4 ≈ 5k — assez pour lire les sillons.
 */
export function buildTooth(name, detail = 5) {
  const key = `${name}:${detail}`
  const hit = cache.get(key)
  if (hit) return hit

  const preset = TOOTH_PRESETS[name]
  if (!preset) throw new Error(`Préréglage de dent inconnu : ${name}`)

  const base = new THREE.IcosahedronGeometry(1, detail)
  // On supprime uv/normal avant la fusion : leurs coutures empêcheraient les
  // vertices de se souder, et le lissage resterait facetté.
  base.deleteAttribute('uv')
  base.deleteAttribute('normal')

  const geo = mergeVertices(base)
  base.dispose()

  const pos = geo.attributes.position
  const dir = new THREE.Vector3()
  // Les uv d'origine ont été supprimées pour permettre la soudure ; on les
  // recalcule en projection sphérique à partir de la direction du sommet.
  // La couture arrière est invisible : ces uv ne servent qu'à une carte de
  // normales de grain, jamais à une texture figurative.
  const uv = new Float32Array(pos.count * 2)

  for (let i = 0; i < pos.count; i++) {
    dir.fromBufferAttribute(pos, i).normalize()
    uv[i * 2] = Math.atan2(dir.z, dir.x) / (Math.PI * 2) + 0.5
    uv[i * 2 + 1] = 1 - Math.acos(THREE.MathUtils.clamp(dir.y, -1, 1)) / Math.PI
    const r = toothRadius(dir, preset)
    pos.setXYZ(i, dir.x * r, dir.y * r, dir.z * r)
  }
  pos.needsUpdate = true
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))

  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  geo.computeBoundingBox()

  cache.set(key, geo)
  return geo
}

/**
 * Disposition d'une arcade : 8 dents par hémi-arcade, de l'incisive centrale à
 * la 3e molaire, réparties sur une ellipse (la vraie courbe d'une arcade n'est
 * pas un cercle : elle est plus étroite à l'avant).
 */
const HEMI_ARCH = [
  { type: 'incisor', angle: 0.15, scale: [0.4, 0.46, 0.4], lean: 0.1 },
  { type: 'incisor', angle: 0.44, scale: [0.33, 0.4, 0.34], lean: 0.12 },
  { type: 'canine', angle: 0.72, scale: [0.4, 0.46, 0.4], lean: 0.08 },
  { type: 'premolar', angle: 1.0, scale: [0.42, 0.42, 0.42], lean: 0.04 },
  { type: 'premolar', angle: 1.26, scale: [0.44, 0.42, 0.44], lean: 0.02 },
  { type: 'molar', angle: 1.53, scale: [0.5, 0.44, 0.5], lean: 0 },
  { type: 'molar', angle: 1.82, scale: [0.49, 0.42, 0.49], lean: -0.02 },
  { type: 'molar', angle: 2.1, scale: [0.44, 0.38, 0.44], lean: -0.04 },
]

export const ARCH_A = 1.28 // demi-largeur (mésio-distal)
export const ARCH_B = 1.62 // profondeur (antéro-postérieur)

/**
 * Renvoie la liste des dents d'une arcade complète (16), avec position,
 * rotation et échelle. `side` = -1 puis +1 pour miroiter l'hémi-arcade.
 */
export function archLayout() {
  const teeth = []
  for (const side of [-1, 1]) {
    HEMI_ARCH.forEach((t, i) => {
      const a = t.angle
      const x = side * ARCH_A * Math.sin(a)
      // +cos : les incisives sont vers +z, les molaires s'enfoncent vers -z.
      // L'arcade s'ouvre donc en s'éloignant du spectateur, et les molaires ne
      // viennent plus écraser le cadre au premier plan.
      const z = ARCH_B * Math.cos(a)
      // Orientation : la dent regarde vers l'extérieur de la courbe.
      const yaw = side * a
      teeth.push({
        key: `${side > 0 ? 'R' : 'L'}${i}`,
        type: t.type,
        position: [x, 0, z],
        rotation: [t.lean * Math.cos(a), yaw, -side * t.lean * Math.sin(a)],
        scale: t.scale,
        // Ordre d'apparition : du centre vers le fond, symétrique.
        order: i,
      })
    })
  }
  return teeth
}

/**
 * Implant : corps tronconique + filetage hélicoïdal réel.
 * Les générateurs 3D par IA ratent les vis (pas de filetage irrégulier ou fondu),
 * alors qu'un hélicoïde est trivial à calculer exactement.
 */
class HelixCurve extends THREE.Curve {
  constructor({ turns, height, radiusTop, radiusBottom }) {
    super()
    this.turns = turns
    this.height = height
    this.radiusTop = radiusTop
    this.radiusBottom = radiusBottom
  }

  getPoint(t, target = new THREE.Vector3()) {
    const angle = t * this.turns * Math.PI * 2
    // Le rayon décroît vers la pointe : une vis dentaire est conique.
    const r = THREE.MathUtils.lerp(this.radiusBottom, this.radiusTop, t)
    const y = -this.height / 2 + t * this.height
    return target.set(Math.cos(angle) * r, y, Math.sin(angle) * r)
  }
}

let implantCache = null

export function buildImplantThread() {
  if (implantCache) return implantCache
  const curve = new HelixCurve({
    turns: 9,
    height: 0.62,
    radiusTop: 0.088,
    radiusBottom: 0.042,
  })
  implantCache = new THREE.TubeGeometry(curve, 480, 0.016, 8, false)
  return implantCache
}

/**
 * Gouttière d'alignement : une coque continue, et non seize capuchons posés
 * côte à côte — c'est la continuité de la coque qui fait lire l'objet comme
 * une gouttière plutôt que comme un empilement.
 *
 * Un profil en Π (fermé en haut, ouvert vers la gencive) est balayé le long de
 * la courbe de l'arcade. Coque sans épaisseur, rendue en double face.
 */
const ALIGNER_PROFILE = [
  [0.32, -0.08],
  [0.32, 0.22],
  [0.27, 0.33],
  [0.13, 0.38],
  [0, 0.39],
  [-0.13, 0.38],
  [-0.27, 0.33],
  [-0.32, 0.22],
  [-0.32, -0.08],
]

let alignerCache = null

export function buildAlignerShell(samples = 160) {
  if (alignerCache) return alignerCache

  const A_MAX = 2.24 // couvre jusqu'à la dernière molaire de chaque côté
  const cols = samples + 1
  const rows = ALIGNER_PROFILE.length
  const positions = new Float32Array(cols * rows * 3)
  const indices = []

  for (let c = 0; c < cols; c++) {
    const a = -A_MAX + (2 * A_MAX * c) / samples
    const cx = ARCH_A * Math.sin(a)
    const cz = ARCH_B * Math.cos(a)
    // Normale extérieure de l'ellipse (le sens du balayage horizontal).
    let nx = ARCH_B * Math.sin(a)
    let nz = ARCH_A * Math.cos(a)
    const n = Math.hypot(nx, nz) || 1
    nx /= n
    nz /= n

    for (let r = 0; r < rows; r++) {
      const [u, y] = ALIGNER_PROFILE[r]
      const i = (c * rows + r) * 3
      positions[i] = cx + nx * u
      positions[i + 1] = y
      positions[i + 2] = cz + nz * u
    }
  }

  for (let c = 0; c < cols - 1; c++) {
    for (let r = 0; r < rows - 1; r++) {
      const a0 = c * rows + r
      const b0 = (c + 1) * rows + r
      indices.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  geo.computeBoundingSphere()

  alignerCache = geo
  return geo
}

export function disposeGeometryCache() {
  cache.forEach((g) => g.dispose())
  cache.clear()
  implantCache?.dispose()
  implantCache = null
  alignerCache?.dispose()
  alignerCache = null
}
