/**
 * Optimisation des GLB Meshy pour le web.
 *
 *   npm run models
 *
 * Lit chaque .glb déposé dans public/models/source/ et écrit la version
 * allégée dans public/models/. Les fichiers d'origine ne sont jamais modifiés :
 * on peut donc relancer autant de fois que nécessaire en changeant les réglages.
 *
 * Chaîne appliquée, dans cet ordre :
 *   dedup    → supprime maillages, matériaux et textures dupliqués
 *   flatten  → aplatit la hiérarchie de nœuds
 *   join     → fusionne les primitives compatibles (moins d'appels de rendu)
 *   weld     → soude les sommets identiques
 *   simplify → ramène le maillage au budget de triangles voulu
 *   textures → redimensionne et recompresse en WebP
 *   meshopt  → compresse la géométrie
 *
 * Pourquoi meshopt et pas Draco : le décodeur meshopt est embarqué dans le
 * bundle, alors que Draco va chercher son décodeur sur un CDN Google. Le site
 * doit pouvoir tourner sans dépendance externe.
 */

import { readdir, mkdir, stat } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions'
import {
  dedup,
  flatten,
  join as joinPrimitives,
  weld,
  simplify,
  textureCompress,
  prune,
  resample,
} from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SRC = join(ROOT, 'public', 'models', 'source')
const OUT = join(ROOT, 'public', 'models')

// Budget par asset. La dent héros est vue en très gros plan et garde donc plus
// de triangles que l'arcade, qui n'est jamais montrée de près.
const BUDGET = {
  // Molaire : géométrie seule. Les textures livrées avec ce modèle ne valaient
  // pas leur poids — une couleur de base en motif sable qui n'a rien d'un
  // émail, et une carte de normales pratiquement plate. Le site rhabille de
  // toute façon la dent avec sa propre matière et son propre micro-relief.
  'tooth-molar': { triangles: 26000, texture: 1024, dropTextures: true },
  'arch-upper': { triangles: 45000, texture: 1024 },
  aligner: { triangles: 14000, texture: 512 },
  veneer: { triangles: 12000, texture: 1024 },
  default: { triangles: 25000, texture: 1024 },
}

const mo = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} Mo`

async function main() {
  await mkdir(SRC, { recursive: true })

  let files
  try {
    files = (await readdir(SRC)).filter((f) => f.toLowerCase().endsWith('.glb'))
  } catch {
    files = []
  }

  if (!files.length) {
    console.log(`Aucun GLB à traiter.\nDépose les fichiers Meshy bruts dans :\n  ${SRC}`)
    return
  }

  await MeshoptEncoder.ready
  await MeshoptSimplifier.ready

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'meshopt.encoder': MeshoptEncoder,
  })

  for (const file of files) {
    const name = basename(file, '.glb')
    const budget = BUDGET[name] || BUDGET.default
    const inPath = join(SRC, file)
    const outPath = join(OUT, file)

    const before = (await stat(inPath)).size
    const doc = await io.read(inPath)

    // Le site réécrit entièrement la matière : il ne consomme que la couleur de
    // base et les normales. Les cartes métal/rugosité, occlusion et émission
    // sont donc du poids mort — souvent le tiers du fichier. On les retire ici
    // pour que `prune` les supprime ensuite avec leurs images.
    for (const mat of doc.getRoot().listMaterials()) {
      mat.setMetallicRoughnessTexture(null)
      mat.setOcclusionTexture(null)
      mat.setEmissiveTexture(null)
      if (budget.dropTextures) {
        mat.setBaseColorTexture(null)
        mat.setNormalTexture(null)
      }
    }

    const trianglesBefore = countTriangles(doc)
    const ratio = Math.min(1, budget.triangles / Math.max(1, trianglesBefore))

    await doc.transform(
      dedup(),
      flatten(),
      joinPrimitives(),
      weld(),
      // simplify n'agit que s'il y a réellement du gras à retirer.
      ...(ratio < 0.98 ? [simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.0015 })] : []),
      resample(),
      prune(),
      textureCompress({
        encoder: sharp,
        targetFormat: 'webp',
        resize: [budget.texture, budget.texture],
        quality: 82,
      }),
    )

    doc
      .createExtension(EXTMeshoptCompression)
      .setRequired(true)
      .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE })

    await io.write(outPath, doc)

    const after = (await stat(outPath)).size
    const trianglesAfter = countTriangles(doc)
    console.log(
      `${file}\n` +
        `  triangles  ${trianglesBefore.toLocaleString('fr-FR')} → ${trianglesAfter.toLocaleString('fr-FR')}\n` +
        `  poids      ${mo(before)} → ${mo(after)}  (${Math.round((1 - after / before) * 100)} % de moins)`,
    )
  }
}

function countTriangles(doc) {
  let n = 0
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices()
      const count = indices ? indices.getCount() : prim.getAttribute('POSITION')?.getCount() || 0
      n += count / 3
    }
  }
  return Math.round(n)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
