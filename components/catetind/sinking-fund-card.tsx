'use client'

import { CalendarDays, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CONTEXT_LABEL } from '@/lib/data/money-context'
import { PlantIllustration, type PlantStage as IllustrationStage } from './plant-illustration'
import {
  FUND_CARD_ACTION_COPY,
  PLANT_STAGES,
  PLANT_STAGE_INDEX,
  SINKING_FUND_CARD_COPY,
  formatDeadline,
  fundPercent,
  maskNominal,
  monthlyNeeded,
  priorityStyle,
  type SinkingFundItem,
} from '@/lib/data/budget'

/* ── Kartu Celengan Impian (Zona B) — tanaman + bar progres tipis (paket 78) ──
   Kartu tempat tanaman bertumbuh. Progres digambar sebagai TANAMAN (SVG statis
   seed → sprout → plant → flower) plus auto-kalkulasi "nabung Rp X/bulan biar
   tercapai tepat waktu" (rumus PRD 2C.3). Tanaman di list view sengaja SVG
   statis (resolusi CANDRA, PRD Domain 3B): animasi berat hanya di halaman detail.

   ⚠️ OWNER OVERRIDE (paket 78) — BACA SEBELUM MENGUBAH BAR LAGI.
   Audit UX #1 dulu MENGHAPUS progress bar generik karena PRD menolak progress
   bar untuk goal: "tanaman adalah SATU-SATUNYA indikator visual". Pemilik produk
   lalu meminta halaman Budget & Target Nabung direnovasi dengan "progress bars,
   clean typography, dan whitespace" — karena itu keputusan paket 78 adalah
   MENAMBAH, bukan mengganti:

     · TANAMAN TIDAK DIHAPUS. Ia tetap ada sebagai penanda identitas/jiwa kartu
       dan satu-satunya yang membedakan celengan dari kartu budget biasa;
     · PERSENTASE TIDAK DIHAPUS. Ia duduk di kanan atas kartu, sebaris dengan nama;
     · Bar progres `h-2` tipis ditambahkan MENDAMPINGI keduanya, memakai bahasa
       visual meter Jatah Hari Ini (paket 76): track `bg-soil/[0.09]`, isian
       membulat penuh, transisi `[cubic-bezier(0.22,1,0.36,1)]`, aman untuk
       `prefers-reduced-motion`. Warna isiannya mint (keluarga "tumbuh") — BUKAN
       tiga warna status Jatah Harian, karena untuk celengan makin penuh = makin
       baik, jadi amber/terracotta akan salah terbaca sebagai peringatan.

   Kalau kelak tanamannya yang justru harus dilepas, itu keputusan pemilik produk
   — bukan keputusan yang boleh diambil diam-diam di file ini.

   Area kartu dibagi dua tombol supaya jelas: badan kartu = buka detail,
   tombol `Setor` = langsung menyetor tanpa meninggalkan halaman.

   PAKET 60.2: footer kartu menambah tombol hapus (`onDelete`). Konfirmasi,
   kalimat efek uang, dan jendela Undo-nya dipasang halaman pemilik state
   (`budget-screen`), bukan di kartu ini — kartu ini murni presentasional.

   PAKET 78 (tipografi): jumlah ukuran teks dikurangi — nama, satu baris angka,
   bar, lalu satu baris mikro (setoran bulanan + deadline). Label tahap tanaman
   ("Baru ditanam") TIDAK lagi ditulis karena ilustrasinya sudah menunjukkan
   tahapnya, dan pembaca layar tetap mendengarnya dari `aria-label` SVG tanaman
   (`plant-illustration.tsx`). ─────────────────────────────────────────────── */

export function SinkingFundCard({
  fund,
  masked,
  onOpen,
  onContribute,
  onDelete,
}: {
  fund: SinkingFundItem
  masked: boolean
  onOpen: (fund: SinkingFundItem) => void
  onContribute: (fund: SinkingFundItem) => void
  /** hapus celengan ini (opsional — kartu tetap utuh tanpa prop ini) */
  onDelete?: (fund: SinkingFundItem) => void
}) {
  const priority = priorityStyle(fund.priority)
  const percent = fundPercent(fund)
  const reached = percent >= 100
  const perMonth = monthlyNeeded(fund.target, fund.current, fund.deadline)
  const percentLabel = `${Math.round(percent)}%`

  return (
    <article
      className={cn(
        'group/card flex flex-col rounded-[1.4rem] bg-cream p-3.5 ring-1 transition-shadow duration-300 hover:shadow-[0_18px_40px_-26px_rgba(0,0,0,0.4)]',
        reached ? 'ring-mint/60' : 'ring-soil/10',
      )}
    >
      {/* badan kartu → halaman detail celengan */}
      <button
        type="button"
        onClick={() => onOpen(fund)}
        aria-label={SINKING_FUND_CARD_COPY.progressAria(
          fund.name,
          percentLabel,
          maskNominal(fund.current, masked),
          maskNominal(fund.target, masked),
        )}
        className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-forest/30 rounded-2xl"
      >
        {/* baris 1 — tanaman (identitas/jiwa kartu) · nama + meta · persen.
            REDESAIN paket 82 (round 2): dua badge (konteks + prioritas) diganti
            SATU sub-baris yang tenang — titik warna prioritas · label prioritas ·
            konteks uang. Tiga pil berdampingan terasa ramai; satu baris titik+teks
            menyampaikan informasi yang sama tanpa berebut perhatian dengan NAMA
            celengan & persennya. */}
        <div className="flex items-center gap-3">
          {/* tanaman = identitas/jiwa kartu (SVG statis; animasi hanya di detail) */}
          <span className="flex size-11 shrink-0 items-end justify-center overflow-hidden rounded-xl bg-sage/45 ring-1 ring-soil/8">
            <PlantIllustration
              stage={PLANT_STAGE_INDEX[fund.stage] as IllustrationStage}
              className="w-8"
            />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14.5px] font-medium leading-tight tracking-tight text-forest">
              {fund.name}
            </span>
            {/* meta: prioritas (titik berwarna + label) · konteks uang (paket 47) —
                konteks tetap terbaca supaya jelas celengan ini milik Pribadi,
                Keluarga, atau Bersama di halaman mana pun */}
            <span className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium text-forest/45">
              <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', priority.dot)} />
              {priority.label}
              <span aria-hidden className="text-forest/20">
                ·
              </span>
              {CONTEXT_LABEL[fund.scope]}
            </span>
          </span>

          {/* persen — pil mint: angka besar kedua di kartu, jadi ia bisa dipindai
              tanpa membaca baris nominal (paket 82) */}
          <span className="shrink-0 rounded-full bg-mint/25 px-2.5 py-1 text-[12.5px] font-semibold tabular-nums text-forest">
            {percentLabel}
          </span>
        </div>

        {/* baris 2 — nominal terkumpul / target */}
        <div className="mt-3 flex items-end justify-between gap-3">
          <p className="text-[19px] font-semibold leading-none tracking-tight text-forest tabular-nums">
            {maskNominal(fund.current, masked)}
          </p>
          <p className="shrink-0 text-[11.5px] font-medium text-forest/45 tabular-nums">
            / {maskNominal(fund.target, masked)}
          </p>
        </div>

        {/* baris 3 — BAR PROGRES TIPIS (paket 78 · owner override, lihat catatan
            di atas kartu ini): mendampingi tanaman & persentase, bukan
            menggantikannya. Bar-nya `aria-hidden` karena angka progresnya SUDAH
            diumumkan oleh `aria-label` tombol badan kartu di atas (persen +
            nominal) — satu sumber pengumuman, tidak dobel di pembaca layar. */}
        <div
          aria-hidden
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-soil/[0.07]"
        >
          <div
            className="h-full rounded-full bg-mint transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>

        {/* baris 4 — mikro: setoran bulanan (kalau belum penuh) + tanggal deadline,
            satu baris dua fakta, tanpa kalimat */}
        <div className="mt-2 flex items-center justify-between gap-2 text-[10.5px] text-forest/45">
          <span className="truncate tabular-nums">
            {reached ? (
              /* target penuh → `monthlyNeeded()` = 0, jadi jangan pernah tulis
                 "Rp 0/bulan"; label tahap kanon (`PLANT_STAGES.bloom`) yang tampil */
              <span className="font-medium text-forest/60">{PLANT_STAGES.bloom.label}</span>
            ) : (
              SINKING_FUND_CARD_COPY.perMonth(maskNominal(perMonth, masked))
            )}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 tabular-nums">
            <CalendarDays className="size-3" strokeWidth={2.2} aria-hidden />
            {formatDeadline(fund.deadline)}
          </span>
        </div>
      </button>

      {/* footer — pintasan setor tanpa harus masuk detail */}
      <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-soil/12 pt-3">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-forest/35 transition-colors group-hover/card:text-forest/55">
          {SINKING_FUND_CARD_COPY.detail}
          <ChevronRight className="size-3" strokeWidth={2.4} />
        </span>
        <span className="flex items-center gap-1.5">
          {/* hapus (paket 60.2) — ikon dengan nama yang menyebut celengannya */}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(fund)}
              aria-label={FUND_CARD_ACTION_COPY.delete(fund.name)}
              title={FUND_CARD_ACTION_COPY.deleteLabel}
              className="flex size-8 items-center justify-center rounded-full text-forest/30 transition-colors hover:bg-plum/12 hover:text-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25 active:scale-95"
            >
              <Trash2 className="size-3.5" strokeWidth={2.4} aria-hidden />
            </button>
          )}
          <button
            type="button"
            onClick={() => onContribute(fund)}
            className="inline-flex items-center gap-1.5 rounded-full bg-forest px-3.5 py-2 text-[12px] font-medium text-mint transition-colors hover:bg-forest-soft active:scale-95"
          >
            <Plus className="size-3.5" strokeWidth={3} />
            {SINKING_FUND_CARD_COPY.contribute}
          </button>
        </span>
      </div>
    </article>
  )
}
