import { catalog as retained } from './catalog-v02.ts'
import { musicBaseline } from './musicBaseline.ts'
// World logic uses semantic slots; replacing a recording never changes the director.
const assets = Object.fromEntries(Object.entries(musicBaseline.slots).map(([slot,id])=>[slot,musicBaseline.recordings[id].asset]))
const tracks = Object.fromEntries(Object.entries(musicBaseline.slots).map(([slot,id])=>[slot,musicBaseline.recordings[id].timing]))
export const catalog = {...retained, assets:{...retained.assets,...assets}, tracks:{...retained.tracks,...tracks}}
