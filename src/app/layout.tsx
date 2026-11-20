import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { Toaster } from "@/components/ui/toaster"


const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  metadataBase: new URL("https://strikora.in"),
  title: {
    default: "Strikora | Book Sports Turfs, Courts & Tournaments",
    template: "%s | Strikora",
  },
  description:
    "Strikora helps you discover and book sports turfs, courts and facilities near you. Find football, cricket, badminton and more, join tournaments, and earn rewards.",
  keywords: [
    "sports booking",
    "turf booking",
    "football turf",
    "cricket net booking",
    "badminton court booking",
    "sports facility booking",
    "book turf online",
    "tournaments",
    "sports rewards",
    "Strikora",
  ],
  authors: [{ name: "Strikora" }],
  creator: "Strikora",
  publisher: "Strikora",
  applicationName: "Strikora",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://strikora.in",
    siteName: "Strikora",
    title: "Strikora | Book Sports Turfs, Courts & Tournaments",
    description:
      "Discover and book sports turfs, courts and facilities near you. Join tournaments and earn rewards.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Strikora - Book Sports Turfs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Strikora | Book Sports Turfs, Courts & Tournaments",
    description:
      "Discover and book sports turfs, courts and facilities near you. Join tournaments and earn rewards.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://strikora.in",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.mapbox.com" />
        <link rel="dns-prefetch" href="https://api.mapbox.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Strikora",
              url: "https://strikora.in",
              logo: "https://strikora.in/og-image.png",
              description: "Book sports turfs, courts and facilities near you. Join tournaments and earn rewards.",
              sameAs: [],
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground">
        <Providers>
          <main className="min-h-screen">
            {children}
          </main>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}