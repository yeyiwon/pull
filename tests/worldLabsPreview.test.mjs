import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three'
import { ColliderSurface } from '../src/preview/worldlabs/collision.ts'

test('preview collision follows transformed terrain and refuses empty space', () => {
  const root = new Group(), floor = new Mesh(new PlaneGeometry(4,4), new MeshBasicMaterial())
  floor.rotation.x = -Math.PI/2; root.add(floor); root.position.y=2
  const surface = new ColliderSurface(root), p = new Vector3(0,2,0)
  assert.equal(surface.ground(0,0,3),2)
  assert.equal(surface.step(p,.05,0),true)
  assert.equal(surface.step(p,5,0),false)
  assert.equal(p.y,2)
})

test('preview collision blocks wall and excessive step rather than climbing through', () => {
  const root = new Group(), floor = new Mesh(new PlaneGeometry(10,10),new MeshBasicMaterial())
  floor.rotation.x=-Math.PI/2; root.add(floor)
  const wall = new Mesh(new BoxGeometry(.2,3,3),new MeshBasicMaterial());wall.position.set(.25,1.5,0);root.add(wall)
  const surface = new ColliderSurface(root),p=new Vector3()
  assert.equal(surface.step(p,.06,0),false)
  assert.deepEqual(p.toArray(),[0,0,0])
})
