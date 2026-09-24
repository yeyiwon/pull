import { createConversationHandler } from '../server/moruConversation.ts'
const handler=createConversationHandler(process.env,fetch,9000,diagnostic=>{
 // ConversationDiagnostic contains only allow-listed identifiers and our own
 // stage/status summaries. Provider messages, headers, prompts and keys never enter it.
 console.info('[moru-conversation]',JSON.stringify(diagnostic))
})
export const POST=handler
export const OPTIONS=handler
export const maxDuration=15
