import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'
import { Inter } from 'next/font/google'
import './globals.css'
import { metadata as siteMetadata } from './metadata'

const inter = Inter({ subsets: ['latin'] })

// We'll use the metadata from metadata.js
export const metadata: Metadata = siteMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Starknet Staking Dashboard",
              "url": "https://www.starknet-stake.com/",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://www.starknet-stake.com/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </head>
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
