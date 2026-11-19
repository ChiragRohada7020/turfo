import { Suspense } from "react"
import HomePageContent from "@/components/home/HomePageContent"

export const dynamic = "force-dynamic"

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070d12] flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" /></div>}>
      <HomePageContent />
    </Suspense>
  )
}
