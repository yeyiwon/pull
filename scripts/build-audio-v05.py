"""Import existing v0.5 renders only. No composition, synthesis, or source mutations."""
import hashlib,json,pathlib,subprocess,sys,shutil
root=pathlib.Path(__file__).resolve().parents[1]
source=pathlib.Path(sys.argv[1]).resolve()
cat=json.loads((source/'catalogue.json').read_text());renders=json.loads((source/'render_manifest.json').read_text())['assets']
seasons=['spring','summer','autumn','winter'];times=['dawn','morning','day','sunset','evening','night']
if set(cat['slots'])!=set(seasons) or any(set(cat['slots'][s])!=set(times) for s in seasons):raise ValueError('Expected complete 4 x 6 slots')
dest=root/'public/audio/v05';dest.mkdir(parents=True,exist_ok=True)
cache=root/'node_modules/.cache/pull-audio-v05';cache.mkdir(parents=True,exist_ok=True)
slots={};recordings={};records=[]
for season in seasons:
 for time in times:
  semantic=f'{season}_{time}';id=cat['slots'][season][time];a=cat['assets'][id];m=renders[id];wav=(source/a['audio']).resolve()
  if not wav.is_relative_to(source):raise ValueError('Source path escapes package')
  digest=hashlib.sha256(wav.read_bytes()).hexdigest()
  if digest!=m['sha256']:raise ValueError(f'Hash mismatch: {id}')
  if m['loopStartFrame']!=0:raise ValueError('Nonzero loop start requires explicit runtime support')
  out=dest/f'{id}.m4a';stamp=cache/f'.{id}.sha256'
  if not out.exists() or not stamp.exists() or stamp.read_text()!=digest:
   temporary=dest/f'{id}.encoding.m4a'
   subprocess.run(['/usr/bin/afconvert','-f','m4af','-d','aac','-b','128000',str(wav),str(temporary)],check=True,capture_output=True)
   temporary.replace(out);stamp.write_text(digest)
  slots[semantic]=id
  asset={'url':f'/audio/v05/{id}.m4a','gain':m['recommendedPlaybackGain'],'duration':m['seconds'],'channels':m['channels'],'frames':m['loopEndFrame'],'sampleRate':m['sampleRate'],'bytes':out.stat().st_size,'category':'music'}
  # Different tempo/key per track: wait one bar, overlap only three seconds.
  timing={'bpm':a['bpm'],'phraseBars':1,'crossfadeSeconds':3,'durationSeconds':m['seconds']}
  recordings[id]={'asset':asset,'timing':timing,'sourceSha256':digest,'key':a['key']}
  records.append({**asset,'id':semantic,'assetId':id,'sourceMaster':a['audio'],'sourceRevision':cat['revision'],'sourceSha256':digest,'stateMapping':{'season':season,'time':time},'loop':True,'load':'current-core/next-near-future'})
# Preserve the pre-existing Home, SFX and ambience catalogue, independently replaceable.
base=root/'src/audio/catalog-v02.ts'
if not base.exists():shutil.copy2(root/'src/audio/catalog.ts',base)
(root/'src/audio/musicBaseline.ts').write_text('// Generated from Audio v0.5 catalogue/render manifest; provisional, not final OST.\nexport const musicBaseline = '+json.dumps({'revision':cat['revision'],'slots':slots,'recordings':recordings},ensure_ascii=False,indent=2)+' as const\n')
(root/'src/audio/catalog.ts').write_text("""import { catalog as retained } from './catalog-v02.ts'
import { musicBaseline } from './musicBaseline.ts'
// World logic uses semantic slots; replacing a recording never changes the director.
const assets = Object.fromEntries(Object.entries(musicBaseline.slots).map(([slot,id])=>[slot,musicBaseline.recordings[id].asset]))
const tracks = Object.fromEntries(Object.entries(musicBaseline.slots).map(([slot,id])=>[slot,musicBaseline.recordings[id].timing]))
export const catalog = {...retained, assets:{...retained.assets,...assets}, tracks:{...retained.tracks,...tracks}}
""")
p=root/'public/audio/audio-production-manifest.json';manifest=json.loads(p.read_text())
retained=[a for a in manifest['assets'] if a['id'] not in slots]
for a in retained:
 if 'sourceMaster' in a:a['sourceMaster']=pathlib.Path(a['sourceMaster']).name
manifest.update({'version':'0.5-development-baseline','musicRevision':cat['revision'],'assets':retained+records,'musicSlots':slots,'musicStatus':'PROVISIONAL_NOT_FINAL_OST','retained':'v0.2 Home, ambience, Moru/world/UI SFX; no Nuu','totalBytes':sum(a['bytes'] for a in retained+records)})
manifest['tracks']=[t for t in manifest['tracks'] if t['id'] not in slots]+[{'id':r['id'],**recordings[r['assetId']]['timing']} for r in records]
p.write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
credits=dest/'credits';credits.mkdir(exist_ok=True)
shutil.copy2(source/'CREDITS.md',credits/'CREDITS.md');shutil.copytree(source/'licenses',credits/'licenses',dirs_exist_ok=True)
print('Imported',len(records),'existing tracks; runtime selected bytes:',manifest['totalBytes'])
