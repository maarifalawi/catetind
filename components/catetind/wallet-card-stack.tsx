'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Upload,
  Wallet as WalletIcon,
  Wifi,
} from 'lucide-react'
import { LogoWordmark } from './logo-wordmark'
import { cn } from '@/lib/utils'
import { formatIDR, INITIAL_WALLETS, WALLET_POOL, type Wallet } from '@/lib/wallets'

const TAP_THRESHOLD = 10 // px — gerakan di bawah ini dianggap tap, bukan drag
const DRAG_START = 12 // px — gerakan horizontal yang mengubah tekanan jadi swipe
const SWIPE_THRESHOLD = 90 // px — lepas melewati ini memutar deck
const FLY = 680 // px — jarak kartu terbang keluar sebelum rotasi di-commit

// Deck slot-based: SEMUA kartu dirender full-size menumpuk; tiap kartu menempati
// "slot" (0 = depan). Satu rAF loop meng-ease tiap kartu ke slot targetnya dengan
// tempo masing-masing — tumpukan bergerak seperti kaskade, bukan serentak.
const MAX_VISIBLE = 4 // slot terdalam yang masih terlihat mengintip di atas kartu depan
const SLOT_STEP = 30 // px — jarak vertikal antar slot (makin dalam makin naik)
const SLOT_SCALE = 0.045 // pengurangan scale per slot
const ENTER_RISE = 170 // px — kartu baru / kartu yang di-swipe naik dari bawah sejauh ini
const CARD_H = 336 // px — tinggi seragam semua kartu supaya tumpukan rapi
const SCENE_PAD = MAX_VISIBLE * SLOT_STEP + 8 // ruang di atas kartu untuk intipan tumpukan

type DeckEntry = { type: 'all' } | { type: 'wallet'; wallet: Wallet } | { type: 'add' }

/** key stabil per kartu — wajib konsisten saat deck diputar supaya state animasinya nyambung */
const entryKey = (entry: DeckEntry) =>
  entry.type === 'all' ? 'all' : entry.type === 'wallet' ? entry.wallet.id : 'add'

/** easing unik per kartu, stabil dari hash key-nya — tidak ada dua kartu dengan tempo sama */
const easeOf = (key: string) => {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  return 0.1 + (Math.abs(h) % 7) * 0.011 // 0.100 – 0.166
}

/** keadaan visual satu kartu — semua nilainya di-ease tiap frame menuju target */
type Visual = {
  x: number // px — geser horizontal (drag / terbang keluar)
  slot: number // float — posisi slot saat ini (bisa di antara dua slot)
  rise: number // px — offset ke bawah; >0 saat kartu sedang naik dari bawah deck
  opacity: number // 0..1
}

const makeVisual = (slot: number): Visual => ({
  x: 0,
  slot,
  rise: ENTER_RISE, // kartu yang baru muncul selalu "di-deal" naik dari bawah
  opacity: 0,
})

/** muka kartu: gradient vivid per dompet dari data; kartu agregat tetap hijau brand */
const faceOf = (entry: DeckEntry): { face: string; swatch: string } =>
  entry.type === 'wallet'
    ? { face: entry.wallet.faceClass, swatch: entry.wallet.bandClass }
    : { face: 'from-forest-soft via-forest to-[#07241a]', swatch: 'from-mint to-mint-soft' }

export function WalletCardStack({ onOpen }: { onOpen?: () => void }) {
  const [wallets, setWallets] = useState<Wallet[]>(INITIAL_WALLETS)
  // rotasi deck — urutan melingkar tanpa akhir; swipe kartu depan = pindah ke belakang
  const [rot, setRot] = useState(0)
  const poolIdx = useRef(0)

  // deck: kartu agregat dulu, lalu tiap dompet, terakhir kartu "tambah dompet"
  const deck = useMemo<DeckEntry[]>(
    () => [
      { type: 'all' },
      ...wallets.map((wallet) => ({ type: 'wallet', wallet }) as const),
      { type: 'add' },
    ],
    [wallets],
  )

  // urutan tampil = deck yang diputar: 1 2 3 4 → swipe → 2 3 4 1 (kartunya tidak hilang)
  const order = useMemo(() => {
    const len = deck.length
    const k = ((rot % len) + len) % len
    return [...deck.slice(k), ...deck.slice(0, k)]
  }, [deck, rot])

  const totalBalance = useMemo(
    () => wallets.reduce((sum, wallet) => sum + wallet.balance, 0),
    [wallets],
  )

  // mirror state ke ref supaya rAF loop & pointer handler selalu baca nilai terbaru
  const orderRef = useRef(order)
  orderRef.current = order

  /* ---------- engine: semua state animasi hidup di ref (render React tetap murah) ---------- */
  const sceneRef = useRef<HTMLDivElement>(null)
  const visuals = useRef(new Map<string, Visual>()) // keadaan visual per kartu (by key)
  const els = useRef(new Map<string, HTMLDivElement>()) // elemen DOM per kartu (by key)
  const rafRef = useRef(0)
  const pressStart = useRef<{ x: number; y: number } | null>(null)
  const activePointer = useRef<number | null>(null)
  const swipe = useRef<'idle' | 'dragging' | 'exiting'>('idle')
  const dragX = useRef(0) // offset x kartu depan saat di-drag
  const exitingKey = useRef<string | null>(null) // kartu yang sedang terbang keluar
  const pendingDelta = useRef(0) // rotasi yang di-commit saat animasi keluar selesai
  const hoverCard = useRef(false)
  const pressCard = useRef(false)
  const boost = useRef(1) // scale halus kartu depan saat hover/press
  const keyboardNav = useRef(false) // true saat deck dikendalikan keyboard → fokus dijaga

  /** ambil/buat keadaan visual kartu — dipanggil juga saat render supaya snapshot konsisten */
  const ensureVisual = (key: string, slot: number) => {
    let v = visuals.current.get(key)
    if (!v) {
      v = makeVisual(slot)
      visuals.current.set(key, v)
    }
    return v
  }
  /** ke kartu berikutnya: kartu depan terbang ke kiri, lalu naik dari bawah ke slot terdalam */
  const startNext = useCallback((count: number) => {
    if (swipe.current === 'exiting' || count < 1) return
    const front = orderRef.current[0]
    if (!front) return
    exitingKey.current = entryKey(front)
    pendingDelta.current = count
    pressCard.current = false
    dragX.current = 0
    swipe.current = 'exiting'
  }, [])

  /** ke kartu sebelumnya: commit langsung — easing slot menarik kartu terdalam maju ke depan */
  const startPrev = useCallback((count: number) => {
    if (swipe.current === 'exiting' || count < 1) return
    dragX.current = 0
    setRot((r) => r - count)
  }, [])

  const step = useCallback(
    (dir: 1 | -1) => {
      if (dir === 1) startNext(1)
      else startPrev(1)
    },
    [startNext, startPrev],
  )

  // lompat ke kartu tertentu lewat dots — pilih arah putaran terpendek
  const goToKey = useCallback(
    (key: string) => {
      const o = orderRef.current
      const pos = o.findIndex((entry) => entryKey(entry) === key)
      if (pos <= 0) return
      if (pos <= o.length - pos) startNext(pos)
      else startPrev(o.length - pos)
    },
    [startNext, startPrev],
  )

  // demo "user bisa nambahin dompet": ambil kandidat dari pool. Kartu Semua Dompet
  // otomatis menghitung ulang total karena nilainya di-derive dari daftar wallets
  const goAfterAdd = useRef<string | null>(null)
  const addWallet = useCallback(() => {
    if (swipe.current === 'exiting') return
    const candidate = WALLET_POOL[poolIdx.current % WALLET_POOL.length]
    poolIdx.current += 1
    const wallet: Wallet = { ...candidate, id: `${candidate.id}-${poolIdx.current}` }
    goAfterAdd.current = wallet.id
    setWallets((prev) => [...prev, wallet])
  }, [])

  // setelah dompet baru masuk deck, putar deck supaya kartunya tampil di depan
  useEffect(() => {
    const key = goAfterAdd.current
    if (key && order.some((entry) => entryKey(entry) === key)) {
      goAfterAdd.current = null
      goToKey(key)
    }
  }, [order, goToKey])
  /* ===== engine: satu rAF loop untuk swipe, antisipasi tumpukan, dan rise tanpa pop ===== */
  useEffect(() => {
    const tick = () => {
      const o = orderRef.current
      const len = o.length
      const front = o[0]
      const fKey = front ? entryKey(front) : null
      const exiting = exitingKey.current

      // boost scale kartu depan saat hover/press
      const boostTo =
        pressCard.current && swipe.current !== 'dragging'
          ? 0.975
          : hoverCard.current && swipe.current === 'idle'
            ? 1.012
            : 1
      boost.current += (boostTo - boost.current) * 0.12

      // antisipasi: saat drag ke kiri kartu-kartu belakang naik satu slot mengikuti jari;
      // saat exiting mereka lanjut naik proporsional dengan jarak terbang kartu keluar
      const frontV = fKey ? visuals.current.get(fKey) : undefined
      const dragProg =
        swipe.current === 'dragging' && frontV
          ? Math.min(1, Math.max(0, -frontV.x / (SWIPE_THRESHOLD * 1.2)))
          : 0
      const exitV = exiting ? visuals.current.get(exiting) : undefined
      const exitProg = exitV ? Math.min(1, Math.abs(exitV.x) / FLY) : 0

      for (let i = 0; i < len; i++) {
        const key = entryKey(o[i])
        let v = visuals.current.get(key)
        if (!v) {
          v = makeVisual(i)
          visuals.current.set(key, v)
        }

        const isExiting = key === exiting
        const isFront = key === fKey && !isExiting

        // ---- target ----
        let tSlot = i
        let tX = 0
        let tOp = i > MAX_VISIBLE ? 0 : 1
        if (isExiting) {
          tX = -FLY
          tOp = 0
        } else if (swipe.current === 'dragging') {
          if (isFront) tX = dragX.current
          else tSlot = i - dragProg
        } else if (swipe.current === 'exiting') {
          tSlot = i - exitProg
        }

        // ---- easing per kartu: tempo unik tiap kartu; makin dalam slotnya makin malas ----
        const depth = Math.min(Math.max(v.slot, 0), MAX_VISIBLE)
        const ease = Math.max(0.075, easeOf(key) - depth * 0.008)
        const xEase = swipe.current === 'dragging' && isFront ? 0.5 : isExiting ? 0.17 : 0.22

        v.x += (tX - v.x) * xEase
        v.slot += (tSlot - v.slot) * ease
        v.rise += (0 - v.rise) * ease * 0.9
        v.opacity += (tOp - v.opacity) * Math.max(0.1, ease)
        // ---- tulis ke DOM sekali per frame ----
        const el = els.current.get(key)
        if (el) {
          const ty = -depth * SLOT_STEP + v.rise
          const s = (1 - depth * SLOT_SCALE) * (isFront ? boost.current : 1)
          const twist = isFront ? v.x * 0.02 : 0
          el.style.transform = `translate3d(${v.x.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${s.toFixed(3)}) rotate(${twist.toFixed(2)}deg)`
          const dragFade =
            isExiting || (isFront && swipe.current === 'dragging')
              ? Math.min(0.3, (Math.abs(v.x) / FLY) * 0.4)
              : 0
          el.style.opacity = Math.max(0, v.opacity - dragFade).toFixed(3)
          el.style.zIndex = isExiting ? '60' : String(50 - Math.round(v.slot * 10))
          el.style.filter = `brightness(${(1 - depth * 0.045).toFixed(3)})`
        }
      }

      // kartu keluar sudah hampir sampai → commit rotasi. Kartu TIDAK hilang:
      // diteleport saat opacity 0 ke bawah deck pada slot tujuan barunya, lalu
      // easing biasa menaikkannya ke belakang tumpukan — naik dari bawah, tanpa pop
      if (swipe.current === 'exiting' && exiting) {
        const ev = visuals.current.get(exiting)
        if (ev && Math.abs(ev.x + FLY) < 90) {
          const delta = pendingDelta.current
          pendingDelta.current = 0
          exitingKey.current = null
          swipe.current = 'idle'
          ev.x = 0
          ev.slot = Math.min(len - 1, MAX_VISIBLE)
          ev.rise = ENTER_RISE
          ev.opacity = 0
          if (delta) setRot((r) => r + delta)
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])
  /* ===== gesture pointer ===== */
  const handleMove = useCallback((e: React.PointerEvent) => {
    const start = pressStart.current
    if (!start || activePointer.current !== e.pointerId) return
    const dx = e.clientX - start.x
    if (swipe.current === 'idle' && Math.abs(dx) > DRAG_START) {
      // mulai swipe — kunci pointer supaya drag tetap terlacak di luar kartu
      swipe.current = 'dragging'
      try {
        sceneRef.current?.setPointerCapture(e.pointerId)
      } catch {
        /* pointer sudah tidak aktif */
      }
    }
    if (swipe.current === 'dragging') dragX.current = dx
  }, [])

  const handleDown = useCallback((e: React.PointerEvent) => {
    if (swipe.current === 'exiting') return
    keyboardNav.current = false
    pressStart.current = { x: e.clientX, y: e.clientY }
    activePointer.current = e.pointerId
    pressCard.current = true
    dragX.current = 0
  }, [])

  const handleEnter = useCallback(() => {
    hoverCard.current = true
  }, [])

  const handleUp = useCallback(
    (e: React.PointerEvent) => {
      pressCard.current = false
      const start = pressStart.current
      pressStart.current = null
      activePointer.current = null
      if (!start) return

      if (swipe.current === 'dragging') {
        swipe.current = 'idle'
        const dx = e.clientX - start.x
        dragX.current = 0
        if (dx <= -SWIPE_THRESHOLD) step(1) // geser kiri → kartu depan pindah ke belakang
        else if (dx >= SWIPE_THRESHOLD) step(-1) // geser kanan → kartu belakang maju ke depan
        return
      }

      // tap (bukan di tombol aksi) → buka overview, atau tambah dompet di kartu "+"
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y)
      if (moved > TAP_THRESHOLD) return
      if ((e.target as HTMLElement).closest('[data-card-action]')) return

      const entry = orderRef.current[0]
      if (entry?.type === 'add') addWallet()
      else onOpen?.()
    },
    [addWallet, onOpen, step],
  )

  const resetPointer = useCallback(() => {
    // swipe batal (pointer keluar/dibatalkan) → kartu snap kembali ke tengah
    if (swipe.current === 'dragging') swipe.current = 'idle'
    dragX.current = 0
    pressCard.current = false
    hoverCard.current = false
    pressStart.current = null
    activePointer.current = null
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        keyboardNav.current = true
        step(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        keyboardNav.current = true
        step(1)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const entry = orderRef.current[0]
        if (entry?.type === 'add') addWallet()
        else onOpen?.()
      }
    },
    [addWallet, onOpen, step],
  )
  const activeEntry = order[0] ?? deck[0]
  const frontKey = entryKey(activeEntry)

  // setelah rotasi lewat keyboard, fokus dipindah ke kartu depan yang baru
  useEffect(() => {
    if (keyboardNav.current) els.current.get(frontKey)?.focus({ preventScroll: true })
  }, [frontKey])

  // label untuk screen reader — diumumkan tiap kartu berganti
  const srLabel =
    activeEntry.type === 'all'
      ? `Semua Dompet, total saldo ${formatIDR(totalBalance)}`
      : activeEntry.type === 'wallet'
        ? `Dompet ${activeEntry.wallet.name}, saldo ${formatIDR(activeEntry.wallet.balance)}`
        : 'Kartu tambah dompet baru'

  const cardAriaLabel =
    activeEntry.type === 'add'
      ? 'Tambah dompet baru — Enter untuk menambahkan'
      : `${srLabel} — Enter untuk buka ringkasan, panah kiri kanan untuk memutar kartu`
  /* ===== muka kartu: gradient vivid + aurora netral + kilau fisik + chip EMV ===== */
  const cardFace = ({
    entry,
    badge,
    name,
    sub,
    label,
    amount,
  }: {
    entry: DeckEntry
    badge: ReactNode
    name: string
    sub: string
    label: string
    amount: number
  }) => {
    const face = faceOf(entry)
    return (
      <div className="relative h-full overflow-hidden rounded-[1.75rem] bg-forest text-cream shadow-[0_2px_4px_rgba(18,40,31,0.2),0_16px_32px_-12px_rgba(18,40,31,0.45),0_40px_72px_-24px_rgba(18,40,31,0.5)] ring-1 ring-white/10">
        {/* dasar gradient vivid khas dompet */}
        <div aria-hidden className={cn('absolute inset-0 bg-gradient-to-br', face.face)} />
        {/* aurora netral: terang di kanan atas, gelap di kiri bawah → kedalaman */}
        <div
          aria-hidden
          className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-28 -left-12 h-64 w-64 rounded-full bg-black/25 blur-3xl"
        />
        {/* kilau diagonal halus seperti kartu fisik */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-white/[0.13] via-white/[0.03] to-transparent [mask-image:linear-gradient(135deg,black_0%,transparent_55%)]"
        />
        {/* garis highlight tipis di bibir atas kartu */}
        <div
          aria-hidden
          className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
        />

        <div className="relative flex h-full flex-col p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-forest shadow-[0_6px_16px_-6px_rgba(0,0,0,0.45)] ring-1 ring-white/30',
                  face.swatch,
                )}
              >
                <WalletIcon className="size-[18px]" strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="truncate text-xs text-cream/60">{sub}</p>
              </div>
            </div>
            {badge}
          </div>

          {/* chip EMV + ikon contactless */}
          <div className="mt-6 flex items-center gap-3">
            <span
              aria-hidden
              className="relative h-7 w-9 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-[#f4d47c] via-[#e3b752] to-[#b98a2e] shadow-[inset_0_1px_2px_rgba(255,255,255,0.45),0_2px_6px_rgba(0,0,0,0.3)]"
            >
              <span className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-black/20" />
              <span className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-black/20" />
              <span className="absolute left-1/2 top-1/2 h-3 w-4 -translate-x-1/2 -translate-y-1/2 rounded-[4px] border border-black/25" />
            </span>
            <Wifi className="size-4 rotate-90 text-cream/50" strokeWidth={2.25} aria-hidden />
          </div>

          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-cream/55">
              {label}
            </p>
            <p className="mt-1.5 text-4xl font-semibold tracking-tight tabular-nums sm:text-[2.75rem]">
              {formatIDR(amount)}
            </p>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-3 pt-6">
            <button
              type="button"
              data-card-action
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.1] text-sm font-medium text-cream backdrop-blur transition-colors hover:bg-white/[0.18] active:scale-[0.98]"
            >
              <Download className="size-4" />
              Setor
            </button>
            <button
              type="button"
              data-card-action
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-mint text-sm font-semibold text-forest shadow-[0_10px_24px_-8px_rgba(183,224,75,0.55)] transition-all hover:bg-mint-soft hover:shadow-[0_12px_28px_-8px_rgba(183,224,75,0.7)] active:scale-[0.98]"
            >
              <Upload className="size-4" />
              Kirim
            </button>
          </div>
        </div>
      </div>
    )
  }
  const networkBadge = (network: string) => (
    <span className="shrink-0 rounded-full border border-white/20 bg-white/[0.1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cream/75 backdrop-blur">
      {network}
    </span>
  )

  const addFace = (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-[1.75rem] border-2 border-dashed border-forest/20 bg-white p-6 text-center">
      <div
        aria-hidden
        className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-sage/60 blur-2xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-14 -left-8 h-36 w-36 rounded-full bg-mint/20 blur-2xl"
      />
      <span className="relative flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-mint to-mint-soft text-forest shadow-[0_10px_20px_-8px_rgba(183,224,75,0.7)] ring-4 ring-mint/15">
        <Plus className="size-5" strokeWidth={2.5} />
      </span>
      <p className="relative mt-3 text-sm font-semibold text-ink">Tambah Dompet</p>
      <p className="relative mt-1 text-xs text-ink/45">Bank, e-wallet, atau tunai</p>
    </div>
  )
  return (
    <div>
      <p className="sr-only" aria-live="polite">
        {srLabel}
      </p>

      {/* scene: tinggi fix = 1 kartu + ruang intipan tumpukan */}
      <div
        ref={sceneRef}
        className="relative select-none [touch-action:pan-y]"
        style={{ height: SCENE_PAD + CARD_H }}
        onPointerMove={handleMove}
        onPointerDown={handleDown}
        onPointerUp={handleUp}
        onPointerEnter={handleEnter}
        onPointerLeave={resetPointer}
        onPointerCancel={resetPointer}
      >
        {/* glow ambient di belakang kartu — kesan lembut & hidup di atas kanvas cream */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 top-10">
          <div className="absolute inset-x-2 bottom-0 h-36 rounded-[50%] bg-mint/25 blur-[70px]" />
          <div className="absolute left-4 top-4 h-28 w-40 rounded-[50%] bg-sage/80 blur-[60px]" />
        </div>

        {/* SEMUA kartu dirender full-size menumpuk; transform di-update tiap frame oleh engine.
            Snapshot inline di bawah = nilai terakhir engine → re-render React tidak memicu pop */}
        {order.map((entry, i) => {
          const key = entryKey(entry)
          const v = ensureVisual(key, i)
          const depth = Math.min(Math.max(v.slot, 0), MAX_VISIBLE)
          const isFront = i === 0
          const style: CSSProperties = {
            top: SCENE_PAD,
            height: CARD_H,
            transform: `translate3d(${v.x}px, ${-depth * SLOT_STEP + v.rise}px, 0) scale(${1 - depth * SLOT_SCALE})`,
            opacity: v.opacity,
            zIndex: 50 - Math.round(v.slot * 10),
            filter: `brightness(${1 - depth * 0.045})`,
          }
          return (
            <div
              key={key}
              ref={(el) => {
                if (el) els.current.set(key, el)
                else els.current.delete(key)
              }}
              inert={!isFront}
              aria-hidden={!isFront || undefined}
              className={cn(
                'absolute inset-x-0 will-change-transform',
                isFront
                  ? 'cursor-pointer rounded-[1.75rem] outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-cream'
                  : 'pointer-events-none',
              )}
              style={style}
              {...(isFront
                ? {
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': cardAriaLabel,
                    onKeyDown: handleKeyDown,
                  }
                : {})}
            >
              {entry.type === 'add'
                ? addFace
                : entry.type === 'all'
                  ? cardFace({
                      entry,
                      badge: <LogoWordmark className="text-xs text-cream/60" />,
                      name: 'Semua Dompet',
                      sub: `Jon Snow · ${wallets.length} dompet aktif`,
                      label: 'Total Saldo',
                      amount: totalBalance,
                    })
                  : cardFace({
                      entry,
                      badge: networkBadge(entry.wallet.network),
                      name: entry.wallet.name,
                      sub: `${entry.wallet.holder} · ${entry.wallet.number}`,
                      label: `Saldo ${entry.wallet.name}`,
                      amount: entry.wallet.balance,
                    })}
            </div>
          )
        })}
      </div>

      {/* dots + chevron — tap untuk lompat ke kartu tertentu (urutan tetap, deck berputar) */}
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          aria-label="Kartu sebelumnya"
          onClick={() => step(-1)}
          className="flex size-8 items-center justify-center rounded-full border border-black/5 bg-white text-ink transition-colors hover:bg-sage"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="flex items-center gap-1.5">
          {deck.map((entry) => {
            const key = entryKey(entry)
            const isActive = key === frontKey
            return entry.type === 'add' ? (
              <button
                key="add"
                type="button"
                aria-label="Tambah dompet"
                aria-current={isActive}
                onClick={() => (isActive ? addWallet() : goToKey(key))}
                className={cn(
                  'flex size-4 items-center justify-center rounded-full border border-dashed transition-colors',
                  isActive
                    ? 'border-forest text-forest'
                    : 'border-ink/20 text-ink/40 hover:border-forest/50 hover:text-forest/60',
                )}
              >
                <Plus className="size-2.5" strokeWidth={2.5} />
              </button>
            ) : (
              <button
                key={key}
                type="button"
                aria-label={entry.type === 'all' ? 'Semua Dompet' : entry.wallet.name}
                aria-current={isActive}
                onClick={() => goToKey(key)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  isActive ? 'w-5 bg-forest' : 'w-1.5 bg-ink/15 hover:bg-ink/30',
                )}
              />
            )
          })}
        </div>

        <button
          type="button"
          aria-label="Kartu berikutnya"
          onClick={() => step(1)}
          className="flex size-8 items-center justify-center rounded-full border border-black/5 bg-white text-ink transition-colors hover:bg-sage"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}