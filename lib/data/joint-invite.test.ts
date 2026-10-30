import { describe, expect, it } from 'vitest'
import {
  DEMO_EXPIRED_CODE,
  DEMO_USED_CODE,
  DEMO_VALID_CODE,
  INVITE_CODE_LENGTH,
  INVITE_TTL_MS,
  JOIN_CLAIM_PARAM,
  buildInviteShareText,
  buildInviteUrl,
  buildJoinClaimHref,
  buildJoinHref,
  consumeInviteIn,
  createInviteRecord,
  demoInviteRecords,
  generateInviteCode,
  generateUniqueInviteCode,
  inviteExpiryLabel,
  inviteExpiryLabelFromTime,
  inviteValidityUntilLabel,
  inviteWalletName,
  isInviteUsable,
  isJoinClaimRequest,
  resolveInviteFrom,
  resolveRemoteInviteView,
  type InviteRecord,
  type RandomBytes,
} from './joint-invite'
import { INITIAL_JOINT_WALLET, JOINT_PARTNER } from './joint'

/* ── Test kode undangan (paket 39) ───────────────────────────────────────────
   Gap yang ditutup paket ini: dulu `INVITE_CODE = 'A7K2M9'` global dipakai
   SEMUA dompet sambil copy-nya menjanjikan "berlaku 24 jam, 1x pakai" — janji
   tanpa pelaksana. Test ini mengunci tiga perilaku penggantinya:

     1. kode PER DOMPET (dua dompet → dua kode berbeda, tidak bertabrakan);
     2. sekali pakai (`usedBy` → status `used`, pemakaian kedua ditolak);
     3. kedaluwarsa 24 jam (lewat `expiresAt` → status `expired`).

   Sumber acaknya disuntik (`random`), jadi hasilnya deterministik & tidak
   bergantung CSPRNG mesin. Waktu juga dipatok, bukan dibaca dari jam mesin. */

const NOW = 1_800_000_000_000 // epoch ms tetap

/** sumber acak palsu: selalu byte yang sama, cukup untuk menguji alfabet & panjang */
const fixedRandom = (byte: number): RandomBytes => (length) =>
  Uint8Array.from({ length }, () => byte)

/** sumber acak yang menghasilkan pola berbeda tiap pemanggilan */
function sequenceRandom(seeds: number[][]): RandomBytes {
  let call = 0
  return (length) => {
    const seed = seeds[Math.min(call, seeds.length - 1)]
    call++
    return Uint8Array.from({ length }, (_, index) => seed[index % seed.length])
  }
}

describe('generateInviteCode · bentuk kode', () => {
  it('6 karakter, hanya dari alfabet aman-baca (tanpa 0/O/1/I/L)', () => {
    const code = generateInviteCode(fixedRandom(7))
    expect(code).toHaveLength(INVITE_CODE_LENGTH)
    expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/)
  })

  it('byte berbeda → kode berbeda (sumber acak benar-benar dipakai)', () => {
    expect(generateInviteCode(fixedRandom(1))).not.toBe(generateInviteCode(fixedRandom(99)))
  })

  it('kode unik: kalau generate pertama bertabrakan, dibuat ulang', () => {
    const existing: InviteRecord[] = [
      createInviteRecord({ walletId: 'w1', now: NOW, random: fixedRandom(5) }),
    ]
    const random = sequenceRandom([
      Array.from({ length: 6 }, () => 5),
      [9, 9, 9, 9, 9, 9],
    ])
    const code = generateUniqueInviteCode(existing, random)
    expect(code).not.toBe(existing[0].code)
  })
})

describe('createInviteRecord · kode per wallet', () => {
  it('dua wallet mendapat KODE BERBEDA', () => {
    const random = sequenceRandom([
      [1, 1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2, 2],
    ])
    const first = createInviteRecord({ walletId: 'joint_1', now: NOW, random })
    const second = createInviteRecord({
      walletId: 'joint_2',
      existing: [first],
      now: NOW,
      random,
    })

    expect(first.walletId).toBe('joint_1')
    expect(second.walletId).toBe('joint_2')
    expect(first.code).not.toBe(second.code)
  })

  it('masa berlaku 24 jam sejak dibuat & belum terpakai', () => {
    const record = createInviteRecord({ walletId: 'joint_1', now: NOW, random: fixedRandom(3) })
    expect(record.expiresAt - record.createdAt).toBe(INVITE_TTL_MS)
    expect(record.usedBy).toBeNull()
    expect(isInviteUsable(record, NOW)).toBe(true)
  })
})

describe('resolveInviteFrom · valid / used / expired / unknown', () => {
  const record = createInviteRecord({ walletId: 'joint_1', now: NOW, random: fixedRandom(11) })

  it('kode hidup → valid, dan menyebut dompetnya (nama pengundang dari server)', () => {
    const invite = resolveInviteFrom([record], record.code.toLowerCase(), NOW)
    expect(invite.status).toBe('valid')
    /**
     * Nama pengundang TIDAK dikarang di perangkat: jalur lokal tidak tahu siapa
     * pembuat kode (dulu diisi konstanta "Jon"). Nilai `null` membuat layar
     * memakai sebutan "Pasanganmu"; nama asli datang dari
     * `catetind_resolve_invite` → `invite_inviter_name`.
     */
    expect(invite.inviterName).toBeNull()
    expect(invite.walletName).toBe(INITIAL_JOINT_WALLET.name)
    expect(invite.validUntilLabel).not.toBeNull()
  })

  it('lewat 24 jam → expired', () => {
    const invite = resolveInviteFrom([record], record.code, NOW + INVITE_TTL_MS)
    expect(invite.status).toBe('expired')
    expect(invite.validUntilLabel).toBeNull()
    /* tidak ada nama karangan untuk pengundang yang tidak diketahui */
    expect(invite.inviterName).toBeNull()
  })

  it('sudah dipakai → used (dan menang atas kedaluwarsa)', () => {
    const used: InviteRecord = { ...record, usedBy: JOINT_PARTNER.id }
    expect(resolveInviteFrom([used], record.code, NOW).status).toBe('used')
    expect(resolveInviteFrom([used], record.code, NOW + INVITE_TTL_MS).status).toBe('used')
  })

  it('kode asing → unknown tanpa mengarang nama', () => {
    const invite = resolveInviteFrom([record], 'ZZZZZZ', NOW)
    expect(invite.status).toBe('unknown')
    expect(invite.inviterName).toBeNull()
    expect(invite.walletName).toBeNull()
  })
})

describe('consumeInviteIn · sekali pakai benar-benar ditegakkan', () => {
  it('pemakaian pertama berhasil, pemakaian kedua ditolak', () => {
    const record = createInviteRecord({ walletId: 'joint_1', now: NOW, random: fixedRandom(21) })

    const first = consumeInviteIn([record], record.code, JOINT_PARTNER.id, NOW)
    expect(first?.usedBy).toBe(JOINT_PARTNER.id)
    expect(resolveInviteFrom([record], record.code, NOW).status).toBe('used')

    expect(consumeInviteIn([record], record.code, 'user_lain', NOW)).toBeNull()
    expect(record.usedBy).toBe(JOINT_PARTNER.id)
  })

  it('kode kedaluwarsa tidak bisa dipakai (ditolak, bukan ditandai terpakai)', () => {
    const record = createInviteRecord({ walletId: 'joint_1', now: NOW, random: fixedRandom(31) })
    expect(consumeInviteIn([record], record.code, JOINT_PARTNER.id, NOW + INVITE_TTL_MS)).toBeNull()
    expect(record.usedBy).toBeNull()
  })

  it('kode asing juga ditolak', () => {
    expect(consumeInviteIn([], 'ZZZZZZ', JOINT_PARTNER.id, NOW)).toBeNull()
  })
})

describe('state review di halaman /join', () => {
  const seeds = demoInviteRecords(NOW)

  it('tiga seed menghasilkan status valid / expired / used', () => {
    expect(resolveInviteFrom(seeds, DEMO_VALID_CODE, NOW).status).toBe('valid')
    expect(resolveInviteFrom(seeds, DEMO_EXPIRED_CODE, NOW).status).toBe('expired')
    expect(resolveInviteFrom(seeds, DEMO_USED_CODE, NOW).status).toBe('used')
  })

  it('seed selalu segar: kapan pun dibuka, kode valid tetap valid', () => {
    const later = NOW + 3 * INVITE_TTL_MS
    expect(resolveInviteFrom(demoInviteRecords(later), DEMO_VALID_CODE, later).status).toBe('valid')
  })
})

describe('label & tautan undangan', () => {
  it('nama dompet diambil dari id-nya (bukan dikarang)', () => {
    expect(inviteWalletName(INITIAL_JOINT_WALLET.id)).toBe(INITIAL_JOINT_WALLET.name)
    expect(inviteWalletName('wallet_asing')).toBeNull()
  })

  it('tautan /join selalu huruf besar & tanpa spasi', () => {
    expect(buildJoinHref(' k4m2p9 ')).toBe('/join/K4M2P9')
    expect(buildInviteUrl('K4M2P9')).toBe('https://catetind.com/join/K4M2P9')
  })

  it('teks share memuat kode dompet yang benar (dulu selalu kode global)', () => {
    const text = buildInviteShareText('Jon', 'K4M2P9', 'Dompet Kita 💚')
    expect(text).toContain('K4M2P9')
    expect(text).toContain('Dompet Kita 💚')
    expect(text).toContain('/join/K4M2P9')
  })

  it('label kedaluwarsa ikut record-nya, bukan angka tetap', () => {
    const record = createInviteRecord({ walletId: 'joint_1', now: NOW, random: fixedRandom(41) })
    const other = { ...record, expiresAt: record.expiresAt + INVITE_TTL_MS }
    expect(inviteExpiryLabel(record)).not.toBe(inviteExpiryLabel(other))
  })
})

/* ── Paket 100: "login -> auto-join" & status dari SERVER ─────────────────────
   Gap yang ditutup: tombol "Gabung Dompet Ini" dulu menaut ke `/login` POLOS
   (kode undangan hilang di tengah jalan), dan jawaban `catetind_resolve_invite`
   dibuang kecuali status used/expired — sehingga kode yang sah tampil
   "Kodenya nggak ketemu" di perangkat yang diundang. Test di bawah mengunci
   bentuk tautan tujuan login dan pemetaan status server -> copy layar. */

describe('tautan auto-join setelah masuk', () => {
  it('membawa kode undangan + penanda terima ke halaman masuk', () => {
    const href = buildJoinClaimHref(' k4m2p9 ')
    expect(href).toBe(`/join/K4M2P9?${JOIN_CLAIM_PARAM}=1`)
  })

  it('penanda hanya aktif untuk 1/true (bukan sembarang isi)', () => {
    expect(isJoinClaimRequest('1')).toBe(true)
    expect(isJoinClaimRequest(['1'])).toBe(true)
    expect(isJoinClaimRequest('TRUE')).toBe(true)
    expect(isJoinClaimRequest('0')).toBe(false)
    expect(isJoinClaimRequest('ya')).toBe(false)
    expect(isJoinClaimRequest(undefined)).toBe(false)
  })
})

describe('resolveRemoteInviteView · jawaban server jadi copy /join', () => {
  const expiresAt = new Date(NOW + INVITE_TTL_MS).toISOString()

  it('valid: nama pengundang & dompet dari server dipakai apa adanya', () => {
    const view = resolveRemoteInviteView({
      status: 'valid',
      walletName: 'Dompet Kita Berdua',
      expiresAt,
      inviterName: 'Dany',
    })

    expect(view.status).toBe('valid')
    if (view.status !== 'valid') return
    expect(view.inviterName).toBe('Dany')
    expect(view.walletName).toBe('Dompet Kita Berdua')
    expect(view.validUntilLabel?.startsWith('Kode berlaku sampai ')).toBe(true)
  })

  it('valid tanpa nama pengundang: jangan mengarang nama', () => {
    const view = resolveRemoteInviteView({
      status: 'valid',
      walletName: 'Dompet Kita Berdua',
      expiresAt,
      inviterName: '   ',
    })
    expect(view.status).toBe('valid')
    expect(view.inviterName).toBeNull()
  })

  it('used & expired mempertahankan nama dompet untuk konteks jalan keluar', () => {
    const used = resolveRemoteInviteView({
      status: 'used',
      walletName: 'Dompet Kita Berdua',
      expiresAt,
      inviterName: 'Dany',
    })
    const expired = resolveRemoteInviteView({
      status: 'expired',
      walletName: 'Dompet Kita Berdua',
      expiresAt,
      inviterName: null,
    })

    expect(used.status).toBe('used')
    expect(expired.status).toBe('expired')
    if (used.status !== 'used' || expired.status !== 'expired') return
    expect(used.walletName).toBe('Dompet Kita Berdua')
    expect(used.validUntilLabel).toBeNull()
    expect(expired.walletName).toBe('Dompet Kita Berdua')
  })

  it('not_found jadi status unknown tanpa nama karangan', () => {
    const view = resolveRemoteInviteView({
      status: 'not_found',
      walletName: null,
      expiresAt: null,
      inviterName: null,
    })
    expect(view.status).toBe('unknown')
    expect(view.walletName).toBeNull()
    expect(view.inviterName).toBeNull()
  })

  it('label masa berlaku memakai waktu expiry, bukan klaim "24 jam"', () => {
    const label = inviteValidityUntilLabel(Date.parse(expiresAt))
    expect(label).toBe(`Kode berlaku sampai ${inviteExpiryLabelFromTime(Date.parse(expiresAt))}.`)
    expect(label).not.toBe(inviteExpiryLabelFromTime(NOW))
  })
})


