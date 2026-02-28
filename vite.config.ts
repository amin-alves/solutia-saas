import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
    // Carrega o .env, .env.local, .env.[mode] do diretório raiz
    const env = loadEnv(mode, process.cwd(), '')

    return {
        plugins: [
            tailwindcss(),
            react()
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        define: {
            // Expõe as chaves NEXT_PUBLIC_ para o processo do browser via Vite
            'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL),
            'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
        }
    }
})
