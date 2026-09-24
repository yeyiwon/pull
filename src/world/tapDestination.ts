import { Vector3 } from 'three'

export type TapDestination={revision:number;point:Vector3|null}
let snapshot:TapDestination={revision:0,point:null}
const listeners=new Set<()=>void>()
export const tapDestination={
 show(point:Vector3){snapshot={revision:snapshot.revision+1,point:point.clone()};for(const listener of listeners)listener()},
 getSnapshot(){return snapshot},
 subscribe(listener:()=>void){listeners.add(listener);return()=>listeners.delete(listener)},
}
