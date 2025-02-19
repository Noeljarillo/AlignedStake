import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
