import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const supportsStripTypes = executable => spawnSync(executable, ['--experimental-strip-types', '-e', ''], { stdio: 'ignore' }).status === 0
const candidates = [process.execPath]
const nvmRoot = join(homedir(), '.nvm', 'versions', 'node')
if (existsSync(nvmRoot)) {
  const installed = readdirSync(nvmRoot).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
  for (const version of installed) candidates.push(join(nvmRoot, version, 'bin', 'node'))
}
const node = candidates.find(executable => existsSync(executable) && supportsStripTypes(executable))
if (!node) {
  console.error('Tests require Node.js with --experimental-strip-types support (Node 22.6+).')
  process.exit(1)
}
const tests = readdirSync('tests').filter(file => file.endsWith('.test.mjs')).sort().map(file => join('tests', file))
const result = spawnSync(node, ['--experimental-strip-types', '--test', ...tests], { stdio: 'inherit' })
process.exit(result.status ?? 1)
