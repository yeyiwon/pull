import { createResearchHandler } from '../server/moruResearch.ts'
const handler=createResearchHandler(process.env)
export const POST=handler
export const OPTIONS=handler
export const maxDuration=15
