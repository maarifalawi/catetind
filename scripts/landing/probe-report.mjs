/**
 * scripts/landing/probe-report.mjs
 * Ringkas `docs/landing/shots/audit-probe.json` jadi teks yang bisa dibaca
 * cepat: overflow, tap target, kontras, font kecil, alignment, tone, jaringan.
 * Pakai: node scripts/landing/probe-report.mjs [file.json]
 */
import fs from 'node:fs'

const file = process.argv[2] ?? 'docs/landing/shots/audit-probe.json'
const outFile = process.argv[3] ?? null
const lines = []
const log = (value = '') => lines.push(value)
const rows = JSON.parse(fs.readFileSync(file, 'utf8'))

for (const row of rows) {
  log(`\n===== ${row.width}px · doc ${row.docHeight}px =====`)
  log(
    `overflowX=${row.horizontalOverflow} · h1 ${row.headline?.lines} baris @${row.headline?.fontSize} · ` +
      `tap<44=${row.tapTargets.length} · kontras gagal=${row.contrastIssues.length} · font<12=${row.smallText.length}`,
  )
  log(`tone: ${JSON.stringify(row.tone)}`)
  log(`sections: ${row.sections.map((s) => `${s.id ?? s.tag}=${s.height}`).join(' | ')}`)
  log(
    `CTA: ${row.ctas
      .map((cta) => `${cta.name}=${cta.w}x${cta.h}${cta.arrowAtRight ? '→' : ' (no arrow)'}`)
      .join(' | ')}`,
  )
  if (row.headline?.linesText) {
    log(
      `H1 (${row.headline.linesText.length} baris): ${row.headline.linesText
        .map((line, index) => `[${index + 1}] ${line} (${line.split(' ').length} kata)`)
        .join(' | ')}`,
    )
  }
  if (row.failedRequests.length) log(`jaringan: ${row.failedRequests.join(' | ')}`)
  log('alignment:')
  for (const box of row.boxes) {
    log(`  ${box.name.padEnd(14)} ${String(box.left).padStart(4)} → ${String(box.right).padStart(4)} (${box.width})`)
  }
  log('tap target < 44px:')
  for (const tap of row.tapTargets) {
    log(`  ${tap.tag.padEnd(6)} ${String(tap.w).padStart(4)}x${String(tap.h).padEnd(4)} ${(tap.aria ?? tap.text).slice(0, 40)}`)
  }
  log('kontras gagal (ratio < minimum):')
  for (const issue of row.contrastIssues) {
    log(
      `  ${String(issue.ratio).padStart(5)} < ${issue.required} · ${issue.fontSize}px · ${issue.text.slice(0, 38)} · ${issue.color}`,
    )
  }
  log('font < 12px:')
  for (const small of row.smallText) {
    log(`  ${small.fontSize}px · ${small.text.slice(0, 44)} · ${small.color}`)
  }
}

if (outFile) {
  fs.writeFileSync(outFile, lines.join('\n'), 'utf8')
  console.error(`report: ${outFile}`)
} else {
  console.log(lines.join('\n'))
}
