import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {normalizeDisplayName,validateBirthday,validateDisplayName,validateProfile} from '../src/cloud/profile.ts'
import {getAccountIdentityContext,setAccountIdentityContext} from '../src/cloud/profileContext.ts'

test('profile validation preserves Unicode names and date-only birthdays',()=>{
 assert.equal(normalizeDisplayName('  예이원  '),'예이원')
 assert.equal(validateDisplayName('모루 친구'),true)
 assert.equal(validateDisplayName('   '),false)
 assert.equal(validateDisplayName('가'.repeat(41)),false)
 assert.equal(validateBirthday('2000-02-29','2026-09-25'),true)
 assert.equal(validateBirthday('2001-02-29','2026-09-25'),false)
 assert.equal(validateBirthday('2027-01-01','2026-09-25'),false)
 assert.equal(validateProfile({displayName:' 예이원 ',birthday:'1999-12-23'}),true)
})

test('conversation identity boundary exposes display name only',()=>{
 setAccountIdentityContext('예이원')
 assert.deepEqual(getAccountIdentityContext(),{displayName:'예이원'})
 assert.equal(JSON.stringify(getAccountIdentityContext()).includes('birthday'),false)
 setAccountIdentityContext(null)
 assert.equal(getAccountIdentityContext(),undefined)
})

test('profile migration is private, owner-scoped, and non-destructive',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20260924185142_account_profile_v1.sql',import.meta.url),'utf8').toLowerCase()
 assert.match(sql,/create table public\.pull_profiles/)
 assert.match(sql,/references auth\.users\(id\) on delete cascade/)
 assert.match(sql,/alter table public\.pull_profiles enable row level security/)
 assert.match(sql,/for select[\s\S]*?using \(\(select auth\.uid\(\)\) = user_id\)/)
 assert.match(sql,/for insert[\s\S]*?with check \(\(select auth\.uid\(\)\) = user_id\)/)
 assert.match(sql,/for update[\s\S]*?using \(\(select auth\.uid\(\)\) = user_id\)[\s\S]*?with check \(\(select auth\.uid\(\)\) = user_id\)/)
 assert.match(sql,/revoke all on table public\.pull_profiles from anon/)
 assert.doesNotMatch(sql,/drop table|truncate|delete from/)
})
