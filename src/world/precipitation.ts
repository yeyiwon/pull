// Recycle only at the outer weather volume. Within a tile, camera/player movement
// cannot change the particle's world coordinate.
export function weatherCoordinate(seed:number,observer:number,span=48){
 return seed+Math.floor((observer-seed+span/2)/span)*span
}
export const SNOW_CAPACITY=1024
export function snowfallCount(amount:number,quality:number){
 return Math.floor(SNOW_CAPACITY*Math.max(0,Math.min(1,amount))*Math.max(0,Math.min(1,quality)))
}
