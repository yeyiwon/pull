import { createConversationHandler } from '../server/moruConversation.ts'
export const POST=createConversationHandler(process.env)
export const maxDuration=15
