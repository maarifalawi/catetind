'use client'

import type { JointTransaction, JointWallet } from '@/lib/data/joint'
import { JOINT_DEFAULT_CATEGORY, splitSpecOf } from '@/lib/data/joint'
import { browserSupabase } from './client'
import { toJointTransaction, toSplitColumns, type JointTransactionDbRow } from './mappers'
import { isUuid } from './uuid'

/* ── BACA DOMPET BERSAMA DARI SERVER (paket 52) ──────────────────────────────
   Ini menutup temuan yang ditulis apa adanya di laporan 45:

     "/joint masih memakai id dompet kanon (`joint-1`) sehingga realtime belum
      menerima baris sampai /joint membaca `joint_wallets`"

   Sebelum paket 52, halaman `/joint` berlangganan Postgres Changes dengan id
   KANON itu — id yang tidak pernah ada di tabel `joint_wallets` (primary key-nya
   uuid). Artinya langganannya tidak akan pernah menerima satu baris pun walau
   backend sudah dipasangkan. Sekarang id-nya DIBACA dari tabelnya: RLS
   `joint_wallets_member_select` (migrasi 03) yang memutuskan dompet mana yang
   berhak dilihat pemanggil, jadi satu akun hanya bisa menemukan dompet yang
   memang ia anggotai.

   Satu panggilan mengembalikan tiga hal yang menentukan seluruh layar:
     · `wallet`   — id + nama + tanggal dibuat (bukan id kanon lagi);
     · `members`  — siapa saja anggotanya (`joint_members` + pemilik), dipakai
                    memutuskan halaman ini berwujud undangan atau kantong aktif;
     · `rows`     — catatan yang SUDAH ada di server, dibaca dari view masker
                    `joint_transactions_public` supaya catatan privat orang lain
                    tidak pernah masuk ke perangkat ini dalam bentuk aslinya.

   `null` = tidak ada sesi/backend, tabelnya kosong, ATAU salah satu bacaan
   gagal. Pemanggil (`lib/money/joint-store.ts`) lalu memakai jalur lokal —
   bukan mengosongkan layar: lebih baik menampilkan state perangkat yang jujur
   daripada layar kosong yang terlihat seperti data hilang. */

export interface RemoteJointWallet {
  wallet: JointWallet
  /** id user pemanggil — dipakai memutuskan isi catatan privat siapa yang boleh tampil */
  viewerId: string
  /** id anggota (pemilik + `joint_members`), unik, urut kali pertama terlihat */
  members: string[]
  /**
   * Nama panggilan anggota (dari RPC `catetind_joint_roster`, yang memeriksa
   * keanggotaan lebih dulu). `{}` = nama belum terbaca; pemanggil memakai
   * sebutan netral ("Kamu"/"Pasangan") alih-alih nama karangan.
   */
  memberNames: Record<string, string>
  /** catatan yang sudah ada di server, terbaru dulu (pola urut store) */
  rows: JointTransaction[]
}

/** jumlah baris yang boleh ditarik sekali baca (sama dengan batas cache lokal) */
const REMOTE_ROW_LIMIT = 200

type WalletRow = { id: string; name: string; created_at?: string | null; owner_id?: string | null }

export async function readRemoteJointWallet(): Promise<RemoteJointWallet | null> {
  const client = browserSupabase()
  if (!client) return null

  try {
    const { data: session } = await client.auth.getSession()
    const viewerId = session.session?.user.id
    if (!viewerId) return null

    /* Dompet paling awal dibuat dipilih supaya hasilnya deterministik kalau
       kelak satu akun punya lebih dari satu dompet bersama. */
    const { data: walletRows, error: walletError } = await client
      .from('joint_wallets')
      .select('id,name,created_at,owner_id')
      .order('created_at', { ascending: true })
      .limit(1)
    if (walletError) return null

    const raw = ((walletRows ?? []) as WalletRow[])[0]
    if (!raw?.id) return null

    const [membersRes, rowsRes] = await Promise.all([
      client.from('joint_members').select('user_id').eq('joint_wallet_id', raw.id),
      client
        .from('joint_transactions_public')
        .select('*')
        .eq('joint_wallet_id', raw.id)
        .order('date', { ascending: false })
        .limit(REMOTE_ROW_LIMIT),
    ])

    /* Bacaannya hanya sah kalau barisnya benar-benar bisa dibaca: kalau gagal,
       pemanggil memakai jalur lokal — bukan menampilkan kantong "kosong" yang
       bisa disalahartikan sebagai data yang hilang. */
    if (rowsRes.error) return null

    const members: string[] = []
    const memberIds = [
      viewerId,
      raw.owner_id,
      ...((membersRes.data ?? []) as { user_id?: string }[]).map((row) => row.user_id),
    ]
    for (const id of memberIds) {
      if (id && !members.includes(id)) members.push(id)
    }

    const rows = ((rowsRes.data ?? []) as JointTransactionDbRow[])
      .filter((row) => Boolean(row?.id))
      .map((row) => toJointTransaction(row, viewerId))

    return {
      wallet: {
        id: raw.id,
        name: raw.name,
        /* `created_at` di database bertimestamp; domain ini memakai tanggal
           lokal `YYYY-MM-DD` (dibaca apa adanya, tanpa `Date` & timezone) */
        createdAt: (raw.created_at ?? '').slice(0, 10),
      },
      viewerId,
      members,
      memberNames: await readMemberNames(raw.id, viewerId),
      rows,
    }
  } catch {
    return null
  }
}

/**
 * Nama panggilan anggota kantong (`catetind_joint_roster`).
 *
 * Dipisah & gagal-sunyi: kalau RPC-nya belum ada (backend lama) atau gagal,
 * hasilnya `{}` dan layar memakai sebutan netral. Nama yang KOSONG tidak pernah
 * diganti nama karangan.
 */
async function readMemberNames(
  walletId: string,
  viewerId: string,
): Promise<Record<string, string>> {
  const client = browserSupabase()
  if (!client) return {}
  try {
    const { data, error } = await client.rpc('catetind_joint_roster', { p_wallet: walletId })
    if (error || !data) return {}
    const out: Record<string, string> = {}
    for (const raw of data as { roster_user_id?: string; roster_nickname?: string }[]) {
      const id = raw.roster_user_id
      if (!id) continue
      const name = (raw.roster_nickname ?? '').trim()
      /* pemilik sesi selalu "Kamu" — itu yang dibaca user tentang dirinya di
         buku besar bersama, bukan nama panggilan yang ia isi saat daftar */
      out[id] = id === viewerId ? 'Kamu' : name || 'Pasangan'
    }
    return out
  } catch {
    return {}
  }
}

/* ── KANTONG BERSAMA DI SERVER (paket 100) ──────────────────────────────────
   `createJointPocket()` di store hanya menamai kantong di PERANGKAT. Akibatnya
   `wallet.id` masih id kanon (`joint_1`) — bukan uuid — sehingga
   `catetind_create_invite` selalu menjawab "Kamu bukan anggota dompet bersama
   itu", dan kode undangan tidak pernah sampai ke tabel `invite_codes` (partner
   di perangkat lain tidak akan pernah bisa gabung).

   RPC `catetind_ensure_joint_pocket` menutupnya secara IDEMPOTEN: satu pemilik =
   satu kantong (yang paling awal dibuat dipakai ulang), nama disesuaikan, dan
   baris keanggotaan pemilik (`role = 'owner'`) dipastikan ada. `null` = tidak ada
   sesi/backend atau RPC belum tersedia → pemanggil tetap di jalur lokal.
*/
export async function ensureJointPocketRemote(name: string): Promise<JointWallet | null> {
  const client = browserSupabase()
  if (!client) return null
  const trimmed = name.trim()
  try {
    const { data, error } = await client.rpc('catetind_ensure_joint_pocket', {
      p_name: trimmed.length > 0 ? trimmed : null,
    })
    if (error || !data) return null
    const row = (Array.isArray(data) ? data[0] : data) as
      | { pocket_id?: string; pocket_name?: string; pocket_created_at?: string }
      | undefined
    if (!row?.pocket_id) return null
    return {
      id: row.pocket_id,
      name: row.pocket_name ?? trimmed,
      /* kolomnya timestamptz; domain ini memakai tanggal lokal `YYYY-MM-DD` */
      createdAt: (row.pocket_created_at ?? '').slice(0, 10),
    }
  } catch {
    return null
  }
}

/* ── JALUR TULIS KANTONG BERSAMA KE SERVER (paket 64 · Paket D) ──────────────
   Sebelumnya `/joint` hanya MEMBACA dari server; catatan baru tetap di perangkat.
   Fungsi di bawah mengirim satu baris ke `joint_transactions` dengan
   `client_tx_id` (uuid baris itu) sebagai kunci idempotensi — constraint
   `unique (joint_wallet_id, client_tx_id)` sudah ada, jadi double-tap / retry
   tidak menggandakan catatan.

   Kolom `user_id`/`paid_by_user_id` bertipe uuid, dan SEJAK identitas kantong
   bersama memakai uuid sungguhan, `pocketId` memang uuid peserta. Baris lama
   yang masih membawa id contoh dinormalkan oleh store
   (`jointIdentityMap`) sebelum sampai ke sini. */

/**
 * Keluar dari kantong bersama: hapus baris keanggotaan MILIK SENDIRI.
 *
 * RLS `joint_members_owner_delete` mengizinkan `user_id = auth.uid()`, jadi ini
 * satu-satunya jalur "putus koneksi" yang benar-benar mengubah data. Dompet &
 * catatan pasangan TIDAK ikut terhapus — keluar dari satu kantong bukan alasan
 * menghapus data orang lain.
 *
 * `false` = tidak ada sesi/backend; pemanggil tetap membersihkan state lokal dan
 * mengatakannya apa adanya.
 */
export async function deleteRemoteJointMembership(
  jointWalletId: string,
  userId: string,
): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const { error } = await client
      .from('joint_members')
      .delete()
      .eq('joint_wallet_id', jointWalletId)
      .eq('user_id', userId)
    return !error
  } catch {
    return false
  }
}

export async function pushJointTransactionToServer(
  row: JointTransaction,
  input: { walletId: string; viewerId: string; pocketId: string; remoteId: string },
): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const cols = toSplitColumns(splitSpecOf(row))
    const { error } = await client.from('joint_transactions').insert({
      id: input.remoteId,
      joint_wallet_id: input.walletId,
      user_id: input.viewerId,
      paid_by_user_id: input.pocketId,
      description: row.description,
      amount: Math.max(0, Math.round(row.amount)),
      category: row.category || JOINT_DEFAULT_CATEGORY,
      date: row.date || null,
      time_label: row.time || '00:00',
      split_type: cols.split_type,
      split_percents: cols.split_percents,
      split_amounts: cols.split_amounts,
      bearer_id: row.payerId && isUuid(row.payerId) ? row.payerId : null,
      is_private: row.isPrivate === true,
      private_for_user: row.isPrivate ? (row.privateForUser ?? input.viewerId) : null,
      is_settlement: row.isSettlement === true,
      month_key: (row.date || '').slice(0, 7) || '1970-01',
      client_tx_id: input.remoteId,
    })
    return !error || error.code === '23505'
  } catch {
    return false
  }
}

/** hapus satu catatan di server (hapus lokal sudah ditangani tombstone store) */
export async function deleteRemoteJointTransaction(remoteId: string): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const { error } = await client.from('joint_transactions').delete().eq('id', remoteId)
    return !error
  } catch {
    return false
  }
}

