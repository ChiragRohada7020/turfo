import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { Toaster } from "@/components/ui/toaster"


const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: {
    default: "Turf Booking Platform",
    template: "%s | Turf Booking Platform",
  },
  description: "Book sports facilities - turfs, courts, gyms, pools - with ease",
  keywords: ["sports booking", "turf booking", "court booking", "facility booking", "sports facilities"],
  authors: [{ name: "Turf Booking Platform" }],
  creator: "Turf Booking Platform",
  publisher: "Turf Booking Platform",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://erp.rohadas.in",
    siteName: "Turf Booking Platform",
    title: "Turf Booking Platform",
    description: "Book sports facilities with ease",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Turf Booking Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Turf Booking Platform",
    description: "Book sports facilities with ease",
    images: ["/og-image.png"],
  },
  verification: {
    google: "google-site-verification-code",
  },
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