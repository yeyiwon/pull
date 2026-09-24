from pathlib import Path
import json,struct,hashlib,shutil,sys
root=Path(__file__).resolve().parent.parent; folder=root/'public/moru'; source=Path(sys.argv[1])
existing={hashlib.sha256(p.read_bytes()).hexdigest():p for p in folder.glob('*.glb')}
report=[]; items=[]
for p in sorted(source.glob('*.glb')):
 b=p.read_bytes();h=hashlib.sha256(b).hexdigest();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);binary=b[28+n:];a=j['animations'][0];name=a['name']
 if name in ['Cherish_Pop_Dance', 'Look_Around_Dumbfounded', 'Talk_with_Hands_Open']:
  print('Excluded user-rejected clip:',name);continue
 slug=name.lower().replace('_','-');filename='moru-'+slug+'.glb'
 duplicate=h in existing
 dest=existing[h] if duplicate else folder/filename
 if not duplicate:
  if dest.exists():raise Exception('Would overwrite '+str(dest))
  shutil.copyfile(p,dest)
 # Animation-only GLB: retain node hierarchy and exact channel accessor bytes.
 out={'asset':{'version':'2.0','generator':'PULL lossless animation extraction'},'nodes':[{k:v for k,v in node.items() if k not in ['mesh','skin','weights']} for node in j['nodes']], 'scenes':j['scenes'],'scene':j.get('scene',0),'animations':json.loads(json.dumps(j['animations'])),'accessors':[],'bufferViews':[]}
 data=bytearray();mapping={}
 for anim in out['animations']:
  for sampler in anim['samplers']:
   for field in ['input','output']:
    old=sampler[field]
    if old not in mapping:
     acc=dict(j['accessors'][old]);view=j['bufferViews'][acc['bufferView']]
     assert 'sparse' not in acc
     while len(data)%4:data.append(0)
     offset=len(data);data.extend(binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']])
     newview={k:v for k,v in view.items() if k not in ['buffer','byteOffset','target']};newview.update(buffer=0,byteOffset=offset)
     acc['bufferView']=len(out['bufferViews']);out['bufferViews'].append(newview);mapping[old]=len(out['accessors']);out['accessors'].append(acc)
    sampler[field]=mapping[old]
 out['buffers']=[{'byteLength':len(data)}];js=json.dumps(out,separators=(',',':')).encode();js+=b' '*((-len(js))%4);data+=b'\0'*((-len(data))%4)
 glb=struct.pack('<III',0x46546c67,2,28+len(js)+len(data))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(data),0x004e4942)+data
 target=folder/'clips'/filename;target.parent.mkdir(exist_ok=True);target.write_bytes(glb)
 items.append({'name':name,'url':'/moru/clips/'+filename,'duration':max(j['accessors'][s['input']]['max'][0] for s in a['samplers'])})
 report.append({'source':p.name,'file':dest.name,'duplicateSkipped':duplicate,'sha256':h,'clip':name,'runtimeBytes':len(glb)})
(root/'src/characters/assets.ts').write_text('export const moruAnimations = '+json.dumps(items,indent=2)+' as const\nexport const manifests = { MORU: { actions: moruAnimations } }\nexport type CharacterId = keyof typeof manifests\n')
(root/'docs/moru-import-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('duplicate',sum(r['duplicateSkipped'] for r in report),'new',sum(not r['duplicateSkipped'] for r in report),'animation bytes',sum(r['runtimeBytes'] for r in report))
