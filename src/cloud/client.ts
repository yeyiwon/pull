import { createClient,type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_AUTH_OPTIONS } from './authConfig.ts'

const url=import.meta.env.VITE_SUPABASE_URL?.trim(),key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
export const cloudConfigured=!!url&&!!key
export const supabase:SupabaseClient|null=cloudConfigured?createClient(url,key,{auth:SUPABASE_AUTH_OPTIONS}):null
