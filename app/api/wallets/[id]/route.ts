import { NextRequest, NextResponse } from 'next/server'
import { INITIAL_WALLETS, type Wallet } from '@/lib/wallets'

/**
 * GET /api/wallets/:id
 * PUT /api/wallets/:id
 * DELETE /api/wallets/:id
 *
 * TODO: migrasi ke Supabase. Saat ini mock in-memory (INITIAL_WALLETS).
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const wallet = INITIAL_WALLETS.find((w) => w.id === id)
  if (!wallet) {
    return NextResponse.json({ error: 'Wallet tidak ditemukan' }, { status: 404 })
  }
  return NextResponse.json(wallet)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()
  const idx = INITIAL_WALLETS.findIndex((w) => w.id === id)
  if (idx < 0) {
    return NextResponse.json({ error: 'Wallet tidak ditemukan' }, { status: 404 })
  }

  const updated: Wallet = { ...INITIAL_WALLETS[idx], ...body, id }
  INITIAL_WALLETS.splice(idx, 1, updated)
  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const idx = INITIAL_WALLETS.findIndex((w) => w.id === id)
  if (idx < 0) {
    return NextResponse.json({ error: 'Wallet tidak ditemukan' }, { status: 404 })
  }

  const deleted = INITIAL_WALLETS.splice(idx, 1)[0]
  return NextResponse.json({ ok: true, deleted })
}
