'use client'

import { hasNotification, notify } from './notification-store'

/* ── PEMBENTUK NOTIFIKASI (satu tempat, dipanggil lapisan data) ───────────────
   Semua kejadian yang layak muncul di lonceng dirumuskan di sini supaya:

     · kalimatnya konsisten (pendek, tanpa basa-basi);
     · nominal TIDAK pernah ditulis ke dalam teks — panel lonceng ikut tombol
       mata privasi, dan teks yang sudah tersimpan tidak bisa disensor;
     · id notifikasi yang butuh ketahanan (jatuh tempo tagihan) stabil, jadi
       membuka halaman berkali-kali tidak menumpuk item yang sama.

   Modul ini SENGAJA tidak mengimpor store uang/tagihan: pemanggilnya yang
   sudah memegang datanya (menghindari impor melingkar). */

export function notifyExpense(category: string): void {
  notify({
    kind: 'expense',
    title: 'Pengeluaran tercatat',
    body: category,
    href: '/history',
  })
}

export function notifyIncome(category: string): void {
  notify({
    kind: 'income',
    title: 'Pemasukan tercatat',
    body: category,
    href: '/history',
  })
}

export function notifySaving(category: string): void {
  notify({
    kind: 'fund',
    title: 'Setoran tabungan tercatat',
    body: category,
    href: '/budget',
  })
}

export function notifyTransfer(fromName: string, toName: string): void {
  notify({
    kind: 'transfer',
    title: 'Pindah dana berhasil',
    body: `${fromName} → ${toName}`,
    href: '/history',
  })
}

export function notifyBillCreated(name: string): void {
  notify({ kind: 'bill', title: 'Tagihan baru dibuat', body: name, href: '/bills' })
}

export function notifyBillPaid(name: string): void {
  notify({ kind: 'bill-paid', title: 'Tagihan dibayar', body: name, href: '/bills' })
}

export interface DueNotificationBill {
  id: string
  name: string
  dueDate: number
  isPaidThisMonth?: boolean
}

/**
 * Notifikasi jatuh tempo: H-3, H-1, dan hari H. `monthKey` + `daysLeft` masuk
 * id, jadi satu tagihan hanya punya satu item per ambang per bulan.
 * `todayDay` dioper pemanggil agar bisa diuji tanpa menggantung jam sistem.
 */
export function notifyBillDue(
  bills: readonly DueNotificationBill[],
  { todayDay, monthKey }: { todayDay: number; monthKey: string },
): void {
  for (const bill of bills) {
    if (bill.isPaidThisMonth) continue
    const daysLeft = bill.dueDate - todayDay
    if (daysLeft !== 3 && daysLeft !== 1 && daysLeft !== 0) continue
    const id = stableNotificationId(`bill-due:${bill.id}:${monthKey}:${daysLeft}`)
    if (hasNotification(id)) continue
    notify({
      id,
      kind: 'bill-due',
      title:
        daysLeft === 0
          ? 'Tagihan jatuh tempo hari ini'
          : daysLeft === 1
            ? 'Tagihan jatuh tempo besok'
            : 'Tagihan jatuh tempo 3 hari lagi',
      body: bill.name,
      href: '/bills',
    })
  }
}

export function notifyFundDeposit(fundName: string): void {
  notify({ kind: 'fund', title: 'Setoran celengan tercatat', body: fundName, href: '/budget' })
}

export function notifyFundWithdraw(fundName: string): void {
  notify({ kind: 'fund', title: 'Dana celengan ditarik', body: fundName, href: '/budget' })
}

export function notifyFundGoal(fundName: string): void {
  notify({ kind: 'fund-goal', title: 'Target celengan tercapai', body: fundName, href: '/budget' })
}

export function notifyJointEntry(actor: string, description: string): void {
  notify({
    kind: 'joint',
    title: 'Catatan baru di Dompet Bersama',
    body: actor ? `${actor}: ${description}` : description,
    href: '/joint',
  })
}

export function notifyJointSettle(monthLabel: string): void {
  notify({
    kind: 'settle',
    title: 'Dompet Bersama sudah settle',
    body: monthLabel,
    href: '/joint',
  })
}

/** dipanggil setelah pengeluaran dicatat; `percent` = pemakaian budget kategori */
/** id notifikasi harus UUID yang sah: kolom `notifications.id` bertipe uuid.
 *  Id stabil dari kunci teks (mis. `budget:Makanan:warn:2026-11`) dulu dikirim
 *  apa adanya → INSERT ditolak server, jadi item hanya hidup di perangkat.
 *  Hash di bawah deterministik (kunci sama = uuid sama) dan berformat v4. */
export function stableNotificationId(key: string): string {
  let a = 0x811c9dc5
  let b = 0x01000193
  let c = 0x9e3779b9
  let d = 0x85ebca6b
  for (let i = 0; i < key.length; i += 1) {
    const code = key.charCodeAt(i)
    a = Math.imul(a ^ code, 0x01000193) >>> 0
    b = Math.imul(b + code, 0x85ebca6b) >>> 0
    c = Math.imul(c ^ (code << (i % 5)), 0xc2b2ae35) >>> 0
    d = Math.imul(d + (code * (i + 1)), 0x27d4eb2f) >>> 0
  }
  const hex = [a, b, c, d].map((n) => n.toString(16).padStart(8, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

export function notifyBudgetThreshold(category: string, percent: number): void {
  if (percent < 80) return
  const over = percent >= 100
  const id = stableNotificationId(`budget:${category}:${over ? 'over' : 'warn'}:${new Date().toISOString().slice(0, 7)}`)
  if (hasNotification(id)) return
  notify({
    id,
    kind: 'budget',
    title: over ? 'Budget kategori terlampaui' : 'Budget kategori hampir habis',
    body: category,
    href: '/budget',
  })
}
