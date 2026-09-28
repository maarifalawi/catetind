'use client'

import type { JointTransaction, JointWallet } from '@/lib/data/joint'
import { browserSupabase } from './client'
import { toJointTransaction, type JointTransactionDbRow } from './mappers'

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
      rows,
    }
  } catch {
    return null
  }
}
