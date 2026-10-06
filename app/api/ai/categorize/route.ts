import { NextRequest, NextResponse } from 'next/server'
import { aiCallerId } from '@/lib/ai/caller'
import { aiConfigured, generateJSON, textModel } from '@/lib/ai/provider'
import { CATEGORIZE_SYSTEM_PROMPT } from '@/lib/ai/prompts'
import { allowAiCall } from '@/lib/ai/rate-limit'
import { TRANSACTION_CATEGORY_OPTIONS, TRANSACTION_FALLBACK_CATEGORY } from '@/lib/data/history'
import { parseSpokenTransaction } from '@/lib/transaction-ai'

/* ── POST /api/ai/categorize — saran kategori (Domain 4B) ────────────────────
   Body: `{ name: string, amount?: number }` → `{ ok:true, category, source }`.

   Resolusi konflik PRD 2791: kategorisasi punya FALLBACK rule-based (keyword),
   karena kalau provider down, user tetap harus bisa menyimpan catatan. Karena
   itu endpoint ini SELALU mengembalikan kategori yang sah: dari model kalau
   berhasil, dari aturan lokal kalau tidak (`source:'rule'`). Tidak pernah
   menggagalkan penyimpanan hanya karena provider sedang istirahat. */

export const dynamic = 'force-dynamic'

interface CategorizeRaw {
  category?: unknown
}

/** fallback rule-based: pakai parser ucapan yang sudah ada (nominal & keyword) */
function ruleCategory(name: string, amount: number): string {
  const parsed = parseSpokenTransaction(`${name} ${Number.isFinite(amount) ? amount : ''}`)
  return parsed.category || TRANSACTION_FALLBACK_CATEGORY
}

export async function POST(req: NextRequest) {
  const callerId = aiCallerId(req)

  if (!allowAiCall(callerId)) {
    return NextResponse.json(
      { ok: false, reason: 'rate-limit', error: 'Kebanyakan permintaan sekaligus — tunggu sebentar ya 🌿' },
      { status: 429 },
    )
  }

  let body: { name?: unknown; amount?: unknown }
  try {
    body = (await req.json()) as { name?: unknown; amount?: unknown }
  } catch {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Body permintaan harus JSON.' },
      { status: 400 },
    )
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const amount = Math.round(Number(body.amount))
  if (!name) {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Nama catatan kosong.' },
      { status: 422 },
    )
  }

  /* provider mati / tanpa kunci → jangan gagalkan; langsung jawab aturan lokal */
  if (aiConfigured()) {
    const result = await generateJSON<CategorizeRaw>({
      system: CATEGORIZE_SYSTEM_PROMPT,
      turns: [{ role: 'user', text: `Catatan: "${name}"${Number.isFinite(amount) ? ` (Rp${amount})` : ''}` }],
      maxOutputTokens: 80,
    })
    const category = result.ok && typeof result.value.category === 'string' ? result.value.category.trim() : ''
    if ((TRANSACTION_CATEGORY_OPTIONS as readonly string[]).includes(category)) {
      return NextResponse.json({ ok: true, category, source: 'model', model: textModel() })
    }
  }

  return NextResponse.json({ ok: true, category: ruleCategory(name, amount), source: 'rule' })
}
