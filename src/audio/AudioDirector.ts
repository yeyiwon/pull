import { catalog } from './catalog.ts'
import { streamCenter, streamWidth } from '../world/terrain.ts'
export type Season = keyof typeof catalog.adaptive.seasonTimeAmbience
export type Weather = keyof typeof catalog.adaptive.weatherMixes
export type AudioState = { season:Season; hour:number; inside:boolean; weather:Weather; wind:number; x:number; z:number; seasonProgress:number }
export type AudioPlan = { music:string; next:string; musicGain:number; musicCutoff:number; outsideCutoff:number; ambience:Record<string,number> }
export function timeSlot(hour:number){return catalog.adaptive.timeSlots.find(s=>s.startHour<s.endHour?hour>=s.startHour&&hour<s.endHour:hour>=s.startHour||hour<s.endHour)!.id as keyof typeof catalog.adaptive.seasonTimeAmbience.spring}
export function audioPlan(s:AudioState):AudioPlan {
 const slot=timeSlot(s.hour),weather=catalog.adaptive.weatherMixes[s.weather],outside=s.inside?.18:1
 const seasonal=catalog.adaptive.seasonTimeAmbience[s.season][slot], ambience:Record<string,number>={}
 for(const id of seasonal.assets)ambience[id]=seasonal.gainMultiplier*outside
 const distance=Math.max(0,Math.abs(s.x-streamCenter(s.z))-streamWidth(s.z)),water=Math.max(0,1-distance/16)
 if(water>.01)ambience.amb_water_pond_close=water*outside
 if(s.weather==='rain'||s.weather==='storm')ambience[s.weather==='storm'?'amb_rain_heavy':'amb_rain_normal']=outside
 if(s.weather==='snow')ambience.amb_winter_quiet_air=outside
 if(s.wind>.55)ambience.amb_wind_normal=s.wind*outside
 if(s.inside){ambience.amb_indoor_room_tone=1;if(s.weather==='rain'||s.weather==='storm')ambience.amb_indoor_window_rain=.7}
 const slots=catalog.adaptive.timeSlots,next=slots[(slots.findIndex(t=>t.id===slot)+1)%slots.length].id
 return {music:s.inside?`home_${slot==='night'||slot==='evening'?'night':'day'}`:`${s.season}_${slot}`,next:`${s.season}_${next}`,musicGain:weather.musicGain*.65,musicCutoff:weather.lowpassHz,outsideCutoff:s.inside?1100:18000,ambience}
}
export function nextPhrase(now:number,start:number,bpm:number,bars:number){const length=bars*4*60/bpm;return start+Math.ceil((now-start+.05)/length)*length}
