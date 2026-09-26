'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  Download,
  FileJson,
  FileText,
  Fingerprint,
  KeyRound,
  LoaderCircle,
  Mail,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog, DialogButton } from './settings-dialog'
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
const PIN_LENGTH = 6

export function SecuritySettingsPanel() {
  const [pinEnabled, setPinEnabled] = useState(false)
  /** PIN tersimpan (mock — produksi: simpan hash di perangkat) */
  const [pin, setPin] = useState('')
  const [pinDraft, setPinDraft] = useState('')
  const [pinOpen, setPinOpen] = useState(false)

  const [biometricSupported, setBiometricSupported] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')

  /* Deteksi dukungan biometrik (WebAuthn). Hanya berjalan di client, dan kalau
     API-nya tidak ada / perangkat tidak punya authenticator, barisnya tidak
     pernah tampil — jadi user tidak menjumpai switch yang pasti gagal. */
  useEffect(() => {
    if (
      typeof PublicKeyCredential === 'undefined' ||
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function'
    ) {
      setBiometricSupported(false)
      return
    }

    let alive = true
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .then((available) => {
        if (alive) setBiometricSupported(available)
      })
      .catch(() => {
        if (alive) setBiometricSupported(false)
      })

    return () => {
      alive = false
    }
  }, [])

  const emailMatches = confirmEmail.trim().toLowerCase() === EMAIL

  function togglePin() {
    const next = !pinEnabled
    setPinEnabled(next)
    if (!next) {
      setPin('')
      setPinDraft('')
    }
    toast(next ? 'Kunci app dengan PIN aktif 🔒' : 'Kunci PIN dimatikan', {
      description: next ? 'App minta PIN tiap dibuka.' : 'App bisa dibuka tanpa PIN.',
    })
  }

  function savePin() {
    setPin(pinDraft)
    setPinOpen(false)
    setPinDraft('')
    toast.success('PIN aplikasi disimpan 🔒', {
      description: 'Cuma tersimpan di perangkat ini, bukan di server kami.',
    })
  }

  function toggleBiometric() {
    const next = !biometricEnabled
    setBiometricEnabled(next)
    toast.success(next ? 'Sidik jari / Face ID aktif 👆' : 'Biometrik dimatikan')
  }

  function handleDeleteAccount() {
    setDeleteOpen(false)
    setConfirmEmail('')
    /* TODO: DELETE /api/account → job hapus bertahap 7 hari (soft delete) */
    toast('Permintaan hapus akun diterima', {
      description: 'Demo: data belum benar-benar dihapus dari server.',
    })
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
            label="Kunci Aplikasi dengan PIN"
            helper="Minta PIN 6 angka setiap kali app dibuka."
            checked={pinEnabled}
            onToggle={togglePin}
          />

          {/* baris biometrik HANYA muncul kalau perangkat benar-benar mendukung */}
          {biometricSupported && (
            <ToggleRow
              label="Buka dengan Sidik Jari / Face ID"
              helper="Pakai sensor biometrik perangkat — lebih cepat dari PIN."
              checked={biometricEnabled}
              onToggle={toggleBiometric}
            />
          )}
        </div>

        {pinEnabled && (
          <SettingsRow
            label={pin ? 'PIN aktif di perangkat ini' : 'Belum ada PIN'}
            helper="PIN cuma tersimpan di perangkatmu, bukan di server kami."
            className="mt-1 border-t border-soil/10"
          >
            <button
              type="button"
              onClick={() => {
                setPinDraft('')
                setPinOpen(true)
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sage px-3.5 py-2 text-[12.5px] font-semibold text-forest transition-colors hover:bg-mint/40"
            >
              <KeyRound className="size-3.5" strokeWidth={2.4} aria-hidden />
              {pin ? 'Ubah PIN' : 'Buat PIN'}
            </button>
          </SettingsRow>
        )}

        {!biometricSupported && (
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-sage/50 px-4 py-3 text-[11.5px] leading-relaxed text-ink/55">
            <Fingerprint className="mt-0.5 size-3.5 shrink-0 text-ink/40" aria-hidden />
            Perangkat ini belum menyediakan sensor biometrik untuk web, jadi opsi itu disembunyikan.
          </p>
        )}
      </SettingsCard>

      {/* ── ZONA BERBAHAYA ───────────────────────────────────────────────── */}
      <SettingsCard
        tone="danger"
        title="Zona Berbahaya"
        desc="Tindakan di sini permanen dan nggak bisa dibatalkan."
      >
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p className="min-w-0 text-[12.5px] leading-relaxed text-ink/55">
            Hapus akun berarti semua transaksi, dompet, budget, dan hutangmu ikut terhapus.
          </p>
          <button
            type="button"
            onClick={() => {
              setConfirmEmail('')
              setDeleteOpen(true)
            }}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-plum/20 px-4 py-3 text-sm font-semibold text-plum ring-1 ring-plum/30 transition-colors hover:bg-plum/30"
          >
            <Trash2 className="size-4" strokeWidth={2.4} aria-hidden />
            Hapus Akun Permanen
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

      {/* ── DIALOG: buat / ubah PIN ──────────────────────────────────────── */}
      <ConfirmDialog
        id="pin-lock"
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        icon={KeyRound}
        title={pin ? 'Ubah PIN Aplikasi' : 'Buat PIN Aplikasi'}
        body={
          <div className="flex flex-col gap-3">
            <p>PIN ini cuma tersimpan di perangkatmu, bukan di server kami.</p>
            <SettingsField label={`PIN ${PIN_LENGTH} angka`} htmlFor="settings-pin">
              <SettingsInput
                id="settings-pin"
                value={pinDraft}
                inputMode="numeric"
                maxLength={PIN_LENGTH}
                autoComplete="off"
                placeholder="••••••"
                onChange={(event) =>
                  setPinDraft(event.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))
                }
                className="tracking-[0.4em] tabular-nums"
              />
            </SettingsField>
          </div>
        }
        actions={
          <>
            <DialogButton
              tone="primary"
              disabled={pinDraft.length !== PIN_LENGTH}
              onClick={savePin}
            >
              Simpan PIN
            </DialogButton>
            <DialogButton tone="neutral" onClick={() => setPinOpen(false)}>
              Batal
            </DialogButton>
          </>
        }
      />

      {/* ── DIALOG: hapus akun (wajib ketik email) ───────────────────────── */}
      <ConfirmDialog
        id="delete-account"
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        icon={Trash2}
        tone="danger"
        title="Yakin mau hapus akun?"
        body={
          <div className="flex flex-col gap-3">
            <p>
              Semua data akan dihapus permanen dan tidak bisa dikembalikan. Ketik email kamu untuk
              konfirmasi.
            </p>
            <SettingsField label="Email konfirmasi" htmlFor="settings-delete-email">
              <SettingsInput
                id="settings-delete-email"
                type="email"
                autoComplete="off"
                placeholder={EMAIL}
                value={confirmEmail}
                onChange={(event) => setConfirmEmail(event.target.value)}
              />
            </SettingsField>
          </div>
        }
        actions={
          <>
            <DialogButton tone="danger" disabled={!emailMatches} onClick={handleDeleteAccount}>
              Hapus Permanen
            </DialogButton>
            <DialogButton tone="neutral" onClick={() => setDeleteOpen(false)}>
              Batal
            </DialogButton>
          </>
        }
      />
    </SettingsPanel>
  )
}

/* ── Panel: Export Data Saya (inventaris #24, Domain 4C) ───────────────────────
   Satu tombol, satu janji: file JSON-nya HANYA dikirim ke email user sendiri.
   Tidak ada upsell, tidak ada "bagikan ke teman", tidak ada mata-mata. */
export function DataExportSettingsPanel() {
  const [busy, setBusy] = useState(false)
  /** timer mock — dibersihkan saat unmount supaya tidak setState di komponen mati */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  function handleExport() {
    if (busy) return
    setBusy(true)
    /* TODO: POST /api/export → server mengompilasi JSON lalu mengirim lewat
       email transaksional (Resend). Demo ini menyimulasikan latensinya. */
    timer.current = setTimeout(() => {
      setBusy(false)
      toast.success(`Data berhasil dikirim ke ${EMAIL}!`, {
        description: 'Cek inbox (dan folder spam) dalam beberapa menit ya.',
      })
    }, 1600)
  }

  return (
    <SettingsPanel
      eyebrow="Export Data"
      title="Export Data Saya"
      desc="Semua data keuanganmu dikirim lewat email — bukan dibagikan ke siapa-siapa."
    >
      <SettingsCard>
        <div className="flex items-start gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sage text-forest">
            <FileJson className="size-5" strokeWidth={2.2} aria-hidden />
          </span>
          <p className="min-w-0 text-[13.5px] leading-relaxed text-ink/60">
            Semua data keuanganmu (transaksi, wallet, budget, hutang) akan dikompilasi menjadi file
            JSON dan dikirim ke email kamu. File ini{' '}
            <b className="font-semibold text-ink">HANYA</b> dikirim ke email kamu — tidak dibagikan
            ke siapa-siapa, termasuk tim CatetInd.
          </p>
        </div>

        <p className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-ink/45">
          <Mail className="size-3.5 shrink-0" strokeWidth={2.2} aria-hidden />
          Dikirim ke {EMAIL}
        </p>

        <button
          type="button"
          onClick={handleExport}
          disabled={busy}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-forest py-3.5 text-sm font-semibold text-mint transition-colors hover:bg-forest-soft active:scale-[0.99] disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:px-6"
        >
          {busy ? (
            <LoaderCircle className="size-4 animate-spin" strokeWidth={2.4} aria-hidden />
          ) : (
            <Download className="size-4" strokeWidth={2.4} aria-hidden />
          )}
          {busy ? 'Menyiapkan file…' : 'Export & Kirim ke Email Saya'}
        </button>
      </SettingsCard>
    </SettingsPanel>
  )
}


