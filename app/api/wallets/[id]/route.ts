import { NextRequest, NextResponse } from 'next/server'
import type { Wallet } from '@/lib/wallets'
import { requireUser } from '@/lib/session'
import { findWallet, removeWallet, replaceWallet } from '../store'

/**
 * GET /api/wallets/:id
 * PUT /api/wallets/:id
 * DELETE /api/wallets/:id
 *
 * 🔐 Paket 39 — dua lapis otorisasi, dan keduanya wajib:
 *   1. `requireUser()` → tanpa sesi: `401`;
 *   2. semua operasi memakai `userId` dari sesi sebagai kunci store, sehingga
 *      dompet yang bukan milik pemanggil TIDAK PERNAH ketemu → `404`.
 *
 * Kenapa sengaja `404` (bukan `403`) untuk id milik orang lain: `403` mengakui
 * "baris ini ada, cuma bukan punyamu" — itu sudah membocorkan keberadaan data
 * user lain. `404` tidak memberi tahu apa pun.
 *
 * 🚧 Produksi: `UPDATE/DELETE … WHERE id = $1 AND user_id = auth.uid()`.
 * Yang berubah cuma isi `store.ts`.
 */

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response

  const { id } = await params
  const wallet = await findWallet(auth.user.id, id, auth.token)
  if (!wallet) {
    return NextResponse.json({ error: 'Wallet tidak ditemukan' }, { status: 404 })
  }
  return NextResponse.json(wallet)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response

  const { id } = await params

  let body: Partial<Wallet>
  try {
    body = (await req.json()) as Partial<Wallet>
  } catch {
    return NextResponse.json({ error: 'Body request bukan JSON yang sah' }, { status: 400 })
  }

  const updated = await replaceWallet(auth.user.id, id, body, auth.token)
  if (!updated) {
    return NextResponse.json({ error: 'Wallet tidak ditemukan' }, { status: 404 })
  }
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireUser(req)
  if (!auth.ok) return auth.response

  const { id } = await params
  const deleted = await removeWallet(auth.user.id, id, auth.token)
  if (!deleted) {
    return NextResponse.json({ error: 'Wallet tidak ditemukan' }, { status: 404 })
  }
  return NextResponse.json({ ok: true, deleted })
}

