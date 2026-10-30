'use client'

import { Drawer } from 'vaul'
import { EyeOff, SlidersHorizontal, Wallet } from 'lucide-react'
import { TransactionInputEngine } from '@/components/dashboard/transaction-input-engine'
import {
  JOINT_DEFAULT_DESCRIPTION,
  PAID_BY_HINT,
  PAID_BY_LABEL,
  PAID_BY_ME_LABEL,
  PRIVATE_CATEGORY_NOTE,
  PRIVACY_WARNING_COPY,
  splitSpecLabel,
  type JointPerson,
} from '@/lib/data/joint'
import type { JointSplitDraft } from './joint-split-sheet'
import { ChoicePills } from './budget-sheet'
import { cn } from '@/lib/utils'

/* â”€â”€ Add Joint Transaction (Section 9) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   FAB (+) di halaman Joint memakai Transaction Input Engine yang SAMA dengan
   halaman lain â€” jadi perilaku input tidak pernah divergen â€” tapi dompet
   bersamanya otomatis jadi sumber dana (`sourceLabel`) dan ada TIGA field
   tambahan khas halaman ini. Ketiganya kini berada DI ATAS tombol "Catat"
   (Stage 2 #4): user melihat opsinya lebih dulu, baru mencatat.

   1. Pemilih split (default "Bagi Rata (50/50)") + tautan "Atur pembagian â†’"
      yang membuka Split Bill Bottom Sheet (Section 6).
   2. Pemilih "Siapa yang nalangin?" (2 chip, default Aku) â†’ mengisi
      `paidByUserId`. Tanpa ini catatan yang uangnya keluar dari kantong
      pasangan selalu terhitung sebagai pengeluaran pencatat (audit #4).
   3. Toggle "Sembunyikan dari pasangan ðŸ”’" â€” saat menyala, pemilih split
      DISEMBUNYIKAN karena pembagiannya bukan urusan pasangan, dan muncul
      peringatan. Catatan akuntansi (audit fintech #3): NOMINAL transaksi
      privat tetap ikut dihitung di total bersama & timbangan settlement â€”
      yang disembunyikan cuma itemnya. Lihat `weighedPaidBy()`.
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function JointAddSheet({
  open,
  onClose,
  walletName,
  splitDraft,
  privateOn,
  paidBy,
  onAmountChange,
  onOpenSplit,
  onTogglePrivate,
  onPaidByChange,
  onSubmitted,
  me,
  partner,
  walletOptions = [],
  cashWalletId = '',
  onCashWalletChange,
}: {
  open: boolean
  onClose: () => void
  /** nama dompet bersama â€” ditampilkan sebagai sumber dana terpilih */
  walletName: string
  /** pembagian yang sedang dipilih (null = default bagi rata) */
  splitDraft: JointSplitDraft | null
  privateOn: boolean
  /** kantong yang keluar uang (id anggota) â€” default "Aku" */
  paidBy: string
  onAmountChange: (amount: number) => void
  onOpenSplit: () => void
  onTogglePrivate: () => void
  onPaidByChange: (userId: string) => void
  /** transaksi selesai dicatat â€” halaman menyisipkannya ke timeline */
  onSubmitted: (input: {
    description: string
    amount: number
    /**
     * kategori PILIHAN USER dari engine (paket 54). Boleh kosong hanya untuk
     * pemanggil lama; store-nya sendiri jatuh ke `JOINT_DEFAULT_CATEGORY`.
     * Catatan privat tetap dianonimkan store (`PRIVATE_CATEGORY`) â€” lihat
     * `PRIVATE_CATEGORY_NOTE` di bawah.
     */
    category?: string
    isPrivate: boolean
    split: JointSplitDraft | null
    paidByUserId: string
    /** dompet pribadi yang benar-benar mengeluarkan uang (opsional) */
    cashWalletId?: string
  }) => void
  me: JointPerson
  partner: JointPerson
  /**
   * Dompet PRIBADI yang bisa dipakai sebagai sumber dana. Kalau dipilih, uangnya
   * benar-benar keluar dari dompet itu dan muncul di Riwayat/Budget. Kosong =
   * catatan bersama saja (buku besar patungan, tanpa menyentuh kas).
   */
  walletOptions?: { id: string; label: string }[]
  cashWalletId?: string
  onCashWalletChange?: (walletId: string) => void
}) {
  const extraFields = (
    <div className="space-y-2.5">
      {/* 1. pemilih split â€” disembunyikan saat transaksi privat */}
      {!privateOn && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/12">
          <span className="flex min-w-0 items-center gap-2">
            <SlidersHorizontal className="size-4 shrink-0 text-forest" strokeWidth={2.3} />
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-medium text-forest">
                Split: {draftLabel(splitDraft, me, partner)}
              </span>
              <span className="mt-0.5 block text-[12px] text-forest/45">
                Bisa diubah kapan aja sebelum dicatat
              </span>
            </span>
          </span>
          <button
            type="button"
            onClick={onOpenSplit}
            className="shrink-0 text-[12.5px] font-medium text-forest underline decoration-dotted underline-offset-4 transition-colors hover:text-forest-soft"
          >
            Atur pembagian â†’
          </button>
        </div>
      )}

      {/* 2. pemilih "Siapa yang nalangin?" â€” 2 chip, default Aku (Stage 2 #3) */}
      <div className="rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/12">
        <p className="flex items-center gap-2 text-[13.5px] font-medium text-forest">
          <Wallet className="size-4 shrink-0 text-forest" strokeWidth={2.3} />
          {PAID_BY_LABEL}
        </p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-forest/45">{PAID_BY_HINT}</p>
        <ChoicePills
          className="mt-2.5"
          options={[
            { id: me.id, label: `${PAID_BY_ME_LABEL} (${me.name})` },
            { id: partner.id, label: partner.name },
          ]}
          value={paidBy}
          onChange={onPaidByChange}
          ariaLabel={PAID_BY_LABEL}
        />
      </div>

      {/* 3. SUMBER DANA (opsional) â€” kalau dipilih, uangnya benar-benar keluar
          dari dompet pribadi user dan muncul di Riwayat/Budget. Kalau tidak
          dipilih, catatan ini murni buku besar patungan. */}
      {onCashWalletChange && walletOptions.length > 0 && (
        <div className="rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/12">
          <p className="flex items-center gap-2 text-[13.5px] font-medium text-forest">
            <Wallet className="size-4 shrink-0 text-forest" strokeWidth={2.3} />
            Sumber Dana (opsional)
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-forest/45">
            Pilih dompet kalau uangnya keluar dari kasmu. Tanpa dompet, catatan ini tidak menggeser
            saldo apa pun.
          </p>
          <ChoicePills
            className="mt-2.5"
            options={[{ id: '', label: 'Tanpa dompet' }, ...walletOptions]}
            value={cashWalletId}
            onChange={onCashWalletChange}
            ariaLabel="Sumber dana"
          />
        </div>
      )}

      {/* 3. toggle privasi */}
      <div className="rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/12">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[13.5px] font-medium text-forest/80">
            <EyeOff className="size-4 text-forest/40" strokeWidth={2.3} />
            Sembunyikan dari pasangan ðŸ”’
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={privateOn}
            aria-label="Sembunyikan dari pasangan"
            onClick={onTogglePrivate}
            className={cn(
              'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
              privateOn ? 'bg-forest' : 'bg-ink/15',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 size-5 rounded-full bg-cream shadow-sm transition-transform duration-200',
                privateOn ? 'translate-x-[22px]' : 'translate-x-0.5',
              )}
            />
          </button>
        </div>
        {privateOn && (
          <>
            <p className="mt-2 text-[12px] leading-relaxed text-hud-terracotta">
              {PRIVACY_WARNING_COPY}
            </p>
            {/* pemilih kategori ada di form engine di atas â€” sebut lebih dulu
                bahwa untuk catatan privat pilihannya tidak ikut tersimpan */}
            <p className="mt-1.5 text-[12px] leading-relaxed text-forest/50">
              {PRIVATE_CATEGORY_NOTE}
            </p>
          </>
        )}
      </div>
    </div>
  )
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      autoFocus={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay data-catetind-overlay="true" className="fixed inset-0 z-[70] bg-ink/60" />
        <Drawer.Content
          data-catetind-sheet="true"
          aria-label="Catat transaksi bareng"
          className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex max-h-[94dvh] w-full max-w-md flex-col rounded-t-[2rem] bg-cream shadow-[0_-24px_60px_-24px_rgba(0,0,0,0.55)] outline-none"
        >
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-ink/10" />
          <Drawer.Title className="sr-only">Catat transaksi bareng</Drawer.Title>
          <Drawer.Description className="sr-only">
            Catat pengeluaran di dompet bersama, atur pembagiannya, dan sembunyikan dari pasangan
            kalau perlu.
          </Drawer.Description>

          <div
            data-lenis-prevent
            className="overflow-y-auto px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            <TransactionInputEngine
              active={open}
              layout="sheet"
              sourceLabel={walletName}
              onAmountChange={onAmountChange}
              extraFields={extraFields}
              onSubmitted={(payload) => {
                onSubmitted({
                  description: payload.note || JOINT_DEFAULT_DESCRIPTION,
                  amount: payload.amount,
                  /* kategori pilihan user diteruskan apa adanya (paket 54) â€”
                     kalau dibuang di sini, pemilih kategori di form jadi kontrol
                     mati, dan rincian kategori halaman ini selalu "Lainnya" */
                  category: payload.category,
                  isPrivate: privateOn,
                  split: privateOn ? null : splitDraft,
                  /* kantong yang keluar uang dikirim EKSPLISIT â€” inilah yang
                     membedakan "pasangan yang nalangin" dari "aku yang mengetik" */
                  paidByUserId: paidBy,
                  /* dompet pribadi hanya dikirim kalau user MEMILIHNYA. Kosong =
                     catatan bersama saja, tanpa menggeser saldo apa pun. */
                  ...(cashWalletId ? { cashWalletId } : {}),
                })
                onClose()
              }}
            />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

/** label singkat pembagian untuk baris "Split: ..." di form. Dibaca dari
 *  `SplitSpec` (bukan `splits`), jadi bahasa form = bahasa timeline = bahasa
 *  ledger â€” dan persen tidak akan pernah tampil sebagai rupiah. */
function draftLabel(
  draft: JointSplitDraft | null,
  me: JointPerson,
  partner: JointPerson,
): string {
  if (!draft) return 'Bagi Rata (50/50)'

  const spec = draft.split
  if (spec.type === 'percentage') return `Persentase ${splitSpecLabel(spec, me, partner)}`
  if (spec.type === 'nominal') return `Nominal ${splitSpecLabel(spec, me, partner)}`
  return splitSpecLabel(spec, me, partner)
}
