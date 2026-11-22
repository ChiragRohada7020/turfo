"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { usePathname } from "next/navigation"
import {
  Home,
  CalendarDays,
  Ticket,
  Users,
  ShieldCheck,
  Trophy,
  Building2,
  Gift,
  Wallet,
  Bell,
  Settings,
  MapPin,
  Menu,
  X,
  LogOut,
  QrCode,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getNavForRole } from "../../constants/navigation"

interface SidebarProps {
  session: any
  extra?: React.ReactNode
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
}

export function Sidebar({ session, extra, mobileOpen, onMobileOpenChange }: SidebarProps) {
  const pathname = usePathname()
  const [internalOpen, setInternalOpen] = useState(false)
  const sidebarOpen = mobileOpen !== undefined ? mobileOpen : internalOpen
  const setSidebarOpen = (v: boolean) => {
    if (onMobileOpenChange) onMobileOpenChange(v)
    else setInternalOpen(v)
  }

  const navItems = getNavForRole(session?.user?.role)

  const active = (href: string) =>
    pathname === href ||
    (href !== "/dashboard" &&
      pathname.startsWith(href + "/") &&
      !navItems.some(
        (item) =>
          item.href !== href &&
          item.href.length > href.length &&
          (pathname === item.href || pathname.startsWith(item.href + "/"))
      ))

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[262px] flex-col overflow-hidden border-r border-white/[0.08] bg-[#080f15] md:flex">
        <Brand />
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 py-6">
          {navItems.map((item) => (
            item.locked ? (
              <div
                key={item.name}
                aria-disabled="true"
                className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium text-slate-500 opacity-50 cursor-not-allowed"
              >
                <item.icon className="h-[18px] w-[18px]" />
                <span className="truncate">{item.name}</span>
                <Lock className="ml-auto h-3.5 w-3.5" />
              </div>
            ) : (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition",
                active(item.href)
                  ? "bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg shadow-orange-950/30"
                  : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span className="truncate">{item.name}</span>
              {item.badge && <span className="ml-auto text-[10px] font-bold text-slate-400">{item.badge}</span>}
            </Link>
            )
          ))}
        </nav>
        {extra && <div className="px-3 py-2">{extra}</div>}
        {session && (
          <div className="border-t border-white/[0.08] p-4 md:hidden">
            <div className="flex items-center justify-between mb-3">
              <Link href="/notifications" onClick={() => setSidebarOpen(false)} className="relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
                <Bell className="h-4 w-4" /> Notifications
                {/* unread badge could go here */}
              </Link>
              <Link href="/dashboard" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
                <Users className="h-4 w-4" /> Profile
              </Link>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* Mobile slide-out sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col overflow-hidden border-r border-white/10 bg-[#080f15] transition-transform md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08]">
          <Brand />
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            className="mr-3 rounded-lg p-2 text-slate-400 hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 py-6">
          {navItems.map((item) => (
            item.locked ? (
              <div
                key={item.name}
                aria-disabled="true"
                className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium text-slate-500 opacity-50 cursor-not-allowed"
              >
                <item.icon className="h-[18px] w-[18px]" />
                <span className="truncate">{item.name}</span>
                <Lock className="ml-auto h-3.5 w-3.5" />
              </div>
            ) : (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition",
                active(item.href)
                  ? "bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg shadow-orange-950/30"
                  : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span className="truncate">{item.name}</span>
              {item.badge && <span className="ml-auto text-[10px] font-bold text-slate-400">{item.badge}</span>}
            </Link>
            )
          ))}
        </nav>
        {extra && <div className="px-3 py-2">{extra}</div>}
        {extra && <div className="px-3 py-2">{extra}</div>}
        {session && (
          <div className="border-t border-white/[0.08] p-4">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full items-center gap-3 px-3 py-2 text-sm text-slate-400"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* Mobile menu button (only when uncontrolled) */}
      {!onMobileOpenChange && (
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          className="fixed top-4 left-4 z-50 rounded-lg border border-white/10 bg-[#080f15] p-2 text-slate-300 md:hidden pointer-events-auto"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
    </>
  )
}

function Brand() {
  return (
    <div className="flex h-[76px] shrink-0 items-center gap-3 border-b border-white/[0.08] px-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-lime-400 text-lime-400">
        <span className="text-lg">🏟️</span>
      </div>
      <div>
        <Link href="/" className="text-[22px] font-black tracking-tight">
          Strikora
        </Link>
        <p className="text-[10px] tracking-wide text-slate-500">Book · Play · Compete</p>
      </div>
    </div>
  )
}
