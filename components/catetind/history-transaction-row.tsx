'use client'

import { useRef, useState } from 'react'
import { MoreVertical, Pencil, Sparkles, Trash2 } from 'lucide-react'
import {
  MONEY_TONE,
  amountSign,
  isMoneyMovement,
  maskMoney,
  resolveCategoryLabel,
  type HistoryTransaction,
} from '@/lib/data/history'
import { cn } from '@/lib/utils'

/* ── Baris transaksi dengan aksi geser (tabel gesture PRD Domain 3D) ─────────
   - Geser KANAN → buka tombol Edit (hijau brand)
   - Geser KIRI  → buka tombol Hapus (rose — satu-satunya pemakaian merah,
                   karena memang aksi merusak)
   - Tap (tanpa geser) → buka Detail Transaksi

   Digerakkan pointer events (mouse & sentuh) sehingga tidak butuh library
   gesture tambahan. 88px = lebar area aksi yang tersingkap.

   REDESIGN: baris ini sekarang TANPA kartu (garis rambut memisah antar baris,
   lihat history-screen.tsx) supaya daftarnya terasa seperti satu daftar, bukan
   tumpukan kotak. Nominal memakai `MONEY_TONE` yang sama dengan Dashboard:
   hijau = masuk, terracotta = keluar, tinta redup + ⇄ = cuma pindah dana. */

const REVEAL = 88

const CATEGORY_EMOJI: Record<string, string> = {
  makanan: '🍜',
  transportasi: '🛵',
  tagihan: '🧾',
  hiburan: '🎬',
  'gaji utama': '💼',
  'dana darurat': '🛟',
  transfer: '🔁',
  tabungan: '🌱',
  /* dua kategori yang dipakai halaman Dompet Detail (proyek & cashback) —
     tanpa ini ikonnya jatuh ke fallback 🏷️ padahal maknanya sudah jelas */
  proyek: '🧑‍💻',
  cashback: '🎁',
}

/** emoji lingkaran kategori — jatuh ke 🏷️ untuk kategori yang belum dipetakan */
export function categoryEmoji(category: string): string {
  return CATEGORY_EMOJI[category.toLowerCase()] ?? '🏷️'
}

/** `+ Rp 7.500.000` (masuk) · `- Rp 25.000` (keluar) · `⇄ Rp 750.000` (pindah
 *  dana) — ikut mode privasi (Rp •••••••). Glyph-nya diambil dari `amountSign`
 *  supaya tanda & warnanya selalu sejalan. */
export function transactionAmountLabel(tx: HistoryTransaction, masked: boolean): string {
  return `${amountSign(tx.type)} ${maskMoney(tx.amount, masked)}`
}

export function HistoryTransactionRow({
  tx,
  masked,
  delay = 0,
  showWallet = true,
  onOpen,
  onEdit,
  onDelete,
  onMenu,
}: {
  tx: HistoryTransaction
  masked: boolean
  /** jeda animasi masuk (stagger antar baris) */
  delay?: number
  /**
   * tampilkan nama dompet di baris meta. Di Riwayat & Insight ini wajib
   * (barisnya bercampur banyak dompet); di halaman Dompet Detail yang seluruh
   * isinya dompet yang sama, nama itu cuma jadi kebisingan berulang.
   */
  showWallet?: boolean
  onOpen: (tx: HistoryTransaction) => void
  onEdit: (tx: HistoryTransaction) => void
  onDelete: (tx: HistoryTransaction) => void
  /** buka sheet aksi (affordance titik tiga) — alternatif non-gesture */
  onMenu: (tx: HistoryTransaction) => void
}) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef<number | null>(null)
  const moved = useRef(false)

  const clamp = (v: number) => Math.max(-REVEAL, Math.min(REVEAL, v))

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    startX.current = e.clientX
    moved.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (startX.current === null) return
    const d = e.clientX - startX.current
    if (Math.abs(d) > 6) {
      moved.current = true
      setDragging(true)
    }
    setDx(clamp(d))
  }

  /** lepas jari: snap ke lebar penuh kalau sudah lewat setengah, kalau tidak tutup */
  const settle = () => {
    if (startX.current === null) return
    startX.current = null
    setDragging(false)
    setDx((v) => (Math.abs(v) > 44 ? Math.sign(v) * REVEAL : 0))
  }

  /* tap biasa membuka detail — geser tidak pernah ikut memicu tap */
  const onClick = (e: React.MouseEvent) => {
    if (moved.current || dx !== 0) {
      e.preventDefault()
      e.stopPropagation()
      setDx(0)
      return
    }
    onOpen(tx)
  }

  const exposed = Math.abs(dx) / REVEAL
  const label = transactionAmountLabel(tx, masked)
  /* kategori aman (tidak pernah berisi nama TYPE) + penanda pindah dana */
  const category = resolveCategoryLabel(tx)
  const moves = isMoneyMovement(tx)

  return (
    <li className="relative select-none overflow-hidden rounded-xl">
      {/* aksi KIRI — tersingkap saat swipe kanan (Edit, hijau brand) */}
      <button
        type="button"
        aria-label={`Edit ${tx.name}`}
        onClick={() => {
          setDx(0)
          onEdit(tx)
        }}
        className="absolute inset-y-0 left-0 flex w-[88px] flex-col items-center justify-center gap-1 rounded-xl bg-forest text-mint transition-opacity"
        style={{ opacity: dx > 0 ? exposed : 0, pointerEvents: dx > 24 ? 'auto' : 'none' }}
      >
        <Pencil className="size-4" strokeWidth={2.3} />
        <span className="text-[10px] font-semibold">Edit</span>
      </button>

      {/* aksi KANAN — tersingkap saat swipe kiri (Hapus, rose = aksi merusak) */}
      <button
        type="button"
        aria-label={`Hapus ${tx.name}`}
        onClick={() => {
          setDx(0)
          onDelete(tx)
        }}
        className="absolute inset-y-0 right-0 flex w-[88px] flex-col items-center justify-center gap-1 rounded-xl bg-plum text-cream transition-opacity"
        style={{ opacity: dx < 0 ? exposed : 0, pointerEvents: dx < -24 ? 'auto' : 'none' }}
      >
        <Trash2 className="size-4" strokeWidth={2.3} />
        <span className="text-[10px] font-semibold">Hapus</span>
      </button>

      {/* konten baris — dibungkus bersama tombol menu supaya keduanya ikut
          tergeser saat swipe. Barisnya rata (bukan kartu): pemisah antar
          transaksi adalah garis rambut di <ul>, jadi tidak ada kotak di dalam
          kotak. Affordance aksinya adalah ikon titik tiga yang bisa ditekan. */}
      <div
        className="group relative flex cursor-pointer touch-pan-y items-center rounded-xl bg-cream transition-colors duration-200 animate-[row-in_0.5s_ease_backwards] hover:bg-cream focus-within:bg-cream"
        style={{
          transform: `translateX(${dx}px)`,
          transitionDuration: dragging ? '0ms' : undefined,
          animationDelay: `${delay}ms`,
        }}
      >
        <button
          type="button"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={settle}
          onPointerCancel={settle}
          onClick={onClick}
          aria-label={`${tx.name}, ${category}, ${label}${moves ? ' (pindah dana)' : ''}. Geser kanan untuk edit, kiri untuk hapus, atau buka menu aksi.`}
          className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-1 pr-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-forest/20"
        >
          {/* lingkaran emoji kategori — tanpa ring, cukup tona sage lembut */}
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage/70 text-[15px] transition-transform duration-300 group-hover:scale-105"
            aria-hidden
          >
            {categoryEmoji(category)}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[13.5px] font-semibold text-ink">{tx.name}</span>
              {tx.aiGenerated && (
                <Sparkles
                  className="size-3 shrink-0 text-forest/50"
                  strokeWidth={2.4}
                  aria-label="Nama dibuat AI"
                />
              )}
            </span>
            {/* meta: dompet · jam · kategori, lalu penanda "pindah dana" dalam
                teks redup — bukan pill biru lagi (audit warna: makna uang tidak
                perlu biru, cukup dikatakan) */}
            <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink/40">
              <span className="truncate">
                {showWallet ? `${tx.wallet} · ` : ''}
                {tx.time} · {category}
              </span>
              {moves && <span className="shrink-0 font-medium text-ink/40">· pindah dana</span>}
            </span>
          </span>

          <span
            className={cn(
              'shrink-0 text-[13.5px] font-semibold tabular-nums',
              MONEY_TONE[tx.type].text,
            )}
          >
            {label}
          </span>
        </button>

        {/* affordance aksi: titik tiga membuka sheet aksi (menggantikan teks
            instruksi "Geser: kanan Edit · kiri Hapus" yang dihapus) */}
        <button
          type="button"
          onClick={() => onMenu(tx)}
          aria-label={`Buka menu aksi ${tx.name}`}
          className="mr-1 flex size-9 shrink-0 items-center justify-center rounded-full text-ink/30 transition-colors hover:bg-sage/70 hover:text-ink/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25"
        >
          <MoreVertical className="size-4" strokeWidth={2.4} />
        </button>
      </div>
    </li>
  )
}
