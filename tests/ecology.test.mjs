import test from 'node:test'
import assert from 'node:assert/strict'
import {allowsGroundDetail,allowsTerrestrialDetail,isCirculationClear,isOpenWater,isShoreline,waterEdgeDistance} from '../src/world/ecology.ts'
import {HOME} from '../src/world/worldLayout.ts'
import {streamCenter,streamWidth} from '../src/world/terrain.ts'

test('ecological masks keep terrestrial filler out of open water and circulation',()=>{
 const z=58,center=streamCenter(z),edge=center+streamWidth(z)
 assert.ok(isOpenWater(center,z))
 assert.equal(allowsTerrestrialDetail(center,z),false)
 assert.equal(allowsGroundDetail(center,z),false)
 assert.ok(isShoreline(edge+.4,z))
 assert.equal(isOpenWater(edge+2,z),false)
 assert.ok(allowsTerrestrialDetail(edge+2,z))
 assert.ok(isCirculationClear(HOME.x,HOME.z))
 assert.equal(allowsTerrestrialDetail(HOME.x,HOME.z),false)
 assert.ok(waterEdgeDistance(center,z)<0)
})
