import { readdir,rm,readFile } from 'node:fs/promises'
import path from 'node:path'
// Vite copies ignored public files too. Only versioned public content can ship.
const tracked=new Set(JSON.parse(await readFile(new URL('./runtime-public-files.json',import.meta.url),'utf8')))
async function visit(dir,relative=''){
 for(const e of await readdir(dir,{withFileTypes:true})){
  const rel=path.posix.join(relative,e.name),file=path.join(dir,e.name)
  if(e.isDirectory()){await visit(file,rel);continue}
  if(rel==='index.html'||rel.startsWith('assets/'))continue
  if(!tracked.has(rel))await rm(file)
 }
}
await visit('dist')
console.log('Production public files restricted to versioned runtime assets.')
