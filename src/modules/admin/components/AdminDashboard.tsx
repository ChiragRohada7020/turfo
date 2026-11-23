"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import {
  Shield,
  Users,
  Building2,
  CalendarDays,
  DollarSign,
  Search as SearchIcon,
  Bell,
  ChevronDown,
  Activity,
  LogOut as LogOutIcon,
  Menu,
  MapPin,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sidebar } from "@/components/layout/Sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { trpc } from "@/lib/trpc"
import { formatCurrency } from "@/lib/utils"

export default function AdminPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data: analytics } = trpc.admin.analytics.useQuery()
  const { data: usersData } = trpc.admin.users.useQuery({ limit: 10 })
  const { data: facilitiesData } = trpc.admin.facilities.useQuery({ limit: 10 })
  const { data: pendingOwnersData } = trpc.admin.pendingOwners.useQuery({ limit: 20 })
  const verifyOwner = trpc.admin.verifyOwner.useMutation({
    onSuccess: () => {
      window.location.reload()
    },
  })

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1020] px-4 text-white">
        <div className="max-w-md w-full bg-[#151E32] border border-white/[0.09] rounded-2xl p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-orange-500 text-white flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold">Admin Access Required</h1>
          <p className="mt-2 text-sm text-slate-400">Please sign in as an admin to access this page.</p>
          <Link href="/auth/login?callbackUrl=/admin" className="mt-6 w-full">
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

  const users = usersData?.users || []
  const facilities = facilitiesData?.facilities || []
  const pendingOwners = pendingOwnersData?.users || []

  const statCards = [
    { label: "Total Users", value: analytics?.totalUsers || 0, icon: <Users className="w-5 h-5" /> },
    { label: "Total Facilities", value: analytics?.totalFacilities || 0, icon: <Building2 className="w-5 h-5" /> },
    { label: "Total Bookings", value: analytics?.totalBookings || 0, icon: <CalendarDays className="w-5 h-5" /> },
    { label: "Revenue", value: formatCurrency(analytics?.totalRevenue || 0), icon: <DollarSign className="w-5 h-5" /> },
  ]

  return (
    <div className="min-h-screen bg-[#0B1020] text-white">
      {sidebarOpen && (
        <button aria-label="Close menu" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden" />
      )}

      <Sidebar session={session} mobileOpen={sidebarOpen} onMobileOpenChange={setSidebarOpen} />

      <div className="min-h-screen md:ml-[262px] bg-[#070d12] text-slate-100">
        <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-white/[0.08] bg-[#0F172A]/90 px-4 backdrop-blur-xl sm:px-6">
          <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="rounded-lg border border-white/10 p-2 text-slate-300 md:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-[#182238] px-3 py-2 text-sm text-slate-300 sm:flex">
            <Shield className="h-4 w-4 text-orange-400" />
            <span className="text-xs font-medium">Admin Panel</span>
          </div>
          <div className="ml-auto" />
          <Link href="/notifications" aria-label="Notifications" className="relative rounded-full border border-white/10 bg-[#182238] p-2.5 text-slate-300">
            <Bell className="h-4 w-4" />
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
                <LogOutIcon className="mr-2 h-4 w-4" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto max-w-[1800px] p-4 sm:p-6 xl:p-7 space-y-6">
          {/* Page Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" /> Platform overview
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Admin Panel</h1>
              <p className="mt-2 text-sm text-slate-400">Manage users, facilities and platform activity from one place.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Activity className="h-4 w-4 text-orange-400" /> Live platform overview
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#1A2740] via-[#172238] to-[#121A2B] p-5 shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-1 hover:border-orange-400/25 hover:shadow-xl hover:shadow-black/20 sm:p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{card.label}</p>
                    <p className="mt-2 text-3xl font-black tracking-tight text-white">{card.value}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-400/15 bg-orange-400/10 text-orange-300 transition-colors group-hover:bg-orange-400/15">
                    {card.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pending Owners */}
          {pendingOwners.length > 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#131C2E] p-5 shadow-xl shadow-black/10 sm:p-6">
              <h3 className="text-lg font-bold mb-4">Pending Owner Approvals ({pendingOwners.length})</h3>
              <div className="space-y-3">
                {pendingOwners.map((owner: any) => (
                  <div key={owner.id} className="flex flex-col gap-4 rounded-xl border border-white/[0.06] bg-white/[0.025] p-4 transition-colors hover:border-orange-400/20 hover:bg-white/[0.045] sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-white">{owner.name || "N/A"}</p>
                      <p className="text-xs text-slate-400">{owner.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="bg-orange-500 font-bold text-white shadow-lg shadow-orange-950/20 transition hover:bg-orange-400" onClick={() => verifyOwner.mutate({ userId: owner.id, action: "VERIFY" })} disabled={verifyOwner.isPending}>Approve</Button>
                      <Button size="sm" variant="outline" className="border-red-500/25 text-red-400 hover:bg-red-500/10" onClick={() => verifyOwner.mutate({ userId: owner.id, action: "REJECT" })} disabled={verifyOwner.isPending}>Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#131C2E] p-6">
            <h3 className="text-lg font-bold mb-4">Recent Users</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-white">
                <thead className="border-b border-white/[0.08]">
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
                        <Badge className={user.role === "ADMIN" ? "bg-red-500/20 text-red-400 border-red-500/40" : user.role === "OWNER" ? "bg-orange-500/20 text-orange-400 border-orange-500/40" : "bg-white/10 text-slate-300 border-white/10"}>{user.role}</Badge>
                      </td>
                      <td className="py-3 text-xs text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Facilities Table */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#131C2E] p-6">
            <h3 className="text-lg font-bold mb-4">Recent Facilities</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-white">
                <thead className="border-b border-white/[0.08]">
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
                        <Badge className={facility.isActive ? "bg-green-500/20 text-green-400 border-green-500/40" : "bg-red-500/20 text-red-400 border-red-500/40"}>
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
