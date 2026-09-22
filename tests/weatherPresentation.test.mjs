import test from 'node:test'
import assert from 'node:assert/strict'
import {weatherPreview,presentedWeather,canonicalWeather,WEATHER_LOOK} from '../src/world/weatherPresentation.ts'
import {livingWorld} from '../src/world/livingWorld.ts'
import {environmentState as env,updateEnvironmentState} from '../src/world/environmentState.ts'
import {observeWorld} from '../src/world/brain/observation.ts'
import {createPlayer} from '../src/world/locomotion.ts'
test('weather preview cannot become canonical Brain weather',()=>{
 livingWorld.weather={type:'clear'};weatherPreview.type='rain'
 assert.equal(presentedWeather(),'rain');assert.equal(canonicalWeather(),'clear')
 const o=observeWorld(createPlayer(),{idle:0,interacted:false,returned:false,actions:[],speech:[]})
 assert.equal(o.weather,'clear');assert.equal(o.wind,WEATHER_LOOK.clear.wind)
 weatherPreview.type=null;livingWorld.weather=null
})
test('clouds lead rain, wetness lags and persists, snow wind is quieter',()=>{
 env.cloudiness=0;env.rain=0;env.wetness=0;weatherPreview.type='rain'
 for(let i=0;i<60;i++)updateEnvironmentState(1/60)
 assert.ok(env.cloudiness>env.rain);assert.ok(env.rain>env.wetness)
 for(let i=0;i<1200;i++)updateEnvironmentState(1/60)
 assert.ok(env.wetness>.6&&env.wetness<.7)
 const wet=env.wetness;weatherPreview.type='clear'
 for(let i=0;i<60;i++)updateEnvironmentState(1/60)
 assert.ok(env.wetness>wet*.95)
 assert.ok(WEATHER_LOOK.snow.wind<WEATHER_LOOK.rain.wind)
 weatherPreview.type=null
})
