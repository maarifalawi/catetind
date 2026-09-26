'use client'

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Wallet as WalletIcon,
  Wifi,
} from 'lucide-react'
import { LogoWordmark } from './logo-wordmark'
import { usePrivacy } from './privacy-provider'
import { cn } from '@/lib/utils'
import { AMOUNT_LABEL, AMOUNT_XL } from '@/lib/typography'
import {
  INITIAL_WALLETS,
  WALLET_POOL,
  type DeckSelection,
  type Wallet,
  type WalletArt,
} from '@/lib/wallets'

const TAP_THRESHOLD = 10 // px — gerakan di bawah ini dianggap tap, bukan drag
const DRAG_START = 14 // px — gerakan horizontal yang mengubah tekanan jadi swipe
const DRAG_INTENT = 1.4 // rasio |dx| / |dy| — drag baru mulai kalau niatnya horizontal
const DRAG_MAX = 150 // px — batas geser kartu depan, supaya kartu tidak keluar panel
const DRAG_RUBBER = 0.26 // faktor gerakan setelah melewati DRAG_MAX (terasa "direm")
const SWIPE_THRESHOLD = 90 // px — lepas melewati ini memutar deck
/* Transisi antar kartu = VERTIKAL. Kartu depan "diselipkan" kembali ke dalam
   kantong dompet (turun + memudar cepat), sementara kartu berikutnya naik dari
   bawah deck. Tidak ada lagi kartu yang terbang 680px ke kiri, jadi animasinya
   tidak pernah melintasi — apalagi menutupi — teks di sidebar, dan tidak ada
   momen layar kosong di tengah transisi. */
const EXIT_TUCK = 96 // px — jarak turun kartu yang keluar sebelum rotasi di-commit
const EXIT_FADE = 2.6 // pengali kekakuan pegas opacity saat kartu sedang keluar

// Deck slot-based: SEMUA kartu dirender full-size menumpuk; tiap kartu menempati
// "slot" (0 = depan). Satu rAF loop menggerakkan tiap kartu ke slot targetnya dengan
// spring physics (posisi + velocity) — gerakan terasa fisik, settle tegas, dan
// konsisten di semua refresh rate. Tumpukan bergerak seperti kaskade pegas.
const MAX_VISIBLE = 4 // slot terdalam yang masih terlihat mengintip di atas kartu depan
const SLOT_STEP = 30 // px — jarak vertikal antar slot (makin dalam makin naik)
const SLOT_SCALE = 0.045 // pengurangan scale per slot
const ENTER_RISE = 170 // px — kartu baru / kartu yang di-swipe naik dari bawah sejauh ini
// tinggi kartu responsif via CSS var --card-h di scene (mobile 248px, sm+ 272px) —
// nilai ini dipakai sebagai fallback inline style supaya engine & layout tetap sinkron.
// Kartu diperkecil dari 336px → 272px: saldo dompet sifatnya pasif, jadi ruang
// vertikalnya diserahkan ke Jatah Hari Ini & Tanaman (hierarki visual baru).
const CARD_H = 272 // px — tinggi kartu di layar sm ke atas
const SCENE_PAD = MAX_VISIBLE * SLOT_STEP + 8 // ruang di atas kartu untuk intipan tumpukan

// geometri sleeve dompet di sekeliling tumpukan
const SLEEVE_X = 14 // px — sleeve lebih lebar dari kartu di tiap sisi
const SLEEVE_TOP = 18 // px — sleeve menjulang di atas kartu depan
const SLEEVE_BOTTOM = 26 // px — kedalaman kantong di bawah kartu depan
const LIP_OVERLAP = 18 // px — seberapa jauh bibir kantong menutupi tepi bawah kartu

// konfigurasi spring per properti: k = stiffness, z = damping ratio
// (<1 = overshoot halus & hidup, 1 = tanpa overshoot)
const SPR_X = { k: 340, z: 0.82 } // kartu terbang keluar / snap balik ke tengah
const SPR_X_DRAG = { k: 950, z: 1.05 } // saat drag: tracking jari nyaris 1:1
const SPR_SLOT = { k: 250, z: 0.88 } // naik-turun slot — kaskade pegas
const SPR_RISE = { k: 220, z: 0.95 } // deal-in dari bawah deck
const SPR_OPACITY = { k: 320, z: 1 } // fade tanpa overshoot
const FLICK_VELOCITY = 550 // px/s — lepas secepat ini dihitung swipe walau jarak kurang

type DeckEntry = { type: 'all' } | { type: 'wallet'; wallet: Wallet } | { type: 'add' }

/** key stabil per kartu — wajib konsisten saat deck diputar supaya state animasinya nyambung */
const entryKey = (entry: DeckEntry) =>
  entry.type === 'all' ? 'all' : entry.type === 'wallet' ? entry.wallet.id : 'add'

/** variasi tempo per kartu (0.92 – 1.10), stabil dari hash key — kaskade konsisten, bukan acak */
const tempoOf = (key: string) => {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  return 0.92 + (Math.abs(h) % 10) * 0.02
}

/** spring 1 dimensi: posisi + velocity */
type Spring = { p: number; v: number }

/** keadaan visual satu kartu — tiap properti adalah spring yang diintegrasi tiap frame */
type Visual = {
  x: Spring // px — geser horizontal (drag / terbang keluar)
  slot: Spring // float — posisi slot saat ini (bisa di antara dua slot)
  rise: Spring // px — offset ke bawah; >0 saat kartu sedang naik dari bawah deck
  opacity: Spring // 0..1
}

const spring = (p: number): Spring => ({ p, v: 0 })

const makeVisual = (slot: number): Visual => ({
  x: spring(0),
  slot: spring(slot),
  rise: spring(ENTER_RISE), // kartu yang baru muncul selalu "di-deal" naik dari bawah
  opacity: spring(0),
})

/** integrasi semi-implicit Euler + settle detection: snap saat benar-benar diam,
 *  jadi tidak ada tail merayap seperti exponential lerp. Mengembalikan `true`
 *  kalau spring ini SUDAH diam — dipakai engine untuk tahu kapan seluruh deck
 *  tenang sehingga rAF loop boleh berhenti (idle-stop). */
const integrate = (
  s: Spring,
  target: number,
  k: number,
  z: number,
  dt: number,
  epsP: number,
  epsV: number,
): boolean => {
  const c = 2 * z * Math.sqrt(k) // damping dari damping ratio
  s.v += (-k * (s.p - target) - c * s.v) * dt
  s.p += s.v * dt
  if (Math.abs(s.p - target) < epsP && Math.abs(s.v) < epsV) {
    s.p = target
    s.v = 0
    return true
  }
  return false
}

/** muka kartu: gradient vivid + aksen seni per dompet; kartu agregat tetap hijau brand */
const faceOf = (
  entry: DeckEntry,
): { face: string; swatch: string; glow: string; art: WalletArt } =>
  entry.type === 'wallet'
    ? {
        face: entry.wallet.faceClass,
        swatch: entry.wallet.bandClass,
        glow: entry.wallet.glowClass ?? 'bg-cream/20',
        art: entry.wallet.art,
      }
    : {
        face: 'from-[#45594e] via-forest to-[#161c19]',
        swatch: 'from-mint to-mint-soft',
        glow: 'bg-mint/25',
        art: 'kawung',
      }

/** Dibungkus `memo` — deck ini hanya menerima `onOpen` (yang di HomeScreen
 *  sudah distabilkan dengan useCallback), jadi klik buka/tutup popup tidak
 *  memicu re-render pohon kartu yang berat ini. PENTING: engine rAF-nya memang
 *  menggerakkan kartu lewat DOM langsung (bukan state), jadi skip re-render
 *  tidak mempengaruhi animasi deck sama sekali. */
export const WalletCardStack = memo(function WalletCardStack({
  onOpen,
}: {
  /**
   * Dipanggil saat kartu depan di-tap / di-Enter. Payload-nya pilihan kartu
   * yang sedang aktif, supaya panel "Your Balance Overview" menampilkan saldo
   * kartu yang dipencet (kartu A → detail A, kartu B → detail B) — bukan selalu
   * total gabungan semua dompet.
   */
  onOpen?: (selection: DeckSelection) => void
}) {
  const [wallets, setWallets] = useState<Wallet[]>(INITIAL_WALLETS)
  /* sensor nominal global — saldo di muka kartu ikut tombol mata di header */
  const { money } = usePrivacy()
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
  /* isi `tick` engine — disimpan di ref supaya `startEngine` (dipanggil dari
     handler interaksi) bisa menghidupkan lagi loop yang sudah idle */
  const tickRef = useRef<(now: number) => void>(() => {})
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
  const lastT = useRef(0) // timestamp frame terakhir — sumber dt untuk spring
  const flick = useRef({ x: 0, t: 0, v: 0 }) // tracker velocity jari saat drag (EMA)
  /* pilihan kartu depan — dibaca callback lewat ref supaya handler tap/Enter
     tidak perlu dibuat ulang tiap render (lihat pola orderRef di atas) */
  const selectionRef = useRef<DeckSelection>({ type: 'all', total: 0 })

  /** ambil/buat keadaan visual kartu — dipanggil juga saat render supaya snapshot konsisten */
  const ensureVisual = (key: string, slot: number) => {
    let v = visuals.current.get(key)
    if (!v) {
      v = makeVisual(slot)
      visuals.current.set(key, v)
    }
    return v
  }

  /** Menyalakan kembali engine rAF. Loop-nya berhenti sendiri saat seluruh
   *  spring sudah settle (lihat `moving` di dalam tick) supaya halaman tidak
   *  terus membayar style recalc + re-raster selama deck diam; setiap interaksi
   *  yang mengubah target memanggil fungsi ini. Idempoten — aman dipanggil
   *  berkali-kali, termasuk saat loop sedang jalan. */
  const startEngine = useCallback(() => {
    if (rafRef.current !== 0) return
    /* `lastT` di-reset: frame pertama setelah idle harus memakai delta kecil,
       kalau tidak `now - lastT` yang besar membuat spring melompat sekali. */
    lastT.current = 0
    rafRef.current = requestAnimationFrame((now) => tickRef.current(now))
  }, [])

  /** ke kartu berikutnya: kartu depan diselipkan turun ke dalam kantong dompet
   *  sambil memudar, lalu muncul lagi dari bawah pada slot terdalam */
  const startNext = useCallback((count: number) => {
    if (swipe.current === 'exiting' || count < 1) return
    const front = orderRef.current[0]
    if (!front) return
    const key = entryKey(front)
    exitingKey.current = key
    pendingDelta.current = count
    pressCard.current = false
    dragX.current = 0
    swipe.current = 'exiting'
    // warisi momentum flick jari: kartu yang di-"lempar" masuk lebih cepat
    if (flick.current.v < 0) {
      const v = visuals.current.get(key)
      if (v) v.rise.v = Math.max(v.rise.v, Math.min(420, -flick.current.v * 0.5))
    }
    startEngine()
  }, [startEngine])

  /** ke kartu sebelumnya: kartu yang di belakang disiapkan tersembunyi di bawah
   *  deck, lalu spring menaikkannya ke slot depan — semua gerakan vertikal */
  const startPrev = useCallback((count: number) => {
    if (swipe.current === 'exiting' || count < 1) return
    dragX.current = 0
    const o = orderRef.current
    const incoming = o[o.length - count]
    if (incoming) {
      const key = entryKey(incoming)
      let v = visuals.current.get(key)
      if (!v) {
        v = makeVisual(o.length - count)
        visuals.current.set(key, v)
      }
      /* masuk dari bawah kantong, bukan menyapu dari kanan: tidak ada kartu yang
         terbang melintasi kolom lain di layar */
      v.x.p = 0
      v.x.v = 0
      v.opacity.p = 0
      v.opacity.v = 0
      v.rise.p = ENTER_RISE
      v.rise.v = 0
    }
    setRot((r) => r - count)
    startEngine()
  }, [startEngine])

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
    // kartu baru di-"deal" masuk dari bawah deck — engine harus hidup untuk itu
    startEngine()
  }, [startEngine])

  // setelah dompet baru masuk deck, putar deck supaya kartunya tampil di depan
  useEffect(() => {
    const key = goAfterAdd.current
    if (key && order.some((entry) => entryKey(entry) === key)) {
      goAfterAdd.current = null
      goToKey(key)
    }
  }, [order, goToKey])
  /* ===== engine: satu rAF loop — semua kartu digerakkan spring physics per frame.
     useLayoutEffect (bukan useEffect) supaya frame pertama menulis keadaan awal
     spring SEBELUM paint pertama — HTML server tidak sempat menampilkan tumpukan
     kartu tanpa transform. ===== */
  useLayoutEffect(() => {
    const tick = (now: number) => {
      /* frame ini sudah "diambil". Kalau di akhir frame tidak ada yang bergerak,
         loop sengaja TIDAK dijadwalkan ulang (lihat blok idle-stop di bawah) —
         jadi `rafRef.current === 0` berarti engine sedang berhenti. */
      rafRef.current = 0

      // dt dinormalisasi ke detik + di-clamp: kecepatan konsisten di 60/120Hz
      // dan spring tidak meledak saat tab kembali aktif setelah lama di background
      const dt = Math.min(Math.max((now - (lastT.current || now)) / 1000, 0.0001), 1 / 30)
      lastT.current = now

      /* true selama masih ada spring / animasi yang bergerak di frame ini */
      let moving = false

      const o = orderRef.current
      const len = o.length
      const front = o[0]
      const fKey = front ? entryKey(front) : null
      const exiting = exitingKey.current

      // boost scale kartu depan saat hover/press (dt-normalized)
      const boostTo =
        pressCard.current && swipe.current !== 'dragging'
          ? 0.975
          : hoverCard.current && swipe.current === 'idle'
            ? 1.012
            : 1
      /* boost di-snap begitu selisihnya tak terlihat; tanpa snap ini nilainya
         tidak pernah benar-benar diam sehingga engine tidak akan pernah idle */
      if (Math.abs(boostTo - boost.current) < 0.0004) {
        boost.current = boostTo
      } else {
        boost.current += (boostTo - boost.current) * (1 - Math.exp(-12 * dt))
        moving = true
      }

      // antisipasi: saat drag kartu-kartu belakang naik satu slot mengikuti jari;
      // saat kartu depan "masuk kantong" mereka lanjut naik proporsional dengan
      // seberapa dalam kartu itu sudah turun
      const frontV = fKey ? visuals.current.get(fKey) : undefined
      const dragProg =
        swipe.current === 'dragging' && frontV
          ? Math.min(1, Math.max(0, Math.abs(frontV.x.p) / (SWIPE_THRESHOLD * 1.2)))
          : 0
      const exitV = exiting ? visuals.current.get(exiting) : undefined
      const exitProg = exitV ? Math.min(1, Math.max(0, exitV.rise.p / EXIT_TUCK)) : 0

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
        let tRise = 0
        let tOp = i > MAX_VISIBLE ? 0 : 1
        if (isExiting) {
          // turun ke dalam kantong dompet sambil memudar (tanpa terbang ke kiri)
          tRise = EXIT_TUCK
          tOp = 0
        } else if (swipe.current === 'dragging') {
          if (isFront) tX = dragX.current
          else tSlot = i - dragProg
        } else if (swipe.current === 'exiting') {
          tSlot = i - exitProg
        }

        // ---- spring per kartu: tempo unik & stabil tiap kartu; makin dalam slotnya
        // makin lembut pegasnya — tumpukan bergerak kaskade, settle-nya tetap tegas ----
        const depth = Math.min(Math.max(v.slot.p, 0), MAX_VISIBLE)
        const tempo = tempoOf(key)
        const kSlot = SPR_SLOT.k * tempo * Math.max(0.62, 1 - depth * 0.06)
        const dragging = swipe.current === 'dragging' && isFront
        const xCfg = dragging ? SPR_X_DRAG : SPR_X
        // kartu keluar memudar lebih cepat supaya tidak terlihat "menggantung"
        const opK = SPR_OPACITY.k * (isExiting ? EXIT_FADE : 1)

        const xStill = integrate(v.x, tX, xCfg.k * tempo, xCfg.z, dt, 0.05, 1.5)
        const slotStill = integrate(v.slot, tSlot, kSlot, SPR_SLOT.z, dt, 0.0015, 0.015)
        const riseStill = integrate(v.rise, tRise, SPR_RISE.k * tempo, SPR_RISE.z, dt, 0.05, 1.5)
        const opStill = integrate(v.opacity, tOp, opK, SPR_OPACITY.z, dt, 0.002, 0.02)
        if (!(xStill && slotStill && riseStill && opStill)) moving = true
        // ---- tulis ke DOM sekali per frame (React tidak boleh menyentuh properti
        //      ini — lihat catatan di blok render) ----
        const el = els.current.get(key)
        if (el) {
          const ty = -depth * SLOT_STEP + v.rise.p
          const s = (1 - depth * SLOT_SCALE) * (isFront ? boost.current : 1)
          const twist = isFront ? v.x.p * 0.02 : 0
          el.style.transform = `translate3d(${v.x.p.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${s.toFixed(3)}) rotate(${twist.toFixed(2)}deg)`
          el.style.opacity = Math.max(0, v.opacity.p).toFixed(3)
          /* z-index & filter hanya ditulis kalau nilainya BENAR-BENAR berubah.
             `filter` tidak bisa di-composite seperti transform — tiap perubahan
             memaksa kartu di-raster ulang — jadi shading slot di-kuantisasi ke
             langkah 0.05 (hanya 4 nilai untuk 4 slot). Bedanya tak terlihat,
             tapi memangkas puluhan raster per transisi deck. */
          const z = isExiting ? 60 : 50 - Math.round(v.slot.p * 10)
          if (el.dataset.deckZ !== String(z)) {
            el.dataset.deckZ = String(z)
            el.style.zIndex = String(z)
          }
          const shade = Math.round((1 - depth * 0.045) * 20) / 20
          if (el.dataset.deckShade !== String(shade)) {
            el.dataset.deckShade = String(shade)
            el.style.filter = `brightness(${shade})`
          }
        }
      }

      // kartu keluar sudah masuk kantong & hampir tak terlihat → commit rotasi. Kartu
      // TIDAK hilang: diteleport ke bawah deck pada slot tujuan barunya, lalu spring
      // biasa menaikkannya ke belakang tumpukan — naik dari bawah, tanpa pop
      if (swipe.current === 'exiting' && exiting) {
        const ev = visuals.current.get(exiting)
        const nearlyHidden = ev ? ev.opacity.p < 0.06 : false
        if (ev && (ev.rise.p > EXIT_TUCK - 18 || nearlyHidden)) {
          const delta = pendingDelta.current
          pendingDelta.current = 0
          exitingKey.current = null
          swipe.current = 'idle'
          ev.x.p = 0
          ev.x.v = 0
          ev.slot.p = Math.min(len - 1, MAX_VISIBLE)
          ev.slot.v = 0
          ev.rise.p = ENTER_RISE
          ev.rise.v = 0
          ev.opacity.p = 0
          ev.opacity.v = 0
          if (delta) setRot((r) => r + delta)
          /* kartu ini baru diteleport ke bawah deck → frame berikutnya WAJIB
             jalan supaya ia dianimasikan naik ke slot barunya */
          moving = true
        }
      }

      /* idle-stop: semua spring diam & tidak ada kartu yang sedang keluar →
         jangan jadwalkan frame lagi. Engine ini hidup di halaman yang sama
         dengan popup; kalau rAF-nya jalan terus tanpa henti, tiap frame ia
         menulis transform ke 4+ kartu (style recalc + re-raster) — beban yang
         terus menggerus frame budget animasi buka/tutup popup. Dinyalakan lagi
         lewat startEngine() dari tiap interaksi. */
      if (moving) rafRef.current = requestAnimationFrame(tick)
    }

    tickRef.current = tick

    /* frame pertama dijalankan SINKRON di dalam layout effect: keadaan awal
       spring (kartu tersembunyi di bawah deck) sudah tertulis sebelum paint
       pertama, jadi tidak ada kedipan "tumpukan kartu" di awal */
    tick(performance.now())
    return () => {
      cancelAnimationFrame(rafRef.current)
      /* WAJIB direset: kalau tidak, id frame lama yang sudah dibatalkan masih
         dianggap "loop sedang jalan" — di dev StrictMode (effect dipasang dua
         kali) startEngine() lalu menolak menyalakan engine dan deck membeku. */
      rafRef.current = 0
    }
  }, [])
  /* ===== gesture pointer ===== */
  const handleMove = useCallback((e: React.PointerEvent) => {
    const start = pressStart.current
    if (!start || activePointer.current !== e.pointerId) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (swipe.current === 'idle' && Math.abs(dx) > DRAG_START) {
      /* baru dianggap swipe kalau niatnya horizontal (bukan gulir vertikal).
         Tanpa cek ini, drag pelan yang agak miring membuat kartu "gemetar"
         antara mengikuti jari dan menggulir halaman. */
      if (Math.abs(dx) < Math.abs(dy) * DRAG_INTENT) return
      // mulai swipe — kunci pointer supaya drag tetap terlacak di luar kartu
      swipe.current = 'dragging'
      try {
        sceneRef.current?.setPointerCapture(e.pointerId)
      } catch {
        /* pointer sudah tidak aktif */
      }
    }
    if (swipe.current === 'dragging') {
      /* batasi geseran: lewat DRAG_MAX gerakan direm keras, jadi kartu depan
         tidak pernah keluar dari panelnya sendiri (mis. menutupi sidebar) */
      const over = Math.abs(dx) - DRAG_MAX
      dragX.current = over > 0 ? Math.sign(dx) * (DRAG_MAX + over * DRAG_RUBBER) : dx
      // lacak velocity jari (EMA) — dipakai untuk flick & momentum kartu keluar
      const now = performance.now()
      const ms = Math.max(1, now - flick.current.t)
      const inst = ((e.clientX - flick.current.x) / ms) * 1000
      flick.current.v = flick.current.v * 0.6 + inst * 0.4
      flick.current.x = e.clientX
      flick.current.t = now
      // target kartu berubah mengikuti jari → pastikan engine hidup
      startEngine()
    }
  }, [startEngine])

  const handleDown = useCallback((e: React.PointerEvent) => {
    if (swipe.current === 'exiting') return
    keyboardNav.current = false
    pressStart.current = { x: e.clientX, y: e.clientY }
    activePointer.current = e.pointerId
    pressCard.current = true
    dragX.current = 0
    flick.current = { x: e.clientX, t: performance.now(), v: 0 }
    startEngine() // press = boost scale kartu depan turun ke 0.975
  }, [startEngine])

  const handleEnter = useCallback(() => {
    hoverCard.current = true
    startEngine() // hover = boost scale kartu depan naik ke 1.012
  }, [startEngine])

  const handleUp = useCallback(
    (e: React.PointerEvent) => {
      pressCard.current = false
      startEngine() // lepas jari = boost naik ke 1 + spring snap balik ke tengah
      const start = pressStart.current
      pressStart.current = null
      activePointer.current = null
      if (!start) return

      if (swipe.current === 'dragging') {
        swipe.current = 'idle'
        const dx = e.clientX - start.x
        const fv = flick.current.v
        dragX.current = 0
        // threshold jarak ATAU velocity — flick cepat tetap dianggap swipe
        if (dx <= -SWIPE_THRESHOLD || fv <= -FLICK_VELOCITY) step(1) // kartu depan pindah ke belakang
        else if (dx >= SWIPE_THRESHOLD || fv >= FLICK_VELOCITY) step(-1) // kartu belakang maju ke depan
        return
      }

      // tap → buka overview, atau tambah dompet di kartu "+".
      // (Dulu di sini ada penjaga `[data-card-action]` untuk tombol Pemasukan/
      // Pengeluaran di muka kartu. Tombol itu sudah dihapus demi Single Entry
      // Point, jadi sekarang seluruh area kartu aman untuk tap.)
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y)
      if (moved > TAP_THRESHOLD) return

      const entry = orderRef.current[0]
      if (entry?.type === 'add') addWallet()
      else onOpen?.(selectionRef.current)
    },
    [addWallet, onOpen, startEngine, step],
  )

  const resetPointer = useCallback(() => {
    // swipe batal (pointer keluar/dibatalkan) → kartu snap kembali ke tengah
    if (swipe.current === 'dragging') swipe.current = 'idle'
    dragX.current = 0
    flick.current.v = 0
    pressCard.current = false
    hoverCard.current = false
    pressStart.current = null
    activePointer.current = null
    startEngine() // hover/press berakhir → boost & posisi kartu di-settle-kan
  }, [startEngine])

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
        else onOpen?.(selectionRef.current)
      }
    },
    [addWallet, onOpen, step],
  )

  const activeEntry = order[0] ?? deck[0]
  const frontKey = entryKey(activeEntry)

  /* sinkronkan pilihan kartu depan ke ref — dipakai saat user tap / Enter */
  selectionRef.current =
    activeEntry.type === 'wallet'
      ? { type: 'wallet', wallet: activeEntry.wallet }
      : { type: 'all', total: totalBalance }

  // setelah rotasi lewat keyboard, fokus dipindah ke kartu depan yang baru
  useEffect(() => {
    if (keyboardNav.current) els.current.get(frontKey)?.focus({ preventScroll: true })
  }, [frontKey])

  // label untuk screen reader — diumumkan tiap kartu berganti (ikut tersensor
  // saat Global Eye aktif, supaya pembaca layar tidak membocorkan nominal)
  const srLabel =
    activeEntry.type === 'all'
      ? `Semua Dompet, total saldo ${money(totalBalance)}`
      : activeEntry.type === 'wallet'
        ? `Dompet ${activeEntry.wallet.name}, saldo ${money(activeEntry.wallet.balance)}`
        : 'Kartu tambah dompet baru'

  const cardAriaLabel =
    activeEntry.type === 'add'
      ? 'Tambah dompet baru — Enter untuk menambahkan'
      : `${srLabel} — Enter untuk buka ringkasan, panah kiri kanan untuk memutar kartu`
  /* ===== muka kartu: gradient vivid + aurora netral + kilau fisik + chip EMV =====
     CATATAN AUDIT: kartu dompet ini SENGAJA tidak punya tombol "Pemasukan /
     Pengeluaran" lagi. Dulu ada DUA pintu masuk (tombol sidebar + 2 tombol di
     kartu) yang bikin user ragu harus memencet yang mana. Sekarang satu pintu
     saja (tombol "+ Tambah Transaksi" di sidebar / FAB mobile), dan kartu ini
     murni jadi DISPLAY saldo + sarana swipe antar rekening. */
  const cardFace = ({
    entry,
    badge,
    name,
    sub,
    label,
    amount,
    holder,
    account,
  }: {
    entry: DeckEntry
    badge: ReactNode
    name: string
    sub: string
    label: string
    amount: number
    /** nama pemegang rekening — baris metadata bawah kartu */
    holder: string
    /** nomor rekening / keterangan akun — baris metadata bawah kartu */
    account: string
  }) => {
    const face = faceOf(entry)
    return (
      <div className="relative h-full overflow-hidden rounded-[1.75rem] bg-forest text-cream shadow-[0_2px_4px_rgba(0,0,0,0.2),0_16px_32px_-12px_rgba(0,0,0,0.45),0_40px_72px_-24px_rgba(0,0,0,0.5)] ring-1 ring-cream/10">
        {/* dasar gradient vivid khas dompet */}
        <div aria-hidden className={cn('absolute inset-0 bg-gradient-to-br', face.face)} />
        {/* aksen seni per dompet: motif batik/geometris terpusat di kanan atas,
            memudar ke arah teks saldo supaya tetap terbaca */}
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full [mask-image:radial-gradient(135%_125%_at_88%_-12%,black_22%,transparent_72%)]"
        >
          <rect width="100%" height="100%" fill={`url(#card-art-${face.art})`} />
        </svg>
        {/* aurora di-tint warna dompet: terang di kanan atas, gelap di kiri bawah → kedalaman */}
        <div
          aria-hidden
          className={cn('absolute -right-16 -top-24 h-64 w-64 rounded-full blur-3xl', face.glow)}
        />
        <div
          aria-hidden
          className="absolute -bottom-28 -left-12 h-64 w-64 rounded-full bg-soil/30 blur-3xl"
        />
        {/* kilau diagonal halus seperti kartu fisik */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-cream/[0.13] via-cream/[0.03] to-transparent [mask-image:linear-gradient(135deg,black_0%,transparent_55%)]"
        />
        {/* garis highlight tipis di bibir atas kartu */}
        <div
          aria-hidden
          className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cream/40 to-transparent"
        />

        <div className="relative flex h-full flex-col p-5 pb-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-forest shadow-[0_6px_16px_-6px_rgba(0,0,0,0.45)] ring-1 ring-cream/30',
                  face.swatch,
                )}
              >
                <WalletIcon className="size-4" strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="truncate text-xs text-cream/60">{sub}</p>
              </div>
            </div>
            {badge}
          </div>

          {/* chip EMV + ikon contactless */}
          <div className="mt-4 flex items-center gap-3">
            <span
              aria-hidden
              className="relative h-7 w-9 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-[#ecd768] via-[#ecd768] to-[#6a612f] shadow-[inset_0_1px_2px_rgba(255,255,255,0.45),0_2px_6px_rgba(0,0,0,0.3)]"
            >
              <span className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-soil/20" />
              <span className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-soil/20" />
              <span className="absolute left-1/2 top-1/2 h-3 w-4 -translate-x-1/2 -translate-y-1/2 rounded-[4px] border border-soil/25" />
            </span>
            <Wifi className="size-4 rotate-90 text-cream/50" strokeWidth={2.25} aria-hidden />
          </div>

          <div className="mt-4">
            {/* label & nominal memakai DESIGN TOKEN yang sama dengan halaman
                Dompet & Akun (lib/typography.ts) — bukan kelas lokal per file,
                supaya angka saldo tidak pernah "beda rasa" antar halaman */}
            <p className={cn(AMOUNT_LABEL, 'text-cream/55')}>{label}</p>
            <p className={cn('mt-1', AMOUNT_XL)}>{money(amount)}</p>
          </div>

          {/* baris metadata kartu (pengganti tombol Pemasukan/Pengeluaran):
              muka kartu fisik memang begini — pemegang di kiri, nomor di kanan.
              Fungsinya display, bukan CTA, jadi tidak menambah cognitive load. */}
          <div className="mt-auto flex items-end justify-between gap-3 pt-4">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-cream/45">
                Pemegang
              </p>
              <p className="truncate text-[13px] font-medium text-cream/90">{holder}</p>
            </div>
            <div className="min-w-0 text-right">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-cream/45">
                Akun
              </p>
              <p className="truncate text-[13px] font-medium tracking-[0.1em] text-cream/90 tabular-nums">
                {account}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }
  const networkBadge = (network: string) => (
    <span className="shrink-0 rounded-full border border-cream/20 bg-cream/[0.1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cream/75 backdrop-blur">
      {network}
    </span>
  )

  const addFace = (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-[1.75rem] border-2 border-dashed border-forest/20 bg-cream p-6 text-center">
      <div
        aria-hidden
        className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-sage/60 blur-2xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-14 -left-8 h-36 w-36 rounded-full bg-mint/20 blur-2xl"
      />
      <span className="relative flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-mint to-mint-soft text-forest shadow-[0_10px_20px_-8px_rgba(145,187,158,0.7)] ring-4 ring-mint/15">
        <Plus className="size-5" strokeWidth={2.5} />
      </span>
      <p className="relative mt-3 text-sm font-semibold text-ink">Tambah Dompet</p>
      <p className="relative mt-1 text-xs text-ink/45">Bank, e-wallet, atau tunai</p>
    </div>
  )
  return (
    // inset horizontal = ruang napas di layar kecil; di lg inset-nya persis SLEEVE_X (14px)
    // supaya tepi luar sleeve dompet lurus sejajar dengan tepi kolom (mis. kartu Transaksi Terakhir)
    <div className="px-4 sm:px-2 lg:px-3.5">
      <p className="sr-only" aria-live="polite">
        {srLabel}
      </p>

      {/* scene: tinggi fix = 1 kartu + ruang intipan tumpukan; tinggi kartu responsif
          lewat --card-h (mobile lebih pendek + kartu sengaja diperkecil supaya
          kolom Jatah Hari Ini / Tanaman dapat porsi visual lebih besar) */}
      {/* isolate: scene jadi stacking context sendiri — z-index internal kartu/lip
          (50–70) tidak bocor ke root & tidak menembus overlay global (AI Chat, dll.) */}
      <div
        ref={sceneRef}
        className="relative isolate select-none [touch-action:pan-y] [--card-h:248px] sm:[--card-h:272px]"
        style={{ height: `calc(${SCENE_PAD}px + var(--card-h, ${CARD_H}px))` }}
        onPointerMove={handleMove}
        onPointerDown={handleDown}
        onPointerUp={handleUp}
        onPointerEnter={handleEnter}
        onPointerLeave={resetPointer}
        onPointerCancel={resetPointer}
      >
        {/* definisi motif aksen kartu — didefinisikan sekali, dipakai ulang tiap kartu via url(#…) */}
        <svg aria-hidden className="absolute size-0">
          <defs>
            {/* batik kawung: lingkaran-lingkaran saling beririsan */}
            <pattern id="card-art-kawung" width="72" height="72" patternUnits="userSpaceOnUse">
              <g fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="1.6">
                <circle cx="36" cy="36" r="26" />
                <circle cx="0" cy="0" r="26" />
                <circle cx="72" cy="0" r="26" />
                <circle cx="0" cy="72" r="26" />
                <circle cx="72" cy="72" r="26" />
              </g>
              <circle cx="36" cy="36" r="5" fill="white" fillOpacity="0.1" />
            </pattern>
            {/* batik mega mendung: lengkung awan berlapis */}
            <pattern id="card-art-mendung" width="90" height="44" patternUnits="userSpaceOnUse">
              <g fill="none" stroke="white">
                <path d="M0 44 Q22.5 8 45 44 Q67.5 8 90 44" strokeOpacity="0.12" strokeWidth="1.8" />
                <path d="M0 36 Q22.5 16 45 36 Q67.5 16 90 36" strokeOpacity="0.07" strokeWidth="1.4" />
              </g>
            </pattern>
            {/* batik parang: gelombang diagonal berirama */}
            <pattern
              id="card-art-parang"
              width="48"
              height="48"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <g fill="none" stroke="white">
                <path d="M0 12 Q24 2 48 12" strokeOpacity="0.11" strokeWidth="1.8" />
                <path d="M0 24 Q24 14 48 24" strokeOpacity="0.07" strokeWidth="1.4" />
                <path d="M0 36 Q24 26 48 36" strokeOpacity="0.11" strokeWidth="1.8" />
              </g>
            </pattern>
            {/* rings: garis kontur topografi konsentris */}
            <pattern id="card-art-rings" width="150" height="150" patternUnits="userSpaceOnUse">
              <g fill="none" stroke="white" strokeWidth="1.6">
                <circle cx="150" cy="0" r="34" strokeOpacity="0.13" />
                <circle cx="150" cy="0" r="62" strokeOpacity="0.1" />
                <circle cx="150" cy="0" r="90" strokeOpacity="0.08" />
                <circle cx="150" cy="0" r="118" strokeOpacity="0.06" />
              </g>
            </pattern>
          </defs>
        </svg>

        {/* glow ambient di belakang kartu — kesan lembut & hidup di atas kanvas cream */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 top-10">
          <div className="absolute inset-x-2 bottom-0 h-36 rounded-[50%] bg-mint/25 blur-[70px]" />
          <div className="absolute left-4 top-4 h-28 w-40 rounded-[50%] bg-sage/80 blur-[60px]" />
        </div>

        {/* sleeve dompet: panel kulit forest di belakang tumpukan — kartu-kartu terlihat
            menyembul keluar dari kantongnya; jahitan dashed + bayangan dalam untuk kedalaman */}
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-[2.25rem] bg-gradient-to-b from-[#52685c] via-forest to-[#1f2823] shadow-[0_2px_6px_rgba(0,0,0,0.25),0_24px_48px_-16px_rgba(0,0,0,0.5),0_48px_90px_-32px_rgba(0,0,0,0.45)] ring-1 ring-cream/10"
          style={{
            top: SCENE_PAD - SLEEVE_TOP,
            height: `calc(var(--card-h, ${CARD_H}px) + ${SLEEVE_TOP + SLEEVE_BOTTOM}px)`,
            left: -SLEEVE_X,
            right: -SLEEVE_X,
          }}
        >
          {/* tekstur kulit halus (polka dot timbul) */}
          <div className="absolute inset-0 rounded-[2.25rem] [background-image:radial-gradient(rgba(255,255,255,0.045)_1px,transparent_1.5px)] [background-size:9px_9px]" />
          {/* jahitan mengikuti bibir sleeve */}
          <div className="absolute inset-2.5 rounded-[1.9rem] border-2 border-dashed border-cream/[0.13]" />
          {/* bayangan dalam di mulut kantong — kesan kartu masuk ke dalam */}
          <div className="absolute inset-x-0 top-0 h-28 rounded-t-[2.25rem] bg-gradient-to-b from-soil/40 via-soil/15 to-transparent" />
          {/* highlight rim atas kulit */}
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cream/30 to-transparent" />
        </div>

        {/* SEMUA kartu dirender full-size menumpuk. transform / opacity / z-index /
            filter di bawah ini HANYA nilai awal per slot — setelah frame pertama,
            engine rAF yang memegang properti itu sepenuhnya. React sengaja tidak
            ikut menulisnya supaya re-render (mis. saat deck diputar) tidak pernah
            "menyentak" kartu yang sedang beranimasi → tidak ada kedipan/blank. */}
        {order.map((entry, i) => {
          const key = entryKey(entry)
          ensureVisual(key, i)
          const isFront = i === 0
          const restDepth = Math.min(i, MAX_VISIBLE)
          const style: CSSProperties = {
            top: SCENE_PAD,
            height: `var(--card-h, ${CARD_H}px)`,
            transform: `translate3d(0, ${-restDepth * SLOT_STEP}px, 0) scale(${1 - restDepth * SLOT_SCALE})`,
            zIndex: 50 - Math.round(restDepth * 10),
            filter: `brightness(${1 - restDepth * 0.045})`,
          }
          return (
            <div
              key={key}
              ref={(el) => {
                if (el) {
                  els.current.set(key, el)
                  /* Kartu yang baru ter-mount (ganti konteks Pribadi/Joint, dompet
                     baru) harus di-"deal" masuk dari bawah deck. Engine yang
                     sedang idle tidak akan menyadari kartu baru ini, jadi
                     dinyalakan di sini — sama seperti perilaku loop yang dulu
                     selalu jalan. */
                  startEngine()
                } else {
                  els.current.delete(key)
                }
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
                      badge: <LogoWordmark tone="light" className="h-2.5 opacity-70" />,
                      name: 'Semua Dompet',
                      sub: `Jon Snow · ${wallets.length} dompet aktif`,
                      label: 'Total Saldo',
                      amount: totalBalance,
                      holder: 'Jon Snow',
                      account: `${wallets.length} dompet`,
                    })
                  : cardFace({
                      entry,
                      badge: networkBadge(entry.wallet.network),
                      name: entry.wallet.name,
                      sub: `${entry.wallet.holder} · ${entry.wallet.number}`,
                      label: `Saldo ${entry.wallet.name}`,
                      amount: entry.wallet.balance,
                      holder: entry.wallet.holder,
                      account: entry.wallet.number,
                    })}
            </div>
          )
        })}

        {/* bibir kantong (cover): menutupi tepi bawah kartu depan — ilusi kartu
            benar-benar dimasukkan ke dompet. z-70 supaya kartu yang di-swipe keluar
            meluncur di BELAKANG bibir, seperti ditarik dari kantong */}
        <div
          aria-hidden
          className="pointer-events-none absolute z-[70]"
          style={{
            top: `calc(${SCENE_PAD - LIP_OVERLAP}px + var(--card-h, ${CARD_H}px))`,
            height: LIP_OVERLAP + SLEEVE_BOTTOM,
            left: -SLEEVE_X,
            right: -SLEEVE_X,
          }}
        >
          {/* bayangan yang jatuh ke kartu tepat di atas bibir */}
          <div className="absolute inset-x-3 -top-4 h-4 bg-gradient-to-t from-soil/30 to-transparent" />
          {/* flap kulit */}
          <div className="absolute inset-0 rounded-b-[2.25rem] rounded-t-[0.85rem] bg-gradient-to-b from-[#52685c] via-forest to-[#1f2823] shadow-[0_20px_40px_-14px_rgba(0,0,0,0.6)] ring-1 ring-cream/10">
            {/* tekstur kulit */}
            <div className="absolute inset-0 rounded-[inherit] [background-image:radial-gradient(rgba(255,255,255,0.045)_1px,transparent_1.5px)] [background-size:9px_9px]" />
            {/* rim atas bibir — tepi kulit yang menahan kartu */}
            <div className="absolute inset-x-5 top-0 h-[3px] rounded-full bg-gradient-to-r from-transparent via-cream/35 to-transparent" />
            {/* jahitan flap */}
            <div className="absolute inset-x-6 top-3.5 border-t-2 border-dashed border-cream/[0.13]" />
          </div>
        </div>
      </div>

      {/* dots + chevron — tap untuk lompat ke kartu tertentu (urutan tetap, deck berputar).
          Jarak besar dari scene: bibir dompet menjulur SLEEVE_BOTTOM px ke bawah kartu */}
      <div className="mt-12 flex items-center justify-center gap-3">
        <button
          type="button"
          aria-label="Kartu sebelumnya"
          onClick={() => step(-1)}
          className="flex size-8 items-center justify-center rounded-full border border-soil/12 bg-cream text-ink transition-colors hover:bg-sage"
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
          className="flex size-8 items-center justify-center rounded-full border border-soil/12 bg-cream text-ink transition-colors hover:bg-sage"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
})