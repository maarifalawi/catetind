/* ── Milestone Celebration (inventaris #k · PRD Domain 3A/3B/3C) ─────────────
   Puncak loop kebiasaan: SATU momen untuk merasa dihargai, bukan dinilai.

   Kenapa file ini ada & kenapa isinya begini:
   - Reward-nya SENGAJA bukan poin/badge/leaderboard (PRD 1746–1752). Yang
     dirayakan cuma dua hal: tanaman yang tumbuh + satu kalimat personal.
   - Pesannya 100% TEMPLATE client-side yang diisi dari data lokal, jadi NOL
     panggilan API ke DeepSeek (PRD 2046–2049: ~95% apresiasi dari template,
     hanya 4–6 pesan/bulan yang benar-benar AI). Slot `{days}`/`{activeDays}`
     diisi dari state — bukan dari model.
   - Tidak ada satu pun copy yang menakut-nakuti soal streak (CONTEXT §5.3 no.1):
     kalimat seperti "streak-mu putus" DILARANG ada di file ini.
   - Perayaan hanya dipicu kondisi NYATA yang bisa dihitung dari data
     (`pendingMilestone()`), bukan pencapaian karangan.

   File ini SENGAJA tanpa impor: lapis data murni, tanpa React, tanpa DOM saat
   modul dievaluasi (kecuali helper haptic/storage yang selalu dijaga). Jadi
   `pendingMilestone()` bisa diuji hanya dengan state + daftar id yang dilihat.

   DI LUAR SCOPE task ini (disebut eksplisit oleh prompt #5): seluruh sistem
   HP/tanaman produksi (perhitungan HP harian, sleep mode, edge function 00:01
   WIB). Di sini cukup PERAYAAN-nya, memakai state mock yang jujur.
   ─────────────────────────────────────────────────────────────────────────── */

/** jenis perayaan yang dikenal sistem (inventaris #k) */
export type MilestoneKind = 'streak' | 'stage-up' | 'target-reached'

/** Tahap ilustrasi tanaman (1 Benih … 4 Berbunga). Didefinisikan ulang di sini
 *  dengan sengaja: file ini lapis DATA dan tidak boleh mengimpor komponen
 *  (`plant-illustration.tsx`). Nilainya identik, jadi hasilnya tetap assignable. */
export type MilestonePlantStage = 1 | 2 | 3 | 4

/** Hari ke-7/14/21/30 memicu celebration full-screen (PRD 1821 & 2088–2091) */
export const MILESTONE_DAYS = [7, 14, 21, 30] as const
export type MilestoneDay = (typeof MILESTONE_DAYS)[number]

/** "Naik tahap" baru layak dirayakan dari Tanaman Muda ke atas — hari-hari
 *  pertama itu masa menanam, terlalu cepat untuk disebut pencapaian. */
export const STAGE_UP_MIN_STAGE: MilestonePlantStage = 3

export interface Milestone {
  /** id stabil — dipakai sebagai penanda "sudah dirayakan" di localStorage */
  id: string
  kind: MilestoneKind
  title: string
  /** SATU kalimat personal; slot template sudah terisi (bukan dari API) */
  message: string
  /** tahap tanaman yang ditampilkan di overlay */
  plantStage: MilestonePlantStage
}

export interface MilestoneState {
  /** hari berturut-turut catat — di produk streak tidak pernah "reset ke 0",
   *  hanya pause (PRD 1778–1780); angka ini tidak pernah ditampilkan sebagai
   *  skor besar, cuma dipakai untuk memilih kalimat perayaan. */
  streakDays: number
  /** hari aktif catat bulan ini — bahan apresiasi, bukan bahan hukuman */
  activeDays: number
  plantStage: MilestonePlantStage
  /** true = setoran yang barusan dilakukan MELUNASI target celengan */
  targetAchieved?: boolean
}

/* ── STATE MOCK (pengganti `user_plant` di produksi) ─────────────────────────
   Di produksi angka-angka ini datang dari `user_plant` (PRD 3B): streak,
   active_days, dan stage yang direcompute server. Nilai di bawah dipilih supaya
   demo Home benar-benar memicu perayaan "hari ke-7" SEKALI — sesuai acceptance
   criteria — jadi bukan angka hiasan. */
export const MILESTONE_STATE: MilestoneState = {
  streakDays: 7,
  activeDays: 7,
  plantStage: 2,
}

/** State untuk perayaan "target tercapai" (dipakai halaman detail celengan
 *  SETELAH setoran benar-benar melunasi target — bukan saat halaman dibuka).
 *  Tanaman ditampilkan di tahap Berbunga karena targetnya sudah penuh. */
export const MILESTONE_TARGET_STATE: MilestoneState = {
  streakDays: 0,
  activeDays: 0,
  plantStage: 4,
  targetAchieved: true,
}

/* ── PESAN TEMPLATE (PRD 3C · "Template-Based, Zero API Cost") ───────────────
   Nada yang dipakai: seperti sahabat yang bangga — bukan guru yang menilai.
   Kata yang DILARANG (PRD 2124): "harus", "seharusnya", "jangan", "salah". */

export interface MilestoneCopy {
  /** judul default untuk jenis ini */
  title: string
  /** judul khusus streak: hari ke-7 beda rasanya dari hari ke-30 */
  titlesByDay?: Partial<Record<MilestoneDay, string>>
  /** beberapa variasi pesan — dipilih DETERMINISTIK dari `id` (lihat
   *  `pickMilestoneMessage`), bukan Math.random, supaya HTML server &
   *  render pertama client identik (tanpa hydration mismatch). */
  messages: readonly string[]
}

export const MILESTONE_MESSAGES: Record<MilestoneKind, MilestoneCopy> = {
  streak: {
    title: 'Konsisten terus!',
    titlesByDay: {
      7: 'Minggu pertama!',
      14: 'Dua minggu berturut-turut!',
      21: 'Tiga minggu!',
      30: 'Sebulan penuh!',
    },
    messages: [
      /* contoh kanon PRD 2062 — judul "Minggu pertama!" + kalimat ini */
      'Kamu udah catat {days} hari — tanamanmu mulai tumbuh 🌿',
      '{days} hari berturut-turut! Konsisten banget, dan itu yang bikin tanamanmu subur 🌿',
      'Udah {days} hari kamu jalan bareng. Kecil-kecilan tapi terus, ya 💚',
      '{days} hari terakhir nggak ada yang lewat begitu aja — semuanya kecatet 💚',
    ],
  },
  'stage-up': {
    title: 'Naik satu tahap!',
    messages: [
      'Tanamanmu naik tahap! Hasil dari {activeDays} hari catatanmu 🌿',
      'Tumbuh terus! {activeDays} hari kamu rawat, sekarang tanamannya lebih besar 🌿',
      'Satu tahap lagi dilewatin. {activeDays} hari yang kamu rawat, sekarang kelihatan hasilnya 🌿',
    ],
  },
  'target-reached': {
    title: 'Target tercapai! 🎉',
    messages: [
      'Celenganmu penuh! Ini hasil dari setoran kecil yang kamu lakukan terus 🎉',
      'Targetmu tercapai — nggak ada jackpot, cuma kamu yang konsisten setor 🎉',
      'Penuh! Dan yang bikin ini terjadi bukan keberuntungan, tapi kamu yang nggak berhenti 🌿',
    ],
  },
}

/** slot yang boleh muncul di template — isinya dari data lokal, bukan model */
export interface MilestoneSlots {
  days: number
  activeDays: number
}

/** Isi slot template. Sengaja cuma dua slot: data yang tidak ada tidak ditulis,
 *  jadi tidak ada pesan yang mengarang angka. */
export function fillMilestoneTemplate(template: string, slots: MilestoneSlots): string {
  return template.replace(/\{(days|activeDays)\}/g, (_match, key: 'days' | 'activeDays') =>
    String(slots[key]),
  )
}

/**
 * Pilih variasi pesan secara DETERMINISTIK dari id: id yang sama selalu dapat
 * kalimat yang sama (aman untuk hydration & untuk "tidak muncul dua kali"),
 * sementara milestone berbeda tidak selalu berbunyi identik — bagian dari
 * variable reward (PRD 1823), bukan janji keacakan di runtime.
 */
export function pickMilestoneMessage(messages: readonly string[], seed: string): string {
  if (messages.length === 0) return ''
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1_000_003
  }
  return messages[hash % messages.length]
}

/** hari milestone TERTINGGI yang sudah dilewati; `null` kalau belum sampai 7 */
export function highestMilestoneDay(streakDays: number): MilestoneDay | null {
  let found: MilestoneDay | null = null
  for (const day of MILESTONE_DAYS) if (streakDays >= day) found = day
  return found
}

/** susun satu milestone dari template + state (pengisian slot ikut di sini) */
function buildMilestone(
  kind: MilestoneKind,
  id: string,
  state: MilestoneState,
  day?: MilestoneDay,
): Milestone {
  const copy = MILESTONE_MESSAGES[kind]
  return {
    id,
    kind,
    title: (day !== undefined ? copy.titlesByDay?.[day] : undefined) ?? copy.title,
    message: fillMilestoneTemplate(pickMilestoneMessage(copy.messages, id), {
      days: day ?? state.streakDays,
      activeDays: state.activeDays,
    }),
    plantStage: state.plantStage,
  }
}

/**
 * Semua perayaan yang LAYAK untuk state ini, urut prioritas:
 *   1. target celengan tercapai (momen paling besar — PRD 2095),
 *   2. naik tahap tanaman (PRD 2089),
 *   3. streak 7/14/21/30 — hari TERTINGGI yang sudah dilewati, bukan yang pertama
 *      (streak 21 yang belum pernah dirayakan tidak perlu mampir ke hari ke-7).
 */
export function eligibleMilestones(state: MilestoneState): Milestone[] {
  const list: Milestone[] = []

  if (state.targetAchieved) list.push(buildMilestone('target-reached', 'target-reached', state))

  if (state.plantStage >= STAGE_UP_MIN_STAGE) {
    /* id membawa tahapnya: naik lagi ke tahap berikutnya tetap boleh dirayakan */
    list.push(buildMilestone('stage-up', `stage-up-${state.plantStage}`, state))
  }

  const day = highestMilestoneDay(state.streakDays)
  if (day !== null) list.push(buildMilestone('streak', `streak-${day}`, state, day))

  return list
}

/**
 * Perayaan "terbaik" untuk state ini, MENGABAIKAN penanda sudah-dilihat.
 * Dipakai pintu "Lihat perayaan" di Plant Detail (meninjau ulang momen).
 */
export function bestMilestone(state: MilestoneState): Milestone | null {
  return eligibleMilestones(state)[0] ?? null
}

/**
 * Perayaan berikutnya yang MASIH layak ditampilkan, atau `null` kalau semua yang
 * layak sudah pernah dirayakan. Murni: hasilnya cuma bergantung pada `state` dan
 * `seenIds` — tidak menyentuh localStorage/DOM, jadi gampang diuji.
 */
export function pendingMilestone(
  state: MilestoneState,
  seenIds: readonly string[],
): Milestone | null {
  const seen = new Set(seenIds)
  return eligibleMilestones(state).find((milestone) => !seen.has(milestone.id)) ?? null
}

/* ── PENANDA "SUDAH DIRAYAKAN" — perayaan yang sama tidak muncul dua kali ──── */

export function milestoneStorageKey(): string {
  return 'catet-ind-milestone:seen'
}

/**
 * Daftar id yang sudah dirayakan. Aman untuk SSR (mengembalikan `[]`), jadi
 * pemanggil tidak perlu menduplikasi cek `typeof window`.
 */
export function readSeenMilestones(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(milestoneStorageKey())
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    /* localStorage diblokir (mode privat) atau isinya rusak — anggap belum pernah */
    return []
  }
}

/** Tandai satu perayaan sudah dilihat; mengembalikan daftar terbaru. */
export function writeSeenMilestone(id: string): string[] {
  const next = Array.from(new Set([...readSeenMilestones(), id]))
  try {
    window.localStorage.setItem(milestoneStorageKey(), JSON.stringify(next))
  } catch {
    /* storage diblokir — perayaan tetap ditandai untuk sesi ini lewat state
       React, cuma tidak "ingat" antar reload */
  }
  return next
}

/* ── HAPTIC — pola kanon PRD 563 + graceful degradation PRD 566 ───────────── */

export const HAPTIC_PATTERN = [30, 50, 30] as const

/**
 * `navigator.vibrate` TIDAK ada di iOS Safari PWA (PRD 566). Karena itu haptic
 * selalu lewat dua pagar: cek dukungan dulu, lalu bungkus `try` — getaran itu
 * bonus, bukan syarat, dan tidak boleh sampai bikin overlay error.
 */
export function canVibrate(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'vibrate' in navigator &&
    typeof navigator.vibrate === 'function'
  )
}

/** Jalankan pola haptic; `false` = perangkat tidak mendukung / diblokir. */
export function triggerMilestoneHaptic(pattern: readonly number[] = HAPTIC_PATTERN): boolean {
  if (!canVibrate()) return false
  try {
    return navigator.vibrate([...pattern])
  } catch {
    return false
  }
}

/* ── COPY UI OVERLAY (nol string user-facing di JSX) ───────────────────────── */

export const CELEBRATION_COPY = {
  /** label dialog untuk screen reader */
  dialogLabel: 'Perayaan pencapaian',
  /** aksi primer — langsung bisa ditekan, tidak menunggu animasi selesai */
  continueLabel: 'Lanjut',
  /** pintu meninjau ulang di Plant Detail (inventaris #j) */
  replayLabel: 'Lihat perayaan',
  replayHint: 'Putar ulang momen perayaan terakhirmu',
  closeBackdropLabel: 'Tutup perayaan',
  /** caption tahap tanaman di bawah ilustrasi */
  stageCaption: (stageName: string) => `Tanamanmu — ${stageName}`,
  footnote: 'Tanpa poin, tanpa papan peringkat — cuma tanda kamu konsisten 🌿',
} as const
