'use client'

import { useState, type ReactNode } from 'react'
import { Drawer } from 'vaul'
import { Delete, Check, Utensils, Bus, Receipt, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const categories: { label: string; icon: LucideIcon }[] = [
  { label: 'Food', icon: Utensils },
  { label: 'Transport', icon: Bus },
  { label: 'Bills', icon: Receipt },
]

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del']

export function AddTransactionDrawer({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('50000')
  const [category, setCategory] = useState('Food')

  const formatted = Number(amount || '0').toLocaleString('id-ID')

  function press(key: string) {
    if (key === 'del') {
      setAmount((prev) => prev.slice(0, -1) || '0')
      return
    }
    setAmount((prev) => {
      const next = prev === '0' ? key.replace(/^0+/, '') || '0' : prev + key
      return next.slice(0, 12)
    })
  }

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92vh] max-w-md flex-col rounded-t-3xl bg-white shadow-2xl outline-none">
          <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-slate-200" />

          <div className="flex flex-col px-6 pt-4 pb-8">
            <Drawer.Title className="text-center text-base font-bold tracking-tight text-slate-900">
              Tambah Transaksi
            </Drawer.Title>
            <Drawer.Description className="sr-only">
              Masukkan jumlah dan pilih kategori transaksi
            </Drawer.Description>

            <div className="mt-6 text-center">
              <span className="align-top text-2xl font-semibold text-slate-400">
                Rp
              </span>
              <span className="text-5xl font-black tracking-tighter text-slate-900">
                {' '}
                {formatted}
              </span>
            </div>

            <div className="mt-6 flex justify-center gap-2">
              {categories.map((cat) => {
                const active = cat.label === category
                return (
                  <button
                    key={cat.label}
                    onClick={() => setCategory(cat.label)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-[#fff100] text-black'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                    )}
                  >
                    <cat.icon className="size-4" />
                    {cat.label}
                  </button>
                )
              })}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              {keys.map((key) => (
                <button
                  key={key}
                  onClick={() => press(key)}
                  className="flex h-14 items-center justify-center rounded-2xl text-xl font-semibold text-slate-900 transition-colors hover:bg-slate-100 active:bg-slate-200"
                  aria-label={key === 'del' ? 'Hapus' : key}
                >
                  {key === 'del' ? (
                    <Delete className="size-5 text-slate-500" />
                  ) : (
                    key
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-black text-base font-bold text-[#fff100] transition-transform active:translate-y-px"
            >
              <Check className="size-5" />
              Simpan Transaksi
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
