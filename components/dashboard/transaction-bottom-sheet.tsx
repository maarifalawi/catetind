'use client'

import { useState, type ReactNode } from 'react'
import { Drawer } from 'vaul'
import {
  TransactionInputEngine,
  type TransactionTypeId,
} from './transaction-input-engine'
import { useMoneyContext } from '@/components/catetind/money-context-provider'
import { usePrivacy } from '@/components/catetind/privacy-provider'
import { defaultWalletNameFor } from '@/lib/money/store'
import { useTransactionSubmit } from '@/hooks/use-transaction-submit'

/**
 * Shell MOBILE dari Transaction Input Engine (inventaris 97a/b/c).
 *
 * FAB (+) di bottom nav membuka Vaul bottom sheet yang isinya LANGSUNG engine
 * manual — siap mengetik tanpa menu perantara. Tombol OCR & Voice ada di dalam
 * engine sebagai quick-action sekunder.
 *
 * Versi web-nya ada di `transaction-web-modal.tsx`; keduanya memakai engine yang
 * sama supaya perilaku mobile & web tidak pernah divergen.
 *
 * PAKET 33: shell ini yang MENYIMPAN hasilnya. Sebelumnya ia cuma menutup panel
 * (`onSubmitted={() => setOpen(false)}`), jadi semua pintu yang memakai sheet ini
 * — FAB, "+ Catat Transaksi" di Home, tombol di dompet, CTA Dry Spell di /budget
 * — menghasilkan catatan yang tidak ada di mana pun. Sekarang urutannya:
 * tulis (`useTransactionSubmit`) → tutup → toast.
 */
export function TransactionBottomSheet({
  trigger,
  defaultType = 'expense',
}: {
  trigger: ReactNode
  /** tipe terpilih saat sheet dibuka — dipakai tombol cepat di kartu dompet */
  defaultType?: TransactionTypeId
}) {
  const [open, setOpen] = useState(false)
  /* dompet default ikut konteks uang aktif (Pribadi/Keluarga/Bersama) — sumber
     yang sama dengan penyaring dompet & budget di halaman lain */
  const { context } = useMoneyContext()
  /* Toast sukses menampilkan nominal transaksi — jadi ia WAJIB ikut sensor tombol
     mata (paket 31). `hooks/` sengaja tidak mengimpor provider dari `components/`,
     jadi statusnya dioper dari sini. */
  const { masked } = usePrivacy()
  const submit = useTransactionSubmit(defaultWalletNameFor(context), masked)

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} autoFocus={false}>
      <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>

      <Drawer.Portal>
        {/* overlay disamakan dengan shell WEB (transaction-web-modal.tsx):
            digelapkan TANPA `backdrop-blur`. Blur layar penuh memaksa browser
            menghitung ulang blur tiap frame selama animasi buka/tutup, padahal
            konten dashboard di belakangnya repaint terus (komet CashFlowCard,
            ayunan tanaman, titik `animate-ping`) — itu yang bikin sheet
            "patah-patah". Fokus user dijaga lewat kegelapan saja. */}
        <Drawer.Overlay
          data-catetind-overlay="true"
          className="fixed inset-0 z-[70] bg-ink/60"
        />

        <Drawer.Content
          data-catetind-sheet="true"
          aria-label="Catat transaksi"
          className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex max-h-[94dvh] w-full max-w-md flex-col rounded-t-[2rem] bg-[#ffffff] shadow-[0_-24px_60px_-24px_rgba(69,89,78,0.55)] outline-none"
        >
          {/* drag handle khas Vaul — nuansa warm white */}
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-ink/10" />

          <Drawer.Title className="sr-only">Catat transaksi</Drawer.Title>
          <Drawer.Description className="sr-only">
            Pilih tipe transaksi, masukkan nominal, lalu tekan Catat. Tersedia
            juga tombol scan struk dan input suara.
          </Drawer.Description>

          <div
            data-lenis-prevent
            className="overflow-y-auto px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            {/* Radix melepas isi Content setelah animasi tutup selesai, jadi
                state form otomatis fresh; prop `active` tetap dikirim sebagai
                jaring pengaman kalau shell berubah perilaku di masa depan */}
            <TransactionInputEngine
              active={open}
              layout="sheet"
              defaultType={defaultType}
              onSubmitted={(draft) => submit(draft, () => setOpen(false))}
            />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}


