import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Biztonsági fejlécek
// - A CSP (Content-Security-Policy) a buildbe <meta> címkeként kerül bele.
//   Fejlesztés közben nem használjuk, mert a React gyorsfrissítés inline szkriptet használ.
// - Az iframe-be ágyazás tiltását a böngésző csak HTTP fejlécből fogadja el:
//   fejlesztéskor ezt itt adjuk meg, élesben a public/_headers fájl (vagy a szerver beállítása).
const BIZTONSAGI_FEJLECEK = {
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
}

// Az oldal CSP szabálya: csak a saját kód és a külső szolgáltatások, amiket tényleg használunk.
const cspSzabaly = (apiOrigin) => {
  const szabalyok = [
    "default-src 'self'",
    "script-src 'self'",
    // a diagramok méretét style attribútummal adjuk meg, ezért kell az unsafe-inline
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    // képek: Cloudinary, feltöltés előtti előnézet (data:, blob:), a főoldali kép
    "img-src 'self' data: blob: https://res.cloudinary.com https://i.pinimg.com",
    "connect-src 'self' " + apiOrigin,
    // a telephely térképe
    'frame-src https://www.openstreetmap.org',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ]
  return szabalyok.join('; ')
}

// saját Vite plugin: build közben beleteszi a CSP-t az index.html-be
const cspMeta = (apiOrigin) => {
  return {
    name: 'veltrix-csp',
    apply: 'build',
    transformIndexHtml: () => {
      return [
        { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: cspSzabaly(apiOrigin) }, injectTo: 'head-prepend' },
        { tag: 'meta', attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' }, injectTo: 'head-prepend' },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '')
  const apiUrl = env.VITE_API_URL || 'http://localhost:3600/api'
  // a robots.txt-t, a sitemap.xml-t és a megosztás oldalt a backend adja,
  // ezért ezeket továbbítjuk neki (élesben a szervernek kell ezt beállítani)
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
