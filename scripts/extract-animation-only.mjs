import { readFileSync, writeFileSync } from 'node:fs'

const [sourcePath, outputPath, clipName] = process.argv.slice(2)
if (!sourcePath || !outputPath || !clipName) throw Error('Usage: source.glb output.glb ClipName')

const source = readFileSync(sourcePath)
const jsonLength = source.readUInt32LE(12)
const json = JSON.parse(source.subarray(20, 20 + jsonLength))
const binary = source.subarray(28 + jsonLength)
const animation = structuredClone(json.animations?.[0])
if (!animation) throw Error('Source GLB has no animation')
animation.name = clipName

const output = {
  asset: { version: '2.0', generator: 'PULL lossless animation extraction' },
  nodes: json.nodes.map(({ mesh: _mesh, skin: _skin, weights: _weights, ...node }) => node),
  scenes: json.scenes,
  scene: json.scene ?? 0,
  animations: [animation],
  accessors: [],
  bufferViews: [],
  buffers: [{ byteLength: 0 }],
}
const data = []
const mapping = new Map()
for (const sampler of animation.samplers) {
  for (const field of ['input', 'output']) {
    const oldIndex = sampler[field]
    if (!mapping.has(oldIndex)) {
      const accessor = { ...json.accessors[oldIndex] }
      if (accessor.sparse) throw Error('Sparse animation accessors are unsupported')
      const view = json.bufferViews[accessor.bufferView]
      while (data.length % 4) data.push(0)
      const offset = data.length
      data.push(...binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength))
      const { buffer: _buffer, byteOffset: _byteOffset, target: _target, ...cleanView } = view
      accessor.bufferView = output.bufferViews.length
      output.bufferViews.push({ ...cleanView, buffer: 0, byteOffset: offset })
      mapping.set(oldIndex, output.accessors.length)
      output.accessors.push(accessor)
    }
    sampler[field] = mapping.get(oldIndex)
  }
}
output.buffers[0].byteLength = data.length
let jsonBytes = Buffer.from(JSON.stringify(output))
jsonBytes = Buffer.concat([jsonBytes, Buffer.alloc((4 - jsonBytes.length % 4) % 4, 0x20)])
let binaryBytes = Buffer.from(data)
binaryBytes = Buffer.concat([binaryBytes, Buffer.alloc((4 - binaryBytes.length % 4) % 4)])
const header = Buffer.alloc(12)
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4)
header.writeUInt32LE(28 + jsonBytes.length + binaryBytes.length, 8)
const jsonHeader = Buffer.alloc(8)
jsonHeader.writeUInt32LE(jsonBytes.length, 0); jsonHeader.writeUInt32LE(0x4e4f534a, 4)
const binaryHeader = Buffer.alloc(8)
binaryHeader.writeUInt32LE(binaryBytes.length, 0); binaryHeader.writeUInt32LE(0x004e4942, 4)
writeFileSync(outputPath, Buffer.concat([header, jsonHeader, jsonBytes, binaryHeader, binaryBytes]))
