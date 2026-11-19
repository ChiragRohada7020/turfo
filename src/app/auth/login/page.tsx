"use client"

import { Suspense } from "react"
import LoginPageContent from "./LoginPageContent"

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070d12] flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" /></div>}>
      <LoginPageContent />
    </Suspense>
  )
}