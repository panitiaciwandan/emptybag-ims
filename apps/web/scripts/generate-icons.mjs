// Generates PWA icons as SVG (and writes manifest-compatible SVGs).
// PNG generation is delegated to the browser at build time via VitePWA includeAssets;
// we generate high-quality SVG icons here.
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

const SVG_ICON = (color, bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="${bg}"/>
  <rect x="96" y="176" width="320" height="176" rx="20" fill="none" stroke="${color}" stroke-width="28"/>
  <rect x="176" y="96" width="160" height="80" rx="8" fill="${color}"/>
  <line x1="256" y1="240" x2="256" y2="336" stroke="${color}" stroke-width="24"/>
  <line x1="200" y1="288" x2="312" y2="288" stroke="${color}" stroke-width="24"/>
  <circle cx="256" cy="256" r="36" fill="${color}"/>
</svg>`

const files = {
  'favicon.svg': SVG_ICON('#ffffff', '#0f172a'),
  'apple-touch-icon.svg': SVG_ICON('#ffffff', '#0f172a'),
  'pwa-192x192.svg': SVG_ICON('#ffffff', '#0f172a'),
  'pwa-512x512.svg': SVG_ICON('#ffffff', '#0f172a'),
  'pwa-maskable-512x512.svg': SVG_ICON('#ffffff', '#0f172a')
}

mkdirSync(publicDir, { recursive: true })
for (const [name, content] of Object.entries(files)) {
  writeFileSync(join(publicDir, name), content)
  console.log(`✓ ${name}`)
}
console.log('Icons generated.')
