"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  Shield,
  Users,
  Building2,
  CalendarDays,
  DollarSign,
  Clock,
  ChevronRight,
  Plus,
  AlertCircle,
  Eye,
  Search as SearchIcon,
  Bell,
  MapPin,
  ChevronDown,
  LogOut,
  Gift,
  Trophy,
  Activity,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sidebar } from "@/components/layout/Sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { trpc } from "@/lib/trpc"
import { formatCurrency } from "@/lib/utils"

export default function AdminPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"

  const { data: analytics } = trpc.admin.analytics.useQuery()
  const { data: usersData } = trpc.admin.users.useQuery({ limit: 10 })
  const { data: facilitiesData } = trpc.admin.facilities.useQuery({ limit: 10 })
  const { data: pendingOwnersData } = trpc.admin.pendingOwners.useQuery({ limit: 20 })
  const verifyOwner = trpc.admin.verifyOwner.useMutation({
    onSuccess: () => {
      // refetch
      window.location.reload()
    },
  })

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070d12] px-4 text-white">
        <div className="max-w-md w-full bg-[#111a22] border border-white/10 rounded-2xl p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-lime-400 text-black flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold">Admin Access Required</h1>
          <p className="mt-2 text-sm text-slate-400">Please sign in as an admin to access this page.</p>
          <Link href="/auth/login?callbackUrl=/admin" className="mt-6 w-full">
            <Button className="w-full bg-lime-400 font-bold text-black hover:bg-lime-300">Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070d12] px-4 text-white">
        <div className="max-w-md w-full bg-[#111a22] border border-white/10 rounded-2xl p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold">Admin Access Required</h1>
          <p className="mt-2 text-sm text-slate-400">You don't have admin permissions to access this page.</p>
          <Link href="/dashboard" className="mt-6 w-full">
            <Button className="w-full bg-lime-400 font-bold text-black hover:bg-lime-300">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  const users = usersData?.users || []
  const facilities = facilitiesData?.facilities || []
  const pendingOwners = pendingOwnersData?.users || []

  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      <Sidebar session={session} />

      <div className="ml-[280px] min-h-screen bg-[#070d12] text-white">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-white/10 bg-[#080f15]/95 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#121c25] px-3 py-2 text-sm text-slate-300 sm:flex">
              <Shield className="h-4 w-4 text-lime-400" />
              <span className="text-xs font-medium">Admin Panel</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[590px]">
            <SearchIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              placeholder="Search users, facilities, bookings..."
              className="h-10 w-full rounded-xl border border-white/10 bg-[#121b24] pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-lime-400/50"
            />
          </div>
          <button aria-label="Notifications" className="relative rounded-full border border-white/10 bg-[#121b24] p-2.5 text-slate-300">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex shrink-0 items-center gap-2 rounded-xl p-1.5 hover:bg-white/5">
                <Avatar className="h-9 w-9 border border-white/10">
                  <AvatarImage src={session.user?.image || ""} alt={session.user?.name || "User"} />
                  <AvatarFallback className="bg-lime-400 font-bold text-black">
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
            <DropdownMenuContent align="end" className="border-white/10 bg-[#111a22] text-white">
              <DropdownMenuItem>{session.user?.email || "Account"}</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => {}}>
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto max-w-[1800px] p-4 sm:p-6 xl:p-8 space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Admin Panel</h1>
              <p className="mt-1 text-sm text-slate-400">Platform management and oversight.</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-4">
            <div className="p-4 sm:p-5 rounded-2xl border-white/10 bg-[#0c1916]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">Total Users</p>
                  <p className="text-2xl font-black text-white">{analytics?.totalUsers || 0}</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-400/10 text-blue-400">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl border-white/10 bg-[#0c1916]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">Total Facilities</p>
                  <p className="text-2xl font-black text-white">{analytics?.totalFacilities || 0}</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-400/10 text-green-400">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl border-white/10 bg-[#0c1916]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">Total Bookings</p>
                  <p className="text-2xl font-black text-white">{analytics?.totalBookings || 0}</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-lime-400/10 text-lime-400">
                  <CalendarDays className="w-5 h-5" />
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl border-white/10 bg-[#0c1916]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">Revenue</p>
                  <p className="text-2xl font-black text-white">{formatCurrency(analytics?.totalRevenue || 0)}</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-400/10 text-purple-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Pending Owners */}
          {pendingOwners.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#0c1916] p-6">
              <h3 className="text-lg font-bold mb-4">Pending Owner Approvals ({pendingOwners.length})</h3>
              <div className="space-y-3">
                {pendingOwners.map((owner: any) => (
                  <div key={owner.id} className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                    <div>
                      <p className="font-medium text-white">{owner.name || "N/A"}</p>
                      <p className="text-xs text-slate-400">{owner.email}</p>
                    </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" className="bg-lime-400 font-bold text-black hover:bg-lime-300" onClick={() => verifyOwner.mutate({ userId: owner.id, action: "VERIFY" })} disabled={verifyOwner.isPending}>Approve</Button>
                        <Button size="sm" variant="outline" className="border-red-500/25 text-red-400 hover:bg-red-500/10" onClick={() => verifyOwner.mutate({ userId: owner.id, action: "REJECT" })} disabled={verifyOwner.isPending}>Reject</Button>
                      </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="rounded-2xl border border-white/10 bg-[#0c1916] p-6">
            <h3 className="text-lg font-bold mb-4">Recent Users</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-white">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="pb-3 text-left text-[10px] font-semibold text-slate-400 uppercase">User</th>
                    <th className="pb-3 text-left text-[10px] font-semibold text-slate-400">Role</th>
                    <th className="pb-3 text-left text-[10px] font-semibold text-slate-400">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-white/[0.05]">
                  {users.map((user: any) => (
                    <tr key={user.id} className="hover:bg-white/[0.02]">
                      <td className="py-3">
                        <div className="font-medium text-white">{user.name || "N/A"}</div>
                        <div className="text-xs text-slate-400">{user.email}</div>
                      </td>
                      <td className="py-3">
                        <Badge className="bg-white/10 text-slate-300 border-white/10">{user.role}</Badge>
                      </td>
                      <td className="py-3 text-xs text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Facilities Table */}
          <div className="rounded-2xl border border-white/10 bg-[#0c1916] p-6">
            <h3 className="text-lg font-bold mb-4">Recent Facilities</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-white">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="pb-3 text-left text-[10px] font-semibold text-slate-400 uppercase">Facility</th>
                    <th className="pb-3 text-left text-[10px] font-semibold text-slate-400">Owner</th>
                    <th className="pb-3 text-left text-[10px] font-semibold text-slate-400">City</th>
                    <th className="pb-3 text-left text-[10px] font-semibold text-slate-400">Status</th>
                    <th className="pb-3 text-left text-[10px] font-semibold text-slate-400">Bookings</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-white/[0.05]">
                  {facilities.map((facility: any) => (
                    <tr key={facility.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 font-medium text-white">{facility.name}</td>
                      <td className="py-3 text-xs text-slate-400">{facility.owner?.name || "N/A"}</td>
                      <td className="py-3 text-xs text-slate-400">{facility.city}</td>
                      <td className="py-3">
                        <Badge className={facility.isActive ? "bg-green-500/15 text-green-300 border-green-500/30" : "bg-red-500/15 text-red-300 border-red-500/30"}>
                          {facility.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 text-xs text-slate-400">{facility._count?.bookings || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
