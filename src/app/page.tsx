import { Suspense } from "react"
import HomePageContent from "@/components/home/HomePageContent"

export const dynamic = "force-dynamic"

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070d12] flex items-center justify-center text-white">Loading...</div>}>
      <HomePageContent />
    </Suspense>
  )
}
