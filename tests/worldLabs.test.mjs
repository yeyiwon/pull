import { test } from 'node:test'
import assert from 'node:assert/strict'
import { WorldLabsClient, WorldLabsError } from '../server/worldLabs.ts'

test('World Labs request is server-only, authenticated, and follows documented paths', async () => {
  const calls = []
  const fakeFetch = async (url, init) => {
    calls.push({ url, init })
    if (url.endsWith('/credits')) return Response.json({ remaining_credits: 4200 })
    if (url.endsWith('/worlds:generate')) return Response.json({ operation_id: 'op1', done: false })
    if (url.endsWith('/operations/op1')) return Response.json({ operation_id: 'op1', done: true, response: { id: 'world1' } })
    return Response.json({ world: { id: 'world1', assets: { splats: { spz_urls: { full_res: 'spz' } } } } })
  }
  const client = new WorldLabsClient('test-secret', fakeFetch)
  assert.equal(await client.credits(), 4200)
  assert.equal((await client.generate('lake', 'marble-1.1-plus')).operation_id, 'op1')
  assert.equal((await client.waitForWorld('op1', { maxPolls: 1 })).response.id, 'world1')
  assert.equal((await client.world('world1')).world.assets.splats.spz_urls.full_res, 'spz')
  assert.ok(calls.every(({ init }) => init.headers['WLT-Api-Key'] === 'test-secret'))
  assert.equal(JSON.parse(calls[1].init.body).world_prompt.type, 'text')
  assert.equal(calls[1].url, 'https://api.worldlabs.ai/marble/v1/worlds:generate')
})

test('World Labs errors are sanitized and never automatically retried', async () => {
  let calls = 0
  const client = new WorldLabsClient('test-secret', async () => { calls++; return Response.json({ error: { type: 'billing', message: 'private text' } }, { status: 402 }) })
  await assert.rejects(client.credits(), error => error instanceof WorldLabsError && error.status === 402 && !error.message.includes('private text'))
  assert.equal(calls, 1)
})
