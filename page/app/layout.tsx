import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'
import { Inter, Poppins } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import './enhanced-ui.css'
import { metadata as siteMetadata } from './metadata'
import { ThemeProvider } from '@/components/theme-provider'
import { MainNavigation } from './components/MainNavigation'
import { WalletProvider } from './components/WalletProvider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const poppins = Poppins({
  weight: ['500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
})

// We'll use the metadata from metadata.js
export const metadata: Metadata = siteMetadata;

// Website schema object for structured data
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "AlignedStake",
  "alternateName": ["Starknet Staking Dashboard", "STRK Staking Dashboard", "Starknet Staking Analytics"],
  "url": "https://www.aligned-stake.com/",
  "sameAs": ["https://www.starknet-stake.com/"],
  "description": "The easiest way to stake STRK on Starknet. Find validators, track rewards, view staking analytics and metrics, and learn how to stake STRK tokens safely.",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://www.aligned-stake.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-B4GLJ51ZVF"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-B4GLJ51ZVF');
          `}
        </Script>
        
        <Script
          id="website-schema"
          type="application/ld+json"
          strategy="afterInteractive"
        >
          {JSON.stringify(websiteSchema)}
        </Script>
      </head>
      <body className={`${inter.variable} ${poppins.variable}`}>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <WalletProvider>
            <div className="relative min-h-screen enhanced-gradient" style={{ backgroundColor: 'hsl(var(--background))' }}>
              <div className="absolute inset-0 bg-starknet-pattern opacity-20"></div>
              <div className="relative w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
                <MainNavigation />
                {children}
              </div>
            </div>
          </WalletProvider>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
