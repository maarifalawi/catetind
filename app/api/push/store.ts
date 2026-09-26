import type { PushSubscription } from 'web-push'

/**
 * Store DEMO-GRADE: Map in-memory per endpoint.
 * Di dev `next dev` single process — subscription hilang saat server restart.
 * Produksi (Fase 4 PRD): pindah ke tabel `push_subscriptions` di Supabase + deskripsi user.
 */
const g = globalThis as unknown as { pushSubs?: Map<string, PushSubscription> }

export const pushSubs = (g.pushSubs ??= new Map<string, PushSubscription>())
