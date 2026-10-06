'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Check, Info, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AI_STATUS_COPY } from '@/lib/ai-chat'
import {
  AI_PREFS_COPY,
  AI_PREFS_DEFAULT,
  readAiPrefs,
  writeAiPrefs,
  type AiPrefs,
  type MincaMode,
} from '@/lib/ai-prefs'
import { NotificationSettings } from './notification-settings'
import { ConfirmDialog } from './confirm-dialog'
import {
  CATEGORY_PREFS_COPY,
  CATEGORY_PREFS_STORAGE_KEY,
  DEFAULT_CATEGORIES,
  EMOJI_PRESETS,
  INITIAL_CUSTOM,
  removeCategory,
  restoreCategory,
  type CategoryItem,
  type CategoryPrefs,
  type RemovedCategory,
} from '@/lib/data/category-prefs'
import { UNDO_WINDOW_MS } from '@/lib/data/history'
import {
  Segmented,
  SettingsCard,
  SettingsField,
  SettingsInput,
  SettingsPanel,
  Toggle,
  ToggleRow,
} from './settings-ui'
import { cn } from '@/lib/utils'

/* ── Panel: Tampilan & Tema ────────────────────────────────────────────────────
   Tiga pilihan, tanpa opsi tambahan: Terang / Gelap / Ikuti Sistem. Yang
   dikerjakan hanya menukar kelas di <html> — `light`/`dark` eksplisit, sedangkan
   "Ikuti Sistem" melepas keduanya supaya blok `@media (prefers-color-scheme:
   dark)` di app/globals.css yang memutuskan. Jadi tidak ada sistem tema kedua
   yang perlu dirawat. */
type ThemeMode = 'light' | 'dark' | 'system'

const THEME_KEY = 'catet-theme'

const THEME_OPTIONS: { id: ThemeMode; emoji: string; label: string }[] = [
  { id: 'light', emoji: '☀️', label: 'Terang' },
  { id: 'dark', emoji: '🌙', label: 'Gelap' },
  { id: 'system', emoji: '🖥️', label: 'Ikuti Sistem' },
]

export function AppearanceSettingsPanel() {
  const [mode, setMode] = useState<ThemeMode>('light')

  /* hidrasi preferensi dari localStorage SETELAH mount supaya render server &
     client identik (tanpa hydration mismatch) — pola yang sama dengan
     preferensi notifikasi & sidebar */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY)
      if (stored === 'light' || stored === 'dark' || stored === 'system') setMode(stored)
    } catch {
      /* localStorage diblokir (mode privat) — pakai default terang */
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (mode === 'system') {
      root.classList.remove('light', 'dark')
      return
    }
    root.classList.toggle('light', mode === 'light')
    root.classList.toggle('dark', mode === 'dark')
  }, [mode])

  function handleChange(next: ThemeMode) {
    setMode(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      /* preferensi tetap jalan untuk sesi ini walau gagal disimpan */
    }
    const label = THEME_OPTIONS.find((option) => option.id === next)?.label ?? ''
    toast.success(`Tema: ${label}`)
  }

  return (
    <SettingsPanel
      eyebrow="Tampilan"
      title="Tampilan & Tema"
      desc="Pilih mode yang paling nyaman buat matamu."
    >
      <SettingsCard>
        <Segmented
          label="Mode tampilan"
          value={mode}
          options={THEME_OPTIONS}
          onChange={handleChange}
        />
        <p className="mt-3 text-[11.5px] leading-relaxed text-forest/45">
          Pilihanmu disimpan di perangkat ini dan langsung aktif — nggak perlu reload.
        </p>
      </SettingsCard>
    </SettingsPanel>
  )
}

/* ── Panel: Notifikasi ─────────────────────────────────────────────────────────
   Isinya memakai `NotificationSettings` yang sudah ada (termasuk tombol aktifkan
   push asli lewat `usePushNotifications`), dibungkus kepala panel supaya tetap
   satu keluarga dengan section pengaturan lain. */
export function NotificationsSettingsPanel() {
  return (
    <SettingsPanel
      eyebrow="Notifikasi"
      title="Notifikasi"
      desc="Push notif muncul di HP walau app lagi ditutup — kayak WhatsApp."
    >
      <NotificationSettings />
    </SettingsPanel>
  )
}

/* ── Panel: Kustomisasi Kategori (Domain 2A.3 · paket 62) ─────────────────────
   Dua bagian, sesuai aturan kategorisasi CatetInd:

     1. BAWAAN — tidak bisa dihapus, hanya BISA DISEMBUNYIKAN dari daftar
        pilihan. Alasannya sekarang DIJELASKAN di layar
        (`CATEGORY_PREFS_COPY.defaultExplain`): laporan & insight lintas bulan
        dibandingkan per kategori, jadi kategori bawaannya harus tetap ada di
        data. Sebelum paket 62 alasannya cuma hidup di komentar kode ini — user
        melihat toggle tanpa pernah tahu kenapa tombol hapusnya tidak ada.
     2. CUSTOM — bebas dibuat, diedit (emoji + nama), dan dihapus. Sejak paket 62
        hapusnya lewat konfirmasi + Undo, sama seperti aksi merusak lain di app.

   Daftar & fungsi murni hapus/pulihkannya tinggal di lapis data
   (`lib/data/category-prefs.ts`) supaya bisa diuji tanpa React, dan seluruh
   kalimatnya TIDAK ditulis di JSX (kontrak §4).

   Preferensi (daftar yang disembunyikan + daftar custom) disimpan di
   localStorage `catet-category-prefs`; begitu endpoint kategori asli siap,
   cukup ganti dua blok persist/hidrasi di bawah. */

export function CategoriesSettingsPanel() {
  const [hidden, setHidden] = useState<string[]>([])
  const [custom, setCustom] = useState<CategoryItem[]>(INITIAL_CUSTOM)
  /** id kategori custom yang sedang diedit inline */
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draftEmoji, setDraftEmoji] = useState(EMOJI_PRESETS[0])
  const [draftName, setDraftName] = useState('')
  /** kategori yang dialog konfirmasi hapusnya sedang terbuka (paket 62) */
  const [pendingDelete, setPendingDelete] = useState<CategoryItem | null>(null)
  /**
   * Bukti hapus yang hak Undo-nya masih hidup: itemnya + posisinya di daftar,
   * supaya tombol Undo bisa mengembalikannya TEPAT di urutan semula. Disimpan di
   * ref karena ia bukan bahan render — hanya tombol Undo di toast yang membacanya.
   */
  const undoRef = useRef<RemovedCategory | null>(null)
  const undoTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current)
    },
    [],
  )

  useEffect(() => {
    try {
      const parsed = JSON.parse(
        localStorage.getItem(CATEGORY_PREFS_STORAGE_KEY) ?? 'null',
      ) as CategoryPrefs | null
      if (parsed?.hidden) setHidden(parsed.hidden)
      if (parsed?.custom) setCustom(parsed.custom)
    } catch {
      /* JSON rusak / storage diblokir — biarkan default yang tampil */
    }
  }, [])

  function persist(nextHidden: string[], nextCustom: CategoryItem[]) {
    try {
      localStorage.setItem(
        CATEGORY_PREFS_STORAGE_KEY,
        JSON.stringify({ hidden: nextHidden, custom: nextCustom } satisfies CategoryPrefs),
      )
    } catch {
      /* abaikan — perubahan tetap berlaku untuk sesi ini */
    }
  }

  function toggleDefault(item: CategoryItem) {
    const willHide = !hidden.includes(item.id)
    const next = willHide ? [...hidden, item.id] : hidden.filter((id) => id !== item.id)
    setHidden(next)
    persist(next, custom)
    toast(willHide ? CATEGORY_PREFS_COPY.hideToast : CATEGORY_PREFS_COPY.showToast, {
      description: `${item.emoji} ${item.name}`,
    })
  }

  function openAdd() {
    setAdding(true)
    setEditingId(null)
    setDraftEmoji(EMOJI_PRESETS[0])
    setDraftName('')
  }

  function openEdit(item: CategoryItem) {
    setAdding(false)
    setEditingId(item.id)
    setDraftEmoji(item.emoji)
    setDraftName(item.name)
  }

  function closeForm() {
    setAdding(false)
    setEditingId(null)
    setDraftName('')
  }

  function saveCustom() {
    const name = draftName.trim()
    if (!name) {
      toast(CATEGORY_PREFS_COPY.nameRequired)
      return
    }

    if (editingId) {
      const next = custom.map((item) =>
        item.id === editingId ? { ...item, emoji: draftEmoji, name } : item,
      )
      setCustom(next)
      persist(hidden, next)
      toast.success(CATEGORY_PREFS_COPY.updatedToast, { description: `${draftEmoji} ${name}` })
    } else {
      const next = [...custom, { id: `custom-${Date.now()}`, emoji: draftEmoji, name }]
      setCustom(next)
      persist(hidden, next)
      toast.success(CATEGORY_PREFS_COPY.addedToast(draftEmoji, name))
    }

    closeForm()
  }

  /* ── HAPUS KATEGORI KUSTOM (paket 62) ────────────────────────────────────────
     Tiga langkah, sama seperti aksi merusak lain di app: konfirmasi dulu → hapus
     lewat fungsi murni di lapis data → Undo 5 detik lewat toast. Sebelum paket ini
     tombol Hapus langsung membuangnya tanpa satu pun kesempatan membatalkan. */
  function confirmDeleteCategory() {
    if (!pendingDelete) return
    const result = removeCategory({ hidden, custom }, pendingDelete.id)
    setPendingDelete(null)
    if (!result.removed) {
      /* kategori bawaan / sudah tidak ada — tidak ada yang berubah */
      toast(CATEGORY_PREFS_COPY.undoExpired)
      return
    }

    setCustom(result.prefs.custom)
    persist(result.prefs.hidden, result.prefs.custom)
    undoRef.current = result.removed
    if (undoTimer.current !== null) window.clearTimeout(undoTimer.current)
    undoTimer.current = window.setTimeout(() => {
      if (undoRef.current?.item.id === result.removed?.item.id) undoRef.current = null
    }, UNDO_WINDOW_MS)

    toast(CATEGORY_PREFS_COPY.deleteToast(result.removed.item.emoji, result.removed.item.name), {
      description: CATEGORY_PREFS_COPY.deleteToastDescription,
      action: { label: CATEGORY_PREFS_COPY.undo, onClick: () => undoDeleteCategory(result.removed!) },
      duration: UNDO_WINDOW_MS,
    })
  }

  /** Undo: kembalikan kategori TEPAT di posisi semula (fungsi murni di lib/data). */
  function undoDeleteCategory(removed: RemovedCategory) {
    if (undoRef.current?.item.id !== removed.item.id) {
      toast(CATEGORY_PREFS_COPY.undoExpired)
      return
    }
    undoRef.current = null
    const next = restoreCategory({ hidden, custom }, removed)
    setCustom(next.custom)
    persist(next.hidden, next.custom)
    toast.success(CATEGORY_PREFS_COPY.undoneToast, {
      description: CATEGORY_PREFS_COPY.undoneDescription,
    })
  }

  return (
    <SettingsPanel
      eyebrow={CATEGORY_PREFS_COPY.eyebrow}
      title={CATEGORY_PREFS_COPY.title}
      desc={CATEGORY_PREFS_COPY.desc}
    >
      {/* ── 1. KATEGORI BAWAAN ───────────────────────────────────────────── */}
      <SettingsCard
        title={CATEGORY_PREFS_COPY.defaultTitle}
        desc={CATEGORY_PREFS_COPY.defaultDesc}
      >
        {/* Alasan lengkapnya (temuan audit #10) — dulu hanya hidup di komentar
            kode, jadi user melihat toggle tanpa tahu kenapa tidak ada Hapus. */}
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-sage/50 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-forest">
          <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
          {CATEGORY_PREFS_COPY.defaultExplain(DEFAULT_CATEGORIES.length)}
        </p>
        <div className="mt-3 divide-y divide-soil/10">
          {DEFAULT_CATEGORIES.map((item) => {
            const visible = !hidden.includes(item.id)
            return (
              <div key={item.id} className="flex items-center gap-3.5 py-3">
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage text-base"
                >
                  {item.emoji}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-forest">
                  {item.name}
                </span>
                <span
                  className={cn(
                    'shrink-0 text-[11px] font-medium',
                    visible ? 'text-forest' : 'text-forest/35',
                  )}
                >
                  {visible ? CATEGORY_PREFS_COPY.visibleLabel : CATEGORY_PREFS_COPY.hiddenLabel}
                </span>
                <Toggle
                  checked={visible}
                  onToggle={() => toggleDefault(item)}
                  label={CATEGORY_PREFS_COPY.toggleA11y(item.name)}
                />
              </div>
            )
          })}
        </div>
      </SettingsCard>

      {/* ── 2. KATEGORI CUSTOM ───────────────────────────────────────────── */}
      <SettingsCard
        title={CATEGORY_PREFS_COPY.customTitle}
        desc={CATEGORY_PREFS_COPY.customDesc}
      >
        <ul className="mt-3 divide-y divide-soil/10">
          {custom.map((item) => (
            <li key={item.id} className="py-3">
              {editingId === item.id ? (
                <CategoryForm
                  title={`${CATEGORY_PREFS_COPY.editFormTitle}: ${item.name}`}
                  emoji={draftEmoji}
                  name={draftName}
                  onEmoji={setDraftEmoji}
                  onName={setDraftName}
                  onSave={saveCustom}
                  onCancel={closeForm}
                />
              ) : (
                <div className="flex items-center gap-3.5">
                  <span
                    aria-hidden
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage text-base"
                  >
                    {item.emoji}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-forest">
                    {item.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      aria-label={`Edit kategori ${item.name}`}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] font-medium text-forest ring-1 ring-forest/20 transition-colors hover:bg-sage"
                    >
                      <Pencil className="size-3.5" strokeWidth={2.4} aria-hidden />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(item)}
                      aria-label={CATEGORY_PREFS_COPY.deleteA11y(item.name)}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] font-medium text-plum ring-1 ring-plum/25 transition-colors hover:bg-plum/15"
                    >
                      <Trash2 className="size-3.5" strokeWidth={2.4} aria-hidden />
                      Hapus
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}

          {custom.length === 0 && !adding && (
            <li className="py-3 text-[12.5px] text-forest/45">
              {CATEGORY_PREFS_COPY.customEmpty}
              <span className="mt-1 block text-forest/35">{CATEGORY_PREFS_COPY.customEmptyHint}</span>
            </li>
          )}
        </ul>

        {adding ? (
          <div className="mt-3">
            <CategoryForm
              title={CATEGORY_PREFS_COPY.addFormTitle}
              emoji={draftEmoji}
              name={draftName}
              onEmoji={setDraftEmoji}
              onName={setDraftName}
              onSave={saveCustom}
              onCancel={closeForm}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={openAdd}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-oat px-4 py-3.5 text-sm font-medium text-forest transition-colors hover:bg-sage/50 sm:w-auto sm:px-5"
          >
            <Plus className="size-4" strokeWidth={2.6} aria-hidden />
            {CATEGORY_PREFS_COPY.addCta}
          </button>
        )}

        {/* batas yang ditulis apa adanya (paket 62): daftar ini belum tersambung
            ke pemilih kategori di form catat transaksi */}
        <p className="mt-4 text-[11px] leading-relaxed text-forest/45">
          {CATEGORY_PREFS_COPY.storageNote}
        </p>
      </SettingsCard>

      {/* konfirmasi hapus kategori kustom — dialog yang SAMA dengan aksi merusak
          lain di app (paket 62) */}
      <AnimatePresence>
        {pendingDelete && (
          <ConfirmDialog
            titleId="hapus-kategori-judul"
            overlayLabel={CATEGORY_PREFS_COPY.deleteOverlay}
            title={CATEGORY_PREFS_COPY.deleteTitle(pendingDelete.name)}
            body={CATEGORY_PREFS_COPY.deleteBody(pendingDelete.name)}
            safety={CATEGORY_PREFS_COPY.deleteSafety(UNDO_WINDOW_MS / 1000)}
            cancelLabel={CATEGORY_PREFS_COPY.cancel}
            confirmLabel={CATEGORY_PREFS_COPY.deleteConfirm}
            onCancel={() => setPendingDelete(null)}
            onConfirm={confirmDeleteCategory}
          />
        )}
      </AnimatePresence>
    </SettingsPanel>
  )
}

/* ── Form kategori inline (dipakai untuk "Tambah" maupun "Edit") ─────────────── */
function CategoryForm({
  title,
  emoji,
  name,
  onEmoji,
  onName,
  onSave,
  onCancel,
}: {
  title: string
  emoji: string
  name: string
  onEmoji: (emoji: string) => void
  onName: (name: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="rounded-2xl bg-sage/50 p-4 ring-1 ring-forest/10">
      <p className="text-[12.5px] font-medium text-forest">{title}</p>

      {/* emoji picker ringkas — cukup satu baris yang bisa di-wrap */}
      <div
        role="radiogroup"
        aria-label={CATEGORY_PREFS_COPY.emojiLabel}
        className="mt-3 flex flex-wrap gap-1.5"
      >
        {EMOJI_PRESETS.map((preset) => {
          const active = preset === emoji
          return (
            <button
              key={preset}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`Emoji ${preset}`}
              onClick={() => onEmoji(preset)}
              className={cn(
                'flex size-9 items-center justify-center rounded-xl text-base transition-colors',
                active ? 'bg-forest text-mint' : 'bg-cream hover:bg-sage',
              )}
            >
              <span aria-hidden>{preset}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <SettingsField label={CATEGORY_PREFS_COPY.nameLabel} htmlFor="settings-category-name">
            <SettingsInput
              id="settings-category-name"
              value={name}
              maxLength={24}
              onChange={(event) => onName(event.target.value)}
              placeholder={CATEGORY_PREFS_COPY.namePlaceholder}
            />
          </SettingsField>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onSave}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-forest px-4 py-3 text-sm font-medium text-mint transition-colors hover:bg-forest-soft sm:flex-none"
          >
            <Check className="size-4" strokeWidth={2.6} aria-hidden />
            {CATEGORY_PREFS_COPY.save}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex flex-1 items-center justify-center rounded-2xl bg-cream px-4 py-3 text-sm font-medium text-forest/60 ring-1 ring-soil/12 transition-colors hover:bg-sage sm:flex-none"
          >
            {CATEGORY_PREFS_COPY.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Panel: AI Preferences (Domain 4B) ─────────────────────────────────────────
   Dua switch perilaku AI saat mencatat + satu pilihan "kepribadian" Minca.
   Mode bicara ini bukan hiasan: ia yang menentukan nada balasan AI Coach dan
   copy toast — jadi posisinya sengaja setara dengan switch fungsional lain.

   PAKET 54: kunci & bentuk preferensinya pindah ke `lib/ai-prefs.ts` karena
   dua switch di atasnya dulu TIDAK DIBACA siapa pun (grep berhenti di berkas
   ini) — kontrol yang tidak mengontrol apa pun. Sekarang switch
   "Kategorisasi/Penamaan Otomatis" dibaca jalur AI capture
   (`hooks/use-transaction-capture.ts` → `withCapturePrefs()`), dan helper-nya
   menyebut batas itu apa adanya: catatan manual selalu memakai kategori pilihan
   user sendiri. */

const MINCA_MODES: { id: MincaMode; emoji: string; label: string; desc: string }[] = [
  {
    id: 'bestie',
    emoji: '🌿',
    label: 'Mode Bestie',
    desc: 'Kalem, suportif, selalu nyemangatin kamu',
  },
  {
    id: 'savage',
    emoji: '🔥',
    label: 'Mode Savage',
    desc: 'Blak-blakan, nyelekit, nge-roast pengeluaran bodoh kamu',
  },
]

export function AiSettingsPanel() {
  const [prefs, setPrefs] = useState<AiPrefs>(AI_PREFS_DEFAULT)

  /* hidrasi preferensi dari localStorage SETELAH mount supaya render server &
     client identik (pola yang sama dengan preferensi tema & notifikasi).
     Pembacanya satu sumber dengan jalur AI capture — `readAiPrefs()`. */
  useEffect(() => {
    setPrefs(readAiPrefs())
  }, [])

  function update(next: Partial<AiPrefs>, message?: string) {
    setPrefs((prev) => {
      /* ditulis lewat satu pintu `lib/ai-prefs.ts` supaya Pengaturan & jalur AI
         capture memakai kunci yang sama; saat storage diblokir, preferensinya
         tetap berlaku untuk sesi ini */
      return writeAiPrefs({ ...prev, ...next })
    })
    if (message) toast.success(message)
  }

  return (
    <SettingsPanel
      eyebrow="AI Preferences"
      title="AI Preferences"
      desc="Atur seberapa jauh Minca boleh bantu di catatanmu."
    >
      {/* ── 0. STATUS AI (paket 44) ─────────────────────────────────────────
          Tombol "Hubungkan AI" di AI Coach mendarat di halaman ini, jadi
          keadaannya disebut lebih dulu sebelum saklar-saklarnya: AI belum
          tersambung ke model, saklar di bawah baru berlaku penuh setelah
          tersambung, dan pencatatan manual tetap jalan. Copy-nya di
          `lib/ai-chat.ts` (`AI_STATUS_COPY`) — satu sumber dengan widget chat. */}
      <SettingsCard title={AI_STATUS_COPY.title}>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-hud-amber/20 px-2.5 py-1 text-[11px] font-medium text-forest ring-1 ring-hud-amber/30">
          <Info className="size-3.5" strokeWidth={2.4} aria-hidden />
          {AI_STATUS_COPY.badge}
        </span>
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-forest/60">{AI_STATUS_COPY.body}</p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-forest/45">{AI_STATUS_COPY.worksNow}</p>
      </SettingsCard>

      {/* ── 1. BANTUAN SAAT MENCATAT ───────────────────────────────────────
          Dua saklar ini hidup di jalur AI capture (scan struk & input suara) dan
          tidak pernah menyentuh catatan manual — kalimatnya tinggal di
          `lib/ai-prefs.ts` (`AI_PREFS_COPY`), sehingga tidak ada lagi kontrol
          yang menjanjikan sesuatu yang tidak terjadi (paket 54). */}
      <SettingsCard title="Bantuan AI saat Mencatat">
        <div className="mt-2 divide-y divide-soil/10">
          <ToggleRow
            label={AI_PREFS_COPY.toggles.autoCategory.label}
            helper={AI_PREFS_COPY.toggles.autoCategory.helper}
            checked={prefs.autoCategory}
            onToggle={() => update({ autoCategory: !prefs.autoCategory })}
          />
          <ToggleRow
            label={AI_PREFS_COPY.toggles.autoNaming.label}
            helper={AI_PREFS_COPY.toggles.autoNaming.helper}
            checked={prefs.autoNaming}
            onToggle={() => update({ autoNaming: !prefs.autoNaming })}
          />
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-forest/50">
          {AI_PREFS_COPY.manualScopeNote}
        </p>
      </SettingsCard>

      {/* ── 2. GAYA BICARA MINCA ─────────────────────────────────────────── */}
      <SettingsCard
        title="Gaya Bicara Minca"
        desc="Nentuin nada Minca waktu nemenin kamu review pengeluaran."
      >
        <div
          role="radiogroup"
          aria-label="Gaya bicara Minca"
          className="mt-3 grid gap-2.5 sm:grid-cols-2"
        >
          {MINCA_MODES.map((mode) => {
            const active = mode.id === prefs.mincaMode
            return (
              <button
                key={mode.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update({ mincaMode: mode.id }, `Gaya bicara: ${mode.label}`)}
                className={cn(
                  'flex flex-col rounded-2xl p-4 text-left ring-1 transition-all',
                  active ? 'bg-mint/20 ring-2 ring-forest' : 'bg-cream ring-soil/12 hover:bg-sage/50',
                )}
              >
                <span aria-hidden className="text-2xl">
                  {mode.emoji}
                </span>
                <span className="mt-2 text-sm font-medium text-forest">{mode.label}</span>
                <span className="mt-1 text-xs leading-relaxed text-forest/50">{mode.desc}</span>
                {active && (
                  <span className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-forest">
                    <Check className="size-3.5" strokeWidth={3} aria-hidden />
                    Dipilih
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </SettingsCard>
    </SettingsPanel>
  )
}




