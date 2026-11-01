import { redirect } from 'next/navigation'
import { AdminDashboardScreen } from '@/components/admin/admin-dashboard-screen'
import { PhoneStage } from '@/components/catetind/phone-stage'
import { adminDeniedPath } from '@/lib/admin/access'
import { readAdminIdentity } from '@/lib/admin/guard'
import { loadAdminSnapshot } from '@/lib/admin/server'

/* ── /admin — FOUNDER COMMAND CENTER (SERVER COMPONENT) ──────────────────────
   Urutan yang TIDAK boleh dibalik:

     1. verifikasi sesi ke Supabase Auth (`readAdminIdentity`) — cookie saja
        tidak cukup;
     2. cocokkan email dengan daftar admin (`shiimaify@gmail.com` + env);
     3. kalau bukan admin: `redirect()` SEBELUM data apa pun dibaca, jadi tidak
        ada snapshot bisnis yang sempat dikirim ke browser;
     4. baru setelah itu `loadAdminSnapshot()` memakai kunci peran server.

   Middleware sudah menolak pengunjung tanpa sesi, tetapi halaman ini tetap
   memeriksa sendiri: satu lapis penjagaan di middleware tidak boleh menjadi
   satu-satunya alasan data sensitif aman.
   ────────────────────────────────────────────────────────────────────────── */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const identity = await readAdminIdentity()
  if (!identity.ok) redirect(adminDeniedPath(identity.decision))

  const loaded = await loadAdminSnapshot()

  return (
    <PhoneStage plain>
      <AdminDashboardScreen
        email={identity.user.email}
        name={identity.user.name}
        snapshot={loaded.ok ? loaded.snapshot : null}
        error={loaded.ok ? null : loaded.error}
      />
    </PhoneStage>
  )
}
