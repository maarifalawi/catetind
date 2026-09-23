import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans, Yaldevi } from 'next/font/google'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
})

const yaldevi = Yaldevi({
  weight: '500',
  subsets: ['latin'],
  variable: '--font-yaldevi-colombo',
})

export const metadata: Metadata = {
  title: 'CatetInd — Track. Grow. Secure.',
  description:
    'CatetInd is a modern, minimalist personal finance app to track spending, earnings, and insights.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#e9f1e0',
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jakarta.variable} ${yaldevi.variable}`}
    >
      <body className="font-sans antialiased">
        {children}
        <MobileBottomNav />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
