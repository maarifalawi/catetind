/* ── SEMENTARA: probe bug sidebar geser saat sheet filter dibuka (CDP) ───────
   Dipakai sekali untuk memverifikasi perbaikan, lalu dihapus. */
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9333
const URL = process.argv[2] ?? 'http://localhost:3000/history'

const userDataDir = mkdtempSync(path.join(tmpdir(), 'catet-cdp-'))
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--window-size=1700,1000',
    '--no-first-run',
    '--disable-gpu',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function targets() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
  return res.json()
}

let ws
let id = 0
const pending = new Map()

function send(method, params = {}) {
  const msgId = ++id
  ws.send(JSON.stringify({ id: msgId, method, params }))
  return new Promise((resolve, reject) => pending.set(msgId, { resolve, reject }))
}

const PROBE = `(() => {
  const aside = document.querySelector('aside')
  const r = aside?.getBoundingClientRect()
  const chain = []
  let el = aside
  while (el && el !== document.documentElement.parentNode) {
    const cs = getComputedStyle(el)
    chain.push([
      el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 3).join('.') : ''),
      'pos=' + cs.position,
      'ovf=' + cs.overflowY + '/' + cs.overflowX,
      'trf=' + (cs.transform === 'none' ? '-' : cs.transform),
      'h=' + Math.round(el.getBoundingClientRect().height),
    ].join(' | '))
    el = el.parentElement
  }
  return {
    scrollY: Math.round(window.scrollY),
    htmlScrollTop: document.documentElement.scrollTop,
    bodyInline: document.body.getAttribute('style') || '(none)',
    htmlInline: document.documentElement.getAttribute('style') || '(none)',
    bodyAttrs: ['data-scroll-locked', 'data-vaul-no-drag'].map((a) => a + '=' + (document.body.getAttribute(a) ?? '-')).join(' '),
    dialogs: [...document.querySelectorAll('[role="dialog"]')].map((d) => d.getAttribute('aria-label') + ':' + d.getAttribute('data-state')),
    asideTop: r ? Math.round(r.top) : null,
    asideHeight: r ? Math.round(r.height) : null,
    navScrollTop: (() => { const n = document.querySelector('aside nav'); return n ? Math.round(n.scrollTop) : null })(),
    chain,
  }
})()`

async function main() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await targets()).length) break
    } catch {
      /* chrome belum siap */
    }
    await sleep(200)
  }
  const page = (await targets()).find((t) => t.type === 'page')
  ws = new WebSocket(page.webSocketDebuggerUrl)
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id).resolve(msg)
      pending.delete(msg.id)
    }
  }
  await new Promise((r) => (ws.onopen = r))
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.navigate', { url: URL })
  await sleep(4000)

  const evalJs = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.result?.exceptionDetails) return `EXCEPTION: ${r.result.exceptionDetails.text}`
    return r.result?.result?.value
  }

  console.log('1. awal              :', await evalJs(PROBE))
  await evalJs('window.scrollTo(0, 700)')
  await sleep(1000)
  console.log('2. setelah scroll 700:', await evalJs(PROBE))
  await evalJs(`document.querySelector('[aria-label="Filter Dompet"]').click()`)
  await sleep(800)
  console.log('3. sheet terbuka     :', await evalJs(PROBE))
  await evalJs(`document.querySelector('[aria-label="Filter Dompet"]').click()`)
  await sleep(800)
  console.log('4. setelah ditutup   :', await evalJs(PROBE))

  chrome.kill()
  process.exit(0)
}

main().catch((e) => {
  console.error('ERR', e)
  chrome.kill()
  process.exit(1)
})
