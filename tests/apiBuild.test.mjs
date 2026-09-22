import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'

test('API entrypoint discovers an emit-safe Node config and emitted handler runs without a provider', async () => {
  const root = process.cwd()
  // Vercel discovers a config from the entrypoint, not the root solution references.
  const config = ts.findConfigFile(resolve(root, 'api'), ts.sys.fileExists)
  assert.equal(config, resolve(root, 'api/tsconfig.json'))
  const output = await mkdtemp(join(tmpdir(), 'pull-api-build-'))
  try {
    execFileSync(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'),
      '-p', config, '--noEmit', 'false', '--outDir', output,
    ], { cwd: root, stdio: 'pipe' })
    await writeFile(join(output, 'package.json'), '{"type":"module"}')
    const emitted = await readFile(join(output, 'api/moru-conversation.js'), 'utf8')
    assert.match(emitted, /server\/moruConversation\.js/)
    // A fresh process has no application env/key; fetch throws if MOCK regresses.
    execFileSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      globalThis.fetch = () => { throw new Error('Unexpected external request'); };
      const { POST } = await import('./api/moru-conversation.js');
      assert.equal((await POST(new Request('http://localhost/api/moru-conversation'))).status, 405);
      const payload = {
        userMessage: '안녕', recentConversation: [], recentEvents: [],
        world: {season:'winter', timeOfDay:'NIGHT', weather:'snow', location:'water', indoor:false, nearWater:true},
        moru: {energy:.5, curiosity:.5, comfort:.5, attention:.5, affection:.5, sleepiness:.5}
      };
      const result = await POST(new Request('http://localhost/api/moru-conversation', {
        method:'POST', headers:{'Content-Type':'application/json', Origin:'http://localhost'}, body:JSON.stringify(payload)
      }));
      assert.equal(result.status, 200);
      assert.equal((await result.json()).provider, 'MOCK');
    `], { cwd: output, env: { MORU_PROVIDER: 'MOCK' }, stdio: 'pipe' })
  } finally {
    await rm(output, { recursive: true, force: true })
  }
})
