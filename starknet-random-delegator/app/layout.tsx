import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Starknet Random Delegator',
  description: 'Align your stake with a random validator',
  
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
