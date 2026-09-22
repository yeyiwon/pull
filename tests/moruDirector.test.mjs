import test from 'node:test'
import assert from 'node:assert/strict'
import { ideaFrom, propose, direct, protectedPoint, SLOTS } from '../src/world/evolution/director.ts'
import { parseEnvironmentRegistry } from '../src/environment/registry.ts'
import { MockResearchProvider } from '../src/research/model.ts'
import { createInterestModel,emptyInterests } from '../src/world/brain/interests.ts'
const entry={id:'reviewed-plant',category:'vegetation',url:'/environment/reviewed-plant.glb',season:['autumn'],scaleRange:[1,1],placementType:'catalog',placements:[],lod:[],materialResponse:{wetness:true,snow:true},autonomy:{approved:true,semantics:['PLANT'],areas:['MEADOW_WEST'],radius:.5,height:1,groundOffset:0}}
export const fixtureAssets=()=>parseEnvironmentRegistry({version:1,assets:[structuredClone(entry)]})
export const fixtureIdea={id:'idea:leaves:100',sourceResearch:'research:leaves:100',topic:'leaves',concept:'같은 잎을 다른 빛에서 비교해 보고 싶다.',association:'색과 계절',evidence:'MODEL_KNOWLEDGE',kind:'IDEA'}
export const fixtureProposal=()=>propose(fixtureIdea,'autumn')
test('Research → IDEA retains uncertainty/provenance; empty or unresolved research creates nothing',async()=>{
 const d=emptyInterests();createInterestModel(d).observe({date:'2026-09-22',season:'autumn',indoor:false})
 const j=d.journal[0];assert.equal(ideaFrom(j),null)
 const {result}=await new MockResearchProvider().explore({topic:'leaves',question:j.question,previous:{unknowns:[],inferences:[]}},new AbortController().signal)
 j.research={status:'COMPLETE',provider:'MOCK',result,completedAt:100}
 const idea=ideaFrom(j);assert.equal(idea.evidence,'MOCK');assert.equal(idea.kind,'IDEA');assert.ok(idea.association)
 assert.equal(propose(idea,'autumn').semantic,'PLANT')
})
test('empty production registry waits; reviewed semantic asset resolves without model-chosen filenames',()=>{
 assert.equal(direct(fixtureProposal(),[],'autumn',[]).status,'WAITING_FOR_ASSET')
 const result=direct(fixtureProposal(),fixtureAssets(),'autumn',[])
 assert.equal(result.status,'ACCEPTED');assert.equal(result.placement.assetId,'reviewed-plant')
 assert.ok(!('url' in fixtureProposal()));assert.equal(protectedPoint(...[result.placement.position[0],result.placement.position[2],.5]),false)
})
test('director rejects forbidden scales, properties, areas, seasons and density',()=>{
 for(const patch of [{scale:'MAJOR'},{area:'BRIDGE'},{reversible:false},{url:'/evil.glb'},{code:'execute()'},{position:[0,0,0]}])assert.equal(direct({...fixtureProposal(),...patch},fixtureAssets(),'autumn',[]).status,'REJECTED')
 assert.equal(direct(fixtureProposal(),fixtureAssets(),'winter',[]).reason,'SEASON_MISMATCH')
 const occupied=Array(3).fill({position:[0,0,0],radius:1})
 assert.equal(direct(fixtureProposal(),fixtureAssets(),'autumn',occupied).reason,'GLOBAL_DENSITY')
})
test('protected core and boundaries never become placement slots; metadata must be explicitly reviewed',()=>{
 for(const [x,z]of [[10,-24],[12,-57],[0,-9],[0,0],[100,0]])assert.equal(protectedPoint(x,z,.5),true)
 assert.ok(SLOTS.every(s=>!protectedPoint(s.x,s.z,.5)))
 const unapproved=fixtureAssets();delete unapproved[0].autonomy
 assert.equal(direct(fixtureProposal(),unapproved,'autumn',[]).status,'WAITING_FOR_ASSET')
 assert.throws(()=>parseEnvironmentRegistry({version:1,assets:[{...entry,autonomy:{...entry.autonomy,approved:false}}]}))
 const huge=fixtureAssets();huge[0].autonomy.height=10
 assert.equal(direct(fixtureProposal(),huge,'autumn',[]).status,'REJECTED')
})

test('existing manual registry placements keep their composition space',()=>{
 const entries=fixtureAssets()
 entries.push({...entries[0],id:'existing',placementType:'manual',autonomy:undefined,placements:[{position:[-37,0,17],rotation:[0,0,0],scale:1},{position:[-40,0,23],rotation:[0,0,0],scale:1}]})
 assert.equal(direct(fixtureProposal(),entries,'autumn',[]).status,'REJECTED')
})
