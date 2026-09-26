'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSubscriptionGate } from '@/components/catetind/subscription-gate-provider'
import {
  RENEWAL_STATE,
  readRenewalMarker,
  shouldShowRenewalModal,
  writeRenewalMarker,
  type RenewalState,
} from '@/lib/data/renewal'

/**
 * Trigger pengingat perpanjangan untuk Home (inventaris #m · PRD 4503–4532).
 *
 * Dipisah dari komponennya karena tiga hal di sini harus benar sekaligus:
 *   1. modal hanya boleh MUNCUL SENDIRI di H-1 — di H-7/H-3 cukup banner;
 *   2. "muncul 1x" dihitung per SIKLUS masa aktif (`renewalStorageKey`), bukan
 *      per hari dan bukan per sesi — jadi user tidak pernah di-nag;
 *   3. banner Renewal tetap jadi pintu masuk manual (`openModal`), sehingga
 *      modalnya bisa ditinjau ulang kapan saja tanpa menghapus localStorage.
 *
 * Semua penanda dibaca SETELAH mount (efek), jadi HTML server & client identik —
 * pola yang sama dengan `daily-nudge.tsx` dan `bill-notif-nudge.tsx`.
 */
export function useRenewalReminder(state: RenewalState = RENEWAL_STATE) {
  const [open, setOpen] = useState(false)
  /** true = masa aktif siklus ini sudah diperpanjang (banner ikut berhenti) */
  const [renewed, setRenewed] = useState(false)
  /* Gerbang global (task 23) menang atas pengingat: begitu masa aktif HABIS,
     pengingat H-7/H-3/H-1 kehilangan makna — yang berlaku banner gerbang di atas
     halaman. Tanpa penjagaan ini, Home bisa menulis "tersisa 1 hari lagi" tepat
     di bawah banner "masa aktifmu sudah habis" — dua pesan yang saling
     bertabrakan di satu layar. */
  const { phase } = useSubscriptionGate()
  const gateActive = phase === 'active'

  useEffect(() => {
    const marker = readRenewalMarker(state.expiryLabel)
    setRenewed(marker.renewed)

    if (!gateActive) {
      setOpen(false)
      return
    }

    if (shouldShowRenewalModal(state, marker.shown ? state.expiryLabel : null)) {
      setOpen(true)
    }
  }, [state, gateActive])

  /** pintu masuk manual: CTA di banner Renewal pada Home */
  const openModal = useCallback(() => setOpen(true), [])

  /** "Nanti aja" / tombol tutup — tandai siklus, tanpa nagging & tanpa dialog kedua */
  const dismiss = useCallback(() => {
    writeRenewalMarker(state.expiryLabel, { shown: true })
    setOpen(false)
  }, [state.expiryLabel])

  /**
   * Perpanjangan berhasil (mock). Modal TIDAK ditutup dari sini: user harus
   * sempat membaca konfirmasi "masa aktifmu lanjut", baru menutupnya sendiri.
   */
  const markRenewed = useCallback(() => {
    writeRenewalMarker(state.expiryLabel, { shown: true, renewed: true })
    setRenewed(true)
  }, [state.expiryLabel])

  return { state, open, renewed: renewed || !gateActive, openModal, dismiss, markRenewed }
}
