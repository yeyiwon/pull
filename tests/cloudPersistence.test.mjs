import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyPersistentWorld } from '../src/world/backgroundWorld.ts'
import { readMemory } from '../src/world/brain/memory.ts'
import { recordExperience } from '../src/world/intelligence.ts'
import { readLocalSnapshot,sameSnapshotPayload,writeLocalSnapshot } from '../src/cloud/model.ts'
import { reconcileSnapshots } from '../src/cloud/reconcile.ts'

const identity={userId:'user-a',worldId:'world-a',moruId:'moru-a'}
const memoryStorage=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),values}}
function snapshot(id='user-a',now=Date.parse('2026-09-25T00:00:00Z')){const storage=memoryStorage(),world=emptyPersistentWorld(now),memory=readMemory(null,new Date(now).toISOString());storage.setItem('pull.world.background.v1',JSON.stringify(world));storage.setItem('pull.moru.memory.v1',JSON.stringify(memory));storage.setItem('moruAppearance','base');return readLocalSnapshot(storage,{...identity,userId:id},now)}
function experience(state,activity,timestamp='2026-09-25T00:00:00Z'){return recordExperience(state.moru.intelligence,{timestamp,source:'FOREGROUND',location:'AncientTree',activity,nearbyObjects:['AncientTree'],season:'autumn',timeOfDay:'NIGHT',weather:'clear',activeEvent:null,userPresent:true,voluntary:true,novelty:.7,significance:.8,outcome:'completed',dwellSeconds:12})}

test('existing Memory v7 and Background World v1 survive local cloud snapshot roundtrip',()=>{
 const source=snapshot();source.moru.visitCount=9;source.moru.autonomy.discoveries.AncientTree={status:'familiar',firstSeenAt:source.serverUpdatedAt,lastSeenAt:source.serverUpdatedAt,observations:4};source.world.moruLocation='AncientTree';source.world.manual.time=true;source.world.garden.plants.push({spotId:'garden-1',kind:'starbell',plantedAt:1,wateredAt:1,collectedAt:null});experience(source,'inspect')
 const target=memoryStorage();writeLocalSnapshot(target,source);const restored=readLocalSnapshot(target,identity,Date.parse(source.serverUpdatedAt))
 assert.equal(restored.moru.version,7);assert.equal(restored.moru.visitCount,9);assert.equal(restored.moru.intelligence.experiences.length,1);assert.equal(restored.world.moruLocation,'AncientTree');assert.equal(restored.world.manual.time,true);assert.equal(restored.world.garden.plants[0].kind,'starbell')
})

test('reconciliation unions stable records and rebuilds evidence without double counting',()=>{
 const local=snapshot(),cloud=snapshot();const shared=experience(local,'inspect'),copy=structuredClone(shared);cloud.moru.intelligence.experiences.push(copy);cloud.moru.intelligence.experienceSequence=1
 const unique=experience(cloud,'observe_water','2026-09-25T00:01:00Z');unique.id='exp-device-b'
 const merged=reconcileSnapshots(local,cloud,true,0)
 assert.equal(merged.moru.intelligence.experiences.length,2)
 assert.equal(merged.moru.intelligence.preferences['LOCATION:AncientTree'].evidence,2)
 assert.equal(merged.moru.intelligence.familiarity.AncientTree.visits,2)
 assert.equal(new Set(merged.moru.intelligence.memories.map(item=>item.experienceId)).size,2)
})

test('same legacy experience id with different device content is deterministically preserved',()=>{
 const local=snapshot(),cloud=snapshot();experience(local,'inspect');experience(cloud,'dance');cloud.revision=2
 const first=reconcileSnapshots(local,cloud,true,0),second=reconcileSnapshots(local,cloud,true,0)
 assert.equal(first.moru.intelligence.experiences.length,2);assert.deepEqual(first.moru.intelligence.experiences.map(item=>item.id),second.moru.intelligence.experiences.map(item=>item.id));assert.equal(new Set(first.moru.intelligence.experiences.map(item=>item.id)).size,2)
})

test('same experience content from two devices is idempotent even when local ids differ',()=>{
 const local=snapshot(),cloud=snapshot();const first=experience(local,'observe_snow');const duplicate=structuredClone(first);duplicate.id='exp-device-b';cloud.moru.intelligence.experiences.push(duplicate);cloud.moru.intelligence.experienceSequence=1
 const merged=reconcileSnapshots(local,cloud,true,0)
 assert.equal(merged.moru.intelligence.experiences.length,1);assert.equal(merged.moru.intelligence.preferences['LOCATION:AncientTree'].evidence,1)
})

test('cloud metadata does not make an unchanged local payload dirty',()=>{
 const local=snapshot(),cached=structuredClone(local);cached.revision=42;cached.simulationRevision=8;cached.serverUpdatedAt='2026-09-25T02:00:00Z';cached.identity={userId:'user-a',worldId:'cloud-world',moruId:'cloud-moru'}
 assert.equal(sameSnapshotPayload(local,cached),true);cached.appearance='winter';assert.equal(sameSnapshotPayload(local,cached),false)
})

test('cloud revision wins current state while monotonic discoveries never regress',()=>{
 const local=snapshot(),cloud=snapshot();local.world.moruLocation='HiddenGarden';cloud.world.moruLocation='MoonShrine';cloud.revision=3
 local.moru.autonomy.discoveries.AncientTree={status:'familiar',firstSeenAt:local.serverUpdatedAt,lastSeenAt:local.serverUpdatedAt,observations:3};cloud.moru.autonomy.discoveries.AncientTree={status:'discovered',firstSeenAt:cloud.serverUpdatedAt,lastSeenAt:cloud.serverUpdatedAt,observations:1}
 const merged=reconcileSnapshots(local,cloud,true,1)
 assert.equal(merged.world.moruLocation,'MoonShrine');assert.equal(merged.moru.autonomy.discoveries.AncientTree.status,'familiar')
})
