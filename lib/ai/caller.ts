import type { NextRequest } from 'next/server'
import { readSupabaseSession } from '@/lib/supabase/session-cookie'

/* ── IDENTITAS PEMANGGIL RUTE AI (PAKET 70) ──────────────────────────────────
   Rute AI dulu memakai `requireUser()` sebagai baris pertama, sama seperti rute
   data lain. Konsekuensinya: TANPA sesi Supabase, semuanya menjawab 401 — dan
   Dashboard CatetInd memang bisa dipakai tanpa login (rutenya tidak dijaga
   middleware apa pun). Hasil yang dilihat user: mengirim pertanyaan bebas ke AI
   Coach selalu berakhir di balasan jujur "aku belum tersambung ke model AI",
   padahal kuncinya ada dan providernya sehat.

   File ini menyediakan identitas RINGAN untuk rute AI:
     • kalau ada sesi Supabase → `user.id` (perilaku lama, tetap dipakai kalau
       user memang login);
     • kalau tidak ada → identitas ANONIM yang stabil per jaringan
       (`anon:<ip>`), diambil dari header proxy.

   PENTING, batas jujurnya: nilai ini HANYA dipakai sebagai KUNCI PEMBATAS LAJU
   (`allowAiCall`) dan label — TIDAK PERNAH sebagai izin akses data user. Data
   keuangan tetap tidak bisa disentuh dari sini: rute AI tidak menerima/mengirim
   satu baris ledger pun, dan semua rute data tetap dijaga `requireUser()`.
   Pembatas lajunya pun nyata (10 permintaan/menit per kunci), jadi endpoint ini
   tidak jadi pintu gratis tanpa pagar. */

/** id pemanggil untuk pembatas laju: `user.id` kalau login, `anon:<ip>` kalau tidak */
export function aiCallerId(req: NextRequest): string {
  const session = readSupabaseSession(req.headers.get('cookie'))
  if (session) return session.userId

  const forwarded = req.headers.get('x-forwarded-for') ?? ''
  const ip =
    forwarded.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    /* dev/lokal: tidak ada proxy, semua permintaan dari mesin yang sama */
    'local'
  return `anon:${ip}`
}
