import { NextRequest, NextResponse } from 'next/server'
import { aiCallerId } from '@/lib/ai/caller'
import { claimsRecordedAction, detectOutOfScope } from '@/lib/ai/coach-guard'
import {
  aiConfigured,
  generateJSON,
  generateText,
  textModel,
  type ChatTurn,
} from '@/lib/ai/provider'
import { COACH_REPLY_ENVELOPE_PROMPT, COACH_SYSTEM_PROMPT } from '@/lib/ai/prompts'
import { allowAiCall } from '@/lib/ai/rate-limit'

/* ── POST /api/ai/text — balasan AI Coach (Domain 4B) ────────────────────────
   Identitas pemanggil dibaca `aiCallerId()` (lihat `lib/ai/caller.ts`): sesi
   Supabase kalau ada, kalau tidak identitas anonim per-jaringan. Body:
   `{ messages: [{ role: 'user' | 'ai', content: string }] }` — bentuk yang sudah
   dipakai widget, jadi UI tidak perlu diubah.

   Balasan:
     { ok:true, reply, model, ruleBased:false, blocked:null }       → 200
     { ok:true, reply:'', model, ruleBased:false, blocked:'scope' } → 200 (tolakan)
     { ok:true, reply:'', …, blocked:'claim' }                      → 200 (klaim palsu)
     { ok:false, reason, error }                                    → 400/422/429/503

   `reason` dipakai UI untuk memutuskan fallback JUJUR (aturan lokal) saat provider
   tidak bisa dihubungi — bukan untuk mengarang balasan model.

   DUA PAGAR SEBELUM BALASAN KELUAR (paket 80) — akar temuan uji pakai: user
   mengetik "makn gacoan 30k", AI menjawab "sudah tercatat sebagai pengeluaranmu",
   padahal Riwayat kosong, dan pertanyaan di luar konteks dijawab sebagai asisten
   umum. Karena itu:
     · `blocked:'scope'` — pertanyaan di luar keuangan pribadi user (koding,
       politik, tugas sekolah, …). Dicek DUA kali: deterministik di sini (tanpa
       panggilan provider) dan oleh model lewat `COACH_REPLY_ENVELOPE_PROMPT`.
       Yang ditampilkan app adalah copy kanonnya sendiri, bukan kalimat model.
     · `blocked:'claim'` — balasan model mengklaim sudah menulis data
       (`claimsRecordedAction`), padahal model tidak punya kemampuan itu.
   Balasan yang TIDAK diblokir tetap dikirim apa adanya: `blocked:null`. */

export const dynamic = 'force-dynamic'

/** konteks percakapan maksimum yang dikirim ke model (Domain 4B: sliding window 10) */
const MAX_TURNS = 10

/**
 * Balasan yang TIDAK diteruskan apa adanya ke user (paket 80):
 * `'scope'` = pertanyaan di luar konteks keuangan pribadi, `'claim'` = balasan
 * model mengklaim sudah menulis data. UI menggantinya dengan copy kanon
 * (`AI_OUT_OF_SCOPE_REPLY` / `AI_NO_RECORD_REPLY` di `lib/ai-chat.ts`).
 */
type BlockedKind = 'scope' | 'claim'

interface IncomingMessage {
  role?: unknown
  content?: unknown
}

export async function POST(req: NextRequest) {
  const callerId = aiCallerId(req)

  if (!aiConfigured()) {
    return NextResponse.json(
      { ok: false, reason: 'no-key', error: 'AI belum tersambung di server ini.' },
      { status: 503 },
    )
  }

  if (!allowAiCall(callerId)) {
    return NextResponse.json(
      { ok: false, reason: 'rate-limit', error: 'Kebanyakan pesan sekaligus — tunggu sebentar ya 🌿' },
      { status: 429 },
    )
  }

  let body: { messages?: unknown; context?: unknown }
  try {
    body = (await req.json()) as { messages?: unknown; context?: unknown }
  } catch {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Body permintaan harus JSON.' },
      { status: 400 },
    )
  }

  /* ── GROUNDING DATA NYATA (paket 65 · Tugas D) ───────────────────────────────
     Klien mengirim ringkasan angka yang BENAR-BENAR ada di data user (pemasukan/
     pengeluaran bulan ini, kategori teratas, sisa jatah harian, dompet, hutang,
     celengan). Angka itu disisipkan ke prompt sistem supaya model TIDAK
     mengarang jatah/saldo — kalau ringkasannya kosong, model diberi tahu tegas
     bahwa ia tidak punya angka dan harus bilang belum tahu, bukan menebak. */
  const contextText =
    typeof body.context === 'string' ? body.context.trim().slice(0, 2000) : ''
  const system = contextText
    ? `${COACH_SYSTEM_PROMPT}

## DATA USER (HANYA ini yang boleh kamu sebut sebagai angka)
${contextText}

ATURAN ANGKA: Jangan pernah menyebut nominal saldo, jatah harian, atau kategori
yang TIDAK ada di daftar DATA USER di atas — kalau tidak ada, katakan belum
tersedia. Jangan mengaku sudah mencatat/menjalankan aksi apa pun.`
    : `${COACH_SYSTEM_PROMPT}

## DATA USER
(kosong — kamu TIDAK punya angka user saat ini) Jangan menyebut nominal saldo
atau jatah harian apa pun. Kalau user menanyakan angka, katakan datanya belum
terkirim dan arahkan ke ringkasan di app. Jangan mengaku sudah mencatat apa pun.`

  const raw = Array.isArray(body.messages) ? body.messages : []
  const turns: ChatTurn[] = raw
    .map((entry) => {
      const message = entry as IncomingMessage
      const content = typeof message.content === 'string' ? message.content.trim() : ''
      const role: ChatTurn['role'] = message.role === 'ai' || message.role === 'model' ? 'model' : 'user'
      return { role, text: content }
    })
    .filter((turn) => turn.text.length > 0)
    .slice(-MAX_TURNS)

  /* yang terakhir WAJIB pesan user — model tidak menjawab pesannya sendiri */
  if (turns.length === 0 || turns[turns.length - 1]?.role !== 'user') {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Tidak ada pesan user untuk dijawab.' },
      { status: 422 },
    )
  }

  /* ── PAGAR KONTEKS — DETERMINISTIK (paket 80) ────────────────────────────────
     Pertanyaan yang jelas bukan soal keuangan pribadi user ditolak SEBELUM model
     dipanggil: (a) penolakannya tidak bergantung pada suasana model, (b) kuota
     user tidak terbakar untuk pertanyaan yang memang tidak akan dijawab.
     Aturan yang sama dipakai widget (`detectOutOfScope` di hook chat), jadi
     perilakunya tidak bisa berbeda antara pagar klien & pagar server. */
  const lastUserText = turns[turns.length - 1]?.text ?? ''
  const blocked = (kind: BlockedKind) =>
    NextResponse.json({ ok: true, reply: '', model: textModel(), ruleBased: false, blocked: kind })

  if (detectOutOfScope(lastUserText)) return blocked('scope')

  /* ── BALASAN MODEL: minta envelope JSON supaya SKOP ditentukan model, tapi
     KEPUTUSAN tetap di app (`inScope:false` ⇒ copy tolakan milik app). Kalau
     envelope-nya tak terbaca, jaring aman di bawah memakai bentuk lama (teks
     bebas) supaya chat tidak pernah mati karena perubahan format. */
  const envelope = await generateJSON<{ inScope?: unknown; reply?: unknown }>({
    system: `${system}\n\n${COACH_REPLY_ENVELOPE_PROMPT}`,
    turns,
    maxOutputTokens: 900,
    temperature: 0.7,
  })

  if (envelope.ok) {
    if (envelope.value.inScope === false) return blocked('scope')
    const reply = typeof envelope.value.reply === 'string' ? envelope.value.reply.trim() : ''
    if (reply) {
      if (claimsRecordedAction(reply)) return blocked('claim')
      return NextResponse.json({
        ok: true,
        reply,
        model: textModel(),
        ruleBased: false,
        blocked: null,
      })
    }
    /* reply kosong tanpa alasan skop: bukan keadaan yang sah → jatuh ke jalur teks */
  }

  const result = await generateText({ system, turns, maxOutputTokens: 700 })
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.error.kind, error: result.error.message },
      { status: result.error.kind === 'rate-limit' ? 429 : 503 },
    )
  }

  /* pagar klaim juga berlaku di jalur jaring aman: model tidak pernah boleh
     mengaku sudah mencatat, apa pun bentuk balasannya */
  if (claimsRecordedAction(result.value)) return blocked('claim')

  return NextResponse.json({
    ok: true,
    reply: result.value,
    model: textModel(),
    ruleBased: false,
    blocked: null,
  })
}
