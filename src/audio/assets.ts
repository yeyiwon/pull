// Stable compatibility export: seasonal v0.5 music + retained Home/ambience/SFX.
import { catalog } from './catalog.ts'
export const audioAssets = catalog.assets
export type AudioAsset = keyof typeof audioAssets
