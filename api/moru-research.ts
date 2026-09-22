import { createResearchHandler } from '../server/moruResearch.ts'
export const POST=createResearchHandler(process.env)
export const maxDuration=15
