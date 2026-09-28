'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  Database,
  Download,
  FileJson,
  FileText,
  Fingerprint,
  KeyRound,
  LoaderCircle,
  Lock,
  Mail,
  ServerOff,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog, DialogButton } from './settings-dialog'
import { useAppLock } from './app-lock-provider'
import { LOCK_SETTINGS_COPY, PIN_LENGTH } from '@/lib/data/app-lock'
import {
  DELETE_ACCOUNT_COPY,
  DELETE_ACCOUNT_KEYWORD,
  EXPORT_DATA_COPY,
  RETENTION_POLICY,
  matchesDeleteKeyword,
} from '@/lib/data/account'
import { LOGIN_PATH } from '@/lib/data/auth'
import { deleteAccount } from '@/lib/account'
import { downloadMoneyExport } from '@/lib/money/export'
import { fetchSessionUser } from '@/lib/session-client'
import { PRIVACY_LINK_COPY } from '@/lib/legal/privacy'
import { TERMS_LINK_COPY } from '@/lib/legal/terms'
import {
  SettingsCard,
  SettingsField,
  SettingsInput,
  SettingsPanel,
  SettingsRow,
  ToggleRow,
} from './settings-ui'

/* ── Panel: Keamanan & Privasi + Export Data (inventaris #23, #24) ─────────────
   Prinsipnya: SATU keputusan per baris, dan tiap keputusan berisiko punya
   konfirmasi yang menyebut akibatnya dengan jelas (bukan sekadar "Yakin?").

   • PIN       → toggle + tombol Ubah PIN (PIN hanya di perangkat, tidak di server).
   • Biometrik → HANYA tampil kalau perangkat benar-benar punya platform
                 authenticator (WebAuthn `isUserVerifyingPlatformAuthenticatorAvailable`).
   • Hapus akun → wajib mengetik email dulu; tombolnya tetap disabled sampai cocok.
   • Export    → satu tombol, data dikirim HANYA ke email user sendiri. */

const EMAIL = 'jon@snow.com'

/** ikon kebijakan retensi → ikon lucide (copy-nya di `lib/data/account.ts`) */
const RETENTION_ICONS = {
  device: Smartphone,
  database: Database,
  server: ServerOff,
  lock: Lock,
} as const

/** mode dialog PIN: buat / ubah / matikan (satu dialog, tiga pekerjaan) */
type PinDialogMode = 'create' | 'change' | 'disable'

/**
 * Dua lapis konfirmasi hapus akun (paket 43): `keyword` = jelaskan akibatnya +
 * minta user MENGETIK kata kuncinya; `final` = konfirmasi terakhir tanpa input,
 * supaya keputusan destruktif tidak pernah selesai dalam satu klik.
 */
type DeleteAccountLayer = 'keyword' | 'final'

export function SecuritySettingsPanel() {
  /**
   * Kunci app sekarang NYATA (paket 39). Sumbernya bukan `useState` lagi:
   * `useAppLock()` membaca record PIN perangkat (hash PBKDF2 di localStorage) dan
   * itulah yang dipakai gerbang di root layout. Karena itu kalimat di panel ini
   * bisa jujur: "app minta PIN tiap dibuka / saat ditinggal" memang terjadi.
   */
  const {
    enabled: pinEnabled,
    enablePin,
    changePin,
    disablePin,
    biometricAvailable,
    biometricEnabled,
    enableBiometric,
    disableBiometric,
  } = useAppLock()

  const [pinMode, setPinMode] = useState<PinDialogMode>('create')
  const [pinOpen, setPinOpen] = useState(false)
  const [currentDraft, setCurrentDraft] = useState('')
  const [nextDraft, setNextDraft] = useState('')
  const [pinBusy, setPinBusy] = useState(false)
  const [biometricBusy, setBiometricBusy] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLayer, setDeleteLayer] = useState<DeleteAccountLayer>('keyword')
  /** kata kunci konfirmasi yang diketik user (harus `HAPUS AKUN`) */
  const [deleteKeyword, setDeleteKeyword] = useState('')
  const [deleting, setDeleting] = useState(false)

  const keywordMatches = matchesDeleteKeyword(deleteKeyword)

  function openDeleteDialog() {
    setDeleteKeyword('')
    setDeleteLayer('keyword')
    setDeleteOpen(true)
  }

  function openPinDialog(mode: PinDialogMode) {
    setPinMode(mode)
    setCurrentDraft('')
    setNextDraft('')
    setPinOpen(true)
  }

  /** toggle utama: buat PIN baru, atau matikan (dengan konfirmasi PIN dulu) */
  function togglePin() {
    openPinDialog(pinEnabled ? 'disable' : 'create')
  }

  async function submitPin() {
    setPinBusy(true)
    const ok =
      pinMode === 'create'
        ? await enablePin(nextDraft)
        : pinMode === 'change'
          ? await changePin(currentDraft, nextDraft)
          : await disablePin(currentDraft)
    setPinBusy(false)

    if (!ok) {
      toast.error(LOCK_SETTINGS_COPY.wrongCurrentPin)
      return
    }

    setPinOpen(false)
    setCurrentDraft('')
    setNextDraft('')

    if (pinMode === 'disable') {
      toast(LOCK_SETTINGS_COPY.disableToast, {
        description: LOCK_SETTINGS_COPY.disableToastDescription,
      })
      return
    }
    if (pinMode === 'create') {
      toast.success(LOCK_SETTINGS_COPY.enableToast, {
        description: LOCK_SETTINGS_COPY.enableToastDescription,
      })
      return
    }
    toast.success(LOCK_SETTINGS_COPY.savedToast, {
      description: LOCK_SETTINGS_COPY.savedToastDescription,
    })
  }

  /** biometrik: benar-benar minta sensor platform mendaftarkan kredensial */
  async function toggleBiometric() {
    if (biometricBusy) return
    setBiometricBusy(true)
    if (biometricEnabled) {
      disableBiometric()
      setBiometricBusy(false)
      toast.success(LOCK_SETTINGS_COPY.biometricOffToast)
      return
    }

    const ok = await enableBiometric()
    setBiometricBusy(false)
    if (!ok) {
      toast.error(LOCK_SETTINGS_COPY.biometricFailToast, {
        description: LOCK_SETTINGS_COPY.biometricFailToastDescription,
      })
      return
    }
    toast.success(LOCK_SETTINGS_COPY.biometricOnToast, {
      description: LOCK_SETTINGS_COPY.biometricOnToastDescription,
    })
  }

  /**
   * Unduh salinan dari dalam dialog hapus akun — jalur yang sama dengan panel
   * Export Data (`lib/money/export.ts`), sengaja disediakan DI SINI supaya user
   * tidak perlu menutup dialog, mencari menu lain, lalu mengulang dari awal.
   */
  async function handleDownloadFromDialog() {
    const user = await fetchSessionUser()
    const result = downloadMoneyExport(user)
    if (!result) {
      toast.error(EXPORT_DATA_COPY.failedTitle, {
        description: EXPORT_DATA_COPY.failedDescription,
      })
      return
    }
    toast.success(EXPORT_DATA_COPY.downloadedTitle(result.fileName), {
      description: EXPORT_DATA_COPY.downloadedDescription(
        result.counts.wallets,
        result.counts.ledgerRows,
      ),
    })
  }

  /**
   * HAPUS AKUN SUNGGUHAN (paket 43 · audit Stage 6 #2).
   *
   * Urutannya: bersihkan perangkat (`lib/account.ts` → localStorage,
   * sessionStorage, IndexedDB, store uang, store undangan & pemakaian AI), lalu
   * akhiri sesi di server, lalu KEMBALI ke `/login`.
   *
   * Dua hal yang sengaja dikatakan apa adanya, bukan ditutupi:
   *   · kalau basis data lokal ternyata masih dikunci tab lain → toast-nya
   *     memberi tahu supaya user menutup tab lain (bukan diam-diam mengaku bersih);
   *   · kalau sesi gagal diakhiri → user diberi tahu untuk keluar sekali lagi.
   */
  async function handleDeleteAccount() {
    if (deleting) return
    setDeleting(true)
    const { report, sessionEnded } = await deleteAccount()
    setDeleting(false)
    setDeleteOpen(false)
    setDeleteKeyword('')

    if (!report.indexedDbCleared) {
      toast.error(DELETE_ACCOUNT_COPY.idbBlockedTitle, {
        description: DELETE_ACCOUNT_COPY.idbBlockedDescription,
      })
    } else if (!sessionEnded) {
      toast.error(DELETE_ACCOUNT_COPY.sessionFailedTitle, {
        description: DELETE_ACCOUNT_COPY.sessionFailedDescription,
      })
    } else {
      toast.success(DELETE_ACCOUNT_COPY.doneTitle, {
        description: DELETE_ACCOUNT_COPY.doneDescription,
        /* jeda singkat ini yang membuat toast terbaca sebelum halaman berpindah */
        duration: 6000,
      })
    }

    /**
     * Navigasi PENUH (`location.assign`), bukan `router.replace`.
     *
     * Alasannya bukan estetika: state di MEMORY app ini juga harus ikut bersih.
     * Kunci app (PIN) menyimpan `enabled`/`locked` di state provider yang hidup
     * sampai reload — kalau kita cuma berpindah secara client-side, PIN yang baru
     * saja dihapus masih "aktif" di memory, dan user bisa terjebak di layar kunci
     * yang PIN-nya sudah tidak ada. Reload juga memastikan tidak ada satu pun
     * store (uang, undangan, pemakaian AI) yang masih memegang data lama.
     */
    window.setTimeout(() => window.location.assign(LOGIN_PATH), 1200)
  }

  return (
    <SettingsPanel
      eyebrow="Keamanan"
      title="Keamanan & Privasi"
      desc="Kunci app di perangkat ini — plus jalan keluar yang jelas kalau kamu mau pergi."
    >
      {/* ── KUNCI APP ────────────────────────────────────────────────────── */}
      <SettingsCard title="Kunci Aplikasi">
        <div className="mt-2 divide-y divide-soil/10">
          <ToggleRow
            label={LOCK_SETTINGS_COPY.toggleLabel}
            helper={LOCK_SETTINGS_COPY.toggleHelper(PIN_LENGTH)}
            checked={pinEnabled}
            onToggle={togglePin}
          />

          {/* Baris biometrik hanya muncul kalau perangkat BENAR-BENAR punya
              platform authenticator — user tidak pernah menjumpai switch yang
              pasti gagal. Saat PIN belum dibuat, barisnya jadi keterangan (bukan
              toggle) karena sensornya adalah jalan cepat, bukan kunci tunggal. */}
          {biometricAvailable ? (
            pinEnabled ? (
              <ToggleRow
                label={LOCK_SETTINGS_COPY.biometricLabel}
                helper={
                  biometricBusy
                    ? 'Menunggu sensor perangkat…'
                    : LOCK_SETTINGS_COPY.biometricHelper
                }
                checked={biometricEnabled}
                onToggle={toggleBiometric}
              />
            ) : (
              <ToggleRow
                label={LOCK_SETTINGS_COPY.biometricLabel}
                helper={LOCK_SETTINGS_COPY.biometricNeedsPin}
                checked={false}
                onToggle={togglePin}
              />
            )
          ) : null}
        </div>

        {pinEnabled && (
          <SettingsRow
            label="PIN aktif di perangkat ini"
            helper="Yang tersimpan cuma sidik PIN-nya (hash), bukan angkanya — dan tidak pernah dikirim ke server kami."
            className="mt-1 border-t border-soil/10"
          >
            <button
              type="button"
              onClick={() => openPinDialog('change')}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sage px-3.5 py-2 text-[12.5px] font-semibold text-forest transition-colors hover:bg-mint/40 focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:outline-none"
            >
              <KeyRound className="size-3.5" strokeWidth={2.4} aria-hidden />
              Ubah PIN
            </button>
          </SettingsRow>
        )}

        {!biometricAvailable && (
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-sage/50 px-4 py-3 text-[11.5px] leading-relaxed text-ink/55">
            <Fingerprint className="mt-0.5 size-3.5 shrink-0 text-ink/40" aria-hidden />
            {LOCK_SETTINGS_COPY.biometricUnsupported}
          </p>
        )}
      </SettingsCard>

      {/* ── ZONA BERBAHAYA ───────────────────────────────────────────────── */}
      <SettingsCard
        tone="danger"
        title="Zona Berbahaya"
        desc={RETENTION_POLICY.summary}
      >
        {/* KEBIJAKAN RETENSI — ditulis di UI, bukan disembunyikan di komentar kode.
            User yang mau menghapus akun berhak tahu apa yang hilang, apa yang
            tersisa, dan apakah ada salinan di tempat lain (di demo ini: tidak ada). */}
        <ul className="mt-4 flex flex-col gap-3">
          {RETENTION_POLICY.points.map((point) => {
            const Icon = RETENTION_ICONS[point.icon]
            return (
              <li key={point.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-plum/15 text-plum">
                  <Icon className="size-4" strokeWidth={2.2} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-ink">{point.title}</span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-ink/55">
                    {point.body}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p className="min-w-0 text-[12.5px] leading-relaxed text-ink/55">
            {DELETE_ACCOUNT_COPY.cardBody}
          </p>
          <button
            type="button"
            onClick={openDeleteDialog}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-plum/20 px-4 py-3 text-sm font-semibold text-plum ring-1 ring-plum/30 transition-colors hover:bg-plum/30"
          >
            <Trash2 className="size-4" strokeWidth={2.4} aria-hidden />
            {DELETE_ACCOUNT_COPY.cardCta}
          </button>
        </div>
      </SettingsCard>

      {/* ── DOKUMEN LEGAL ─────────────────────────────────────────────────
          Janji privasi di panel ini punya versi tertulis — dan orang yang ragu
          justru mencari buktinya, bukan janji di kartu pengaturan. Kedua
          dokumen (privasi + syarat) sekarang punya route-nya sendiri, jadi
          keduanya ditautkan di sini; catatan "sedang disiapkan" yang dulu ada
          sudah tidak berlaku. Labelnya diambil dari file datanya masing-masing
          supaya satu dokumen tidak pernah disebut dengan dua nama berbeda
          (dipakai juga di kaki Pusat Bantuan). */}
      <SettingsCard title={PRIVACY_LINK_COPY.cardTitle} desc={PRIVACY_LINK_COPY.hint}>
        {/* dua dokumen, dua tombol — dibungkus flex supaya tetap satu baris di
            desktop dan bertumpuk dengan rapi di 375 px */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/privacy"
            className="inline-flex items-center gap-2 rounded-2xl bg-sage px-4 py-3 text-sm font-semibold text-forest transition-colors duration-200 hover:bg-mint/40 focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:outline-none motion-reduce:transition-none"
          >
            <FileText className="size-4" strokeWidth={2.4} aria-hidden />
            {PRIVACY_LINK_COPY.label}
            <ArrowUpRight className="size-4" strokeWidth={2.4} aria-hidden />
          </Link>
          <Link
            href="/terms"
            className="inline-flex items-center gap-2 rounded-2xl bg-sage px-4 py-3 text-sm font-semibold text-forest transition-colors duration-200 hover:bg-mint/40 focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:outline-none motion-reduce:transition-none"
          >
            <FileText className="size-4" strokeWidth={2.4} aria-hidden />
            {TERMS_LINK_COPY.label}
            <ArrowUpRight className="size-4" strokeWidth={2.4} aria-hidden />
          </Link>
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink/55">
          {PRIVACY_LINK_COPY.pairNote}
        </p>
      </SettingsCard>

      {/* ── DIALOG: buat / ubah / matikan PIN ───────────────────────────────
          Satu dialog tiga pekerjaan supaya aturannya cuma hidup di satu tempat.
          "Matikan" pun wajib mengetik PIN sekarang: mematikan kunci app tanpa
          verifikasi = siapa pun yang memegang HP bisa mematikan proteksinya. */}
      <ConfirmDialog
        id="pin-lock"
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        icon={KeyRound}
        title={
          pinMode === 'create'
            ? LOCK_SETTINGS_COPY.createTitle
            : pinMode === 'change'
              ? LOCK_SETTINGS_COPY.changeTitle
              : LOCK_SETTINGS_COPY.disableTitle
        }
        body={
          <div className="flex flex-col gap-3">
            <p>
              {pinMode === 'create'
                ? LOCK_SETTINGS_COPY.createBody
                : pinMode === 'change'
                  ? LOCK_SETTINGS_COPY.changeBody(PIN_LENGTH)
                  : LOCK_SETTINGS_COPY.disableBody(PIN_LENGTH)}
            </p>

            {pinMode !== 'create' && (
              <SettingsField
                label={LOCK_SETTINGS_COPY.currentLabel(PIN_LENGTH)}
                htmlFor="settings-pin-current"
              >
                <SettingsInput
                  id="settings-pin-current"
                  value={currentDraft}
                  inputMode="numeric"
                  maxLength={PIN_LENGTH}
                  autoComplete="off"
                  placeholder={LOCK_SETTINGS_COPY.pinPlaceholder}
                  onChange={(event) =>
                    setCurrentDraft(event.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))
                  }
                  className="tracking-[0.4em] tabular-nums"
                />
              </SettingsField>
            )}

            {pinMode !== 'disable' && (
              <SettingsField
                label={
                  pinMode === 'change'
                    ? LOCK_SETTINGS_COPY.newLabel(PIN_LENGTH)
                    : `PIN ${PIN_LENGTH} angka`
                }
                htmlFor="settings-pin"
              >
                <SettingsInput
                  id="settings-pin"
                  value={nextDraft}
                  inputMode="numeric"
                  maxLength={PIN_LENGTH}
                  autoComplete="off"
                  placeholder={LOCK_SETTINGS_COPY.pinPlaceholder}
                  onChange={(event) =>
                    setNextDraft(event.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))
                  }
                  className="tracking-[0.4em] tabular-nums"
                />
              </SettingsField>
            )}
          </div>
        }
        actions={
          <>
            <DialogButton
              tone={pinMode === 'disable' ? 'danger' : 'primary'}
              disabled={
                pinBusy ||
                (pinMode === 'disable'
                  ? currentDraft.length !== PIN_LENGTH
                  : pinMode === 'change'
                    ? currentDraft.length !== PIN_LENGTH || nextDraft.length !== PIN_LENGTH
                    : nextDraft.length !== PIN_LENGTH)
              }
              onClick={submitPin}
            >
              {pinBusy
                ? 'Menyimpan…'
                : pinMode === 'disable'
                  ? LOCK_SETTINGS_COPY.disableTitle
                  : LOCK_SETTINGS_COPY.saveLabel}
            </DialogButton>
            <DialogButton tone="neutral" onClick={() => setPinOpen(false)}>
              {LOCK_SETTINGS_COPY.cancelLabel}
            </DialogButton>
          </>
        }
      />

      {/* ── DIALOG: hapus akun (wajib ketik email) ───────────────────────── */}
      <ConfirmDialog
        id="delete-account"
        open={deleteOpen && deleteLayer === 'keyword'}
        onClose={() => setDeleteOpen(false)}
        icon={Trash2}
        tone="danger"
        title={DELETE_ACCOUNT_COPY.dialogOneTitle}
        body={
          <div className="flex flex-col gap-3">
            <p>{DELETE_ACCOUNT_COPY.dialogOneLead}</p>
            <ul className="flex flex-col gap-1.5">
              {DELETE_ACCOUNT_COPY.dialogOneSteps.map((step) => (
                <li key={step} className="flex items-start gap-2">
                  <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-plum/60" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>

            {/* Unduh dulu — jalan keluar yang jujur: keputusan destruktif tidak
                boleh memaksa user kehilangan salinan datanya. */}
            <div className="rounded-2xl bg-sage/60 px-4 py-3">
              <p className="text-[12.5px] font-semibold text-ink">
                {DELETE_ACCOUNT_COPY.downloadFirstLead}
              </p>
              <button
                type="button"
                onClick={handleDownloadFromDialog}
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-cream px-3.5 py-2 text-[12.5px] font-semibold text-ink ring-1 ring-soil/12 transition-colors hover:bg-sage"
              >
                <Download className="size-3.5" strokeWidth={2.4} aria-hidden />
                {DELETE_ACCOUNT_COPY.downloadFirstCta}
              </button>
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink/50">
                {DELETE_ACCOUNT_COPY.downloadFirstHint}
              </p>
            </div>

            <SettingsField
              label={DELETE_ACCOUNT_COPY.keywordLabel}
              htmlFor="settings-delete-keyword"
            >
              <SettingsInput
                id="settings-delete-keyword"
                autoComplete="off"
                autoCapitalize="characters"
                placeholder={DELETE_ACCOUNT_COPY.keywordPlaceholder}
                value={deleteKeyword}
                onChange={(event) => setDeleteKeyword(event.target.value)}
              />
            </SettingsField>
          </div>
        }
        actions={
          <>
            <DialogButton
              tone="danger"
              disabled={!keywordMatches}
              onClick={() => setDeleteLayer('final')}
            >
              {DELETE_ACCOUNT_COPY.continueCta}
            </DialogButton>
            <DialogButton tone="neutral" onClick={() => setDeleteOpen(false)}>
              {DELETE_ACCOUNT_COPY.cancelCta}
            </DialogButton>
          </>
        }
      />

      {/* LAPIS 2 — konfirmasi terakhir, tanpa input apa pun. Ini yang membuat
          alur hapus akun tidak pernah selesai dalam SATU klik. */}
      <ConfirmDialog
        id="delete-account-final"
        open={deleteOpen && deleteLayer === 'final'}
        onClose={() => setDeleteLayer('keyword')}
        icon={Trash2}
        tone="danger"
        title={DELETE_ACCOUNT_COPY.dialogTwoTitle}
        body={<p>{DELETE_ACCOUNT_COPY.dialogTwoBody}</p>}
        actions={
          <>
            <DialogButton tone="danger" disabled={deleting} onClick={handleDeleteAccount}>
              {deleting ? DELETE_ACCOUNT_COPY.busyLabel : DELETE_ACCOUNT_COPY.dialogTwoCta}
            </DialogButton>
            <DialogButton tone="neutral" onClick={() => setDeleteLayer('keyword')}>
              {DELETE_ACCOUNT_COPY.cancelTwoCta}
            </DialogButton>
          </>
        }
      />
    </SettingsPanel>
  )
}

/* ── Panel: Export Data Saya (inventaris #24, Domain 4C) ───────────────────────
   Satu tombol, satu janji, dan sejak paket 43 janji itu BENAR-BENAR ditepati:
   file `.json`-nya terunduh di perangkat user sendiri. Sebelumnya handler-nya
   cuma `setTimeout` + toast "Data berhasil dikirim ke emailmu" tanpa file dan
   tanpa email (temuan audit Stage 6 #1).

   Dua jalur ditampilkan berdampingan, dan bedanya DIKATAKAN, bukan disamarkan:
     · UNDUH  -> benar-benar bekerja (Blob + URL.createObjectURL)
     · EMAIL  -> diberi badge DEMO, karena butuh server pengirim yang belum ada */
export function DataExportSettingsPanel() {
  const [busy, setBusy] = useState(false)

  /**
   * Unduh ekspor. `busy` menyala sangat singkat karena pembuatan filenya lokal
   * (tidak ada jaringan), tapi tetap dipakai supaya tombol tidak bisa ditekan
   * dua kali dan user melihat umpan balik.
   */
  async function handleDownload() {
    if (busy) return
    setBusy(true)
    const user = await fetchSessionUser()
    const result = downloadMoneyExport(user)
    setBusy(false)

    if (!result) {
      toast.error(EXPORT_DATA_COPY.failedTitle, {
        description: EXPORT_DATA_COPY.failedDescription,
      })
      return
    }
    toast.success(EXPORT_DATA_COPY.downloadedTitle(result.fileName), {
      description: EXPORT_DATA_COPY.downloadedDescription(
        result.counts.wallets,
        result.counts.ledgerRows,
      ),
    })
  }

  /**
   * Jalur email — SENGAJA tidak berpura-pura berhasil. Yang dikatakan adalah
   * kenyataannya: belum ada server pengirim, jadi tidak ada email yang dikirim,
   * dan datanya tetap bisa diambil lewat tombol unduh di atas.
   */
  function handleEmailPath() {
    toast.error(EXPORT_DATA_COPY.emailToastTitle, {
      description: EXPORT_DATA_COPY.emailToastDescription,
    })
  }

  return (
    <SettingsPanel
      eyebrow={EXPORT_DATA_COPY.eyebrow}
      title={EXPORT_DATA_COPY.title}
      desc={EXPORT_DATA_COPY.desc}
    >
      <SettingsCard title={EXPORT_DATA_COPY.cardTitle}>
        <div className="mt-3 flex items-start gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sage text-forest">
            <FileJson className="size-5" strokeWidth={2.2} aria-hidden />
          </span>
          <ul className="min-w-0 flex flex-col gap-1.5">
            {EXPORT_DATA_COPY.includes.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[13px] leading-relaxed text-ink/60">
                <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-forest/40" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-3 flex items-start gap-2 text-[11.5px] leading-relaxed text-ink/45">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-forest" strokeWidth={2.2} aria-hidden />
          {EXPORT_DATA_COPY.metadataNote}
        </p>

        <button
          type="button"
          onClick={handleDownload}
          disabled={busy}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-forest py-3.5 text-sm font-semibold text-mint transition-colors hover:bg-forest-soft active:scale-[0.99] disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:px-6"
        >
          {busy ? (
            <LoaderCircle className="size-4 animate-spin" strokeWidth={2.4} aria-hidden />
          ) : (
            <Download className="size-4" strokeWidth={2.4} aria-hidden />
          )}
          {busy ? EXPORT_DATA_COPY.preparingCta : EXPORT_DATA_COPY.downloadCta}
        </button>
      </SettingsCard>

      {/* JALUR EMAIL — tetap ada supaya bentuk produk produksinya terlihat, tapi
          diberi badge DEMO dan penjelasan mengapa tombolnya belum mengirim apa pun. */}
      <SettingsCard title={EXPORT_DATA_COPY.emailTitle}>
        <p className="mt-2 inline-flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-hud-amber/30 px-2 py-0.5 text-[10.5px] font-semibold tracking-wide text-hud-terracotta uppercase">
            {EXPORT_DATA_COPY.emailDemoBadge}
          </span>
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink/60">{EXPORT_DATA_COPY.emailBody}</p>

        <p className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-ink/45">
          <Mail className="size-3.5 shrink-0" strokeWidth={2.2} aria-hidden />
          {EXPORT_DATA_COPY.emailTargetLabel}: {EMAIL}
        </p>

        <button
          type="button"
          onClick={handleEmailPath}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cream py-3.5 text-sm font-semibold text-ink ring-1 ring-soil/12 transition-colors hover:bg-sage sm:w-auto sm:px-6"
        >
          <Mail className="size-4" strokeWidth={2.4} aria-hidden />
          {EXPORT_DATA_COPY.emailCta}
        </button>
      </SettingsCard>
    </SettingsPanel>
  )
}


