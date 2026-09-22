import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { conversationAPI } from './server/viteConversation.ts'

// https://vite.dev/config/
export default defineConfig(({mode}) => {
  const env={...loadEnv(mode,process.cwd(),''),...process.env}
  return {plugins:[react(),conversationAPI({MORU_PROVIDER:env.MORU_PROVIDER,OPENAI_API_KEY:env.OPENAI_API_KEY,MORU_OPENAI_MODEL:env.MORU_OPENAI_MODEL})]}
})
