/**
 * scripts/landing/extract-framer-spec.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * MENGUBAH EXPORT FRAMER MENJADI SPEC YANG BISA DIBACA MANUSIA.
 *
 * Landing `/` di repo ini di-port dari export Framer (`LP CATETIND.html`).
 * File itu satu dokumen 534 KB berisi markup generated (1.131 class
 * `framer-xxxxx`), 273 KB CSS inline, dan data animasi. Untuk mem-port satu
 * section dengan setia, kita butuh tiga hal dari file itu:
 *
 *   1. pohon markup-nya (tag + class + inline style),
 *   2. aturan CSS untuk class-class tersebut — TERMASUK media query-nya
 *      (layout Framer punya 3 breakpoint: ≥1200, 810–1199.98, ≤809.98),
 *   3. token warna + skala tipografi (12 style preset).
 *
 * Script ini menulis semuanya ke `docs/landing/` supaya porting tidak pernah
 * menebak angka. Bukan bagian dari runtime — hanya alat kerja.
 *
 * Pakai:
 *   node scripts/landing/extract-framer-spec.mjs
 *   node scripts/landing/extract-framer-spec.mjs --section navbar
 * ─────────────────────────────────────────────────────────────────────────────
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SOURCE = path.join(ROOT, 'LP CATETIND.html')
const OUT_DIR = path.join(ROOT, 'docs', 'landing')

if (!fs.existsSync(SOURCE)) {
  console.error(`Sumber tidak ditemukan: ${SOURCE}`)
  process.exit(1)
}

const html = fs.readFileSync(SOURCE, 'utf8')
fs.mkdirSync(OUT_DIR, { recursive: true })

/* ── 1. CSS: parse aturan + media context ───────────────────────────────── */

const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
  .map((m) => m[1])
  .join('\n')

/** @type {{ media: string, selector: string, body: string }[]} */
const rules = []

function parseCss(source) {
  let i = 0
  let media = ''
  let mediaDepth = 0
  let depth = 0
  let buf = ''

  while (i < source.length) {
    const ch = source[i]

    if (ch === '{') {
      const header = buf.trim()
      buf = ''
      depth += 1

      if (header.startsWith('@media') || header.startsWith('@supports')) {
        media = header
        mediaDepth = depth
        i += 1
        continue
      }

      let body = ''
      let d = 1
      i += 1
      while (i < source.length && d > 0) {
        if (source[i] === '{') d += 1
        else if (source[i] === '}') {
          d -= 1
          if (d === 0) break
        }
        body += source[i]
        i += 1
      }
      if (header) rules.push({ media, selector: header, body: body.trim() })
      i += 1
      depth -= 1
      continue
    }

    if (ch === '}') {
      if (depth === mediaDepth && media) {
        media = ''
        mediaDepth = 0
      }
      depth = Math.max(0, depth - 1)
      buf = ''
      i += 1
      continue
    }

    buf += ch
    i += 1
  }
}

parseCss(css)

/* ── Mode query: --class framer-a,framer-b → aturan CSS + media context ─── */

const classQuery = process.argv.includes('--class')
  ? process.argv[process.argv.indexOf('--class') + 1].split(',').map((c) => c.trim()).filter(Boolean)
  : null

if (classQuery) {
  for (const cls of classQuery) {
    console.log(`\n===== .${cls} =====`)
    const hits = rules.filter((r) => r.selector.includes(`.${cls}`))
    if (!hits.length) console.log('(tidak ada aturan)')
    for (const r of hits) console.log(`${r.media ? `${r.media} ` : ''}${r.selector}{${r.body}}`)
  }
  process.exit(0)
}

/* ── 2. Markup utama ─────────────────────────────────────────────────────── */

const mainStart = html.indexOf('<div id="main"')
const svgStart = html.indexOf('<svg id="2047441354"')
const BODY = mainStart >= 0 && svgStart > mainStart ? html.slice(mainStart, svgStart) : ''

const SECTION_BOUNDS = {
  navbar: [
    (() => {
      const at = BODY.indexOf('framer-1pjef6k-container')
      return at < 0 ? -1 : BODY.lastIndexOf('<div', at)
    })(),
    (() => {
      const at = BODY.indexOf('id="hero"')
      return at < 0 ? -1 : BODY.lastIndexOf('<section', at)
    })(),
  ],
  hero: [
    (() => {
      const at = BODY.indexOf('id="hero"')
      return at < 0 ? -1 : BODY.lastIndexOf('<section', at)
    })(),
    (() => {
      const at = BODY.indexOf('id="mission"')
      return at < 0 ? -1 : BODY.lastIndexOf('<section', at)
    })(),
  ],
  /* Section tengah Milestone B. Dicari lewat anchor/id yang memang dipakai
     export (bukan lewat urutan <section>), supaya kalau urutan berubah spec
     tetap menunjuk section yang benar. Batas akhir = awal section berikutnya. */
  mission: [
    (() => {
      const at = BODY.indexOf('id="mission"')
      return at < 0 ? -1 : BODY.lastIndexOf('<section', at)
    })(),
    (() => {
      const at = BODY.indexOf('id="pricing"')
      return at < 0 ? -1 : BODY.lastIndexOf('<section', at)
    })(),
  ],
  pricing: [
    (() => {
      const at = BODY.indexOf('id="pricing"')
      return at < 0 ? -1 : BODY.lastIndexOf('<section', at)
    })(),
    (() => {
      const at = BODY.indexOf('id="faq"')
      return at < 0 ? -1 : BODY.lastIndexOf('<section', at)
    })(),
  ],
  faq: [
    (() => {
      const at = BODY.indexOf('id="faq"')
      return at < 0 ? -1 : BODY.lastIndexOf('<section', at)
    })(),
    (() => {
      const at = BODY.indexOf('data-framer-name="CTA"', BODY.indexOf('id="faq"'))
      return at < 0 ? -1 : BODY.lastIndexOf('<section', at)
    })(),
  ],
  cta: [
    (() => {
      const at = BODY.indexOf('data-framer-name="CTA"', BODY.indexOf('id="faq"'))
      return at < 0 ? -1 : BODY.lastIndexOf('<section', at)
    })(),
    (() => {
      const at = BODY.indexOf('data-framer-name="Footer"')
      if (at < 0) return -1
      return Math.max(BODY.lastIndexOf('<section', at), BODY.lastIndexOf('<div', at))
    })(),
  ],
  footer: [
    (() => {
      const at = BODY.indexOf('data-framer-name="Footer"')
      if (at < 0) return -1
      return Math.max(BODY.lastIndexOf('<section', at), BODY.lastIndexOf('<div', at))
    })(),
    BODY.length,
  ],
}

const SECTION_BOUNDS_OK = Object.fromEntries(
  Object.entries(SECTION_BOUNDS).map(([k, [a, b]]) => [k, a >= 0 && b > a ? [a, b] : null]),
)

/* ── 3. Ringkas markup: tag + class + inline style penting ──────────────── */

const STYLE_KEYS = [
  'align-items',
  'background',
  'background-color',
  'border',
  'border-bottom-left-radius',
  'border-bottom-right-radius',
  'border-radius',
  'border-top-left-radius',
  'border-top-right-radius',
  'bottom',
  'box-shadow',
  'color',
  'display',
  'flex',
  'flex-direction',
  'font-size',
  'gap',
  'height',
  'justify-content',
  'left',
  'max-width',
  'min-height',
  'opacity',
  'padding',
  'position',
  'right',
  'transform',
  'width',
  'z-index',
]

function digest(markup) {
  const lines = []
  const tagRe = /<(div|section|nav|header|footer|p|h1|h2|h3|h4|h5|span|a|ul|li|img|svg|strong|em|button)([^>]*)>/g
  let depth = 0
  let m
  while ((m = tagRe.exec(markup))) {
    const [, tag, attrs] = m
    const cls = /class="([^"]*)"/.exec(attrs)?.[1] ?? ''
    const id = /id="([^"]*)"/.exec(attrs)?.[1] ?? ''
    const name = /data-framer-name="([^"]*)"/.exec(attrs)?.[1] ?? ''
    const style = /style="([^"]*)"/.exec(attrs)?.[1] ?? ''
    const href = /href="([^"]*)"/.exec(attrs)?.[1] ?? ''
    const src = /src="([^"]*)"/.exec(attrs)?.[1] ?? ''
    const keep = style
      .split(';')
      .map((s) => s.trim())
      .filter((s) => {
        const key = s.split(':')[0]?.trim()
        return key && STYLE_KEYS.includes(key)
      })
    const pad = '  '.repeat(Math.min(depth, 8))
    const bits = [tag]
    if (id) bits.push(`#${id}`)
    if (name) bits.push(`[${name}]`)
    if (cls) bits.push(`.${cls.split(/\s+/).filter((c) => c.startsWith('framer-')).join('.')}`)
    if (href) bits.push(`href=${href}`)
    if (src) bits.push(`src=${src.split('/').pop()}`)
    lines.push(`${pad}<${bits.join(' ')}${keep.length ? ` | ${keep.join('; ')}` : ''}`)

    if (!/\/>$/.test(attrs) && tag !== 'img') depth += 1
  }
  return lines.join('\n')
}

/* ── 4. CSS untuk class di satu section ─────────────────────────────────── */

function cssForMarkup(markup) {
  const classes = new Set()
  for (const m of markup.matchAll(/class="([^"]*)"/g)) {
    for (const c of m[1].split(/\s+/)) if (c.startsWith('framer-')) classes.add(c)
  }
  const out = []
  for (const rule of rules) {
    if ([...classes].some((c) => rule.selector.includes(`.${c}`))) {
      const prefix = rule.media ? `${rule.media} ` : ''
      out.push(`${prefix}${rule.selector}{${rule.body}}`)
    }
  }
  return { classes: [...classes], css: out.join('\n') }
}

/* ── Mode digest: --digest=<teks> → ringkasan section yang memuat teks itu ─ */

const digestArg = process.argv.find((a) => a.startsWith('--digest='))
if (digestArg) {
  const needle = digestArg.slice('--digest='.length)
  const at = html.indexOf(needle)
  if (at < 0) {
    console.error(`Teks "${needle}" tidak ditemukan`)
    process.exit(1)
  }
  const start = html.lastIndexOf('<section', at)
  const end = html.indexOf('</section>', at) + '</section>'.length
  const markup = html.slice(start, end)
  const name = needle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
  fs.writeFileSync(path.join(OUT_DIR, `digest-${name}.txt`), digest(markup))
  const { css: sectionCss } = cssForMarkup(markup)
  fs.writeFileSync(path.join(OUT_DIR, `digest-${name}.css`), sectionCss)
  console.log(`digest-${name}: markup ${markup.length} char · css ${sectionCss.length} char`)
  process.exit(0)
}

/* ── 5. Token warna + style preset ──────────────────────────────────────── */

const tokens = [...html.matchAll(/--token-[a-f0-9-]+:\s*([^;]+)/g)]
  .map((m) => m[0].trim())
  .filter((v, i, a) => a.indexOf(v) === i)

const presets = (() => {
  const map = new Map()
  for (const rule of rules) {
    const m = /framer-styles-preset-([a-z0-9]+)/.exec(rule.selector)
    if (!m) continue
    const props = rule.body
      .split(';')
      .map((s) => s.trim())
      .filter(
        (s) =>
          s.startsWith('--framer-font-') ||
          s.startsWith('--framer-text-') ||
          s.startsWith('--framer-line-height') ||
          s.startsWith('--framer-letter-spacing'),
      )
    if (!props.length) continue
    const key = `${m[1]}::${rule.media}`
    map.set(key, props)
  }
  return [...map.entries()].map(([key, props]) => {
    const [preset, media] = key.split('::')
    return { preset, media: media || 'base', props }
  })
})()

fs.writeFileSync(
  path.join(OUT_DIR, 'framer-spec.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: 'LP CATETIND.html',
      breakpoints: [
        '(min-width: 1200px)',
        '(min-width: 810px) and (max-width: 1199.98px)',
        '(max-width: 809.98px)',
      ],
      tokens,
      presets,
    },
    null,
    2,
  ),
)

/* ── 6. Tulis dump per section ──────────────────────────────────────────── */

const wanted = process.argv.includes('--section')
  ? process.argv[process.argv.indexOf('--section') + 1]
  : 'all'

const sections = ['navbar', 'hero', 'mission', 'pricing', 'faq', 'cta', 'footer'].filter(
  (s) => wanted === 'all' || wanted === s,
)

for (const section of sections) {
  const bounds = SECTION_BOUNDS_OK[section]
  if (!bounds) {
    console.warn(`Section ${section} tidak ditemukan`)
    continue
  }
  const markup = BODY.slice(bounds[0], bounds[1])
  fs.writeFileSync(path.join(OUT_DIR, `section-${section}.html`), markup)
  fs.writeFileSync(path.join(OUT_DIR, `section-${section}.digest.txt`), digest(markup))
  const { classes, css: sectionCss } = cssForMarkup(markup)
  fs.writeFileSync(
    path.join(OUT_DIR, `section-${section}.css`),
    `/* ${classes.length} class framer dipakai section "${section}" */\n${sectionCss}\n`,
  )
  console.log(`${section}: markup ${markup.length} char · ${classes.length} class · css ${sectionCss.length} char`)
}

console.log(`tokens: ${tokens.length} · presets: ${presets.length} → docs/landing/framer-spec.json`)

