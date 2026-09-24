import type { SupabaseClient,User } from '@supabase/supabase-js'

export const DISPLAY_NAME_MAX_LENGTH=40
export type PullProfile={userId:string;displayName:string;birthday:string;createdAt:string;updatedAt:string}
export type ProfileInput={displayName:string;birthday:string}

export function normalizeDisplayName(value:string){return value.trim()}
export function validateDisplayName(value:string){const name=normalizeDisplayName(value);return name.length>0&&name.length<=DISPLAY_NAME_MAX_LENGTH}
export function todayDate(now=new Date()){const year=now.getFullYear(),month=String(now.getMonth()+1).padStart(2,'0'),day=String(now.getDate()).padStart(2,'0');return `${year}-${month}-${day}`}
export function validateBirthday(value:string,today=todayDate()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value>today)return false
 const [year,month,day]=value.split('-').map(Number),date=new Date(Date.UTC(year,month-1,day))
 return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day
}
export function validateProfile(input:ProfileInput){return validateDisplayName(input.displayName)&&validateBirthday(input.birthday)}

type ProfileRow={user_id:string;display_name:string;birthday:string;created_at:string;updated_at:string}
function profile(row:ProfileRow):PullProfile{return {userId:row.user_id,displayName:row.display_name,birthday:row.birthday,createdAt:row.created_at,updatedAt:row.updated_at}}

export class SupabaseProfileAdapter{
 private client:SupabaseClient
 constructor(client:SupabaseClient){this.client=client}
 async load(user:User){
  const {data,error}=await this.client.from('pull_profiles').select('user_id,display_name,birthday,created_at,updated_at').eq('user_id',user.id).maybeSingle()
  if(error)throw error
  return data?profile(data as ProfileRow):null
 }
 async save(user:User,input:ProfileInput){
  const clean={displayName:normalizeDisplayName(input.displayName),birthday:input.birthday}
  if(!validateProfile(clean))throw Error('Invalid profile')
  const now=new Date().toISOString()
  const {data,error}=await this.client.from('pull_profiles').upsert({user_id:user.id,display_name:clean.displayName,birthday:clean.birthday,updated_at:now},{onConflict:'user_id'}).select('user_id,display_name,birthday,created_at,updated_at').single()
  if(error)throw error
  return profile(data as ProfileRow)
 }
}
