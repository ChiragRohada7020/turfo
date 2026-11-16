"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Clock3, MapPin, Users, DollarSign, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { formatCurrency, formatDate, formatTime } from "@/lib/utils"
import { trpc } from "@/lib/trpc"
import { BookingStatus } from "@prisma/client"

export default function BookingsPage() {
  const { data: session } = useSession()
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const { data, isLoading } = trpc.bookings.myBookings.useQuery({
    status: statusFilter !== "all" ? statusFilter as BookingStatus : undefined,
    limit: 20,
  })

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070d12] px-4 text-white">
        <div className="max-w-md w-full bg-[#111a22] border border-white/10 rounded-2xl p-8 text-center">
          <CalendarDays className="w-12 h-12 text-lime-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Sign In Required</h1>
          <p className="mt-2 text-sm text-slate-400">Please sign in to view your bookings.</p>
          <Link href="/auth/login?callbackUrl=/dashboard/bookings" className="mt-6 w-full">
            <Button className="w-full bg-lime-400 font-bold text-black hover:bg-lime-300">Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  const bookings = data?.bookings || []

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED": return "bg-green-500/15 text-green-300 border-green-500/30"
      case "PENDING": return "bg-amber-500/15 text-amber-300 border-amber-500/30"
      case "CANCELLED": return "bg-red-500/15 text-red-300 border-red-500/30"
      case "COMPLETED": return "bg-blue-500/15 text-blue-300 border-blue-500/30"
      default: return "bg-slate-500/15 text-slate-300 border-slate-500/30"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "CONFIRMED": return <CheckCircle2 className="h-4 w-4" />
      case "PENDING": return <AlertCircle className="h-4 w-4" />
      case "CANCELLED": return <XCircle className="h-4 w-4" />
      case "COMPLETED": return <CheckCircle2 className="h-4 w-4" />
      default: return <Clock3 className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      <div className="max-w-[1800px] mx-auto p-4 sm:p-6 xl:p-7">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
          <p className="mt-1 text-sm text-slate-400">View and manage your bookings</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {["all", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={
                statusFilter === status
                  ? "shrink-0 px-4 py-2 rounded-full text-xs font-semibold bg-lime-400 text-black"
                  : "shrink-0 px-4 py-2 rounded-full text-xs font-semibold bg-[#111a22] text-slate-300 border border-white/10 hover:border-white/20"
              }
            >
              {status === "all" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="bg-[#111a22] border-white/10 animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-white/5 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-white/5 rounded w-1/4 mb-2" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : bookings.length > 0 ? (
          <div className="space-y-3">
            {bookings.map((booking: any) => (
              <Card key={booking.id} className="bg-[#111a22] border-white/10 hover:border-lime-400/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{booking.facility?.name}</h3>
                        <Badge className={getStatusColor(booking.status)}>
                          {getStatusIcon(booking.status)}
                          <span className="ml-1">{booking.status}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">{booking.court?.name || "Facility booking"}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(booking.startTime)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {booking.facility?.city}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-lg text-lime-400">{formatCurrency(booking.totalPrice)}</span>
                      {booking.status === "PENDING" || booking.status === "CONFIRMED" ? (
                        <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <CalendarDays className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No bookings found</h3>
            <p className="text-slate-400 mb-6">Book your first facility to get started</p>
            <Link href="/search">
              <Button className="bg-lime-400 font-bold text-black hover:bg-lime-300">Find Facilities</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
