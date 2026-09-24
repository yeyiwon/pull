import { createConversationHandler } from '../server/moruConversation.ts'
const handler=createConversationHandler(process.env)
export const POST=handler
export const OPTIONS=handler
export const maxDuration=15
