'use client'

import { Drawer } from 'vaul'
import { SlidersHorizontal, Wallet } from 'lucide-react'
import {
  TransactionInputEngine,
  type TransactionTypeId,
} from '@/components/dashboard/transaction-input-engine'
import {
  JOINT_DEFAULT_DESCRIPTION,
  JOINT_DEFAULT_INCOME_DESCRIPTION,
  PAID_BY_LABEL,
  PAID_BY_ME_LABEL,
  splitSpecLabelFor,
  type JointPerson,
} from '@/lib/data/joint'
import type { TransactionFormResume } from '@/lib/data/transaction-form-reset'
import type { JointSplitDraft } from './joint-split-sheet'
import { ChoicePills } from './budget-sheet'

/**
 * Tipe yang ditawarkan form Catat Bareng: hanya pengeluaran & pemasukan —
 * "Tabungan"/"Transfer" punya arti berbeda di kas pribadi dan tidak punya
 * padanan di buku besar patungan.
 *
 * WAJIB berupa konstanta MODUL, bukan literal di dalam render: prop `types`
 * engine dipakai sebagai dependensi effect reset form (`transaction-input-engine.tsx`),
 * jadi array baru di setiap render akan mengosongkan isian user saat halaman
 * Joint render ulang — dan halaman itu render ulang di SETIAP digit nominal
 * (`onDraftChange`). Itu bug "catatan yang gue tulis ke-delete terus".
 */
const JOINT_ENGINE_TYPES: readonly TransactionTypeId[] = ['expense', 'income']

/* ── Add Joint Transaction (Section 9) ──────────────────────────────────────
   FAB (+) di halaman Joint memakai Transaction Input Engine yang SAMA dengan
   halaman lain — jadi perilaku input tidak pernah divergen — tapi ada DUA field
   tambahan khas halaman ini. Keduanya berada DI ATAS tombol "Catat"
   (Stage 2 #4): user melihat opsinya lebih dulu, baru mencatat.

   1. Pemilih split (default "Bagi Rata") + tautan "Atur pembagian →" yang
      membuka Split Bill Bottom Sheet (Section 6). Bagi Rata membagi ke SEMUA
      anggota kantong (2 orang atau lebih), bukan selalu 50/50.
   2. Pemilih "Siapa yang nalangin?" (chip sebanyak anggota, default Aku) →
      mengisi `paidByUserId`. Tanpa ini catatan yang uangnya keluar dari kantong
      orang lain selalu terhitung sebagai pengeluaran pencatat (audit #4).

   JENIS catatan (Pengeluaran/Pemasukan) memakai pemilih tipe bawaan engine dan
   diteruskan ke store sebagai `kind`. Toggle "Sembunyikan dari pasangan"
   DIHAPUS atas permintaan pemilik produk — dompet bersama sekarang transparan
   untuk semua anggotanya.

   "SUMBER DANA" DIHAPUS (permintaan pemilik produk, 11 Nov 2026). Kantong
   bersama kembali murni buku besar: mencatat di sini TIDAK menggeser saldo
   dompet pribadi mana pun, dan tidak memunculkan baris di Riwayat/Budget/
   Dashboard. Itu aturan awalnya (paket 37/49 — lihat catatan model akuntansi
   di `lib/data/joint.ts`). Dukungan `cashWalletId` di STORE tetap ada untuk
   mencabut baris kas data lama saat catatannya dihapus.
   ────────────────────────────────────────────────────────────────────────── */

export function JointAddSheet({
  open,
  onClose,
  walletName,
  splitDraft,
  paidBy,
  onDraftChange,
  resumeDraft,
  onOpenSplit,
  people,
  onPaidByChange,
  onSubmitted,
  memberAccess = false,
}: {
  open: boolean
  onClose: () => void
  /** nama dompet bersama — ditampilkan sebagai banner dompet di atas form */
  walletName: string
  /** pembagian yang sedang dipilih (null = default bagi rata) */
  splitDraft: JointSplitDraft | null
  /** kantong yang keluar uang (id anggota) — default "Aku" */
  paidBy: string
  /**
   * isian yang sedang berjalan, dilaporkan engine ke halaman. Halaman
   * menyimpannya sebagai `resumeDraft` supaya nominal & catatan yang sudah
   * diketik TIDAK hilang saat user mampir ke "Atur Pembagian".
   */
  onDraftChange?: (draft: {
    amount: number
    note: string
    category: string
    type: TransactionTypeId
  }) => void
  /** isian yang dipulihkan saat form dibuka lagi (null = form baru/kosong) */
  resumeDraft?: TransactionFormResume | null
  onOpenSplit: () => void
  /**
   * SELURUH anggota kantong (2 orang atau lebih), pemilik sesi di urutan
   * pertama. Pemilih "Siapa yang nalangin?" membaca daftar ini, jadi orang
   * ketiga/keempat bisa dicatat sebagai pembayar — bukan cuma aku & satu orang.
   */
  people: JointPerson[]
  onPaidByChange: (userId: string) => void
  /** transaksi selesai dicatat — halaman menyisipkannya ke timeline */
  onSubmitted: (input: {
    description: string
    amount: number
    /**
     * kategori PILIHAN USER dari engine (paket 54). Boleh kosong hanya untuk
     * pemanggil lama; store-nya sendiri jatuh ke `JOINT_DEFAULT_CATEGORY`.
     */
    category?: string
    /** `expense` (bawaan) atau `income` — dibaca dari tipe yang dipilih user */
    kind: 'expense' | 'income'
    split: JointSplitDraft | null
    paidByUserId: string
  }) => void
  /**
   * true = pemanggil adalah anggota aktif dompet bersama. Tombol simpan tidak
   * boleh ditahan kunci paket: anggota gratis yang diundang tetap bisa mencatat
   * selama dompetnya aktif (yang berlangganan cukup pembuat dompet).
   */
  memberAccess?: boolean
}) {
  const extraFields = (
    <div className="space-y-2.5">
      {/* 1. pemilih split */}
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/12">
        <span className="flex min-w-0 items-center gap-2">
          <SlidersHorizontal className="size-4 shrink-0 text-forest" strokeWidth={2.3} />
          <span className="min-w-0">
            <span className="block truncate text-[13.5px] font-medium text-forest">
              Split: {draftLabel(splitDraft, people)}
            </span>
          </span>
        </span>
        <button
          type="button"
          onClick={onOpenSplit}
          className="shrink-0 text-[12.5px] font-medium text-forest underline decoration-dotted underline-offset-4 transition-colors hover:text-forest-soft"
        >
          Atur pembagian →
        </button>
      </div>

      {/* 2. pemilih "Siapa yang nalangin?" — chip sebanyak ANGGOTA kantong
             (2 orang atau lebih), default Aku (Stage 2 #3) */}
      <div className="rounded-2xl bg-cream px-4 py-3 ring-1 ring-soil/12">
        <p className="flex items-center gap-2 text-[13.5px] font-medium text-forest">
          <Wallet className="size-4 shrink-0 text-forest" strokeWidth={2.3} />
          {PAID_BY_LABEL}
        </p>
        <ChoicePills
          className="mt-2.5"
          options={people.map((person, index) => ({
            id: person.id,
            label: index === 0 ? `${PAID_BY_ME_LABEL} (${person.name})` : person.name,
          }))}
          value={paidBy}
          onChange={onPaidByChange}
          ariaLabel={PAID_BY_LABEL}
        />
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
            Catat pengeluaran atau pemasukan di dompet bersama, pilih siapa yang menalangi, dan atur
            pembagiannya.
          </Drawer.Description>

          <div
            data-lenis-prevent
            className="overflow-y-auto px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            <TransactionInputEngine
              active={open}
              layout="sheet"
              sourceLabel={walletName}
              /* Kantong bersama hanya menerima pengeluaran & pemasukan:
                 "Tabungan"/"Transfer" punya arti berbeda di kas pribadi dan
                 tidak punya padanan di buku besar patungan. */
              types={JOINT_ENGINE_TYPES}
              /* Isian yang sudah diketik DIPULIHKAN saat form dibuka lagi
                 (mis. user baru kembali dari "Atur Pembagian"), dan setiap
                 perubahan dilaporkan ke halaman supaya bisa disimpan. */
              onDraftChange={onDraftChange}
              resumeDraft={resumeDraft}
              extraFields={extraFields}
              bypassPlanGate={memberAccess}
              onSubmitted={(payload) => {
                /* tipe yang DIPILIH USER menentukan jenisnya. Sebelumnya pilihan
                   "Pemasukan" dibuang di sini, jadi uang masuk selalu tersimpan
                   sebagai pengeluaran. */
                const kind = payload.type === 'income' ? 'income' : 'expense'
                onSubmitted({
                  description:
                    payload.note || (kind === 'income' ? JOINT_DEFAULT_INCOME_DESCRIPTION : JOINT_DEFAULT_DESCRIPTION),
                  amount: payload.amount,
                  /* kategori pilihan user diteruskan apa adanya (paket 54) —
                     kalau dibuang di sini, pemilih kategori di form jadi kontrol
                     mati, dan rincian kategori halaman ini selalu "Lainnya" */
                  category: payload.category,
                  kind,
                  split: kind === 'income' ? null : splitDraft,
                  /* kantong yang keluar uang dikirim EKSPLISIT — inilah yang
                     membedakan "pasangan yang nalangin" dari "aku yang mengetik" */
                  paidByUserId: paidBy,
                  /* TIDAK ada `cashWalletId` lagi: catatan bersama murni buku
                     besar dan tidak menggeser saldo dompet pribadi mana pun
                     (permintaan pemilik produk, 11 Nov 2026). */
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
 *  ledger — dan persen tidak akan pernah tampil sebagai rupiah.
 *
 *  `people` = SELURUH anggota (2 orang atau lebih), supaya label pembagian
 *  tetap masuk akal kalau kantongnya dipakai tiga/empat orang. */
function draftLabel(draft: JointSplitDraft | null, people: JointPerson[]): string {
  if (!draft) {
    return people.length > 2
      ? `Bagi Rata (${Math.floor(100 / people.length)}% × ${people.length} orang)`
      : 'Bagi Rata (50/50)'
  }

  const spec = draft.split
  if (spec.type === 'percentage') return `Persentase ${splitSpecLabelFor(spec, people)}`
  if (spec.type === 'nominal') return `Nominal ${splitSpecLabelFor(spec, people)}`
  return splitSpecLabelFor(spec, people)
}
