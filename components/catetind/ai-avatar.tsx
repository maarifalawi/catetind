import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Avatar kecil AI Coach — kepala bubble AI & header panel.
 *
 * Dipakai bersama oleh `ai-chat-widget.tsx` (bubble teks) dan
 * `ai-capture-bubble.tsx` (bubble alur voice/scan), jadi wajah Minca di dua
 * tempat itu mustahil berbeda. Diekstrak ke file sendiri ketimbang diekspor
 * dari widget supaya komponen anak tidak perlu mengimpor induknya.
 */
export function AIAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-forest text-mint',
        className ?? 'size-7',
      )}
    >
      <Sparkles className="size-[55%]" strokeWidth={2} />
    </span>
  )
}
