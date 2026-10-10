'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { BadgeCheck, Camera, ExternalLink, HeartHandshake, LogOut, Save, Unlink, UserPlus, XCircle } from 'lucide-react'
import { ConfirmDialog, DialogButton } from './settings-dialog'
import {
  Segmented,
  SettingsCard,
  SettingsField,
  SettingsInput,
  SettingsPanel,
  TonePill,
} from './settings-ui'
import { clampPayday, digitsToDisplay, onlyDigits, type DashboardPeriod } from '@/lib/onboarding'
import {
  MONEY_SETTINGS_COPY,
  saveUserMoneySettings,
  useUserMoneySettings,
} from '@/lib/user-money-settings'
import { LOGIN_PATH, RELOGIN_COPY, SESSION_COPY } from '@/lib/data/auth'
import { JOIN_PREVIEW_COPY, buildJoinHref } from '@/lib/data/joint-invite'
import { DEMO_PARTNER_JOINED, INITIAL_JOINT_WALLET, JOINT_PARTNER } from '@/lib/data/joint'
import { activeInviteFor } from '@/lib/invite-store'
import { endSession } from '@/lib/session-client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

/* ── Panel: Profil & Akun + Keluar (inventaris #15, #23) ──────────────────────
   Isi panel ini mengikuti tiga urutan yang paling sering dibutuhkan user:
     1. IDENTITAS  — avatar (bisa diganti), nama, email (terkunci), badge member.
     2. SIKLUS KEUANGAN — satu penentu kapan Dashboard & Kalender di-reset.
        Nilainya memakai tipe `DashboardPeriod` + `clampPayday()` yang SAMA dengan
        onboarding (lib/onboarding.ts) supaya aturannya tidak pernah bercabang.
     3. DOMPET BERSAMA — putus koneksi pasangan dengan dua pilihan yang jujur
        (simpan riwayat sendiri / hapus semua), bukan satu tombol ambigu. */

const EMAIL = 'jon@snow.com'
const MEMBER_BADGE = '🏆 Founding Member #47'

/** "2026-07-15" → "15 Juli 2026" — timeZone UTC supaya tanggalnya tidak
 *  bergeser satu hari antara server & client (SSR-safe). */
const PARTNER_SINCE = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
}).format(new Date(INITIAL_JOINT_WALLET.createdAt))

export function ProfileSettingsPanel() {
  const [name, setName] = useState('Jon Snow')
  const [avatarUrl, setAvatarUrl] = useState('/avatar-maarif.png')
  const [period, setPeriod] = useState<DashboardPeriod>('calendar')
  const [payday, setPayday] = useState(25)
  const [dirty, setDirty] = useState(false)

  /* ── KONFIGURASI UANG USER (paket 57) ────────────────────────────────────
     Pemasukan bulanan & total cicilan adalah PEMBAGI jatah harian, jadi
     nilainya wajib bisa diubah user — bukan cuma disimpan diam-diam. Sebelum
     paket ini panel ini cuma punya "Tanggal Gajian", sementara kartu Jatah Hari
     Ini dihitung dari konstanta contoh.

     Ditulis LANGSUNG (write-through) saat field berubah, bukan menunggu tombol
     "Simpan Perubahan": angka ini dipakai halaman lain (Home & /budget) untuk
     menghitung jatah, dan simpan tertunda membuat halaman itu menampilkan angka
     lama sampai user menekan tombol di halaman yang berbeda. Yang tersimpan
     adalah bentuk JSON polos (`lib/user-money-settings.ts`), jadi perubahan ini
     tidak pernah menyentuh profil/identitas. */
  const moneySettings = useUserMoneySettings()
  const [incomeDigits, setIncomeDigits] = useState('')
  const [installmentDigits, setInstallmentDigits] = useState('')

  /**
   * Kode undangan yang benar-benar AKTIF untuk dompet bersama (paket 39).
   *
   * Dibaca setelah mount karena hidupnya di localStorage (`lib/invite-store.ts`).
   * Kalau belum ada kode, panel ini TIDAK menampilkan tautan pratinjau palsu —
   * kode undangan umurnya 24 jam, jadi tautan ke kode yang sudah mati justru
   * menyesatkan. Nilainya diisi jalur nyata ke /joint tempat kodenya dibuat.
   */
  const [inviteCode, setInviteCode] = useState<string | null>(null)

  useEffect(() => {
    setInviteCode(activeInviteFor(INITIAL_JOINT_WALLET.id)?.code ?? null)
  }, [])

  /* Nilai konfigurasi uang dibaca setelah mount (hidrasi aman): `moneySettings`
     datang dari store yang mengembalikan default pada render pertama, lalu
     berpindah ke nilai sebenarnya. Di sini ia disalin ke state field supaya user
     bisa mengetik tanpa nilai ketimpa. */
  useEffect(() => {
    setIncomeDigits(
      moneySettings.monthlyIncome > 0 ? String(Math.round(moneySettings.monthlyIncome)) : '',
    )
    setInstallmentDigits(
      moneySettings.totalInstallments > 0 ? String(Math.round(moneySettings.totalInstallments)) : '',
    )
    setPeriod(moneySettings.dashboardPeriod)
    if (moneySettings.paydayDate) setPayday(moneySettings.paydayDate)
  }, [moneySettings])

  /* partner bisa "diputus" di demo ini — state lokal, sumber awal dari mock
     lib/data/joint.ts (DEMO_PARTNER_JOINED) supaya kedua kondisi bisa direview */
  const [partner, setPartner] = useState(DEMO_PARTNER_JOINED ? JOINT_PARTNER : null)
  const [disconnectOpen, setDisconnectOpen] = useState(false)
  /** konfirmasi kedua khusus opsi destruktif ("Hapus Semua") */
  const [purgeOpen, setPurgeOpen] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  function handleName(event: ChangeEvent<HTMLInputElement>) {
    setName(event.target.value)
    setDirty(true)
  }

  function handlePeriod(next: DashboardPeriod) {
    setPeriod(next)
    setDirty(true)
    /* write-through: /calendar & label periode lain membaca konfigurasi ini */
    saveUserMoneySettings({ dashboardPeriod: next })
  }

  function handlePayday(event: ChangeEvent<HTMLInputElement>) {
    const next = clampPayday(event.target.value)
    setPayday(next)
    setDirty(true)
    saveUserMoneySettings({ paydayDate: next })
  }

  /**
   * Pemasukan bulanan — field terpenting paket 57.
   *
   * Angka ini yang membuat kartu "Jatah Hari Ini" di Home & /budget bisa
   * dihitung. Karena itu ia ditulis seketika (bukan menunggu "Simpan"), dan
   * field kosong berarti "belum diatur" (0) — bukan 0 rupiah sebagai pemasukan.
   */
  function handleIncome(event: ChangeEvent<HTMLInputElement>) {
    const digits = onlyDigits(event.target.value, 12)
    setIncomeDigits(digits)
    setDirty(true)
    saveUserMoneySettings({ monthlyIncome: digits ? Number(digits) : 0 })
  }

  /** Total cicilan platform per bulan — dipotong dari pemasukan sebelum jatah harian */
  function handleInstallments(event: ChangeEvent<HTMLInputElement>) {
    const digits = onlyDigits(event.target.value, 12)
    setInstallmentDigits(digits)
    setDirty(true)
    saveUserMoneySettings({ totalInstallments: digits ? Number(digits) : 0 })
  }

  function handleAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    /* URL.createObjectURL = preview lokal tanpa upload; produksi: unggah ke
       storage lalu simpan URL-nya di profil */
    setAvatarUrl(URL.createObjectURL(file))
    setDirty(true)
    toast.success('Foto profil diperbarui 📸')
  }

  function handleSave() {
    setDirty(false)
    toast.success('Perubahan profil tersimpan ✅', {
      description:
        period === 'cycle'
          ? `Periode keuangan di-reset tiap tanggal ${payday}.`
          : 'Periode keuangan mengikuti bulan kalender.',
    })
  }

  function handleKeepHistory() {
    setPartner(null)
    setDisconnectOpen(false)
    toast.success('Dompet dipisah — riwayatmu tetap aman 💚', {
      description: 'Transaksi pribadimu masih bisa kamu buka seperti biasa.',
    })
  }

  function handlePurge() {
    setPartner(null)
    setDisconnectOpen(false)
    setPurgeOpen(false)
    toast('Dompet bersama dipisah & riwayat bersama dihapus', {
      description: 'Kamu bisa mulai dompet baru kapan aja.',
    })
  }

  return (
    <SettingsPanel eyebrow="Profil & Akun" title="Profil & Akun">
      {/* ── 1. IDENTITAS ─────────────────────────────────────────────────── */}
      <SettingsCard>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Ganti foto profil"
            className="group relative size-20 shrink-0 overflow-hidden rounded-full ring-1 ring-soil/12 transition-shadow focus-visible:ring-2 focus-visible:ring-forest/40"
          >
            {/* <img> biasa — sumbernya bisa blob URL hasil pilih file, dan
                next/image hanya mengoptimasi URL statis/lokal yang dikenal */}
            <img src={avatarUrl} alt="Foto profil" className="size-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-ink/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
              <Camera className="size-5 text-cream" strokeWidth={2.2} aria-hidden />
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleAvatar}
          />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-forest">{name}</p>
            <p className="mt-0.5 truncate text-xs text-forest/50">{EMAIL}</p>
            <TonePill tone="warning" icon={BadgeCheck} className="mt-2">
              {MEMBER_BADGE}
            </TonePill>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <SettingsField label="Nama Lengkap" htmlFor="settings-name">
            <SettingsInput
              id="settings-name"
              value={name}
              onChange={handleName}
              autoComplete="name"
              placeholder="Nama lengkap kamu"
            />
          </SettingsField>
          <SettingsField
            label="Email"
            htmlFor="settings-email"
            note="Hubungi support untuk ganti email."
          >
            <SettingsInput id="settings-email" value={EMAIL} disabled readOnly />
          </SettingsField>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-forest py-3.5 text-sm font-medium text-mint transition-colors hover:bg-forest-soft active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-ink/[0.07] disabled:text-forest/35 sm:w-auto sm:px-6"
        >
          <Save className="size-4" strokeWidth={2.4} aria-hidden />
          Simpan Perubahan
        </button>
      </SettingsCard>

      {/* ── 2. SIKLUS KEUANGAN ───────────────────────────────────────────── */}
      <SettingsCard
        title="Mulai Periode Keuangan"
        desc="Ini menentukan kapan dashboard dan kalender kamu di-reset setiap bulannya."
      >
        {/* ── UANG BULANAN (paket 57) ─────────────────────────────────────────
            Dua angka yang MENENTUKAN Jatah Hari Ini di Dashboard & Budget. Dulu
            panel ini cuma punya "Tanggal Gajian", sehingga jatah harian mustahil
            dibetulkan dari mana pun. Ditulis seketika (write-through) supaya
            halaman lain tidak menampilkan angka lama. */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SettingsField
            label={MONEY_SETTINGS_COPY.incomeLabel}
            htmlFor="settings-income"
            note={MONEY_SETTINGS_COPY.incomeNote}
          >
            <SettingsInput
              id="settings-income"
              inputMode="numeric"
              value={digitsToDisplay(incomeDigits)}
              onChange={handleIncome}
              placeholder={MONEY_SETTINGS_COPY.incomePlaceholder}
              className="tabular-nums"
            />
          </SettingsField>
          <SettingsField
            label={MONEY_SETTINGS_COPY.installmentsLabel}
            htmlFor="settings-installments"
            note={MONEY_SETTINGS_COPY.installmentsNote}
          >
            <SettingsInput
              id="settings-installments"
              inputMode="numeric"
              value={digitsToDisplay(installmentDigits)}
              onChange={handleInstallments}
              placeholder={MONEY_SETTINGS_COPY.installmentsPlaceholder}
              className="tabular-nums"
            />
          </SettingsField>
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-forest/45">
          {MONEY_SETTINGS_COPY.effectNote}
        </p>

        <div className="mt-4">
          <Segmented
            label="Mulai periode keuangan"
            value={period}
            onChange={handlePeriod}
            options={[
              { id: 'calendar', emoji: '📅', label: 'Awal Bulan (Tgl 1)' },
              { id: 'cycle', emoji: '💰', label: 'Tanggal Gajian' },
            ]}
          />
        </div>

        {period === 'cycle' && (
          <div className="mt-4 sm:max-w-[13rem]">
            <SettingsField
              label="Tanggal Gajian"
              htmlFor="settings-payday"
              note="Rentang 1–31. Kalau bulan pendek, kami pakai hari terakhir."
            >
              <SettingsInput
                id="settings-payday"
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                value={payday}
                onChange={handlePayday}
                className="tabular-nums"
              />
            </SettingsField>
          </div>
        )}
      </SettingsCard>

      {/* ── 3. DOMPET BERSAMA ────────────────────────────────────────────── */}
      {partner ? (
        <SettingsCard title={INITIAL_JOINT_WALLET.name} desc="Dompet bersama aktif.">
          <div className="mt-4 flex items-center gap-3.5">
            <span
              aria-hidden
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-full text-lg ring-1',
                partner.tint,
              )}
            >
              {partner.avatar}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-forest">{partner.name}</p>
              <p className="mt-0.5 text-xs text-forest/50">Terhubung sejak {PARTNER_SINCE}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDisconnectOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-cream px-4 py-3 text-sm font-medium text-forest/60 ring-1 ring-soil/12 transition-colors hover:bg-sage hover:text-forest"
          >
            <Unlink className="size-4" strokeWidth={2.2} aria-hidden />
            Putus Koneksi Dompet
          </button>

          {/* Pratinjau halaman undangan — memakai kode yang SEDANG AKTIF
              (paket 39). Kalau belum ada kode hidup, yang tampil bukan tautan
              mati melainkan jalan ke halaman tempat kodenya dibuat. */}
          <div className="mt-4 border-t border-soil/12 pt-3.5">
            {inviteCode ? (
              <>
                <Link
                  href={buildJoinHref(inviteCode)}
                  className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-forest/55 underline underline-offset-2 transition-colors hover:text-forest"
                >
                  <ExternalLink className="size-3.5" strokeWidth={2.4} aria-hidden />
                  {JOIN_PREVIEW_COPY.linkLabel}
                </Link>
                <span className="mt-1 block text-[11px] leading-relaxed text-forest/40">
                  {JOIN_PREVIEW_COPY.hint}
                </span>
              </>
            ) : (
              <>
                <p className="text-[11.5px] font-medium text-forest/55">
                  {JOIN_PREVIEW_COPY.emptyLead}
                </p>
                <Link
                  href="/joint"
                  className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-forest underline underline-offset-2 transition-colors hover:text-forest"
                >
                  <ExternalLink className="size-3.5" strokeWidth={2.4} aria-hidden />
                  {JOIN_PREVIEW_COPY.emptyCta}
                </Link>
                <span className="mt-1 block text-[11px] leading-relaxed text-forest/40">
                  {JOIN_PREVIEW_COPY.emptyHint}
                </span>
              </>
            )}
          </div>
        </SettingsCard>
      ) : (
        <SettingsCard
          title="Dompet Bersama"
          desc="Catat pengeluaran patungan sama pasangan — timbangannya dihitung otomatis."
        >
          <Link
            href="/joint"
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-forest px-5 py-3.5 text-sm font-medium text-mint transition-colors hover:bg-forest-soft active:scale-[0.99]"
          >
            <UserPlus className="size-4" strokeWidth={2.4} aria-hidden />
            Ajak Pasangan ke Dompet Kita
          </Link>
        </SettingsCard>
      )}

      {/* ── DIALOG: putus koneksi (2 pilihan jujur) ───────────────────────── */}
      <ConfirmDialog
        id="disconnect-joint"
        open={disconnectOpen}
        onClose={() => setDisconnectOpen(false)}
        icon={HeartHandshake}
        title={`Pisah dompet dengan ${JOINT_PARTNER.name}?`}
        body="Kamu bisa pilih: simpan riwayat transaksimu sendiri, atau hapus seluruh riwayat dompet bersama."
        actions={
          <>
            <DialogButton tone="primary" onClick={handleKeepHistory}>
              Simpan Riwayat Saya
            </DialogButton>
            <DialogButton
              tone="danger"
              onClick={() => {
                setDisconnectOpen(false)
                setPurgeOpen(true)
              }}
            >
              Hapus Semua
            </DialogButton>
            <DialogButton tone="neutral" onClick={() => setDisconnectOpen(false)}>
              Batal
            </DialogButton>
          </>
        }
      />

      <ConfirmDialog
        id="purge-joint"
        open={purgeOpen}
        onClose={() => setPurgeOpen(false)}
        icon={XCircle}
        tone="danger"
        title="Hapus semua riwayat dompet bersama?"
        body="Riwayat patungan, timbangan settle, dan catatan transaksi bersama akan dihapus permanen. Tindakan ini nggak bisa dibatalkan."
        actions={
          <>
            <DialogButton tone="danger" onClick={handlePurge}>
              Ya, Hapus Semua
            </DialogButton>
            <DialogButton tone="neutral" onClick={() => setPurgeOpen(false)}>
              Batal
            </DialogButton>
          </>
        }
      />

    </SettingsPanel>
  )
}

/* ── Panel: Keluar ─────────────────────────────────────────────────────────────
   Tombol keluar ada di sini (bukan di menu yang lompat halaman) supaya tetap
   satu keluarga dengan panel lain: klik → konfirmasi → selesai. */
export function LogoutSettingsPanel() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  /**
   * Keluar SUNGGUHAN (paket 39): cookie sesi dihapus server lewat
   * `DELETE /api/session`, lalu user dikembalikan ke /login. Sebelumnya handler
   * ini cuma menampilkan toast "Demo: sesi belum benar-benar diakhiri" — dan
   * memang tidak ada sesi apa pun yang bisa diakhiri. Sekarang kalimatnya sesuai
   * kenyataan: yang berakhir adalah sesi di perangkat ini, bukan datanya.
   */
  async function handleLogout() {
    if (busy) return
    setBusy(true)
    const ok = await endSession()
    setBusy(false)
    setOpen(false)
    if (!ok) {
      toast.error(SESSION_COPY.signOutFailed, {
        description: SESSION_COPY.signOutFailedDescription,
      })
      return
    }
    toast.success(SESSION_COPY.signedOutToast, {
      description: SESSION_COPY.signedOutToastDescription,
    })
    router.push(LOGIN_PATH)
  }

  return (
    <SettingsPanel
      eyebrow="Keluar"
      title="Keluar"
      desc="Akhiri sesi di perangkat ini tanpa menghapus data apa pun."
    >
      <SettingsCard>
        <p className="text-[13.5px] leading-relaxed text-forest/60">
          Data keuanganmu tetap aman di akun. Masuk lagi kapan aja pakai{' '}
          <b className="font-medium text-forest">{EMAIL}</b>.
        </p>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-plum/20 px-5 py-3.5 text-sm font-medium text-plum ring-1 ring-plum/30 transition-colors hover:bg-plum/30"
        >
          <LogOut className="size-4" strokeWidth={2.4} aria-hidden />
          Keluar dari Akun
        </button>

        {/* Jembatan dua arah: panel ini tempat paling wajar untuk menawarkan
            jalan masuk lagi — sebelumnya kalimat "masuk lagi" ada tanpa tautan
            apa pun. Prompt 09 melunasi itu setelah /login benar-benar ada. */}
        <p className="mt-4 text-[11.5px] leading-relaxed text-forest/50">
          {RELOGIN_COPY.lead}{' '}
          <Link
            href={LOGIN_PATH}
            className="font-medium text-forest underline underline-offset-2 hover:text-forest"
          >
            {RELOGIN_COPY.link}
          </Link>{' '}
          {RELOGIN_COPY.suffix}
        </p>
      </SettingsCard>

      <ConfirmDialog
        id="logout-confirm"
        open={open}
        onClose={() => setOpen(false)}
        icon={LogOut}
        tone="danger"
        title="Keluar dari akun?"
        body="Sesi di perangkat ini akan diakhiri. Data tetap tersimpan dan bisa kamu buka lagi dengan email yang sama."
        actions={
          <>
            <DialogButton tone="danger" disabled={busy} onClick={handleLogout}>
              {busy ? 'Mengakhiri sesi…' : 'Ya, Keluar'}
            </DialogButton>
            <DialogButton tone="neutral" onClick={() => setOpen(false)}>
              Batal
            </DialogButton>
          </>
        }
      />
    </SettingsPanel>
  )
}


