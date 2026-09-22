import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:32*1024*1024})
const sourceNames=new Set(['full-life.glb','moru_rescue.glb','moru-funnydancing-03.glb','moru-love-you-pop-dance.glb','moru-penguin-walk.glb','moru-pod-baby-groove.glb','moru-regular-jump.glb','moru-skip-forward-inplace.glb','moru-superlove-pop-dance.glb','moru-you-groove.glb'])
const approvedLarge=new Set(['public/moru/moru-walk.glb'])
const reviewed=JSON.parse(readFileSync(new URL('./reviewed-environment-assets.json',import.meta.url),'utf8'))
const limit=5_000_000
function forbidden(path){
 const lower=path.toLowerCase(),base=lower.split('/').at(-1)
 return (base!=='.env.example' && (base==='.env'||base.startsWith('.env.'))) || /\.blend\d*$/.test(lower) || lower.startsWith('asset-source/') || lower.startsWith('.vercel/') || lower.startsWith('node_modules/') || lower.startsWith('dist/') || (lower.endsWith('.glb')&&(base.includes('rescue')||base==='full-life.glb')) || (lower.startsWith('public/moru/')&&!lower.startsWith('public/moru/clips/')&&sourceNames.has(base))
}
function inspect(oid,path){
 const size=Number(git('cat-file','-s',oid).trim())
 if(reviewed[path]&&!forbidden(path)){const blob=execFileSync('git',['cat-file','blob',oid],{maxBuffer:100*1024*1024});return size===reviewed[path].bytes&&createHash('sha256').update(blob).digest('hex')===reviewed[path].sha256?null:`${path}: reviewed asset hash/size changed`}
 return forbidden(path)?`${path}: source/secret/generated path`:size>limit&&!approvedLarge.has(path)?`${path}: ${size} bytes exceeds reviewed 5MB limit`:null
}
const issues=[]
const staged=git('diff','--cached','--name-only','--diff-filter=ACMR','-z').split('\0').filter(Boolean)
for(const path of staged){const problem=inspect(git('rev-parse',`:${path}`).trim(),path);if(problem)issues.push(`staged: ${problem}`)}
const args=process.argv.slice(2)
if(args[0]!=='--staged-only'){
 const base=args[0]||'origin/main',head=args[1]||'HEAD'
 git('rev-parse','--verify',`${base}^{commit}`);git('rev-parse','--verify',`${head}^{commit}`)
 const rows=git('rev-list','--objects',`${base}..${head}`).trim().split('\n').filter(Boolean)
 for(const row of rows){const space=row.indexOf(' ');if(space<0)continue;const oid=row.slice(0,space),path=row.slice(space+1)
  if(git('cat-file','-t',oid).trim()!=='blob')continue
  const problem=inspect(oid,path);if(problem)issues.push(`history: ${problem}`)
 }
 // Inspect paths in every changed commit too: a rename can reuse an older blob.
 for(const commit of git('rev-list',`${base}..${head}`).trim().split('\n').filter(Boolean)){
  const paths=git('diff-tree','--root','--no-commit-id','--name-only','--diff-filter=ACMR','-r','-z',commit).split('\0').filter(Boolean)
  for(const path of paths)if(forbidden(path))issues.push(`history ${commit.slice(0,7)}: ${path}: forbidden path`)
 }
}
// No values are printed. This is a staged-content check, not a complete secret scanner.
for(const path of staged){if(/\.(glb|wav|m4a|png|jpg)$/.test(path))continue
 const content=execFileSync('git',['show',`:${path}`],{maxBuffer:16*1024*1024})
 if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{20,}|\bsk-[A-Za-z0-9_-]{24,}/.test(content.toString()))issues.push(`staged: ${path}: credential pattern`)
}
if(issues.length){console.error([...new Set(issues)].join('\n'));process.exitCode=1}else console.log('Runtime asset guard passed: staged files and requested outgoing history.')
