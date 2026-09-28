/* ── KONFIGURASI SUPABASE (paket 45) ─────────────────────────────────────────
   Satu tempat yang tahu nilai `NEXT_PUBLIC_SUPABASE_URL` / `..._ANON_KEY`, dan —
   yang lebih penting — satu tempat yang menjawab pertanyaan "apakah backend-nya
   ada?". Tiga hal bergantung pada jawaban itu:

     · `lib/session.ts`  → tanpa konfigurasi, tidak ada sesi nyata yang bisa dibaca
       (semua route `app/api/**` menjawab 401 seperti sebelumnya);
     · `lib/money/store.ts` → tanpa konfigurasi, store tetap jalan lokal
       (IndexedDB) supaya test & demo offline tidak butuh jaringan;
     · `lib/money/export.ts` → ekspor menyebut apa adanya apakah datanya lokal.

   Kunci di sini adalah kunci PUBLISHABLE (`sb_publishable_...` / anon). Kunci itu
   memang boleh sampai ke browser karena yang melindungi data adalah RLS di
   database (`user_id = auth.uid()`), bukan kerahasiaan kunci.
   Kunci RAHASIA (prefix `sb_` + `secret_`, atau kunci peran server) TIDAK PERNAH
   dibaca di file ini — kalau suatu saat ada yang menambahkannya, ia akan
   ter-bundle ke klien lewat awalan `NEXT_PUBLIC_`. */

const URL_VALUE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_VALUE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/** true = aplikasi ini dipasangkan ke project Supabase yang nyata */
export function hasSupabaseConfig(): boolean {
  return URL_VALUE.startsWith('https://') && ANON_VALUE.length > 20
}

export function supabaseUrl(): string {
  return URL_VALUE
}

export function supabaseAnonKey(): string {
  return ANON_VALUE
}

/**
 * Project ref (`wmswtoyikvgzcvbgdceo`) — dipakai sebagai bagian nama cookie sesi
 * Supabase (`sb-<ref>-auth-token`). Diambil dari HOST, bukan dari variabel
 * terpisah, supaya tidak ada dua nilai yang bisa berbeda.
 */
export function supabaseProjectRef(): string {
  if (!URL_VALUE) return ''
  try {
    return new URL(URL_VALUE).hostname.split('.')[0] ?? ''
  } catch {
    return ''
  }
}

/**
 * Nama cookie sesi Auth. Kalau konfigurasi belum diisi, namanya memakai ref
 * cadangan (`local`) supaya modul ini tetap bisa diuji & dibaca tanpa env — dan
 * cookie itu memang tidak akan pernah ada di browser user.
 */
export function supabaseAuthStorageKey(): string {
  const ref = supabaseProjectRef() || 'local'
  return `sb-${ref}-auth-token`
}
