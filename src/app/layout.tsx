import type { Metadata, Viewport } from 'next'
import { Baloo_2, Lora } from 'next/font/google'
import './globals.css'
import PinGate from '@/components/PinGate'

const baloo2 = Baloo_2({
  variable: '--font-baloo2',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

const lora = Lora({
  variable: '--font-lora',
  subsets: ['latin'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'Book Quest',
  description: 'A magical reading adventure for young readers',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#C8860A',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${baloo2.variable} ${lora.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-parchment text-ink antialiased">
        <PinGate>{children}</PinGate>
      </body>
    </html>
  )
}
