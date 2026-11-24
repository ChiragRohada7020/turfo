"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import {
  Shield,
  Phone,
  Activity,
  ChevronDown,
  LogOut,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sidebar } from "@/components/layout/Sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { WhatsAppAuthCard } from "@/modules/admin/components/WhatsAppAuthCard"

export default function WhatsAppAdminPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1020] px-4 text-white">
        <div className="max-w-md w-full bg-[#151E32] border border-white/[0.09] rounded-2xl p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-orange-500 text-white flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold">Admin Access Required</h1>
          <p className="mt-2 text-sm text-slate-400">Please sign in as an admin to access this page.</p>
          <Link href="/auth/login?callbackUrl=/admin/whatsapp" className="mt-6 w-full">
            <Button className="w-full bg-orange-500 font-bold text-white hover:bg-orange-400">Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1020] px-4 text-white">
        <div className="max-w-md w-full bg-[#151E32] border border-white/[0.09] rounded-2xl p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold">Admin Access Required</h1>
          <p className="mt-2 text-sm text-slate-400">You don't have admin permissions to access this page.</p>
          <Link href="/dashboard" className="mt-6 w-full">
            <Button className="w-full bg-orange-500 font-bold text-white hover:bg-orange-400">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B1020] text-white">
      <Sidebar session={session} />

        <div className="min-h-screen md:ml-[262px] relative z-10 bg-[#070d12] text-slate-100">
        <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-white/[0.08] bg-[#0F172A]/90 px-4 backdrop-blur-xl sm:px-6">
          <div className="hidden shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-[#182238] px-3 py-2 text-sm text-slate-300 sm:flex">
            <Phone className="h-4 w-4 text-orange-400" />
            <span className="text-xs font-medium">WhatsApp OTP</span>
          </div>
          <div className="ml-auto" />
          <Link href="/notifications" aria-label="Notifications" className="relative rounded-full border border-white/10 bg-[#182238] p-2.5 text-slate-300">
            <BellIcon className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex shrink-0 items-center gap-2 rounded-xl p-1.5 hover:bg-white/5">
                <Avatar className="h-9 w-9 border border-white/10">
                  <AvatarImage src={session.user?.image || ""} alt={session.user?.name || "User"} />
                  <AvatarFallback className="bg-orange-500 font-bold text-white">
                    {(session.user?.name || "U")[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-left xl:block">
                  <span className="block max-w-[130px] truncate text-sm font-semibold">{session.user?.name}</span>
                  <span className="block text-xs text-slate-500">{session.user?.role}</span>
                </span>
                <ChevronDown className="hidden h-4 w-4 text-slate-500 xl:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-white/[0.09] bg-[#151E32] text-white">
              <DropdownMenuItem>{session.user?.email || "Account"}</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/auth/login" })} disabled={false}>
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto max-w-[1800px] p-4 sm:p-6 xl:p-7 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" /> WhatsApp OTP Management
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">WhatsApp OTP</h1>
              <p className="mt-2 text-sm text-slate-400">Manage the WhatsApp session and send OTPs to users via WhatsApp.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Activity className="h-4 w-4 text-orange-400" /> Live session
            </div>
          </div>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <WhatsAppAuthCard />

            <div className="rounded-2xl border border-white/[0.08] bg-[#131C2E] p-6 shadow-xl shadow-black/10">
              <h3 className="text-lg font-bold mb-4">OTP Endpoints</h3>
              <div className="space-y-3 text-sm text-slate-400">
                <div className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/[0.02]">
                  <span>POST /api/trpc/auth.sendWhatsAppOTP</span>
                  <span className="text-orange-400 font-mono">phone</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/[0.02]">
                  <span>POST /api/trpc/auth.verifyWhatsAppOTP</span>
                  <span className="text-orange-400 font-mono">phone, otp</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/[0.02]">
                  <span>GET /api/trpc/auth.whatsappStatus</span>
                  <span className="text-orange-400 font-mono">session status</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
