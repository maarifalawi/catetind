import { describe, expect, it } from 'vitest'
import { HOME_GOALS_COPY, greetingNameOf } from './home'

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

/* ── EMPTY STATE "TABUNGAN IMPIAN" (paket copy) ──────────────────────────────
   Struktur final: judul → 3 chip contoh → satu tombol. Paragraf ajakan, label
   pengantar daftar contoh, dan seluruh emoji DIHAPUS dari data layer (bukan
   disembunyikan di komponen). Chip tetap membawa label yang memprefill nama
   celengan; ikonnya milik komponen (Lucide). */

describe('HOME_GOALS_COPY · empty state tanpa emoji', () => {
  it('judul & tombol memakai copy pendek yang sudah ditetapkan', () => {
    expect(HOME_GOALS_COPY.emptyTitle).toBe('Belum ada celengan')
    expect(HOME_GOALS_COPY.emptyCta).toBe('Buat celengan')
  })

  it('tidak ada paragraf & label contoh lagi di data layer', () => {
    expect(HOME_GOALS_COPY).not.toHaveProperty('emptyBody')
    expect(HOME_GOALS_COPY).not.toHaveProperty('emptyPopularTitle')
  })

  it('tiga chip contoh: id untuk ikon, label tanpa emoji', () => {
    expect(HOME_GOALS_COPY.emptyPopular.map((item) => item.label)).toEqual([
      'iPhone baru',
      'Liburan Bali',
      'Dana Darurat',
    ])
    expect(HOME_GOALS_COPY.emptyPopular.map((item) => item.id)).toEqual([
      'gadget',
      'holiday',
      'emergency',
    ])
    for (const item of HOME_GOALS_COPY.emptyPopular) {
      expect(item).not.toHaveProperty('emoji')
      expect(item.label).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u)
    }
  })

  it('copy keadaan kosong bebas emoji & em dash', () => {
    const surfaces = [HOME_GOALS_COPY.emptyTitle, HOME_GOALS_COPY.emptyCta]
    for (const text of surfaces) {
      expect(text).not.toContain('—')
      expect(text).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u)
    }
  })
})
