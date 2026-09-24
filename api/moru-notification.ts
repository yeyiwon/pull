import { createNotificationHandler } from '../server/moruNotification.ts'
const handler=createNotificationHandler(process.env)
export const POST=handler
export const OPTIONS=handler
export const maxDuration=10
