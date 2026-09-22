import type { WeatherContext } from './realWorld.ts'
import { livingWorld } from './livingWorld.ts'
type Weather = WeatherContext['type']
// Canonical weather remains owned by livingWorld; lab/menu values never overwrite it.
export const weatherPreview:{type:Weather|null}={type:null}
export const WEATHER_LOOK:Record<Weather,{cloud:number;wind:number;haze:number;rain:number}>={
 clear:{cloud:0,wind:.16,haze:.86,rain:0},
 partlyCloudy:{cloud:.35,wind:.19,haze:.96,rain:0},
 cloudy:{cloud:.82,wind:.23,haze:1.16,rain:0},
 rain:{cloud:.95,wind:.3,haze:1.42,rain:.65},
 snow:{cloud:.7,wind:.09,haze:1.12,rain:0},
 fog:{cloud:.4,wind:.1,haze:2.2,rain:0},
 storm:{cloud:1,wind:.65,haze:1.6,rain:1},
}
export function canonicalWeather(){return livingWorld.weather?.type??'clear'}
export function presentedWeather(){return weatherPreview.type??canonicalWeather()}
