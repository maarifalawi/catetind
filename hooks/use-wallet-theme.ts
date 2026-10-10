'use client'

import { useMemo, useSyncExternalStore } from 'react'
import type { WalletArt } from '@/lib/wallets'
import {
  WALLET_THEME_STORAGE_KEY,
  applyWalletTheme,
  parseWalletThemePrefs,
  serializeWalletThemePrefs,
  withWalletTheme,
  type WalletThemePrefs,
} from '@/lib/data/wallet-themes'

/* ── PREFERENSI TEMA KARTU DI PERANGKAT (paket 77) ───────────────────────────
   Kenapa ada store kecil di sini padahal tema kartu hanya "tampilan":
   pilihan tema HARUS hidup di luar komponen. Kalau ia jadi state lokal, kartu
   yang sama akan tampil beda di /wallet dan di /wallet/[id] — persis pelanggaran
   yang dicegah `wallet-card-face.tsx` (satu sumber visual). Jadi peta
   `walletId → themeId` disimpan di `localStorage` dan dibaca lewat SATU hook
   yang dipakai muka kartu di mana pun ia muncul.

   Kenapa `useSyncExternalStore` (pola yang sama dengan `lib/money/store.ts`):
   ia punya `getServerSnapshot`. Render server & render pertama client memakai
   peta KOSONG (tema bawaan) sehingga tidak ada hydration mismatch, lalu begitu
   mount ia berpindah ke peta hidup dari localStorage. Alternatifnya (membaca
   localStorage saat render) menghasilkan markup server ≠ client.

   Kunci penyimpanannya SATU — `WALLET_THEME_STORAGE_KEY` di lapis data — supaya
   tidak ada dua nama key yang bisa berbeda (pola yang sama dengan
   `PRIVACY_MASKED_KEY` / `CATEGORY_PREFS_STORAGE_KEY`).
   ────────────────────────────────────────────────────────────────────────── */

/** peta kosong dibagi bersama: harus STABIL (identitas sama) atau React berputar */
const EMPTY_PREFS: WalletThemePrefs = Object.freeze({})

let prefs: WalletThemePrefs = EMPTY_PREFS
let loaded = false
const listeners = new Set<() => void>()

/** baca localStorage SEKALI (mode privat / storage diblokir → tetap peta kosong) */
function loadPrefs(): void {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try {
    prefs = parseWalletThemePrefs(window.localStorage.getItem(WALLET_THEME_STORAGE_KEY))
  } catch {
    prefs = EMPTY_PREFS
  }
}

/** tab lain mengubah preferensi → ikut berubah tanpa reload (satu listener saja) */
function onStorage(event: StorageEvent): void {
  if (event.key !== null && event.key !== WALLET_THEME_STORAGE_KEY) return
  loaded = false
  loadPrefs()
  for (const listener of listeners) listener()
}

function subscribeWalletThemes(listener: () => void): () => void {
  loadPrefs()
  if (listeners.size === 0 && typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage)
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage)
    }
  }
}

/** snapshot hidup (client) */
export function getWalletThemePrefs(): WalletThemePrefs {
  loadPrefs()
  return prefs
}

/** snapshot server / render pertama: selalu "belum ada tema kustom" */
function getServerWalletThemePrefs(): WalletThemePrefs {
  return EMPTY_PREFS
}

/** peta tema per dompet untuk komponen (reaktif). */
export function useWalletThemePrefs(): WalletThemePrefs {
  return useSyncExternalStore(subscribeWalletThemes, getWalletThemePrefs, getServerWalletThemePrefs)
}

/**
 * Simpan tema satu dompet. `themeId` `null` = kembali ke kartu bawaan.
 *
 * Preferensi ini murni TAMPILAN: ia tidak menyentuh store uang, ledger, maupun
 * saldo (tema kartu bukan uang). Karena itu jalurnya pun terpisah dari
 * `addWalletAccount()` — pemanggil menulis temanya setelah store selesai
 * membuat dompetnya (id sudah pasti saat itu).
 */
export function setWalletTheme(walletId: string, themeId: string | null): void {
  if (!walletId) return
  loadPrefs()
  const next = withWalletTheme(prefs, walletId, themeId)
  if (next === prefs) return
  prefs = next
  try {
    window.localStorage.setItem(WALLET_THEME_STORAGE_KEY, serializeWalletThemePrefs(next))
  } catch {
    /* storage penuh / diblokir: pilihan tetap berlaku untuk sesi ini */
  }
  for (const listener of listeners) listener()
}

/**
 * Dompet yang SUDAH memakai temanya — dipakai `WalletFace` supaya /wallet,
 * /wallet/[id], dan pratinjau Tambah Dompet mustahil berbeda tampilan.
 * Nama & tanda tangannya sengaja mempertahankan bentuk yang dioper pemanggil.
 */
export function useThemedWallet<T extends { id: string; face: string; color: string; art: WalletArt }>(
  wallet: T,
): T {
  const themePrefs = useWalletThemePrefs()
  return useMemo(() => applyWalletTheme(wallet, themePrefs[wallet.id]), [wallet, themePrefs])
}
