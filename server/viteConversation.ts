import type { Plugin } from 'vite'
import { createConversationHandler } from './moruConversation.ts'
import type { Settings } from './moruConversation.ts'
export function conversationAPI(settings:Settings):Plugin{
 const handler=createConversationHandler(settings)
 return {name:'moru-conversation-api',configureServer(server){server.middlewares.use('/api/moru-conversation',async(req,res)=>{
  const abort=new AbortController();res.on('close',()=>{if(!res.writableEnded)abort.abort()})
  try{
   const chunks:Buffer[]=[];let size=0
   for await(const chunk of req){size+=chunk.length;if(size>12000){res.writeHead(413);res.end();return}chunks.push(Buffer.from(chunk))}
   const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(v)headers.set(k,Array.isArray(v)?v.join(','):v)
   const response=await handler(new Request(`http://${req.headers.host}/api/moru-conversation`,{method:req.method,headers,signal:abort.signal,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})}))
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text())
  }catch{if(!res.writableEnded){res.writeHead(503);res.end()}}
 })}}
}
