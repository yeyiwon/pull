import { WARDROBE } from './wardrobe.ts'
export const appearanceAssets = Object.fromEntries(WARDROBE.map(entry=>[entry.id,entry.url])) as Record<typeof WARDROBE[number]['id'],string>
