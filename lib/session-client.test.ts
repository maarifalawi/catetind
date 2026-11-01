import { describe, expect, it } from 'vitest'
import {
  DISPLAY_NAME_COPY,
  DISPLAY_NAME_MAX,
  normalizeDisplayName,
  updateDisplayName,
} from './session-client'

/* ── GANTI NAMA DARI PENGATURAN (perbaikan: nama benar-benar berubah) ─────────
   Sebelum ini tombol "Simpan Perubahan" di Profil & Akun hanya menampilkan toast
   sukses tanpa menulis apa pun, jadi sapaan Dashboard tetap memakai nama lama.
   Yang dikunci di sini adalah bagian yang bisa diuji tanpa jaringan:

     · nama dirapikan dulu (spasi ganda & spasi tepi dibuang);
     · nama kosong / kepanjangan DITOLAK sebelum request apa pun;
     · tanpa backend (build demo/test) ia berkata jujur "belum bisa disimpan" —
       bukan mengaku berhasil seperti perilaku lama.

   Penulisan ke Supabase Auth + `profiles` sendiri tidak diuji di sini karena
   butuh jaringan; jalurnya satu fungsi (`updateDisplayName`) supaya tidak ada
   dua cara berbeda menyimpan nama. */

describe('normalizeDisplayName', () => {
  it('merapikan spasi ganda & spasi di tepi', () => {
    expect(normalizeDisplayName('  Rina   Putri  ')).toBe('Rina Putri')
    expect(normalizeDisplayName('Maari')).toBe('Maari')
  })

  it('spasi saja dianggap kosong (bukan nama)', () => {
    expect(normalizeDisplayName('   ')).toBe('')
    expect(normalizeDisplayName('')).toBe('')
  })
})

describe('updateDisplayName · penjagaan sebelum menyentuh jaringan', () => {
  it('nama kosong ditolak dengan pesan yang jelas', async () => {
    const result = await updateDisplayName('   ')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe(DISPLAY_NAME_COPY.empty)
  })

  it('nama kepanjangan ditolak (batas 40 karakter)', async () => {
    const result = await updateDisplayName('a'.repeat(DISPLAY_NAME_MAX + 1))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe(DISPLAY_NAME_COPY.tooLong)
  })

  it('tanpa backend: jujur bilang belum bisa disimpan', async () => {
    const result = await updateDisplayName('Rina')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe(DISPLAY_NAME_COPY.noBackend)
  })
})
