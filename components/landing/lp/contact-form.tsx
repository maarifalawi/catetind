'use client'

import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Mail, Send } from 'lucide-react'
import {
  LP_CONTACT,
  buildContactMailto,
  buildContactWhatsApp,
  type LpContactValues,
} from '@/lib/data/landing'
import { cn } from '@/lib/utils'

/* ── FORM KONTAK (/contact) ─────────────────────────────────────────────────
   Tiga field saja — Nama, Kontak (WhatsApp/Email), Pesan/Pertanyaan. Repo ini
   DEMO tanpa backend email/WhatsApp Business, jadi submit TIDAK berpura-pura
   mengirim ke server:

     · utama    → membuka `https://wa.me/6281775777778?text=…` berisi isi form;
     · cadangan → `mailto:halo@catetind.com` dengan subject + body yang sama.

   Catatan di bawah tombol menjelaskan aplikasi mana yang akan terbuka — bukan
   toast "terkirim". Validasi semua field wajib; error diumumkan lewat
   role="alert" + aria-describedby, dan fokus pindah ke field invalid pertama.
   Semua label/placeholder/teks berasal dari `LP_CONTACT`. */

const ORDER: Array<keyof LpContactValues> = ['name', 'contact', 'question']

type Errors = Partial<Record<keyof LpContactValues, string>>
type Opened = 'whatsapp' | 'email' | null

const INPUT_CLASS =
  'h-12 w-full rounded-[12px] border border-soil/10 bg-canvas px-4 text-[14px] leading-[1.5] text-forest placeholder:text-forest-muted focus-visible:border-forest/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/30'

const LABEL_CLASS = 'text-[14px] font-medium leading-[1.5] text-forest'

const ERROR_CLASS = 'text-[12px] font-medium leading-[1.5] text-hud-terracotta'

export function LandingContactForm() {
  const fields = LP_CONTACT.form.fields
  const [values, setValues] = useState<LpContactValues>({
    name: '',
    contact: '',
    question: '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [opened, setOpened] = useState<Opened>(null)

  const nameRef = useRef<HTMLInputElement>(null)
  const contactRef = useRef<HTMLInputElement>(null)
  const questionRef = useRef<HTMLTextAreaElement>(null)

  const fieldRefs = {
    name: nameRef,
    contact: contactRef,
    question: questionRef,
  }

  const update =
    (key: keyof LpContactValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value
      setValues((previous) => ({ ...previous, [key]: value }))
      setErrors((previous) => ({ ...previous, [key]: undefined }))
      setOpened(null)
    }

  const validate = (): Errors => {
    const next: Errors = {}
    if (!values.name.trim()) next.name = LP_CONTACT.form.errors.name
    if (!values.contact.trim()) next.contact = LP_CONTACT.form.errors.contact
    if (!values.question.trim()) next.question = LP_CONTACT.form.errors.question
    return next
  }

  /** validasi → fokus field pertama yang salah → `true` kalau boleh lanjut */
  const ensureValid = (): boolean => {
    const nextErrors = validate()
    setErrors(nextErrors)
    const firstInvalid = ORDER.find((key) => nextErrors[key])
    if (firstInvalid) {
      fieldRefs[firstInvalid].current?.focus()
      return false
    }
    return true
  }

  const handleWhatsApp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!ensureValid()) return

    const href = buildContactWhatsApp(values)
    /* anchor programatik: tab baru + noopener, tanpa fallback yang bisa
       menavigasi halaman kontak pergi kalau browser memblokir popup. */
    const link = document.createElement('a')
    link.href = href
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.click()
    setOpened('whatsapp')
  }

  const handleEmail = () => {
    if (!ensureValid()) return
    window.location.href = buildContactMailto(values)
    setOpened('email')
  }

  return (
    <form onSubmit={handleWhatsApp} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="landing-contact-name" className={LABEL_CLASS}>
          {fields.name.label}
        </label>
        <input
          ref={nameRef}
          id="landing-contact-name"
          name="name"
          type={fields.name.type}
          required
          aria-required
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'landing-contact-name-error' : undefined}
          autoComplete={fields.name.autoComplete}
          maxLength={fields.name.maxLength}
          placeholder={fields.name.placeholder}
          value={values.name}
          onChange={update('name')}
          className={cn(INPUT_CLASS, errors.name && 'border-hud-terracotta/60')}
        />
        {errors.name ? (
          <p id="landing-contact-name-error" role="alert" className={ERROR_CLASS}>
            {errors.name}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="landing-contact-contact" className={LABEL_CLASS}>
          {fields.contact.label}
        </label>
        {/* type="text": satu kolom menerima nomor WhatsApp ATAU email */}
        <input
          ref={contactRef}
          id="landing-contact-contact"
          name="contact"
          type={fields.contact.type}
          required
          aria-required
          aria-invalid={Boolean(errors.contact)}
          aria-describedby={errors.contact ? 'landing-contact-contact-error' : undefined}
          autoComplete={fields.contact.autoComplete}
          maxLength={fields.contact.maxLength}
          placeholder={fields.contact.placeholder}
          value={values.contact}
          onChange={update('contact')}
          className={cn(INPUT_CLASS, errors.contact && 'border-hud-terracotta/60')}
        />
        {errors.contact ? (
          <p id="landing-contact-contact-error" role="alert" className={ERROR_CLASS}>
            {errors.contact}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="landing-contact-question" className={LABEL_CLASS}>
          {fields.question.label}
        </label>
        <textarea
          ref={questionRef}
          id="landing-contact-question"
          name="question"
          required
          aria-required
          rows={5}
          aria-invalid={Boolean(errors.question)}
          aria-describedby={errors.question ? 'landing-contact-question-error' : undefined}
          autoComplete={fields.question.autoComplete}
          maxLength={fields.question.maxLength}
          placeholder={fields.question.placeholder}
          value={values.question}
          onChange={update('question')}
          className={cn(
            INPUT_CLASS,
            'h-auto min-h-[132px] resize-y py-3',
            errors.question && 'border-hud-terracotta/60',
          )}
        />
        {errors.question ? (
          <p id="landing-contact-question-error" role="alert" className={ERROR_CLASS}>
            {errors.question}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
        <button
          type="submit"
          className="group inline-flex h-12 w-fit items-center gap-3 rounded-[16px] bg-forest p-1 pr-5 text-cream transition-transform duration-200 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-daisy text-forest">
            <Send className="size-5" aria-hidden />
          </span>
          <span className="text-[14px] leading-[1.5]">{LP_CONTACT.form.submit}</span>
        </button>

        <button
          type="button"
          onClick={handleEmail}
          className="inline-flex h-12 w-fit items-center gap-2 rounded-[16px] px-4 text-[14px] font-medium text-forest underline-offset-4 ring-1 ring-soil/12 transition-colors hover:bg-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40"
        >
          <Mail className="size-4" aria-hidden />
          {LP_CONTACT.form.secondaryLabel}
        </button>
      </div>

      {opened ? (
        <p role="status" aria-live="polite" className="text-[12px] leading-[1.5] text-forest-muted">
          {LP_CONTACT.form.afterSubmitNote}
        </p>
      ) : null}
    </form>
  )
}
