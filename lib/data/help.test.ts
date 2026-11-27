import { describe, expect, it } from 'vitest'
import {
  HELP_QUICK_ANSWERS,
  HELP_TOPICS,
  PUBLIC_HELP_COPY,
  searchHelp,
  topicByLabel,
  totalHelpArticles,
} from './help'

/* ── PUSAT BANTUAN: STRUKTUR, NADA, & KEBIJAKAN ──────────────────────────────
   Isi Pusat Bantuan dibaca langsung oleh user yang sedang panik, jadi yang
   dikunci di sini bukan sekadar jumlah: setiap label topik harus benar-benar
   menunjuk topik yang ada, bahasanya memakai "catet/nyatet", dan tidak ada
   janji garansi uang kembali 30 hari yang tidak dimiliki produk. */

const topicCopy = HELP_TOPICS.flatMap((topic) => [
  topic.label,
  topic.blurb,
  ...topic.articles.flatMap((article) => [article.title, ...article.steps, article.proTip ?? '']),
]).join(' ')

describe('HELP_TOPICS — 9 topik & 25 artikel', () => {
  it('jumlah topik dan artikel tetap seperti kontrak halaman', () => {
    expect(HELP_TOPICS).toHaveLength(9)
    expect(totalHelpArticles()).toBe(25)
  })

  it('setiap topik punya label, emoji, blurb, dan minimal satu artikel', () => {
    const ids = new Set<string>()
    for (const topic of HELP_TOPICS) {
      expect(topic.id.trim().length).toBeGreaterThan(0)
      expect(ids.has(topic.id)).toBe(false)
      ids.add(topic.id)
      expect(topic.label.trim().length).toBeGreaterThan(2)
      expect(topic.emoji.trim().length).toBeGreaterThan(0)
      expect(topic.blurb.trim().length).toBeGreaterThan(10)
      expect(topic.articles.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('setiap artikel punya judul, langkah bernomor, dan id unik', () => {
    const ids = new Set<string>()
    for (const topic of HELP_TOPICS) {
      for (const article of topic.articles) {
        expect(article.id.trim().length).toBeGreaterThan(0)
        expect(ids.has(article.id), `${article.id} dobel`).toBe(false)
        ids.add(article.id)
        expect(article.title.trim().length).toBeGreaterThan(8)
        expect(article.steps.length).toBeGreaterThanOrEqual(3)
        for (const step of article.steps) expect(step.trim().length).toBeGreaterThan(8)
      }
    }
  })
})

describe('nada & kosakata Pusat Bantuan', () => {
  it('memakai "catet/nyatet", bukan "catat/mencatat"', () => {
    expect(topicCopy).not.toMatch(/\bmencatat\b/i)
    expect(topicCopy).not.toMatch(/\bcatat\b/i)
    expect(topicCopy).toMatch(/\b(catet|nyatet)\b/i)
  })

  it('tidak ada janji garansi uang kembali 30 hari', () => {
    const copy = JSON.stringify({ topics: HELP_TOPICS, quick: HELP_QUICK_ANSWERS, public: PUBLIC_HELP_COPY })
    expect(copy).not.toMatch(/garansi/i)
    expect(copy).not.toMatch(/uang kembali/i)
    expect(copy).not.toMatch(/refund 30 hari/i)
  })

  it('artikel Refund & Salah Bayar jujur: final, tanpa auto-debit, tetap bisa dibantu', () => {
    const article = HELP_TOPICS.flatMap((topic) => topic.articles).find(
      (item) => item.id === 'langganan-refund',
    )
    expect(article).toBeDefined()
    const copy = article ? [article.title, ...article.steps, article.proTip ?? ''].join(' ') : ''
    expect(copy).toMatch(/final/i)
    expect(copy).toMatch(/tanpa auto-debit/i)
    expect(copy).toMatch(/whatsapp/i)
    expect(copy).toContain('halo@catetind.com')
    expect(copy).not.toMatch(/garansi|uang kembali|30 hari/i)
  })
})

describe('HELP_QUICK_ANSWERS — 5 pertanyaan default', () => {
  it('setiap kartu menunjuk label topik yang benar-benar ada', () => {
    expect(HELP_QUICK_ANSWERS).toHaveLength(5)
    const ids = new Set<string>()
    for (const item of HELP_QUICK_ANSWERS) {
      expect(ids.has(item.id)).toBe(false)
      ids.add(item.id)
      expect(item.question.trim().length).toBeGreaterThan(8)
      expect(item.answer.trim().length).toBeGreaterThan(30)
      expect(topicByLabel(item.topic), `${item.topic} tidak ada`).toBeDefined()
    }
  })

  it('satu kartu ditandai paling sering ditanya (kartu privasi)', () => {
    expect(HELP_QUICK_ANSWERS.filter((item) => item.mostAsked)).toHaveLength(1)
    expect(HELP_QUICK_ANSWERS.find((item) => item.mostAsked)?.id).toBe('dompet-banyak-orang')
  })
})

describe('searchHelp — pencarian tanpa backend', () => {
  it('query kosong = mode idle', () => {
    expect(searchHelp('').idle).toBe(true)
    expect(searchHelp('   ').articles).toEqual([])
  })

  it('kata kunci "dompet" menemukan artikel & jawaban singkat', () => {
    const result = searchHelp('dompet')
    expect(result.idle).toBe(false)
    expect(result.articles.length).toBeGreaterThan(0)
    expect(result.quickAnswers.length).toBeGreaterThan(0)
    expect(result.articles[0].score).toBeGreaterThanOrEqual(1)
  })
})
