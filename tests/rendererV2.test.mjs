import test from 'node:test'
import assert from 'node:assert/strict'
import {PerspectiveCamera} from 'three'
import {artificialLightLevel,getRendererMode,setRendererMode,V2_FULL_BUDGET,V3_FULL_BUDGET,V2_LIGHTING_PRESETS,V2_SLICE_BUDGET,V2_SLICE_TREE_INDICES} from '../src/graphics/rendererV2.ts'
import {createPlayer} from '../src/world/locomotion.ts'
import {perceiveWorld} from '../src/world/worldPerception.ts'

test('Renderer v2 remains an explicit reversible slice with a bounded mobile budget',()=>{
 assert.equal(getRendererMode(),'V3_FULL')
 setRendererMode('V2_SLICE');assert.equal(getRendererMode(),'V2_SLICE')
 assert.equal(V2_SLICE_TREE_INDICES.size,5)
 assert.ok(V2_SLICE_BUDGET.drawCalls<=9)
 assert.ok(V2_SLICE_BUDGET.estimatedTriangles<70000)
 assert.equal(V2_SLICE_BUDGET.textures,0)
 assert.ok(V2_FULL_BUDGET.drawCalls<=9)
 assert.ok(V2_FULL_BUDGET.estimatedTriangles<180000)
 assert.equal(V2_FULL_BUDGET.textures,0)
 assert.ok(V3_FULL_BUDGET.drawCalls<=20)
 assert.ok(V3_FULL_BUDGET.estimatedTriangles<145000)
 assert.equal(V3_FULL_BUDGET.textures,0)
 setRendererMode('V3_FULL');assert.equal(getRendererMode(),'V3_FULL')
 setRendererMode('V1')
})

test('artificial lights fade in smoothly from day through deep night',()=>{
 assert.equal(artificialLightLevel(0),0)
 assert.ok(artificialLightLevel(.45)>0)
 assert.ok(artificialLightLevel(.8)>artificialLightLevel(.45))
 assert.equal(artificialLightLevel(1),1)
})

test('shared v2 local-light presets stay restrained and keep semantic perception intact',()=>{
 for(const preset of Object.values(V2_LIGHTING_PRESETS)){assert.ok(preset.intensity<=500);assert.ok(preset.distance<=20);assert.equal(preset.decay,2)}
 const player=createPlayer(),camera=new PerspectiveCamera();camera.position.set(0,5,10);camera.lookAt(0,1,0);camera.updateMatrixWorld()
 setRendererMode('V2_SLICE');const candidates=perceiveWorld(player,camera).candidates
 assert.ok(candidates.some(candidate=>candidate.type==='tree'))
 assert.ok(candidates.every(candidate=>candidate.affordances.length>0))
 setRendererMode('V1')
})
