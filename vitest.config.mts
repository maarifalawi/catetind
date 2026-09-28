import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/* ── Vitest untuk logika uang + otorisasi (tanpa DOM) ────────────────────────
   Repo ini sebelumnya NOL test, padahal fungsi yang menentukan "siapa harus
   transfer berapa" (`lib/data/joint-ledger.ts` + `computeSettlement`) murni dan
   gampang diuji. Konfigurasi sengaja minimal: environment node, tanpa React,
   tanpa plugin — file test hidup berdampingan dengan modulnya
   (`lib/data/*.test.ts`) sehingga import-nya relatif.

   Ekstensi `.mts` (bukan `.ts`) karena `package.json` repo ini tidak memakai
   `"type": "module"`: dengan `.ts`, Vite memuatnya sebagai CommonJS dan
   mengeluh "ESM syntax in a file loaded as CommonJS".

   Alias `@` ditambahkan saat paket 39 (test route handler `app/api/**`): file
   `route.ts` mengimpor `@/lib/session`, jadi test yang mengimpor handler itu
   butuh alias yang sama dengan `tsconfig.json`. */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'hooks/**/*.test.ts', 'app/**/*.test.ts'],
    passWithNoTests: false,
  },
})

