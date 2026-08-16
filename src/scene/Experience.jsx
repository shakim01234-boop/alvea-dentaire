import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, ChromaticAberration, Noise } from '@react-three/postprocessing'
import { archLayout, buildAlignerShell, buildImplantThread, buildTooth } from './geometry'
import { Model } from './useModel.jsx'
import { enamelNormalMap } from './textures'
import { range, scroll, window4 } from '../lib/scroll'
import { THEMES, themeState } from '../lib/theme'
import { destroyInteraction, drag, initInteraction, stepInteraction } from './interaction'

/* ------------------------------------------------------------------ *
 * Repères de scène
 * ------------------------------------------------------------------ */

/**
 * La dent héros ouvre la séquence, puis sort par le haut pendant que l'arcade
 * se compose. Elle ne revient pas.
 *
 * Elle a d'abord rejoint l'arcade, puis y est revenue pour le plan final :
 * dans les deux cas elle se voyait comme une pièce rapportée, posée au milieu
 * des autres. Le maillage réel et les doublures n'ont ni la même densité ni la
 * même proportion couronne/racine — aucun réglage ne les réconcilie.
 *
 * Le plan final se joue donc sur les incisives, ce qui tombe juste : le
 * blanchiment et les facettes concernent le sourire, pas une molaire.
 */
const HERO_OUT = [0.95, 3.8, 0.1]
// Emplacement de la molaire gauche : laissé vide, c'est là que l'implant se visse.
const IMPLANT_SLOT = { position: [-1.279, 0, 0.066], yaw: -1.53 }
// Position de repos de la dent héros : décalée à droite pour dégager la colonne
// de texte, jamais au centre.
const HERO_REST = [0.95, 0.02, 0.1]

/**
 * Trajectoire de la caméra.
 * Règle appliquée partout : le point visé est décalé du côté du texte, ce qui
 * repousse l'objet 3D de l'autre côté du cadre. C'est ce décalage — et non un
 * calque noir — qui rend le texte lisible.
 */
const CAMERA_KEYS = [
  { t: 0.0, pos: [0.15, 0.05, 4.8], look: [0.15, 0.02, 0.2] },
  { t: 0.1, pos: [1.6, 0.4, 4.2], look: [0.5, 0, 0.2] },
  { t: 0.18, pos: [2.3, 0.1, 3.5], look: [0.7, -0.05, 0.15] },
  { t: 0.3, pos: [1.4, 2.2, 4.4], look: [0.5, 0, 0.2] },
  { t: 0.42, pos: [0.5, 4.6, 3.4], look: [0.5, 0, 0.35] },
  { t: 0.52, pos: [-0.6, 3.4, 3.8], look: [-0.4, 0, 0.3] },
  { t: 0.6, pos: [-2.9, 1.3, 2.9], look: [-0.95, -0.05, 0.15] },
  { t: 0.68, pos: [-2.3, 2.3, 3.5], look: [-0.7, 0, 0.25] },
  { t: 0.78, pos: [0.1, 4.4, 2.9], look: [-0.5, 0, 0.3] },
  // Acte esthétique : gros plan sur les incisives — c'est là que se joue le
  // sourire, et donc le blanchiment et les facettes.
  { t: 0.88, pos: [0.2, 1.0, 4.65], look: [0, 0.05, 1.5] },
  { t: 1.0, pos: [0.2, 2.6, 6.4], look: [0, 0, 0.6] },
]

const tmpA = new THREE.Vector3()
const tmpB = new THREE.Vector3()

function sampleKeys(p, outPos, outLook) {
  let i = 0
  while (i < CAMERA_KEYS.length - 2 && p > CAMERA_KEYS[i + 1].t) i++
  const a = CAMERA_KEYS[i]
  const b = CAMERA_KEYS[i + 1]
  const raw = THREE.MathUtils.clamp((p - a.t) / (b.t - a.t), 0, 1)
  const t = raw * raw * (3 - 2 * raw)
  outPos.set(...a.pos).lerp(tmpA.set(...b.pos), t)
  outLook.set(...a.look).lerp(tmpB.set(...b.look), t)
}

/* ------------------------------------------------------------------ *
 * Matières
 *
 * Les valeurs ci-dessous sont celles de l'ambiance sombre ; le ThemeRig les
 * réécrit image par image pendant la bascule. Le marqueur userData.themed est
 * ce qui permet de les retrouver dans la scène, y compris sur un modèle chargé
 * depuis un GLB.
 * ------------------------------------------------------------------ */

/**
 * Émail. Une dent ne se lit pas comme du plastique blanc : la lumière entre
 * dans l'émail et ressort teintée par la dentine. D'où transmission + épaisseur
 * + couleur d'atténuation chaude, et un vernis (clearcoat) par-dessus.
 */
const ENAMEL_GRAIN = enamelNormalMap()

const ENAMEL = {
  normalMap: ENAMEL_GRAIN,
  normalScale: new THREE.Vector2(0.12, 0.12),
  color: '#f7eddf',
  transmission: 0.62,
  thickness: 0.9,
  attenuationColor: '#d9a86f',
  attenuationDistance: 0.9,
  ior: 1.62,
  roughness: 0.13,
  metalness: 0,
  clearcoat: 1,
  clearcoatRoughness: 0.09,
  sheen: 0.4,
  sheenColor: '#fff4e2',
  sheenRoughness: 0.4,
  envMapIntensity: 1.15,
  userData: { themed: 'enamel' },
}

// Version sans transmission pour les dents secondaires : la transmission coûte
// une passe de rendu supplémentaire, on la réserve aux objets en gros plan.
const ENAMEL_LIGHT = {
  normalMap: ENAMEL_GRAIN,
  normalScale: new THREE.Vector2(0.08, 0.08),
  color: '#ece0cd',
  roughness: 0.24,
  metalness: 0,
  clearcoat: 1,
  clearcoatRoughness: 0.16,
  sheen: 0.55,
  sheenColor: '#ffe9c8',
  sheenRoughness: 0.5,
  envMapIntensity: 1,
  userData: { themed: 'enamelLight' },
}

const TITANIUM = {
  color: '#b9bcc2',
  metalness: 1,
  roughness: 0.28,
  envMapIntensity: 1.4,
  userData: { themed: 'titanium' },
}

// Gouttière : coque très fine. Une épaisseur élevée assombrirait la matière et
// donnerait un capuchon gris posé sur la dent au lieu d'un film de verre.
const ALIGNER = {
  color: '#f2f7fb',
  transmission: 0.92,
  thickness: 0.06,
  ior: 1.42,
  roughness: 0.09,
  metalness: 0,
  clearcoat: 1,
  clearcoatRoughness: 0.02,
  envMapIntensity: 2.2,
  transparent: true,
  opacity: 1,
  side: THREE.DoubleSide,
  userData: { themed: 'aligner' },
}

/* ------------------------------------------------------------------ *
 * Objets
 * ------------------------------------------------------------------ */

/** Récupère le premier matériau physique d'un sous-arbre (proxy ou GLB). */
function findMaterial(root) {
  let found = null
  root?.traverse?.((o) => {
    if (!found && o.isMesh && o.material) found = o.material
  })
  return found
}

function HeroTooth() {
  const group = useRef()
  const material = useRef(null)
  const geo = useMemo(() => buildTooth('molar', 5), [])

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const p = scroll.progress

    // 0 → 0.28   : seule, en lévitation.
    // 0.28 → 0.44 : elle s'élève et sort du cadre, l'arcade se compose.
    const away = range(p, 0.28, 0.44)
    const now = performance.now()

    g.visible = away < 0.999
    if (!g.visible) return

    g.position.lerpVectors(
      tmpA.set(HERO_REST[0], HERO_REST[1] + Math.sin(now * 0.0004) * 0.035, HERO_REST[2]),
      tmpB.set(...HERO_OUT),
      away,
    )
    g.scale.setScalar(THREE.MathUtils.lerp(1, 0.35, away))

    g.rotation.y = p * 3.4 + now * 0.00006
    // Inclinaison marquée : c'est ce qui donne à voir la face occlusale — les
    // cuspides et les sillons — plutôt qu'un profil muet.
    g.rotation.x = 0.34 + Math.sin(p * 6) * 0.05

    // Épaisseur optique animée : la dent s'allume de l'intérieur au gros plan.
    if (!material.current) material.current = findMaterial(g)
    const mat = material.current
    if (mat && mat.thickness !== undefined) {
      const glow = window4(p, 0.9, 0.96, 0.99, 1.0)
      mat.thickness = THREE.MathUtils.damp(mat.thickness, 0.85 + glow * 1.6, 4, dt)
    }
  })

  return (
    <group ref={group}>
      <Model
        url="/models/tooth-molar.glb"
        materialProps={ENAMEL}
        // Compromis assumé : un modèle réel n'a pas la proportion
        // couronne/racine de la doublure qu'il remplace. À hauteur totale égale
        // il dépassait de l'arcade ; réduit à la hauteur de couronne, sa
        // couronne devenait minuscule. On cale entre les deux.
        fitHeight={2.2}
        fallback={
          <mesh geometry={geo}>
            <meshPhysicalMaterial {...ENAMEL} />
          </mesh>
        }
      />
    </group>
  )
}

function ArchTooth({ tooth, geo }) {
  const ref = useRef()
  const [sx, sy, sz] = tooth.scale
  // Apparition en cascade, du centre de l'arcade vers le fond.
  const start = 0.33 + tooth.order * 0.014

  useFrame(() => {
    const m = ref.current
    if (!m) return
    const a = range(scroll.progress, start, start + 0.09)
    m.visible = a > 0.002
    if (!m.visible) return
    // Chaque dent descend en place depuis une position éclatée vers le haut.
    m.position.set(
      tooth.position[0] * (0.55 + 0.45 * a),
      (1 - a) * 1.6,
      tooth.position[2] * (0.55 + 0.45 * a),
    )
    m.scale.set(sx * a, sy * a, sz * a)
    m.rotation.set(tooth.rotation[0], tooth.rotation[1] + (1 - a) * 1.2, tooth.rotation[2])
  })

  return (
    <mesh ref={ref} geometry={geo} visible={false}>
      <meshPhysicalMaterial {...ENAMEL_LIGHT} />
    </mesh>
  )
}

function Arch() {
  const group = useRef()
  const geos = useMemo(
    () => ({
      incisor: buildTooth('incisor', 4),
      canine: buildTooth('canine', 4),
      premolar: buildTooth('premolar', 4),
      molar: buildTooth('molar', 4),
    }),
    [],
  )

  // Seule la première molaire gauche manque : c'est l'emplacement que
  // l'implant vient combler. L'arcade est complète partout ailleurs.
  const teeth = useMemo(() => archLayout().filter((t) => t.key !== 'L5'), [])

  useFrame(() => {
    const g = group.current
    if (!g) return
    g.visible = scroll.progress > 0.3
  })

  return (
    <group ref={group} visible={false}>
      <Model
        url="/models/arch-upper.glb"
        materialProps={ENAMEL_LIGHT}
        fitHeight={1.1}
        fallback={
          <>
            {teeth.map((t) => (
              <ArchTooth key={t.key} tooth={t} geo={geos[t.type]} />
            ))}
          </>
        }
      />
    </group>
  )
}

/**
 * Implant : filetage hélicoïdal calculé, pilier et couronne.
 * Il descend et se visse réellement — la rotation est couplée à la translation.
 */
function Implant() {
  const group = useRef()
  const screw = useRef()
  const thread = useMemo(() => buildImplantThread(), [])
  const crownGeo = useMemo(() => buildTooth('crownOnly', 4), [])

  useFrame(() => {
    const g = group.current
    if (!g) return
    const p = scroll.progress
    // Il apparaît, puis il RESTE. Il a d'abord été refermé après son acte, ce
    // qui rouvrait le trou qu'il venait de combler : l'arcade repartait
    // incomplète pour la gouttière et pour le plan final.
    const show = range(p, 0.5, 0.56)
    g.visible = show > 0.002
    if (!g.visible) return

    const drive = range(p, 0.53, 0.68)
    g.position.set(IMPLANT_SLOT.position[0], 1.15 - drive * 1.15, IMPLANT_SLOT.position[2])
    g.scale.setScalar(0.6 + show * 0.4)
    if (screw.current) screw.current.rotation.y = drive * Math.PI * 6
  })

  return (
    <group ref={group} visible={false} rotation={[0, IMPLANT_SLOT.yaw, 0]}>
      <group ref={screw} position={[0, -0.42, 0]}>
        <mesh geometry={thread}>
          <meshStandardMaterial {...TITANIUM} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.072, 0.032, 0.62, 32]} />
          <meshStandardMaterial {...TITANIUM} roughness={0.35} />
        </mesh>
      </group>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.062, 0.085, 0.22, 32]} />
        <meshStandardMaterial {...TITANIUM} roughness={0.2} />
      </mesh>
      {/* Couronne calée sur la hauteur des molaires voisines : posée trop haut,
          elle flottait au-dessus de l'arcade au lieu de la compléter. */}
      <mesh geometry={crownGeo} position={[0, 0.1, 0]} scale={[0.5, 0.4, 0.5]}>
        <meshPhysicalMaterial {...ENAMEL_LIGHT} />
      </mesh>
    </group>
  )
}

/** Gouttière transparente : coque continue qui descend et se pose sur l'arcade. */
function Aligner() {
  const group = useRef()
  const shell = useMemo(() => buildAlignerShell(), [])

  useFrame(() => {
    const g = group.current
    if (!g) return
    const p = scroll.progress

    // Elle se retire AVANT le gros plan esthétique. Elle restait auparavant en
    // scène à demi-transparente pendant celui-ci : une coque à alpha partiel
    // qui traverse une dent vue de très près se trie mal et affiche une tranche
    // plate en travers de l'émail.
    const enter = range(p, 0.68, 0.74)
    const leave = range(p, 0.79, 0.835)
    g.visible = enter > 0.002 && leave < 0.998
    if (!g.visible) return

    const drop = range(p, 0.68, 0.77)
    // Elle descend, se pose, puis se soulève et sort du cadre. Un départ
    // physique plutôt qu'un fondu : il ne reste jamais de voile à mi-opacité.
    g.position.y = (1 - drop) * 1.4 + leave * 2.2
    // Elle arrive légèrement écartée puis se referme : le geste de la pose.
    g.scale.set(1 + (1 - drop) * 0.1 + leave * 0.12, 1, 1 + (1 - drop) * 0.1 + leave * 0.12)

    const opacity = enter * (1 - leave)
    g.traverse((o) => {
      if (o.isMesh && o.material.transparent) o.material.opacity = opacity
    })
  })

  return (
    <group ref={group} visible={false}>
      <Model
        url="/models/aligner.glb"
        materialProps={ALIGNER}
        fitHeight={0.55}
        fallback={
          <mesh geometry={shell}>
            <meshPhysicalMaterial {...ALIGNER} />
          </mesh>
        }
      />
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * Fond
 * ------------------------------------------------------------------ */

/**
 * Sphère inversée à dégradé vertical, plutôt qu'une couleur de fond unie.
 * En clair, c'est indispensable : sur un aplat blanc, la silhouette des dents
 * disparaît. Le dégradé donne au fond une valeur qui change de haut en bas, et
 * le contour se redessine.
 */
function Backdrop({ materialRef }) {
  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color(THEMES.dark.backdropTop) },
      uBottom: { value: new THREE.Color(THEMES.dark.backdropBottom) },
    }),
    [],
  )

  return (
    <mesh scale={60} renderOrder={-1}>
      <sphereGeometry args={[1, 32, 32]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
        vertexShader={`
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 uTop;
          uniform vec3 uBottom;
          varying vec3 vPos;
          void main() {
            float h = smoothstep(-0.55, 0.75, normalize(vPos).y);
            gl_FragColor = vec4(mix(uBottom, uTop, h), 1.0);
          }
        `}
      />
    </mesh>
  )
}

/* ------------------------------------------------------------------ *
 * Lumière et bascule d'ambiance
 * ------------------------------------------------------------------ */

const cA = new THREE.Color()
const cB = new THREE.Color()

function Stage({ themeName }) {
  const backdrop = useRef()
  const ambient = useRef()
  const hemi = useRef()
  const key = useRef()
  const fill = useRef()
  const back = useRef()
  const sweep = useRef()
  const theme = THEMES[themeName]

  useFrame((state, dt) => {
    const p = scroll.progress

    // --- bascule d'ambiance, amortie -------------------------------------
    const target = themeState.name === 'light' ? 1 : 0
    const settled = Math.abs(themeState.mix - target) < 0.0015
    if (!settled) themeState.mix = THREE.MathUtils.damp(themeState.mix, target, 6, dt)
    else themeState.mix = target
    const m = themeState.mix
    const D = THEMES.dark
    const L = THEMES.light

    if (!settled || !state.scene.userData.themePrimed) {
      state.scene.userData.themePrimed = true

      state.gl.toneMappingExposure = THREE.MathUtils.lerp(D.exposure, L.exposure, m)

      if (backdrop.current) {
        backdrop.current.uniforms.uTop.value.lerpColors(
          cA.set(D.backdropTop),
          cB.set(L.backdropTop),
          m,
        )
        backdrop.current.uniforms.uBottom.value.lerpColors(
          cA.set(D.backdropBottom),
          cB.set(L.backdropBottom),
          m,
        )
      }
      if (state.scene.fog) {
        state.scene.fog.color.lerpColors(cA.set(D.fog), cB.set(L.fog), m)
        state.scene.fog.near = THREE.MathUtils.lerp(D.fogRange[0], L.fogRange[0], m)
        state.scene.fog.far = THREE.MathUtils.lerp(D.fogRange[1], L.fogRange[1], m)
      }
      if (ambient.current) ambient.current.intensity = THREE.MathUtils.lerp(D.ambient, L.ambient, m)
      if (hemi.current) {
        hemi.current.intensity = THREE.MathUtils.lerp(D.hemi.intensity, L.hemi.intensity, m)
        hemi.current.groundColor.lerpColors(cA.set(D.hemi.ground), cB.set(L.hemi.ground), m)
      }
      lerpLight(key.current, D.key, L.key, m)
      lerpLight(fill.current, D.fill, L.fill, m)
      lerpLight(back.current, D.back, L.back, m)

      // Les matières sont retrouvées par leur marqueur : le balayage fonctionne
      // aussi bien sur les doublures procédurales que sur un GLB chargé.
      state.scene.traverse((o) => {
        const mat = o.material
        const tag = mat?.userData?.themed
        if (!tag) return
        if (tag === 'enamel') {
          // Avec une texture de couleur, la teinte du matériau est un simple
          // multiplicateur : la faire varier salirait la texture au lieu de
          // changer l'ambiance.
          if (!mat.map) mat.color.lerpColors(cA.set(D.enamel.color), cB.set(L.enamel.color), m)
          mat.attenuationColor.lerpColors(cA.set(D.enamel.attenuation), cB.set(L.enamel.attenuation), m)
          mat.transmission = THREE.MathUtils.lerp(D.enamel.transmission, L.enamel.transmission, m)
          mat.roughness = THREE.MathUtils.lerp(D.enamel.roughness, L.enamel.roughness, m)
        } else if (tag === 'enamelLight') {
          mat.color.lerpColors(cA.set(D.enamelLight.color), cB.set(L.enamelLight.color), m)
          mat.roughness = THREE.MathUtils.lerp(D.enamelLight.roughness, L.enamelLight.roughness, m)
        } else if (tag === 'aligner') {
          mat.color.lerpColors(cA.set(D.aligner.color), cB.set(L.aligner.color), m)
        } else if (tag === 'titanium') {
          mat.color.lerpColors(cA.set(D.titanium.color), cB.set(L.titanium.color), m)
        }
      })
    }

    // --- balayage de lumière sur l'émail, acte esthétique ------------------
    if (sweep.current) {
      const on = range(p, 0.84, 0.9)
      sweep.current.intensity = on * THREE.MathUtils.lerp(D.sweep.intensity, L.sweep.intensity, m)
      // Le balayage passe devant les incisives, là où la caméra se pose.
      sweep.current.position.set(-2.4 + range(p, 0.85, 1.0) * 4.8, 0.9, 2.7)
    }
    if (key.current) key.current.position.x = state.camera.position.x * 0.35 + 1.6
  })

  return (
    <>
      <fog attach="fog" args={[theme.fog, ...theme.fogRange]} />
      <Backdrop materialRef={backdrop} />

      <ambientLight ref={ambient} intensity={theme.ambient} />
      <hemisphereLight
        ref={hemi}
        args={[theme.hemi.sky, theme.hemi.ground, theme.hemi.intensity]}
      />
      {/* Clé froide en haut-avant, contre-jour chaud derrière : c'est ce couple
          qui fait ressortir la translucidité au lieu de l'aplatir. */}
      <directionalLight ref={key} position={[2.4, 3.6, 2.2]} intensity={theme.key.intensity} color={theme.key.color} />
      <directionalLight ref={fill} position={[-3, 1.2, -2.4]} intensity={theme.fill.intensity} color={theme.fill.color} />
      <pointLight ref={back} position={[1.3, 0.35, -1.9]} intensity={theme.back.intensity} color={theme.back.color} distance={7} decay={2} />
      <pointLight ref={sweep} position={[-2.4, 1.2, 1.3]} intensity={0} color={theme.sweep.color} distance={6} decay={2} />

      {/* Environnement construit à la main : aucun HDRI à télécharger, et un
          contrôle exact des reflets qui dessinent le galbe de l'émail.
          Recalculé une seule fois par ambiance (clé sur le nom du thème). */}
      <Environment key={themeName} resolution={256} frames={1}>
        <mesh scale={40}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshBasicMaterial color={theme.env.inner} side={THREE.BackSide} />
        </mesh>
        <Lightformer form="rect" intensity={theme.env.top} scale={[8, 4, 1]} position={[0, 4, 3]} target={[0, 0, 0]} color="#dce9ff" />
        <Lightformer form="rect" intensity={theme.env.warm} scale={[6, 6, 1]} position={[-5, 1, 1]} target={[0, 0, 0]} color="#ffd9ad" />
        <Lightformer form="rect" intensity={theme.env.cool} scale={[6, 6, 1]} position={[5, 0, -2]} target={[0, 0, 0]} color="#9fc4ff" />
        <Lightformer form="ring" intensity={theme.env.ring} scale={3} position={[0, -3, 2]} target={[0, 0, 0]} color="#fff1e0" />
      </Environment>
    </>
  )
}

function lerpLight(light, from, to, m) {
  if (!light) return
  light.intensity = THREE.MathUtils.lerp(from.intensity, to.intensity, m)
  light.color.lerpColors(cA.set(from.color), cB.set(to.color), m)
}

/* ------------------------------------------------------------------ *
 * Caméra et post-traitement
 * ------------------------------------------------------------------ */

/**
 * Support de manipulation.
 *
 * La rotation de l'utilisateur s'applique à l'ensemble de la scène, et non à un
 * objet en particulier : chaque acte a son propre sujet — la dent, l'arcade,
 * l'implant, la gouttière — et il n'y aurait aucun sens à ce que la prise en
 * main change de cible en cours de route.
 */
function Rig({ children }) {
  const group = useRef()

  useEffect(() => {
    initInteraction()
    return destroyInteraction
  }, [])

  useFrame((_, dt) => {
    stepInteraction(dt)
    const g = group.current
    if (!g) return
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, drag.yaw, 12, dt)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, drag.pitch, 12, dt)
  })

  return <group ref={group}>{children}</group>
}

function CameraRig() {
  const pos = useMemo(() => new THREE.Vector3(0, 0.05, 4), [])
  const look = useMemo(() => new THREE.Vector3(), [])
  const current = useMemo(() => new THREE.Vector3(), [])
  const mouse = useRef({ x: 0, y: 0 })

  useFrame((state, dt) => {
    sampleKeys(scroll.progress, pos, look)

    // Écran étroit : on recule le long de l'axe de visée. La chorégraphie est
    // cadrée pour du 16:9, où le sujet est volontairement décalé du côté opposé
    // au texte ; en portrait ce décalage n'a plus de sens — il ne fait que
    // sortir le sujet du cadre. Reculer réduit à la fois le décalage angulaire
    // et la taille apparente : le sujet revient entier et centré.
    const aspect = state.viewport.aspect || state.size.width / state.size.height
    if (aspect < 0.95) {
      const pull = THREE.MathUtils.lerp(2, 1, THREE.MathUtils.clamp((aspect - 0.45) / 0.5, 0, 1))
      pos.sub(look).multiplyScalar(pull).add(look)
    }

    // Parallaxe souris très légère : la scène respire même à l'arrêt.
    mouse.current.x = THREE.MathUtils.damp(mouse.current.x, state.pointer.x, 3, dt)
    mouse.current.y = THREE.MathUtils.damp(mouse.current.y, state.pointer.y, 3, dt)

    const cam = state.camera
    cam.position.x = THREE.MathUtils.damp(cam.position.x, pos.x + mouse.current.x * 0.22, 5, dt)
    cam.position.y = THREE.MathUtils.damp(cam.position.y, pos.y + mouse.current.y * 0.14, 5, dt)
    cam.position.z = THREE.MathUtils.damp(cam.position.z, pos.z, 5, dt)

    current.lerp(look, 1 - Math.exp(-6 * dt))
    cam.lookAt(current)

    // Respiration de l'objectif : la focale s'élargit très légèrement quand on
    // défile vite, et revient au repos. Ça ne se voit pas, ça se sent — la
    // séquence donne l'impression de répondre au geste plutôt que de le subir.
    const speed = Math.min(1, Math.abs(scroll.velocity) / 45)
    const targetFov = 35 + speed * 2.4
    if (Math.abs(cam.fov - targetFov) > 0.01) {
      cam.fov = THREE.MathUtils.damp(cam.fov, targetFov, 4, dt)
      cam.updateProjectionMatrix()
    }
  })

  return null
}

/**
 * La pile d'effets est choisie une fois pour toutes au montage.
 * Elle a d'abord été rendue adaptative, et changer les enfants d'un
 * EffectComposer déjà en marche le laissait rendre un écran noir. La qualité se
 * décide donc au démarrage ; seuls les réglages varient ensuite.
 *
 * Pas de profondeur de champ : essayée à distance fixe puis asservie au point
 * visé, elle effaçait l'image sur les plans rapprochés. Sur des objets isolés,
 * elle ne valait pas une passe de profondeur.
 */
function Effects({ quality, themeName }) {
  const aberration = useMemo(() => new THREE.Vector2(0.0004, 0.0007), [])
  const t = THEMES[themeName]

  if (quality === 'low') {
    return (
      <EffectComposer multisampling={0}>
        <Bloom intensity={t.bloom.intensity} luminanceThreshold={t.bloom.threshold} luminanceSmoothing={0.3} mipmapBlur />
        <Vignette eskil={false} offset={t.vignette.offset} darkness={t.vignette.darkness} />
      </EffectComposer>
    )
  }

  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={t.bloom.intensity} luminanceThreshold={t.bloom.threshold} luminanceSmoothing={0.2} mipmapBlur />
      <ChromaticAberration offset={aberration} />
      <Noise opacity={t.grain} />
      <Vignette eskil={false} offset={t.vignette.offset} darkness={t.vignette.darkness} />
    </EffectComposer>
  )
}

/* ------------------------------------------------------------------ *
 * Canvas
 * ------------------------------------------------------------------ */

export default function Experience({ theme = 'dark' }) {
  // ?fx=low force le rendu allégé, ?fx=off coupe le post-traitement.
  // Sert au diagnostic : c'est le moyen le plus court de savoir si un défaut
  // vient de la scène ou d'un effet.
  const fx = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('fx') : null
  const [quality] = useState(() => {
    if (fx === 'low') return 'low'
    if (fx === 'high') return 'high'
    if (typeof window === 'undefined') return 'high'
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const weak = (navigator.hardwareConcurrency || 8) <= 4
    return coarse || weak ? 'low' : 'high'
  })
  const [dpr, setDpr] = useState(1.5)
  const [running, setRunning] = useState(true)

  // Le rendu s'arrête quand la séquence sort de l'écran : la partie éditoriale
  // qui suit ne doit rien coûter au GPU. La boucle de surveillance vit hors de
  // R3F, sinon elle se figerait avec le canvas.
  useEffect(() => {
    let raf = 0
    let last = true
    const tick = () => {
      const on = scroll.active && document.visibilityState === 'visible'
      if (on !== last) {
        last = on
        setRunning(on)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <Canvas
      className="canvas"
      dpr={dpr}
      frameloop={running ? 'always' : 'never'}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
      camera={{ fov: 35, near: 0.1, far: 90, position: [0, 0.05, 4] }}
    >
      {/* N'agit que sur la résolution : la pile d'effets, elle, ne bouge plus. */}
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)} />
      <Stage themeName={theme} />
      <CameraRig />
      <Rig>
        <HeroTooth />
        <Arch />
        <Implant />
        <Aligner />
      </Rig>
      {fx !== 'off' && <Effects quality={quality} themeName={theme} />}
    </Canvas>
  )
}
