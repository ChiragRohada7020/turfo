"use client"

import { Suspense } from "react"
import RegisterPageContent from "./RegisterPageContent"

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070d12] flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" /></div>}>
      <RegisterPageContent />
    </Suspense>
  )
}