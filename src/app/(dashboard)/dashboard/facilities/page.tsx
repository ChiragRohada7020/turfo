"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Building2, MapPin, Users, CalendarDays, Edit, Trash2, Eye, DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopNavbar } from "@/modules/shared/components/layout/TopNavbar"
import { trpc } from "@/lib/trpc"

export default function FacilitiesPage() {
  const { data: session, status } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { toast } = useToast()
  const { data: facilities, isLoading, refetch } = trpc.facilities.myFacilities.useQuery()
  const deleteFacility = trpc.facilities.delete.useMutation({
    onSuccess: () => { refetch(); setDeleteId(null); toast({ title: "Facility deleted", description: "The facility has been removed.", variant: "success" }) },
    onError: (e) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  })

  const totalRevenue = (facilities || []).reduce((sum: number, f: any) => sum + (f.revenue || 0), 0)
  const totalBookings = (facilities || []).reduce((sum: number, f: any) => sum + (f._count?.bookings || 0), 0)

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1020]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1020] px-4 text-white">
        <div className="max-w-md w-full bg-[#131C2E] border border-white/10 rounded-2xl p-8 text-center">
          <Building2 className="w-12 h-12 text-orange-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Sign In Required</h1>
          <p className="mt-2 text-sm text-slate-400">Please sign in to manage facilities.</p>
          <Link href="/auth/login?callbackUrl=/dashboard/facilities" className="mt-6 w-full">
            <Button className="w-full bg-orange-400 font-bold text-black hover:bg-orange-300">Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B1020] text-white">
      <Sidebar session={session} mobileOpen={sidebarOpen} onMobileOpenChange={setSidebarOpen} />
      <div className="min-h-screen md:pl-[262px]">
        <TopNavbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="max-w-[1800px] mx-auto p-4 sm:p-6 xl:p-7">
        <section className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 bg-[#17233A]">
          <div className="absolute inset-0 -z-10 bg-cover bg-center opacity-60" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1800&q=85')" }} />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_50%,rgba(249,115,22,0.22),transparent_55%),linear-gradient(110deg,rgba(11,16,32,0.92),rgba(32,37,65,0.72),rgba(11,16,32,0.88))]" />
          <div className="absolute inset-0 opacity-20 bg-[linear-gradient(90deg,transparent_49%,rgba(255,255,255,0.08)_50%,transparent_51%)]" />
          <div className="relative flex flex-wrap items-center justify-between gap-6 p-6 sm:p-9">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">
                <Building2 className="h-4 w-4" /> My Facilities
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Welcome, {session?.user?.name?.split(" ")[0] || "Owner"}! <span className="text-orange-400">🏟️</span>
              </h1>
              <p className="mt-2 text-sm text-slate-300 sm:text-base">
                Manage your sports facilities, courts and pricing.
              </p>
            </div>
            <div className="hidden gap-3 sm:flex">
              <div className="min-w-[120px] rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-md">
                <Building2 className="mb-2 h-5 w-5 text-orange-400" />
                <p className="text-xl font-black">{facilities?.length || 0}</p>
                <p className="text-[10px] text-slate-400">Facilities</p>
              </div>
              <div className="min-w-[120px] rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-md">
                <CalendarDays className="mb-2 h-5 w-5 text-amber-400" />
                <p className="text-xl font-black">{(facilities || []).reduce((s: number, f: any) => s + (f._count?.bookings || 0), 0)}</p>
                <p className="text-[10px] text-slate-400">Bookings</p>
              </div>
            </div>
            <Link href="/dashboard/facilities/new">
              <Button className="bg-orange-400 font-bold text-black hover:bg-orange-300">
                <Plus className="h-4 w-4 mr-2" /> Add Facility
              </Button>
            </Link>
          </div>
        </section>

        {/* Revenue summary */}
        {!isLoading && facilities && facilities.length > 0 && (
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-white/[0.08] bg-[#131C2E] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Total Facilities</p>
              <p className="mt-1 text-2xl font-black text-white">{facilities.length}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#131C2E] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Total Bookings</p>
              <p className="mt-1 text-2xl font-black text-white">{totalBookings}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#131C2E] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Total Revenue</p>
              <p className="mt-1 text-2xl font-black text-orange-400">₹{totalRevenue.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#131C2E] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Total Courts</p>
              <p className="mt-1 text-2xl font-black text-white">{facilities.reduce((s: number, f: any) => s + (f._count?.courts || 0), 0)}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-[#131C2E] border-white/10 animate-pulse">
                <div className="h-40 bg-white/5" />
                <CardContent className="p-4">
                  <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : facilities && facilities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {facilities.map((facility: any) => (
               <Card key={facility.id} onClick={() => { window.location.href = "/facility/" + facility.id }} className="bg-[#131C2E] border-white/10 overflow-hidden hover:border-orange-400/30 transition-colors cursor-pointer">
                <div className="relative h-40 overflow-hidden bg-[#1a3027]">
                  <Image src={facility.images?.[0] || "/placeholder.svg"} alt={facility.name} fill sizes="300px" className="object-cover" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Badge className={facility.isActive ? "bg-green-500/15 text-green-300 border-green-500/30" : "bg-red-500/15 text-red-300 border-red-500/30"}>
                      {facility.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg">{facility.name}</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    <MapPin className="h-3 w-3 mr-1 inline" />
                    {facility.city}, {facility.state}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {facility._count?.courts || 0} courts
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {facility._count?.bookings || 0} bookings
                    </span>
                    <span className="flex items-center gap-1 text-orange-400 font-semibold">
                      <DollarSign className="h-3 w-3" />
                      ₹{(facility.revenue || 0).toLocaleString()}
                    </span>
                  </div>
                                     <div className="flex gap-2 mt-4">
                      <Link href={`/facility/${facility.id}?book=1`} className="flex-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" className="w-full bg-orange-400 font-bold text-black hover:bg-orange-300">
                          <CalendarDays className="h-3 w-3 mr-1" /> Book
                        </Button>
                      </Link>
                     <Link href={`/dashboard/facilities/${facility.id}/edit`} className="flex-1" onClick={(e) => e.stopPropagation()}>
                       <Button size="sm" className="w-full bg-orange-400 font-bold text-black hover:bg-orange-300">
                         <Edit className="h-3 w-3 mr-1" /> Edit
                       </Button>
                     </Link>
                     <Button
                       size="sm"
                       variant="outline"
                       className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                       onClick={(e) => { e.stopPropagation(); setDeleteId(facility.id) }}
                       disabled={deleteFacility.isPending}
                     >
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>

                  {/* Recent bookings */}
                  {facility.bookings && facility.bookings.length > 0 && (
                    <div className="mt-4 border-t border-white/[0.06] pt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Recent Bookings</p>
                      <div className="space-y-1.5">
                        {facility.bookings.slice(0, 3).map((b: any) => (
                          <div key={b.id} className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 truncate max-w-[120px]">{b.user?.name || "Player"}</span>
                            <span className="text-slate-500">{new Date(b.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                            <span className="text-orange-400 font-semibold">₹{Number(b.totalPrice).toLocaleString()}</span>
                            <span className={`text-[10px] ${b.status === "CONFIRMED" ? "text-green-400" : b.status === "PENDING" ? "text-amber-400" : "text-red-400"}`}>
                              {b.status}
                            </span>
                          </div>
                        ))}
                      </div>
                      {facility._count?.bookings > 3 && (
                        <Link href="/dashboard/bookings" className="mt-2 block text-[10px] font-semibold text-orange-400 hover:text-lime-300">
                          View all {facility._count.bookings} bookings →
                        </Link>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Building2 className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No facilities yet</h3>
            <p className="text-slate-400 mb-6">Add your first sports facility to start earning</p>
            <Link href="/dashboard/facilities/new">
              <Button className="bg-orange-400 font-bold text-black hover:bg-orange-300">
                <Plus className="h-4 w-4 mr-2" /> Add Facility
              </Button>
            </Link>
          </div>
        )}
      </div>
      </div>

      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null) }}>
        <DialogContent className="bg-[#131C2E] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Delete facility?</DialogTitle>
            <DialogDescription className="text-slate-400">
              This will remove the facility from your active list. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="border-white/10 text-white" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button className="bg-red-500 text-white hover:bg-red-600" disabled={deleteFacility.isPending} onClick={() => deleteId && deleteFacility.mutate({ id: deleteId })}>
              {deleteFacility.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
