import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '')
  // A backend (alapból localhost:3600) szolgálja ki a robots.txt-t, a sitemap.xml-t
  // és a közösségi megosztó oldalakat. Élesben ugyanezt a reverse proxynak kell továbbítania.
  const backend = (env.VITE_API_URL || 'http://localhost:3600/api').replace(/\/api\/?$/, '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/robots.txt': backend,
        '/sitemap.xml': backend,
        '/megosztas': backend,
      },
    },
  }
})
