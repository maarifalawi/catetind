import { NextRequest, NextResponse } from 'next/server'
import { INITIAL_WALLETS, type Wallet } from '@/lib/wallets'
import type { MoneyContext } from '@/lib/types'

/**
 * GET /api/wallets?context=pribadi
 * - tanpa query context → kembalikan semua dompet
 * - dengan context → filter by MoneyContext (PRD Domain 2C.2)
 *
 * TODO: migrasi ke Supabase tabel `wallets` + RLS per user.
 *       Saat ini pakai mock data dari INITIAL_WALLETS.
 */
export async function GET(req: NextRequest) {
  const ctx = req.nextUrl.searchParams.get('context')
  if (ctx) {
    const wallets = INITIAL_WALLETS.filter((w) => w.context === ctx)
    return NextResponse.json(wallets)
  }
  return NextResponse.json(INITIAL_WALLETS)
}

/**
 * POST /api/wallets
 * Body: { name, holder, number, network, balance, kind, context, ... }
 * TODO: migrasi ke Supabase insert + return inserted row.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const wallet: Wallet = {
      id: `\${body.kind ?? 'cash'}-\${Date.now()}`,
      name: body.name ?? 'Tanpa Nama',
      holder: body.holder ?? 'Jon Snow',
      number: body.number ?? '',
      network: body.network ?? '',
      balance: body.balance ?? 0,
      bandClass: body.bandClass ?? 'from-sage via-cream to-sage',
      faceClass: body.faceClass ?? 'from-[#91bb9e] via-[#45594e] to-[#161c19]',
      glowClass: body.glowClass,
      art: body.art ?? 'kawung',
      kind: body.kind ?? 'cash',
      context: (body.context ?? 'pribadi') as MoneyContext,
    }
    // Demo: push to INITIAL_WALLETS (in-memory)
    ;(INITIAL_WALLETS as Wallet[]).push(wallet)
    return NextResponse.json(wallet, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Bad Request' },
      { status: 400 },
    )
  }
}
