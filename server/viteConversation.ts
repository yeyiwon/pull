import { createResearchHandler } from './moruResearch.ts'
import type { ResearchSettings } from './moruResearch.ts'
import { startDiagnostic, diagnosticErrorCode } from './conversationDiagnostics.ts'
import type { DiagnosticSink } from './conversationDiagnostics.ts'
import type { Plugin } from 'vite'
import { createConversationHandler } from './moruConversation.ts'
export function conversationAPI(settings:ResearchSettings):Plugin{
 // This hook runs only in Vite's development server, never the production API.
 let sink:DiagnosticSink|undefined
 let handler:ReturnType<typeof createConversationHandler>

 return {name:'moru-conversation-api',configureServer(server){
  sink=diagnostic=>server.config.logger.info('[moru-conversation] '+JSON.stringify(diagnostic))
  handler=createConversationHandler(settings,fetch,9000,sink)
  const routes = [['/api/moru-conversation',handler],['/api/moru-research',createResearchHandler(settings,fetch,d=>server.config.logger.info('[moru-research] '+JSON.stringify(d)))]] as const
  for (const [path, route] of routes) server.middlewares.use(path,async(req,res)=>{
  const diagnostic=startDiagnostic(settings,sink)
  if(diagnostic)diagnostic.data.stage='local_adapter'
  const abort=new AbortController();res.on('close',()=>{if(!res.writableEnded)abort.abort()})
  try{
   const chunks:Buffer[]=[];let size=0
   for await(const chunk of req){size+=chunk.length;if(size>12000){diagnostic?.finish(413);res.writeHead(413);res.end();return}chunks.push(Buffer.from(chunk))}
   const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(v)headers.set(k,Array.isArray(v)?v.join(','):v)
   const response=await route(new Request(`http://${req.headers.host}${path}`,{method:req.method,headers,signal:abort.signal,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})}))
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text())
  }catch(error){if(diagnostic){diagnostic.data.errorType=error instanceof Error?(['TypeError','RangeError','SyntaxError','AbortError'].includes(error.name)?error.name:'local_adapter_error'):'local_adapter_error';diagnostic.data.errorCode=diagnosticErrorCode(error,settings.OPENAI_API_KEY);diagnostic.data.message='Local API request construction or response handling failed.';diagnostic.finish(503)}if(!res.writableEnded){res.writeHead(503);res.end()}}
 })}}
}
