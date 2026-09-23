import test from 'node:test'
import assert from 'node:assert/strict'
import {Group,Quaternion,Vector3,AnimationClip,QuaternionKeyframeTrack,VectorKeyframeTrack} from 'three'
import {retargetAnimation} from '../src/characters/retargetAnimation.ts'
import {readFileSync} from 'node:fs'
function rig(angle,length){const root=new Group(),parent=new Group(),bone=new Group();parent.name='parent';bone.name='bone';root.add(parent);parent.add(bone);parent.rotation.z=angle;bone.rotation.x=angle*.3;bone.position.y=length;root.updateMatrixWorld(true);return {root,bone}}
test('rest-basis conversion maps source rest exactly to target without altering source clip',()=>{
 const s=rig(.2,1),t=rig(-.5,1.2),clip=new AnimationClip('test',1,[new QuaternionKeyframeTrack('bone.quaternion',[0,1],[...s.bone.quaternion.toArray(),...s.bone.quaternion.toArray()]),new VectorKeyframeTrack('bone.position',[0,1],[0,1,0,0,1.1,0])]);const old=clip.toJSON();const out=retargetAnimation(clip,s.root,t.root)
 assert.deepEqual(clip.toJSON(),old);assert.ok(new Quaternion().fromArray(out.tracks[0].values).normalize().angleTo(t.bone.quaternion)<1e-6)
 assert.ok(Math.abs(out.tracks[1].values[1]-1.2)<1e-6);assert.ok(Math.abs(out.tracks[1].values[4]-1.32)<1e-6)
 const moved=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),.4);clip.tracks[0].values.set(moved.toArray(),4)
 assert.ok(retargetAnimation(clip,s.root,t.root).tracks[0].values.every(Number.isFinite))
})
test('all 306 outfit/animation pairs retain finite bounded skinned poses',()=>{
 const qa=JSON.parse(readFileSync(new URL('../docs/moru-season-retarget-qa.json',import.meta.url)))
 assert.equal(qa.length,306)
 for(const c of qa){assert.equal(c.samples,13);assert.equal(c.finite,true);assert.ok(c.maxExtent>1&&c.maxExtent<3,c.appearance+':'+c.name);assert.ok(Math.abs(c.groundOffset)<.5)}
})
