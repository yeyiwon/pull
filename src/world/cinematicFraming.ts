// Presentation only: no yaw ownership, locomotion changes or Brain state.
export function idleFramingWeight(idleSeconds:number, interrupted:boolean, reducedMotion:boolean, indoor:number) {
  if(interrupted || reducedMotion || indoor>.01)return 0
  const t=Math.max(0,Math.min(1,(idleSeconds-7)/6))
  return t*t*(3-2*t)
}
export function cinematicComposition(aspect:number) {
  return aspect<.8 ? {fov:53,skyLift:1.9,side:.22} : aspect>1.8 ? {fov:49,skyLift:1.4,side:.38} : {fov:47,skyLift:1.6,side:.3}
}
