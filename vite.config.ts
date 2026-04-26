import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Single knob for where the backend lives during dev. Defaults to the
  // backend's `python main.py` port. Override with `BACKEND_URL=...` in .env
  // (or in the shell) if it ever changes.
  const backendUrl = env.BACKEND_URL || 'http://localhost:3001'
  console.info(`[vite] proxying /api and /uploads → ${backendUrl}`)

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    assetsInclude: ['**/*.svg', '**/*.csv'],
    server: {
      proxy: {
        '/api': { target: backendUrl, changeOrigin: true },
        '/uploads': { target: backendUrl, changeOrigin: true },
      },
    },
  }
})
