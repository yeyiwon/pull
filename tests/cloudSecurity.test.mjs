import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync,readdirSync } from 'node:fs'

const migrationName=readdirSync(new URL('../supabase/migrations/',import.meta.url)).find(name=>name.endsWith('_accounts_cloud_persistence_v1.sql'))
if(!migrationName)throw Error('Cloud persistence migration is missing')
const sql=readFileSync(new URL(`../supabase/migrations/${migrationName}`,import.meta.url),'utf8').toLowerCase()
const tables=['pull_worlds','pull_world_states','pull_morus','pull_moru_intelligence','pull_experiences','pull_memories']

test('every account-owned cloud table has RLS and no anonymous access',()=>{
 for(const table of tables){assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security`));assert.match(sql,new RegExp(`create policy [\\s\\S]*? on public\\.${table}[\\s\\S]*?auth\\.uid\\(\\)`))}
 const revoke=sql.match(/revoke all on ([\s\S]*?) from anon;/)?.[1]??''
 for(const table of tables)assert.match(revoke,new RegExp(`public\\.${table}`))
})

test('cloud sync RPC enforces ownership and optimistic revisions',()=>{
 assert.match(sql,/create or replace function public\.pull_sync_state/);assert.match(sql,/from public\.pull_worlds where id = p_world_id and user_id = v_user for update/);assert.match(sql,/v_revision <> p_expected_revision/);assert.match(sql,/v_simulation_revision <> p_expected_simulation_revision/);assert.match(sql,/revoke all on function public\.pull_sync_state[\s\S]*? from public, anon/)
})

test('child rows can only reference a World or Moru owned by the signed-in account',()=>{
 assert.match(sql,/from public\.pull_worlds owner where owner\.id = world_id and owner\.user_id = \(select auth\.uid\(\)\)/)
 assert.match(sql,/from public\.pull_morus owner where owner\.id = moru_id and owner\.user_id = \(select auth\.uid\(\)\)/)
})

test('client-grade schema never grants anonymous table access',()=>{
 assert.doesNotMatch(sql,/grant .+ to anon/);assert.doesNotMatch(sql,/service_role/)
})
