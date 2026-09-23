// Presentation only: no yaw ownership, locomotion changes or Brain state.
export function idleFramingWeight(idleSeconds:number, interrupted:boolean, reducedMotion:boolean, indoor:number) {
  if(interrupted || reducedMotion || indoor>.01)return 0
  const t=Math.max(0,Math.min(1,(idleSeconds-7)/6))
  return t*t*(3-2*t)
}
export function cinematicComposition(aspect:number) {
  return aspect<.8 ? {fov:53,skyLift:1.9,side:.22} : aspect>1.8 ? {fov:49,skyLift:1.4,side:.38} : {fov:47,skyLift:1.6,side:.3}
}

// Keep the feet inside the lower 82% of the vertical frustum while looking up.
// Bounding the optical angle (rather than world-space lift) works at every FOV.
export function skyTargetHeight(cameraY:number, feetY:number, horizontalDistance:number, requestedY:number, fovDegrees:number) {
  const distance=Math.max(.1,horizontalDistance)
  const halfFov=fovDegrees*Math.PI/360
  const feetAngle=Math.atan2(feetY-cameraY,distance)
  const lowerMarginAngle=Math.atan(Math.tan(halfFov)*.82)
  const highestTarget=cameraY+Math.tan(feetAngle+lowerMarginAngle)*distance
  return Math.min(requestedY,highestTarget)
}
