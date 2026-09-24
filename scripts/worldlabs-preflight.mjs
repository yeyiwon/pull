import { WorldLabsClient, WorldLabsError } from '../server/worldLabs.ts'

// This script is read-only: it never submits a generation request.
const client = new WorldLabsClient(process.env.WORLDLABS_API_KEY)
console.log(JSON.stringify({ configured: client.configured, selectedModel: 'marble-1.1-plus', estimatedCredits: '1580–3080', generationSubmitted: false }))
if (client.configured) {
  try {
    console.log(JSON.stringify({ remainingApiCredits: await client.credits() }))
  } catch (error) {
    if (error instanceof WorldLabsError) console.log(JSON.stringify({ creditCheck: 'failed', status: error.status, errorType: error.errorType, description: error.safeDescription }))
    else console.log(JSON.stringify({ creditCheck: 'failed', errorType: 'unknown' }))
  }
}
