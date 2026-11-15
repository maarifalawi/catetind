import { describe, expect, it } from 'vitest'
import { stableNotificationId } from './notification-events'

/* ── ID LONCENG HARUS UUID ────────────────────────────────────────────────────
   Kolom `notifications.id` bertipe uuid. Id stabil berisi titik dua (mis.
   `budget:Makanan:warn:2026-11`) dulu gagal ditulis ke server, sehingga ambang
   budget hanya hidup di perangkat. Hash di bawah mengubah kunci teks jadi uuid
   deterministik: kunci sama → id sama (anti-dobel), formatnya sah untuk Postgres. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('stableNotificationId', () => {
  it('menghasilkan uuid v4 yang sah', () => {
    expect(stableNotificationId('budget:Makanan:warn:2026-11')).toMatch(UUID)
    expect(stableNotificationId('bill-due:abc:2026-11:3')).toMatch(UUID)
  })

  it('deterministik: kunci sama = id sama', () => {
    expect(stableNotificationId('budget:Makanan:warn:2026-11')).toBe(
      stableNotificationId('budget:Makanan:warn:2026-11'),
    )
  })

  it('kunci berbeda = id berbeda', () => {
    expect(stableNotificationId('budget:Makanan:warn:2026-11')).not.toBe(
      stableNotificationId('budget:Makanan:over:2026-11'),
    )
  })
})
