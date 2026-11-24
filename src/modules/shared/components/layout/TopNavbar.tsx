"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Bell, ChevronDown, Menu, MapPin } from "lucide-react"
import { trpc } from "@/lib/trpc"

interface TopNavbarProps {
  onMenuClick: () => void
  showLocation?: boolean
  location?: string
  searchSlot?: React.ReactNode
}

export function TopNavbar({ onMenuClick, showLocation = false, location, searchSlot }: TopNavbarProps) {
  const { data: session } = useSession()
  const { data: profile } = trpc.auth.getProfile.useQuery(undefined, { enabled: !!session })
  const { toast } = useToast()
  const { data: unreadNotifications } = trpc.notifications.list.useQuery({ isRead: false, limit: 1 }, { refetchInterval: 10000 })
  const prevCount = useRef(0)
  useEffect(() => {
    const count = unreadNotifications?.total ?? 0
    if (count > prevCount.current && prevCount.current !== 0) {
      const latest = unreadNotifications?.notifications?.[0]
      toast({ title: latest?.title || "New Notification", description: latest?.message || "You have a new notification" })
    }
    prevCount.current = count
  }, [unreadNotifications])

  return (
    <header className="sticky top-0 z-20 flex h-[64px] items-center gap-3 border-b border-white/[0.08] bg-[#080f15]/95 px-4 backdrop-blur-xl sm:px-6">
      <button onClick={onMenuClick} aria-label="Open menu" className="rounded-lg border border-white/10 p-2 text-slate-300 md:hidden">
        <Menu className="h-5 w-5" />
      </button>
      {showLocation && (
        <div className="hidden shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-[#121c25] px-3 py-2 text-sm text-slate-300 sm:flex">
          <MapPin className="h-4 w-4" />
          {location || profile?.city || "Your Location"}
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </div>
      )}
      {searchSlot}
      <div className="ml-auto" />
      <Link href="/notifications" aria-label="Notifications" className="relative rounded-full border border-white/10 bg-[#121b24] p-2.5 text-slate-300">
        <Bell className="h-4 w-4" />
        {(unreadNotifications?.total ?? 0) > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />}
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex shrink-0 items-center gap-2 rounded-xl p-1.5 hover:bg-white/5">
            <Avatar className="h-9 w-9 border border-white/10">
              <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || "User"} />
              <AvatarFallback className="bg-lime-400 font-bold text-black">{(session?.user?.name || "U")[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="border-white/10 bg-[#111a22] text-white">
          <DropdownMenuItem>{session?.user?.email || "Account"}</DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}