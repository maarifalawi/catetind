import { NextRequest, NextResponse } from 'next/server'
import type { Wallet } from '@/lib/wallets'
import type { MoneyContext } from '@/lib/types'
import { requireUser } from '@/lib/session'
import { insertWallet, walletsOf } from './store'

/**
 * GET /api/wallets?context=pribadi
 * - tanpa query context → kembalikan semua dompet MILIK PEMANGGIL
 * - dengan context → filter by MoneyContext (PRD Domain 2C.2)
 *
 * 🔐 Otorisasi (paket 39): baris pertama setiap handler adalah `requireUser()`.
 * Tanpa cookie sesi → `401 { error }`. Daftarnya diambil dari store per-user
 * (`app/api/wallets/store.ts`), jadi response-nya mustahil berisi dompet orang
 * lain — bukan karena filter di sini, tapi karena `walletsOf(userId)` memang
 * hanya punya baris milik user itu.
 *
 * 🚧 Produksi: `SELECT * FROM wallets WHERE user_id = auth.uid()` (RLS aktif).
 * Yang berubah cuma isi `store.ts`.
 */
export async function GET(req: NextRequest) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response

  const wallets = await walletsOf(auth.user.id, auth.token)
  const ctx = req.nextUrl.searchParams.get('context')
  if (ctx) {
    return NextResponse.json(wallets.filter((wallet) => wallet.context === ctx))
  }
  return NextResponse.json(wallets)
}


/**
 * POST /api/wallets
 * Body: { name, holder, number, network, balance, kind, context, ... }
 *
 * Yang SUDAH diperbaiki di Stage 1 dan tetap berlaku: id unik (dulu semua dompet
 * baru memakai id literal yang sama) + validasi saldo.
 * Yang BARU di paket 39: `holder` TIDAK lagi bisa diisi nama orang lain dari
 * body request — selalu nama pemilik sesi, karena dompet ini miliknya.
 */
export async function POST(req: NextRequest) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response

  try {
    const body = await req.json()
    const balance = Number(body.balance ?? 0)
    const wallet: Wallet = {
      id: `${body.kind ?? 'cash'}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      name: String(body.name ?? 'Tanpa Nama').trim() || 'Tanpa Nama',
      /* kepemilikan tidak bisa dikarang klien */
      holder: auth.user.name,
      number: body.number ?? '',
      network: body.network ?? '',
      /* saldo negatif tidak punya arti di dompet kas — dijepit, bukan disimpan apa adanya */
      balance: Number.isFinite(balance) ? Math.max(0, Math.round(balance)) : 0,
      bandClass: body.bandClass ?? 'from-sage via-cream to-sage',
      faceClass: body.faceClass ?? 'from-[#91bb9e] via-[#45594e] to-[#161c19]',
      glowClass: body.glowClass,
      art: body.art ?? 'kawung',
      kind: body.kind ?? 'cash',
      context: (body.context ?? 'pribadi') as MoneyContext,
    }
    return NextResponse.json(await insertWallet(auth.user.id, wallet, auth.token), { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Bad Request' },
      { status: 400 },
    )
  }
}

