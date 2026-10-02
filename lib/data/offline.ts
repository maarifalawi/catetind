/* ── COPY BANNER OFFLINE & ANTREAN LOKAL (paket 42) ──────────────────────────
   Dua nada yang dipakai banner:
     · `offline*`         → perangkat sedang tanpa jaringan (hud-amber, tenang)
     · `pendingTitle` dkk → jaringan sudah ada tapi antrean belum selesai (sage)

   AUDIT "CLEAN UI" (paket 63): `honestyNote` dulu satu kalimat panjang soal
   IndexedDB/server yang TAMPIL SELALU di setiap layar selama offline — pengingat
   teknis yang menetes ke seluruh app. Sekarang dipecah: `honestySummary` (satu
   baris, selalu tampak) + `honestyBody` (detail, hanya muncul kalau user buka
   disclosurenya). Kewajiban jujurnya tetap: user selalu bisa tahu arti
   "tersinkron" tanpa membuka apa pun. */
export const OFFLINE_COPY = {
  offlineTitle: 'Offline — catatanmu aman',
  /** kalimat keadaan; angka antreannya disusun di data, bukan di komponen */
  offlineBody: (pending: number) =>
    pending > 0
      ? `${pending.toLocaleString('id-ID')} catatan nunggu di perangkat. Balik online, langsung diproses.`
      : 'Catatan tersimpan di perangkat. Balik online, langsung diproses.',
  /** badge angka antrean — satu-satunya angka yang ditampilkan banner */
  pendingBadge: (pending: number) => `${pending.toLocaleString('id-ID')} nunggu`,
  pendingTitle: 'Ada catatan yang belum diproses',
  pendingBody: (pending: number) =>
    `${pending.toLocaleString('id-ID')} catatan masih nunggu di perangkat ini.`,
  /** tombol proses ulang — benar-benar jalan (`flushPendingSync`), bukan pajangan */
  pendingCta: 'Proses sekarang',
  /** nada saat antrean berhasil diproses */
  syncedTitle: 'Semua catatan sudah diproses 🌿',
  syncedBody: (processed: number) =>
    `${processed.toLocaleString('id-ID')} catatan selesai diproses.`,
  dismissLabel: 'Tutup info offline',
  /** BARIS SINGKAT yang selalu tampak — penjaga janji "tersinkron" */
  honestySummary: 'Tanpa server, "tersinkron" = tersimpan di perangkat ini.',
  /** detail teknis, dibuka hanya kalau user minta */
  honestyBody:
    'Selama app ini belum punya backend, semua catatan tinggal di perangkatmu (IndexedDB). Nggak ada satu pun yang dikirim ke mana pun — kirimannya baru jalan begitu online.',
  honestyLabel: 'Maksudnya?',
  /** toast setelah menyimpan saat perangkat OFFLINE — jangan mengaku "kecatat & terkirim" */
  savedOfflineTitle: 'Tersimpan di perangkat 📴',
  savedOfflineBody: 'Masuk antrean — diproses begitu online.',
} as const
