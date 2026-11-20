import { Suspense } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { useSession } from "next-auth/react"

export default function PlaceholderPage() {
  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      <div className="md:pt-0 md:pl-[262px] p-8">
        <h1 className="text-2xl font-bold">Coming Soon</h1>
        <p className="text-slate-400 mt-2">This feature is under development.</p>
      </div>
    </div>
  )
}
