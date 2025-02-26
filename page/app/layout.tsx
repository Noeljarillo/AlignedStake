import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'STRK Staking Dashboard',
  description: 'Starknet STRK token staking and delegation dashboard',
  icons: {
    icon: '/favicon-32x32.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
          <div className="relative w-full">
            {children}
          </div>
        </div>
        <Analytics />
      </body>
    </html>
  )
}
