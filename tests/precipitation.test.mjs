import { test } from 'node:test'
import assert from 'node:assert/strict'
import { weatherCoordinate,snowfallCount,SNOW_CAPACITY } from '../src/world/precipitation.ts'
test('weather particles stay in world coordinates when the observer moves',()=>{
 for(const seed of [-12,0,10])for(const observer of [-3,0,3])assert.equal(weatherCoordinate(seed,observer),seed)
})
test('weather recycles at the far boundary and remains bounded over long travel',()=>{
 assert.equal(weatherCoordinate(0,23.9),0)
 assert.equal(weatherCoordinate(0,24.1),48)
 for(let observer=-300;observer<=300;observer+=.7)assert.ok(Math.abs(weatherCoordinate(7.3,observer)-observer)<=24)
})
test('snow strength differs even at mobile quality and stays within allocated capacity',()=>{
 const counts=[.3,.6,1].map(v=>snowfallCount(v,.45))
 assert.ok(counts[2]>counts[0]*3&&counts[1]>counts[0])
 assert.equal(snowfallCount(0,1),0);assert.equal(snowfallCount(10,10),SNOW_CAPACITY)
})
