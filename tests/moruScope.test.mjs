import test from 'node:test'
import assert from 'node:assert/strict'
import {readdirSync,readFileSync,existsSync} from 'node:fs'
import {catalog} from '../src/audio/catalog.ts'
import {manifests} from '../src/characters/assets.ts'
test('active character and production audio registries are Moru-only',()=>{
 assert.deepEqual(Object.keys(manifests),['MORU'])
 assert.ok(!manifests.MORU.actions.some(a=>/nuu/i.test(a.name)))
 assert.ok(Object.keys(catalog.assets).every(id=>!/nuu/i.test(id)))
 const manifest=JSON.parse(readFileSync(new URL('../public/audio/audio-production-manifest.json',import.meta.url)))
 assert.ok(manifest.assets.every(a=>!/nuu/i.test(a.url)))
 const oldCharacterRoot=new URL('../public/characters',import.meta.url)
 if(existsSync(oldCharacterRoot)) assert.ok(readdirSync(oldCharacterRoot).filter(name=>name!=='.DS_Store').every(name=>name==='moru'))
 assert.ok(!existsSync(new URL('../public/characters/moru/full-life.glb',import.meta.url)))
 assert.ok(readdirSync(new URL('../public/audio/v02',import.meta.url)).every(name=>!/nuu/i.test(name)))
})
