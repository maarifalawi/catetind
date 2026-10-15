/* ── IDENTITAS MESIN AI YANG DILIHAT PUBLIK ───────────────────────────────────
   Nama di berkas ini yang muncul di UI (Pengaturan → AI, label status) dan di
   field `model` pada balasan route AI. Sebelumnya nama PENYEDIA bocor ke tiga
   permukaan sekaligus: copy UI (`AI_STATUS_COPY`), bundel klien, dan field
   `model` di `/api/ai/text`, `/api/ai/ocr`, `/api/ai/categorize`, dan
   `/api/parse-voice` — jadi tidak ada satu tempat pun untuk mengubahnya.
   Sekarang satu nama publik = satu berkas.

   ATURAN BERKAS INI (jangan dilanggar):
     · Isinya merek PRODUK SENDIRI ("Minca Engine"), bukan merek model pihak
       lain. DILARANG mengisi nama model/penyedia yang tidak dipakai app ini
       (mis. merek model kompetitor): itu klaim palsu ke pembeli yang membayar,
       sekaligus tabrakan merek — dan pembeli yang sadar berhak menuntut refund.
     · Nama penyedia yang SEBENARNYA tetap wajib disebut di dokumen hukum
       (`lib/legal/privacy.ts`, bagian "Pihak ketiga"): user punya hak tahu
       siapa yang memproses datanya (UU PDP). Berkas ini TIDAK boleh dipakai
       untuk menutupi hal itu — yang disembunyikan adalah merek di UI/marketing,
       bukan identitas pemroses data.
     · Berkas ini bebas env, jaringan, dan JSX → aman dipakai klien & server. */

/** nama mesin yang ditampilkan ke user (huruf apa adanya, siap dibaca) */
export const AI_ENGINE_NAME = 'Minca Engine v1'

/** nilai field `model` di balasan API — bentuk mesin: huruf kecil, tanpa spasi */
export const AI_ENGINE_ID = 'minca-engine-v1'
