import { streamCenter, streamWidth } from './terrain.ts'

export const LAKESIDE_AREAS = {
  LAKE: { x: streamCenter(83), z: 83, purpose: 'water observation' },
  LAKE_EDGE: { x: streamCenter(70) - streamWidth(70) - 1.5, z: 70, purpose: 'shore vegetation' },
  WALKING_PATH: { x: streamCenter(83) + streamWidth(83) + 4.8, z: 83, purpose: 'main promenade' },
  CHERRY_WALK: { x: streamCenter(75) - streamWidth(75) - 4.8, z: 75, purpose: 'seasonal canopy' },
  QUIET_PATH: { x: streamCenter(102) + streamWidth(102) + 4.8, z: 102, purpose: 'slow walking' },
  LAKE_VIEW: { x: streamCenter(91) + streamWidth(91) + 4.8, z: 91, purpose: 'open water view' },
  RESTING_AREA: { x: streamCenter(59) - streamWidth(59) - 8, z: 59, purpose: 'future seating' },
  HOUSE_TO_LAKE_PATH: { x: 22, z: 10, purpose: 'house connection' },
} as const

export const LAKESIDE_BENCH_ANCHORS = [{
  id:'west-lake-view', area:'RESTING_AREA',
  sitAnchor:[LAKESIDE_AREAS.RESTING_AREA.x,.65,59] as const,
  sitFacing:[1,0,0] as const,
  approachPoint:[LAKESIDE_AREAS.RESTING_AREA.x+2,0,59] as const,
}] as const

// These slots are descriptive only. A reviewed asset and Director approval are still required.
export const LAKESIDE_ASSET_REQUIREMENTS = [
  { id: 'CHERRY_TREE', area: 'CHERRY_WALK', status: 'WAITING_FOR_ASSET' },
  { id: 'BENCH', area: 'RESTING_AREA', status: 'CANDIDATE' },
  { id: 'LAMPPOST', area: 'QUIET_PATH', status: 'CANDIDATE' },
] as const
