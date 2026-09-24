import type { SupabaseClient,User } from '@supabase/supabase-js'
import { readMemory } from '../world/brain/memory.ts'
import { readPersistentWorld } from '../world/backgroundWorld.ts'
import type { PullCloudSnapshot } from './model.ts'

type WorldRow={id:string;revision:number;simulation_revision:number;last_simulated_at:string;updated_at:string;schema_version:number}
export class SupabaseCloudAdapter{
 private client:SupabaseClient
 constructor(client:SupabaseClient){this.client=client}
 async load(user:User):Promise<PullCloudSnapshot|null>{
  const {data:world,error}=await this.client.from('pull_worlds').select('*').eq('user_id',user.id).maybeSingle<WorldRow>();if(error)throw error;if(!world)return null
  const [{data:state,error:stateError},{data:moru,error:moruError}]=await Promise.all([
   this.client.from('pull_world_states').select('state,overrides').eq('world_id',world.id).single(),
   this.client.from('pull_morus').select('id,semantic_state,state_version,created_at').eq('world_id',world.id).single(),
  ]);if(stateError)throw stateError;if(moruError)throw moruError
  const [{data:intel,error:intelError},{data:experiences,error:experienceError},{data:memories,error:memoryError}]=await Promise.all([
   this.client.from('pull_moru_intelligence').select('*').eq('moru_id',moru.id).maybeSingle(),
   this.client.from('pull_experiences').select('payload').eq('moru_id',moru.id).order('occurred_at',{ascending:true}).limit(48),
   this.client.from('pull_memories').select('payload').eq('moru_id',moru.id).order('occurred_at',{ascending:true}).limit(32),
  ]);if(intelError||experienceError||memoryError)throw intelError??experienceError??memoryError
  const now=new Date().toISOString(),semantic=moru.semantic_state??{},memory=readMemory(JSON.stringify({...semantic,version:moru.state_version,intelligence:{preferences:intel?.preferences??{},familiarity:intel?.familiarity??{},experienceSequence:intel?.experience_sequence??0,experiences:(experiences??[]).map(row=>row.payload),memories:(memories??[]).map(row=>row.payload)}}),now)
  const worldState=readPersistentWorld(JSON.stringify({...state.state,manual:state.overrides}),Date.now())
  return {schemaVersion:1,identity:{userId:user.id,worldId:world.id,moruId:moru.id},revision:world.revision,simulationRevision:world.simulation_revision,serverUpdatedAt:world.updated_at,lastSimulatedAt:world.last_simulated_at,world:worldState,moru:memory,appearance:semantic.appearance??'base'}
 }
 async create(user:User,local:PullCloudSnapshot){
  const worldId=crypto.randomUUID(),moruId=crypto.randomUUID()
  const semantic={...local.moru,intelligence:undefined,appearance:local.appearance}
  const {error}=await this.client.rpc('pull_bootstrap_world',{p_world_id:worldId,p_moru_id:moruId,p_world_state:local.world,p_world_overrides:local.world.manual,p_moru_state:semantic,p_preferences:local.moru.intelligence.preferences,p_familiarity:local.moru.intelligence.familiarity,p_experience_sequence:local.moru.intelligence.experienceSequence,p_last_simulated_at:local.lastSimulatedAt});if(error)throw error
  return {...local,identity:{userId:user.id,worldId,moruId}}
 }
 async sync(snapshot:PullCloudSnapshot){
  const semantic={...snapshot.moru,intelligence:undefined,appearance:snapshot.appearance}
  const {data,error}=await this.client.rpc('pull_sync_state',{p_world_id:snapshot.identity.worldId,p_moru_id:snapshot.identity.moruId,p_expected_revision:snapshot.revision,p_world_state:snapshot.world,p_world_overrides:snapshot.world.manual,p_moru_state:semantic,p_preferences:snapshot.moru.intelligence.preferences,p_familiarity:snapshot.moru.intelligence.familiarity,p_experience_sequence:snapshot.moru.intelligence.experienceSequence,p_experiences:snapshot.moru.intelligence.experiences,p_memories:snapshot.moru.intelligence.memories,p_last_simulated_at:snapshot.lastSimulatedAt,p_expected_simulation_revision:snapshot.simulationRevision});if(error)throw error;return data as {status:'synced'|'conflict';revision:number;simulationRevision:number;serverUpdatedAt?:string}
 }
}
