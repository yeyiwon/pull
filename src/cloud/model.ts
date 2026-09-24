import { readPersistentWorld,type PersistentWorldState } from '../world/backgroundWorld.ts'
import { readMemory,type MoruMemory } from '../world/brain/memory.ts'
import type { MoruAppearance } from '../characters/bodySelection.ts'

export const CLOUD_SCHEMA_VERSION=1
export type CloudIdentity={userId:string;worldId:string;moruId:string}
export type PullCloudSnapshot={
 schemaVersion:1;identity:CloudIdentity;revision:number;simulationRevision:number
 serverUpdatedAt:string;lastSimulatedAt:string;world:PersistentWorldState;moru:MoruMemory;appearance:MoruAppearance
}
export type SyncPhase='LOCAL'|'CLEAN'|'DIRTY'|'SYNCING'|'CONFLICT'|'OFFLINE'|'ERROR'
export type CloudDiagnostics={configured:boolean;authenticated:boolean;authState:'GUEST'|'SIGNED_OUT'|'AUTHENTICATED';sessionRestored:boolean;callbackDetected:boolean;pkceExchange:'IDLE'|'ATTEMPTED'|'SUCCESS'|'FAILURE'|'DUPLICATE';pkceFailure:string|null;profileState:'UNKNOWN'|'REQUIRED'|'READY';cloudEnabled:boolean;userId:string|null;worldId:string|null;moruId:string|null;localSchemaVersion:number;cloudSchemaVersion:number|null;localUpdatedAt:string|null;cloudUpdatedAt:string|null;phase:SyncPhase;lastSync:string|null;lastResult:string;pendingRecords:number;conflicts:number}
export const cloudDiagnostics:CloudDiagnostics={configured:false,authenticated:false,authState:'SIGNED_OUT',sessionRestored:false,callbackDetected:false,pkceExchange:'IDLE',pkceFailure:null,profileState:'UNKNOWN',cloudEnabled:false,userId:null,worldId:null,moruId:null,localSchemaVersion:7,cloudSchemaVersion:null,localUpdatedAt:null,cloudUpdatedAt:null,phase:'LOCAL',lastSync:null,lastResult:'Local mode',pendingRecords:0,conflicts:0}

export function readLocalSnapshot(storage:Pick<Storage,'getItem'>,identity:CloudIdentity,now=Date.now()):PullCloudSnapshot{
 const stamp=new Date(now).toISOString(),world=readPersistentWorld(storage.getItem('pull.world.background.v1'),now),moru=readMemory(storage.getItem('pull.moru.memory.v1'),stamp)
 const selected=storage.getItem('moruAppearance') as MoruAppearance|null
 return {schemaVersion:1,identity,revision:0,simulationRevision:0,serverUpdatedAt:stamp,lastSimulatedAt:new Date(world.updatedAt).toISOString(),world,moru,appearance:selected??'base'}
}
export function writeLocalSnapshot(storage:Pick<Storage,'setItem'>,snapshot:PullCloudSnapshot){
 storage.setItem('pull.world.background.v1',JSON.stringify(snapshot.world))
 storage.setItem('pull.moru.memory.v1',JSON.stringify(snapshot.moru))
 storage.setItem('moruAppearance',snapshot.appearance)
}
export function snapshotPayload(snapshot:PullCloudSnapshot){return {world:snapshot.world,moru:snapshot.moru,appearance:snapshot.appearance}}
export function sameSnapshotPayload(a:PullCloudSnapshot,b:PullCloudSnapshot){return JSON.stringify(snapshotPayload(a))===JSON.stringify(snapshotPayload(b))}
export function safeShortId(value:string|null){return value?`${value.slice(0,6)}…${value.slice(-4)}`:'—'}
