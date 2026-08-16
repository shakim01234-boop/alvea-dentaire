/**
 * Inspection d'un GLB avant intégration.
 *
 *   node scripts/inspect-glb.mjs <chemin>
 *
 * Répond aux seules questions qui décident si un modèle est exploitable :
 * combien de triangles, quelles textures, quelle taille réelle, quelle
 * orientation, et quel poids une fois sur le web.
 */

import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { stat } from 'node:fs/promises'

const path = process.argv[2]
if (!path) {
  console.error('usage : node scripts/inspect-glb.mjs <chemin.glb>')
  process.exit(1)
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const doc = await io.read(path)
const root = doc.getRoot()
const size = (await stat(path)).size

let triangles = 0
let vertices = 0
const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }

for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION')
    const idx = prim.getIndices()
    vertices += pos?.getCount() || 0
    triangles += (idx ? idx.getCount() : pos?.getCount() || 0) / 3
    if (pos) {
      const mn = pos.getMin([])
      const mx = pos.getMax([])
      for (let i = 0; i < 3; i++) {
        bounds.min[i] = Math.min(bounds.min[i], mn[i])
        bounds.max[i] = Math.max(bounds.max[i], mx[i])
      }
    }
  }
}

const dims = bounds.max.map((v, i) => +(v - bounds.min[i]).toFixed(3))
const centre = bounds.max.map((v, i) => +((v + bounds.min[i]) / 2).toFixed(3))

console.log(`fichier          ${(size / 1024 / 1024).toFixed(2)} Mo`)
console.log(`triangles        ${Math.round(triangles).toLocaleString('fr-FR')}`)
console.log(`sommets          ${vertices.toLocaleString('fr-FR')}`)
console.log(`maillages        ${root.listMeshes().length}  |  noeuds ${root.listNodes().length}`)
console.log(`dimensions XYZ   ${dims.join(' × ')}   (le plus grand axe : ${'XYZ'[dims.indexOf(Math.max(...dims))]})`)
console.log(`centre           ${centre.join(', ')}`)

console.log(`\nmatériaux (${root.listMaterials().length})`)
for (const mat of root.listMaterials()) {
  const slots = []
  if (mat.getBaseColorTexture()) slots.push('couleur')
  if (mat.getNormalTexture()) slots.push('normales')
  if (mat.getMetallicRoughnessTexture()) slots.push('metal/rugosité')
  if (mat.getOcclusionTexture()) slots.push('occlusion')
  if (mat.getEmissiveTexture()) slots.push('émission')
  const c = mat.getBaseColorFactor().map((v) => +v.toFixed(2))
  console.log(
    `  ${mat.getName() || '(sans nom)'} — textures : ${slots.join(', ') || 'aucune'} | ` +
      `couleur de base ${c.slice(0, 3).join(', ')} | rugosité ${mat.getRoughnessFactor().toFixed(2)} | ` +
      `métal ${mat.getMetallicFactor().toFixed(2)}`,
  )
}

console.log(`\ntextures (${root.listTextures().length})`)
for (const tex of root.listTextures()) {
  const img = tex.getImage()
  const s = tex.getSize()
  console.log(
    `  ${tex.getName() || '(sans nom)'} — ${s ? s.join('×') : '?'} | ${tex.getMimeType()} | ` +
      `${img ? (img.byteLength / 1024).toFixed(0) : '?'} Ko`,
  )
}

const uvMissing = root
  .listMeshes()
  .some((m) => m.listPrimitives().some((p) => !p.getAttribute('TEXCOORD_0')))
console.log(`\ncoordonnées de texture : ${uvMissing ? 'ABSENTES sur au moins une primitive' : 'présentes'}`)
console.log(`extensions             : ${root.listExtensionsUsed().map((e) => e.extensionName).join(', ') || 'aucune'}`)
