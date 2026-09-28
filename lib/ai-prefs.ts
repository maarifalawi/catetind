/* ── PREFERENSI AI DI PERANGKAT — SATU SUMBER (paket 54) ──────────────────────
   Kunci `catet-ai-prefs` dulu hidup sebagai konstanta PRIVAT di dalam
   `components/catetind/settings-panel-preferences.tsx`, dan grep berhenti di
   berkas itu — artinya dua saklar yang menjanjikan kontrol ("Kategorisasi
   Otomatis oleh AI" & "Penamaan Otomatis Transaksi") tidak dibaca siapa pun.
   Saklar mati yang menjanjikan kontrol adalah pelanggaran aturan repo ini
   ("jangan ada tombol mati"), jadi paket 54 memilih jalan (b) — FUNGSIKAN:

     · kuncinya pindah ke sini (arah impor repo: komponen → lib), jadi Pengaturan
       dan jalur AI capture membaca kunci yang sama dan tidak bisa berbeda;
     · pembacanya cuma SATU jalur: AI capture (scan struk & input suara) di
       `hooks/use-transaction-capture.ts`. Di sana tebakannya memang transparan —
       hasilnya selalu mendarat di kartu konfirmasi yang bisa dikoreksi user;
     · jalur MANUAL tidak membacanya sama sekali (paket 54): kategori di form
       tambah selalu pilihan user, bukan tebakan. Jadi saklar ini tidak pernah
       menghidupkan tebakan yang tidak ada.

   Saklar MATI berarti AI tidak mengisi field itu; user yang mengisinya di kartu
   konfirmasi. Field kosong hasil "AI dimatikan" SENGAJA tidak ikut ditandai
   "AI belum yakin" (`lowFields`): tanda amber itu artinya tebakan AI diragukan,
   sementara di sini tidak ada tebakan sama sekali. */

import type { TransactionDraftForm } from './transaction-ai'

/** kunci localStorage — nama lama dipertahankan supaya preferensi user tidak hilang */
export const AI_PREFS_KEY = 'catet-ai-prefs'

/** mode bicara Minca (AI Coach) — nilai lama, tetap di preferensi yang sama */
export type MincaMode = 'bestie' | 'savage'

export interface AiPrefs {
  /** AI boleh mengisi kategori dari hasil bacaannya (jalur capture saja) */
  autoCategory: boolean
  /** AI boleh merapikan nama catatan dari hasil bacaannya (jalur capture saja) */
  autoNaming: boolean
  mincaMode: MincaMode
}

/** titik berangkat yang sama dengan dulu (saklar ON, Mode Bestie) */
export const AI_PREFS_DEFAULT: AiPrefs = {
  autoCategory: true,
  autoNaming: true,
  mincaMode: 'bestie',
}

const MINCA_MODES: MincaMode[] = ['bestie', 'savage']

/**
 * Preferensi AI yang tersimpan. Aman dipanggil di server/test (`window` tidak
 * ada) dan saat localStorage diblokir (mode privat) — selalu jatuh ke default,
 * bukan melempar.
 */
export function readAiPrefs(): AiPrefs {
  if (typeof window === 'undefined') return AI_PREFS_DEFAULT
  try {
    const raw = window.localStorage.getItem(AI_PREFS_KEY)
    if (!raw) return AI_PREFS_DEFAULT
    const saved = JSON.parse(raw) as Partial<AiPrefs> | null
    if (!saved || typeof saved !== 'object') return AI_PREFS_DEFAULT
    return {
      autoCategory: saved.autoCategory !== false,
      autoNaming: saved.autoNaming !== false,
      mincaMode: MINCA_MODES.includes(saved.mincaMode as MincaMode)
        ? (saved.mincaMode as MincaMode)
        : AI_PREFS_DEFAULT.mincaMode,
    }
  } catch {
    /* JSON rusak / storage diblokir → default, bukan error yang membuntuti user */
    return AI_PREFS_DEFAULT
  }
}

/**
 * Simpan preferensi AI — satu pintu untuk baca & tulis kunci yang sama dengan
 * jalur AI capture. Nilai yang dikembalikan = yang benar-benar berlaku: saat
 * localStorage diblokir (mode privat) preferensinya tetap hidup untuk sesi ini,
 * jadi pemanggilnya tidak perlu tahu soal storage sama sekali.
 */
export function writeAiPrefs(prefs: AiPrefs): AiPrefs {
  if (typeof window === 'undefined') return prefs
  try {
    window.localStorage.setItem(AI_PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* storage diblokir / penuh → preferensi tetap berlaku di sesi ini */
  }
  return prefs
}

/**
 * Terapkan preferensi user ke draft hasil AI capture (scan struk / input suara).
 *
 * Ini satu-satunya tempat dua saklar di Pengaturan benar-benar bekerja. Dipakai
 * `useTransactionCapture` saat draft dibentuk, jadi hasilnya selalu terlihat di
 * kartu konfirmasi — user tetap bisa mengoreksi atau mengisi sendiri.
 *
 * Draft aslinya tidak diubah (fungsi murni): yang dikembalikan adalah salinan
 * dengan `category`/`name` dikosongkan sesuai saklar.
 */
export function withCapturePrefs(
  draft: TransactionDraftForm,
  prefs: AiPrefs = readAiPrefs(),
): TransactionDraftForm {
  return {
    ...draft,
    category: prefs.autoCategory ? draft.category : '',
    name: prefs.autoNaming ? draft.name : '',
  }
}

/* ── COPY SAKLAR (tinggal di sini, bukan di JSX — aturan repo) ───────────────
   Kalimatnya menyebut batasnya apa adanya: dua saklar ini berlaku di jalur AI
   capture (struk & suara), sedangkan catatan manual selalu memakai kategori
   pilihan user. Halaman Pengaturan jadi tidak menjanjikan kontrol yang tidak
   ada — dan setelah paket 54 janji itu benar-benar bisa ditepati. */
export const AI_PREFS_COPY = {
  toggles: {
    autoCategory: {
      label: 'Kategorisasi Otomatis oleh AI',
      helper:
        'Khusus scan struk & input suara: kategori diisi Minca dari hasil bacaannya. Kalau dimatikan, kamu yang pilih kategorinya di kartu konfirmasi.',
    },
    autoNaming: {
      label: 'Penamaan Otomatis Transaksi',
      helper:
        'Khusus scan struk & input suara: nama catatan dirapikan Minca (misal "indmrt" → "Indomaret"). Kalau dimatikan, nama kamu isi sendiri.',
    },
  },
  /** batas yang wajib disebut: apa yang TIDAK diubah dua saklar ini */
  manualScopeNote:
    'Catatan yang kamu input manual selalu pakai kategori yang kamu pilih sendiri — dua saklar ini tidak mengubahnya.',
} as const
