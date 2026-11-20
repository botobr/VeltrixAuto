import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/*
 * Biztonsági fejlécek.
 * - A Content-Security-Policy az éles buildbe <meta> címkeként kerül (a fejlesztői szerver inline
 *   szkripttel tölti be a React gyorsfrissítést, ezért ott nem alkalmazzuk).
 * - A keretbe ágyazás tiltását (kattintáseltérítés ellen) a böngésző csak HTTP-fejlécből fogadja el:
 *   ezt a fejlesztői/előnézeti szerver itt adja, élesben a public/_headers fájl (Netlify, Cloudflare
 *   Pages), más tárhelyen ugyanezeket a fejléceket a szerver beállításaiban kell megadni.
 */
const BIZTONSAGI_FEJLECEK = {
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
}

/** Az oldal CSP-je: csak a saját kód és a ténylegesen használt külső szolgáltatások. */
const cspSzabaly = (apiOrigin) => [
  "default-src 'self'",
  "script-src 'self'",
  // Inline style: a diagramok és sávok méretét React style-attribútum adja meg.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // Termék- és autóképek (Cloudinary), feltöltés előtti előnézet (data:, blob:), főoldali kép.
  "img-src 'self' data: blob: https://res.cloudinary.com https://i.pinimg.com",
  `connect-src 'self' ${apiOrigin}`,
  // A telephely térképe (csak kattintásra töltődik be).
  'frame-src https://www.openstreetmap.org',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const cspMeta = (apiOrigin) => ({
  name: 'veltrix-csp',
  apply: 'build',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: cspSzabaly(apiOrigin) }, injectTo: 'head-prepend' },
    { tag: 'meta', attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' }, injectTo: 'head-prepend' },
  ],
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '')
  const apiUrl = env.VITE_API_URL || 'http://localhost:3600/api'
  // A backend (alapból localhost:3600) szolgálja ki a robots.txt-t, a sitemap.xml-t
  // és a közösségi megosztó oldalakat. Élesben ugyanezt a reverse proxynak kell továbbítania.
  const backend = apiUrl.replace(/\/api\/?$/, '')

  return {
    plugins: [react(), cspMeta(new URL(apiUrl).origin)],
    server: {
      headers: BIZTONSAGI_FEJLECEK,
      proxy: {
        '/robots.txt': backend,
        '/sitemap.xml': backend,
        '/megosztas': backend,
      },
    },
    preview: {
      headers: BIZTONSAGI_FEJLECEK,
    },
  }
})
