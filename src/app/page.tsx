import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import HomePageContent from "@/components/home/HomePageContent"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Strikora | Book Sports Turfs, Courts & Tournaments",
  description:
    "Discover and book sports turfs, courts and facilities near you. Join tournaments, find players, and earn rewards with Strikora.",
  alternates: { canonical: "https://strikora.in" },
}

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  if (session) redirect("/dashboard")

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f0fdf4] flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent" /></div>}>
      <HomePageContent />
    </Suspense>
  )
}
