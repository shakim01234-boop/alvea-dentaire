import { Component, useEffect, useState, useMemo, Suspense } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { asset } from '../lib/asset'

/**
 * Bascule automatique doublure procédurale → GLB Meshy.
 *
 * On ne peut pas savoir à la compilation si un fichier a été déposé dans
 * public/models/ : on sonde donc l'URL au démarrage. Tant que le fichier est
 * absent, la géométrie procédurale reste en place et le site fonctionne.
 * Dès qu'il est là, il prend la main sans une ligne à changer.
 *
 * Deux traitements sont appliqués au modèle chargé, sans lesquels le
 * remplacement ne serait pas transparent :
 *   1. la matière est réécrite (voir plus bas)
 *   2. le modèle est recentré et remis à l'échelle de la scène
 */

const probes = new Map()

function probe(url) {
  if (probes.has(url)) return probes.get(url)

  // GET sur deux octets plutôt que HEAD : le serveur de développement répond
  // 404 aux HEAD sur les fichiers statiques, et un fichier bien présent était
  // alors déclaré absent.
  //
  // Le paramètre `?probe=1` est indispensable : sans lui, la sonde et le
  // chargement réel partagent la même entrée de cache. En production, le
  // serveur honore le Range, et la réponse partielle de deux octets était
  // ensuite resservie au chargeur, qui recevait « gl » au lieu du fichier.
  // `no-store` complète la ceinture.
  const p = fetch(`${url}?probe=1`, { headers: { Range: 'bytes=0-1' }, cache: 'no-store' })
    .then((r) => {
      // Certains serveurs renvoient index.html pour un chemin inconnu :
      // un content-type HTML signifie « absent », pas « prêt ».
      const type = r.headers.get('content-type') || ''
      return (r.ok || r.status === 206) && !type.includes('text/html')
    })
    .catch(() => false)
  probes.set(url, p)
  return p
}

export function useModelAvailable(url) {
  const [available, setAvailable] = useState(false)
  useEffect(() => {
    let alive = true
    probe(url).then((ok) => alive && setAvailable(ok))
    return () => {
      alive = false
    }
  }, [url])
  return available
}

function LoadedModel({ url, materialProps, fitHeight, onReady, ...props }) {
  // useDraco = false : le décodeur Draco est téléchargé depuis un CDN Google.
  // Les modèles sont compressés en meshopt, dont le décodeur est embarqué —
  // le site n'a ainsi aucune dépendance réseau externe.
  const { scene } = useGLTF(url, false)

  const prepared = useMemo(() => {
    const root = scene.clone(true)

    if (materialProps) {
      // La matière du fichier est remplacée, mais ses deux cartes utiles sont
      // reprises :
      //   - les normales, qui portent tout le relief d'un maillage souvent
      //     très léger — c'est elles qui font la différence en gros plan ;
      //   - la couleur de base, qui apporte les variations d'un vrai modèle
      //     (jaunissement au collet, usure) qu'aucune couleur unie ne donne.
      // Le reste — métal, rugosité, transmission — est recalculé, sans quoi la
      // dent rendrait comme du plastique ou, ici, comme du métal : le fichier
      // arrivait avec un facteur métallique à 1.
      root.traverse((o) => {
        if (!o.isMesh) return
        const previous = o.material
        const next = new THREE.MeshPhysicalMaterial(materialProps)
        if (previous?.normalMap) {
          next.normalMap = previous.normalMap
          next.normalScale = previous.normalScale?.clone() ?? new THREE.Vector2(1, 1)
        }
        if (previous?.map) {
          next.map = previous.map
          // La couleur de la matière devient un multiplicateur : elle doit
          // rester proche du blanc pour ne pas assombrir la texture deux fois.
          next.color.set('#ffffff')
        }
        o.material = next
      })
    }

    if (fitHeight) {
      // Un modèle généré arrive à une taille et un centre arbitraires. On le
      // recentre et on le met au gabarit de la doublure qu'il remplace, pour
      // que la chorégraphie de la caméra reste valable.
      const box = new THREE.Box3().setFromObject(root)
      const size = new THREE.Vector3()
      const center = new THREE.Vector3()
      box.getSize(size)
      box.getCenter(center)
      const scale = size.y > 0 ? fitHeight / size.y : 1
      root.position.sub(center)
      const wrapper = new THREE.Group()
      wrapper.add(root)
      wrapper.scale.setScalar(scale)
      return wrapper
    }

    return root
  }, [scene, materialProps, fitHeight])

  useEffect(() => {
    onReady?.(prepared)
  }, [prepared, onReady])

  return <primitive object={prepared} {...props} />
}

/**
 * @param {string} url            chemin du GLB attendu, ex. /models/tooth-molar.glb
 * @param {React.ReactNode} fallback la doublure procédurale
 * @param {object} [materialProps] matière à appliquer à la place de celle du fichier
 * @param {number} [fitHeight]     hauteur cible, en unités de scène
 */
/**
 * Garde-fou.
 *
 * Sans lui, un seul fichier illisible faisait tomber tout l'arbre React et la
 * page s'affichait blanche — le site entier perdu pour un modèle 3D de 88 ko.
 * Une doublure procédurale attend derrière chaque modèle : c'est elle qui doit
 * reprendre la main, silencieusement.
 */
class ModelBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.warn('[Alvéa] modèle 3D illisible, retour à la doublure procédurale :', error?.message)
  }

  render() {
    if (this.state.failed) return this.props.fallback
    return this.props.children
  }
}

export function Model({ url, fallback, materialProps, fitHeight, onReady, ...props }) {
  // Résolu ici plutôt qu'à l'appel : les composants de scène gardent des
  // chemins lisibles, et le sous-chemin de déploiement reste un détail.
  const resolved = asset(url)
  const available = useModelAvailable(resolved)
  if (!available) return fallback
  return (
    <ModelBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <LoadedModel
          url={resolved}
          materialProps={materialProps}
          fitHeight={fitHeight}
          onReady={onReady}
          {...props}
        />
      </Suspense>
    </ModelBoundary>
  )
}
