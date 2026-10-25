import { describe, expect, it } from 'vitest'
import { greetingNameOf } from './home'

/* ── NAMA SAPAAN DASHBOARD ───────────────────────────────────────────────────
   Keluhan nyata: sapaan Dashboard selalu "Selamat sore, Jon 🌿" padahal nama user
   bukan Jon. Literal itu identitas contoh yang menempel untuk SEMUA akun — pola
   yang sama dengan "Jon Snow" di sidebar sebelum audit K4.

   Kontraknya: nama diambil dari sesi (`/api/session`) dan dipotong ke kata
   pertama; tidak ada nama yang layak → `null`, sehingga pemanggil menyapa tanpa
   nama. Test ini mengunci dua arah: nama asli DIPAKAI, dan ketiadaan nama TIDAK
   pernah berubah menjadi tebakan. */

describe('greetingNameOf', () => {
  it('memakai kata pertama dari nama lengkap', () => {
    expect(greetingNameOf('Rina Putri')).toBe('Rina')
    expect(greetingNameOf('  Budi  ')).toBe('Budi')
    expect(greetingNameOf('Maari')).toBe('Maari')
  })

  it('tidak pernah menebak nama saat namanya kosong', () => {
    expect(greetingNameOf(null)).toBeNull()
    expect(greetingNameOf(undefined)).toBeNull()
    expect(greetingNameOf('')).toBeNull()
    expect(greetingNameOf('   ')).toBeNull()
  })

  it('menolak email yang tidak sengaja tersimpan sebagai nama', () => {
    expect(greetingNameOf('rina@email.com')).toBeNull()
  })
})
