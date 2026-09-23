import test from 'node:test'
import assert from 'node:assert/strict'
import {createFeedbackDirector,actionFeedback,reactionFeedback,feedbackVisual,FEEDBACK_SOUNDS} from '../src/characters/feedback.ts'
test('dance timeline has bounded particles, one accent and ending, then releases presentation state',()=>{
 const director=createFeedbackDirector();director.start(actionFeedback('bubbleDance'));const cues=[]
 for(let i=0;i<100;i++){const frame=director.update(.1);assert.ok(frame.count<=12);cues.push(...frame.cues)}
 assert.deepEqual(cues,['dance.start','dance.accent','dance.end']);assert.equal(director.update(.1).active,null)
 director.start(actionFeedback('youGroove'));assert.equal(director.update(.1).count,16);director.stop();assert.equal(director.update(.1).count,0)
})
test('reactions do not all emit petals and dances have distinct silhouettes and motion',()=>{
 for(const state of ['NEUTRAL','CURIOUS','SAD','ANNOYED','AFFECTIONATE','HAPPY'])assert.equal(feedbackVisual({state}).count,0)
 assert.equal(feedbackVisual(actionFeedback('bubbleDance')).shape,'petal')
 assert.equal(feedbackVisual(actionFeedback('loveDance')).shape,'heart')
 assert.equal(feedbackVisual(actionFeedback('youGroove')).shape,'star')
 assert.equal(new Set(['bubbleDance','loveDance','youGroove'].map(id=>feedbackVisual(actionFeedback(id)).motion)).size,3)
})
test('conversation semantic feedback does not replace an active dance or infer emotions from raw text',()=>{
 assert.equal(reactionFeedback({event:'BRAIN',speech:'hello',duration:3}).state,'NEUTRAL')
 assert.equal(reactionFeedback({event:'BRAIN',emotion:'warm',duration:3}).state,'AFFECTIONATE')
 assert.equal(reactionFeedback({event:'BRAIN',fx:'SURPRISE',duration:3,typing:true}).intensity,'SUBTLE')
 const d=createFeedbackDirector();d.start(actionFeedback('loveDance'));d.start(reactionFeedback({event:'BRAIN',emotion:'warm',duration:3}));assert.equal(d.update(.1).active.state,'DANCING')
 assert.equal(FEEDBACK_SOUNDS.petal.status,'ASSET_MISSING');assert.equal(FEEDBACK_SOUNDS['dance.start'].status,'SFX_READY')
})
