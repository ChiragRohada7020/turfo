"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Menu, Bell, LogOut } from "lucide-react"
import {
  CalendarDays,
  Clock3,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  ArrowUpRight,
  Share2,
  UserPlus,
  ShieldCheck,
  CalendarCheck,
  Trophy,
  Search,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate, formatTime } from "@/lib/utils"
import { trpc } from "@/lib/trpc"
import { toast } from "@/hooks/use-toast"
import { BookingStatus } from "@prisma/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { QRCodeDisplay } from "@/components/booking/QRCodeDisplay"
import { QRCodeModal } from "@/components/booking/QRCodeModal"
import { ConfirmCancelModal } from "@/components/booking/ConfirmCancelModal"
import { JoinRequestsPanel } from "@/components/booking/JoinRequestsPanel"
import { OpenGameModal } from "@/components/booking/OpenGameModal"

const filters = [
  { label: "All Bookings", value: "all" },
  { label: "My Bookings", value: "MY" },
  { label: "Pending", value: "CONFIRMED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
]

export default function BookingsPage() {
  const { data: session, status } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [statusFilter, setStatusFilter] = useState("CONFIRMED")
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null)
  const [cancelBookingName, setCancelBookingName] = useState("")
  const [cancelRequiresReason, setCancelRequiresReason] = useState(false)
  const [openGameModalOpen, setOpenGameModalOpen] = useState(false)
  const [openGameBookingId, setOpenGameBookingId] = useState<string | null>(null)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [qrBooking, setQrBooking] = useState<any>(null)

  const isOwner = session?.user?.role === "OWNER"
  const { data: myData, isLoading: myLoading, refetch: refetchMy } = trpc.bookings.myBookings.useQuery({
    status:
      statusFilter !== "all" && statusFilter !== "MY"
        ? (statusFilter as BookingStatus)
        : undefined,
    limit: 20,
  }, {
    keepPreviousData: true,
    enabled: !isOwner,
  })
  const { data: ownerData, isLoading: ownerLoading, refetch: refetchOwner } = trpc.bookings.ownerBookings.useQuery({
    status:
      statusFilter !== "all" && statusFilter !== "MY"
        ? (statusFilter as BookingStatus)
        : undefined,
    limit: 20,
  }, {
    keepPreviousData: true,
    enabled: isOwner,
  })

  const data: any = isOwner ? ownerData : myData
  const isLoading: any = isOwner ? ownerLoading : myLoading
  const refetch: any = isOwner ? refetchOwner : refetchMy

  const cancelBooking = trpc.bookings.cancel.useMutation()

  const togglePublic = trpc.bookings.togglePublic.useMutation({
    onSuccess: () => {
      toast({
        title: "Updated successfully",
        description: "Your game visibility has been updated.",
      })
      refetch()
    },
    onError: (e) => {
      toast({
        title: "Error",
        description: e.message,
        variant: "destructive",
      })
    },
  })

  const approveRequest = trpc.bookings.approveJoinRequest.useMutation({
    onSuccess: () => {
      toast({
        title: "Player accepted",
        description: "The player has been added to your game.",
      })
      refetch()
    },
    onError: (e) => {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    },
  })

  const rejectRequest = trpc.bookings.rejectJoinRequest.useMutation({
    onSuccess: () => {
      toast({
        title: "Request rejected",
        description: "The join request has been rejected.",
      })
      refetch()
    },
    onError: (e) => {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    },
  })

  const markAttendance = trpc.bookings.markAttendance.useMutation({
    onSuccess: (result) => {
      toast({
        title: "Attendance updated",
        description: `${result.markedNoShows} no-shows recorded.`,
      })
      refetch()
    },
    onError: (e) => {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    },
  })

  useEffect(() => {
    if (!session) return

    fetch("/api/bookings/cleanup", { method: "POST" })
      .then(() => refetch())
      .catch(() => {})
  }, [session, refetch])

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070d12]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#06110e] flex items-center justify-center px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1c17] p-8 text-center">
          <CalendarDays className="mx-auto mb-5 h-12 w-12 text-orange-400" />
          <h1 className="text-2xl font-bold">Sign in to continue</h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to view and manage your turf bookings.
          </p>
          <Link href="/auth/login?callbackUrl=/dashboard/bookings">
            <Button className="mt-6 w-full bg-orange-400 font-bold text-black hover:bg-orange-300">
              Sign In
            </Button>
          </Link>
                                </div>
                              </div>
    )
  }

  const rawBookings = data?.bookings || []
  const bookings = statusFilter === "MY" ? rawBookings.filter((b: any) => b.userId === session?.user?.id) : rawBookings

  const getStatusStyle = (status: string) => {
    if (isOwner && status === "CONFIRMED") {
      return "bg-amber-500/10 text-amber-400 border-amber-500/20"
    }
    switch (status) {
      case "CONFIRMED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      case "PENDING":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20"
      case "CANCELLED":
        return "bg-red-500/10 text-red-400 border-red-500/20"
      case "COMPLETED":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20"
      default:
        return "bg-white/5 text-slate-300 border-white/10"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <CheckCircle2 className="h-3.5 w-3.5" />
      case "PENDING":
        return <AlertCircle className="h-3.5 w-3.5" />
      case "CANCELLED":
        return <XCircle className="h-3.5 w-3.5" />
      case "COMPLETED":
        return <CheckCircle2 className="h-3.5 w-3.5" />
      default:
        return <Clock3 className="h-3.5 w-3.5" />
    }
  }

  const handleCancel = (booking: any) => {
    setCancelBookingId(booking.id)
    setCancelBookingName(booking.facility?.name || "this booking")
    setCancelRequiresReason(booking.status === "CONFIRMED")
    setCancelModalOpen(true)
  }

  const handleOpenGame = (bookingId: string) => {
    setOpenGameBookingId(bookingId)
    setOpenGameModalOpen(true)
  }

  const handleAttendance = (booking: any) => {
    const attended = prompt(
      "Enter comma-separated names of players who attended (leave empty for none):"
    )

    if (attended === null) return

    const attendedIds = (booking.participants || [])
      .filter((p: any) =>
        attended.toLowerCase().includes(
          p.user?.name?.toLowerCase() || ""
        )
      )
      .map((p: any) => p.userId)

    markAttendance.mutate({
      bookingId: booking.id,
      attendedUserIds: attendedIds,
    })
  }

  return (
    <>
      <Sidebar session={session} mobileOpen={sidebarOpen} onMobileOpenChange={setSidebarOpen} />

      <main className="min-h-screen bg-[#06110e] text-white md:pl-[262px]">
        <header className="sticky top-0 z-20 flex h-[64px] items-center gap-3 border-b border-white/[0.08] bg-[#080f15]/95 px-4 backdrop-blur-xl sm:px-6">
          <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="rounded-lg border border-white/10 p-2 text-slate-300 md:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto" />
          <Link href="/notifications" aria-label="Notifications" className="relative rounded-full border border-white/10 bg-[#121b24] p-2.5 text-slate-300">
            <Bell className="h-4 w-4" />
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex shrink-0 items-center gap-2 rounded-xl p-1.5 hover:bg-white/5">
                <Avatar className="h-9 w-9 border border-white/10">
                  <AvatarImage src={session.user?.image || ""} alt={session.user?.name || "User"} />
                  <AvatarFallback className="bg-orange-400 font-bold text-black">{(session.user?.name || "U")[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-white/10 bg-[#111a22] text-white">
              <DropdownMenuItem>{session.user?.email || "Account"}</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="relative mb-7 overflow-hidden rounded-3xl border border-orange-400/10 bg-[#17233A]">
            <div
              className="absolute inset-0 -z-10 bg-cover bg-center opacity-30"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1551958219-acbc6247805f?w=1800&q=85')"
              }}
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0B1020] via-[#0B1020]/85 to-[#0B1020]/40" />
            <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-orange-400/10 blur-3xl" />
            <div className="relative flex flex-col justify-between gap-5 p-6 sm:p-8 sm:flex-row sm:items-center">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">
                  <CalendarCheck className="h-4 w-4" />
                  Your activity
                </div>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                  My <span className="text-orange-400">Bookings</span>
                </h1>
              </div>

              <Link href={isOwner ? "/dashboard/facilities" : "/search"}>
                 <Button className="h-12 rounded-xl bg-orange-400 px-5 font-bold text-black shadow-lg shadow-orange-400/10 hover:bg-orange-300">
                   <Plus className="mr-2 h-5 w-5" />
                   {isOwner ? "Book Offline" : "Book a Slot"}
                 </Button>
               </Link>
            </div>
          </div>
            {isOwner && (
              <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <OverviewCard label="Total Completed" value={bookings.filter((b: any) => b.status === "COMPLETED").length} icon={<CheckCircle2 />} color="text-green-400" />
                <OverviewCard label="Today Completed" value={bookings.filter((b: any) => b.status === "COMPLETED" && new Date(b.startTime).toDateString() === new Date().toDateString()).length} icon={<CalendarDays />} color="text-blue-400" />
                <OverviewCard label="Pending" value={bookings.filter((b: any) => b.status === "CONFIRMED" || b.status === "PENDING").length} icon={<AlertCircle />} color="text-amber-400" />
                <OverviewCard label="Total Players" value={new Set(bookings.map((b: any) => b.userId)).size} icon={<Users />} color="text-orange-400" />
              </div>
            )}

           {/* Booking overview */}
           {!isOwner && (
           <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <OverviewCard
              label="Bookings shown"
              value={isLoading ? "—" : bookings.length}
              icon={<CalendarDays />}
              color="text-orange-400"
            />
            <OverviewCard
              label="Confirmed"
              value={isLoading ? "—" : bookings.filter((b: any) => b.status === "CONFIRMED").length}
              icon={<ShieldCheck />}
              color="text-emerald-400"
            />
            <OverviewCard
              label="Open games"
              value={isLoading ? "—" : bookings.filter((b: any) => b.isPublic).length}
              icon={<Users />}
              color="text-purple-400"
            />
            <OverviewCard
              label="Completed"
              value={isLoading ? "—" : bookings.filter((b: any) => b.status === "COMPLETED").length}
              icon={<Trophy />}
              color="text-blue-400"
            />
          </div>
           )}

           {/* Filters */}
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                 <h2 className="text-lg font-bold">{isOwner ? "Facility bookings" : "Your reservations"}</h2>
               </div>
              <span className="hidden rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400 sm:inline-flex">
                {bookings.length} shown
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
                    statusFilter === filter.value
                      ? "bg-orange-400 text-black shadow-lg shadow-orange-400/10"
                      : "border border-white/[0.07] bg-[#102019] text-slate-400 hover:border-orange-400/30 hover:text-white"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {isLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-48 animate-pulse rounded-2xl border border-white/5 bg-[#0d1c17]"
                />
              ))}
            </div>
          ) : bookings.length > 0 ? (
            <div className="grid gap-5">
              {bookings.map((booking: any) => {
                const participantCount = booking.participants?.length || 0
                const maxPlayers = Number(booking.maxPlayers || 0)
                const openSeats = maxPlayers > 0
                  ? Math.max(0, maxPlayers - participantCount)
                  : 0

                return (
                  <Card
                    key={booking.id}
                    className="group overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c1b15] transition-all duration-300 hover:border-orange-400/30 hover:bg-[#10231a]"
                  >
                    <CardContent className="p-0">
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                          {/* Booking details */}
                          <div className="min-w-0 flex-1">
                            <div className="mb-4 flex flex-wrap items-center gap-2">
                              <Badge className={`gap-1.5 rounded-full border px-3 py-1 ${getStatusStyle(booking.status)}`}>
                                {getStatusIcon(booking.status)}
                                {isOwner && booking.status === "CONFIRMED" ? "Pending" : booking.status}
                              </Badge>

                              {booking.isPublic && (
                                <Badge className="rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1 text-orange-400">
                                  <Users className="mr-1.5 h-3 w-3" />
                                  Open for players
                                </Badge>
                              )}

                              <Badge className={`rounded-full border px-3 py-1 ${booking.userId === booking.facility?.ownerId ? "border-orange-400/20 bg-orange-400/10 text-orange-300" : "border-sky-400/20 bg-sky-400/10 text-sky-300"}`}>
                                {booking.userId === booking.facility?.ownerId ? "Owner booking" : "Player booking"}
                              </Badge>
                            </div>

                            <div className="flex flex-col gap-4 sm:flex-row">
                               <div className="min-w-0 flex-1">
                                <h3 className="truncate text-xl font-bold text-white sm:text-2xl">
                                  {booking.facility?.name || "Turf booking"}
                                </h3>
                                <p className="mt-1 text-sm text-slate-400">
                                  {booking.court?.name || "Facility booking"}
                                </p>

                                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
                                  <div className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 shrink-0 text-orange-400" />
                                    <span>{formatDate(booking.startTime)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock3 className="h-4 w-4 shrink-0 text-orange-400" />
                                    <span>
                                      {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 shrink-0 text-orange-400" />
                                    <span>{booking.facility?.city || "Location not available"}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 shrink-0 text-orange-400" />
                                     <span>
                                       {booking.user?.name || "Player"}
                                     </span>
                                  </div>
                                </div>

                                 {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && (
                                   <div className="mt-3">
                                     <TimeRemaining startTime={booking.startTime} />
                                   </div>
                                 )}

                                  {!isOwner && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <Button asChild size="sm" className="border-white/10 text-white bg-blue-500 hover:bg-blue-400">
                                        <a href={booking.facility?.latitude && booking.facility?.longitude ? `https://www.google.com/maps/dir/?api=1&destination=${booking.facility.latitude},${booking.facility.longitude}` : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((booking.facility?.address || "") + ", " + (booking.facility?.city || ""))}`} target="_blank" rel="noopener noreferrer">
                                          <MapPin className="mr-1.5 h-3.5 w-3.5" /> Location
                                        </a>
                                      </Button>
                                    </div>
                                  )}

                                  {isOwner && booking.user && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-white/10 text-white hover:bg-white/5"
                                        onClick={() => toast({ title: "Player Details", description: `${booking.user.name || "N/A"} | ${booking.user.email || "N/A"} | ${booking.user.phone || "N/A"}` })}
                                      >
                                        <Users className="mr-1.5 h-3.5 w-3.5" /> Player Details
                                      </Button>
                                    </div>
                                  )}
                              </div>
                            </div>

                            {/* Team requirement / available seats */}
                            {booking.isPublic && (
                              <div className="mt-5 rounded-xl border border-orange-400/15 bg-orange-400/[0.04] p-4">
                                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                  <div>
                                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                                      <UserPlus className="h-4 w-4 text-orange-400" />
                                      Team recruitment
                                    </div>
                                    <p className="mt-1 text-xs text-slate-400">
                                      {maxPlayers > 0
                                        ? `Players needed online: ${maxPlayers}`
                                        : "Your game is visible to other players."}
                                    </p>
                                    {(booking.offlineFriends || 0) > 0 && (
                                      <p className="mt-1 text-xs text-slate-500">
                                        + {booking.offlineFriends} offline friend{booking.offlineFriends > 1 ? "s" : ""} coming
                                      </p>
                                    )}
                                  </div>

                                  {maxPlayers > 0 && (
                                    <div className="flex items-center gap-2">
                                      <span className="rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">
                                        {participantCount}/{maxPlayers} online
                                      </span>
                                      <span className={`rounded-lg px-3 py-2 text-xs font-bold ${
                                        openSeats > 0
                                          ? "bg-orange-400/10 text-orange-400"
                                          : "bg-white/10 text-slate-300"
                                      }`}>
                                        {openSeats > 0
                                          ? `${openSeats} seats open`
                                          : "Team full"}
                                      </span>
                                      <span className="rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-400">
                                        Total: {1 + (booking.offlineFriends || 0) + maxPlayers}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Join requests */}
                            {booking.isPublic &&
                              booking.userId === session?.user?.id && (
                                <div className="mt-4">
                                  <JoinRequestsPanel
                                    bookingId={booking.id}
                                    approveRequest={approveRequest}
                                    rejectRequest={rejectRequest}
                                  />
                                </div>
                              )}

                            {/* QR verification */}
                            {booking.status === "CONFIRMED" && booking.verificationCode && booking.userId !== booking.facility?.ownerId && (
                                <button
                                  onClick={() => {
                                    setQrBooking(booking)
                                    setQrModalOpen(true)
                                  }}
                                  className="mt-5 flex w-full items-center justify-between gap-4 rounded-xl border border-orange-400/20 bg-orange-400/[0.04] p-4 transition hover:border-orange-400/40 hover:bg-orange-400/[0.08]"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-400/10">
                                      <ShieldCheck className="h-6 w-6 text-orange-400" />
                                    </div>
                                    <div className="text-left">
                                      <p className="text-sm font-bold text-white">Booking Verification</p>
                                      <p className="mt-0.5 text-xs text-slate-400">
                                        Tap to view full-screen QR code
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-xs font-semibold text-orange-400">
                                    View QR →
                                  </span>
                                </button>
                              )}

                            {booking.status === "CONFIRMED" && booking.userId === booking.facility?.ownerId && (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch("/api/bookings/verify", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ verificationCode: booking.verificationCode, action: "confirm" }),
                                    })
                                    const data = await res.json()
                                    if (res.ok) {
                                      toast({ title: "Completed", description: "Booking marked as completed." })
                                      window.location.reload()
                                    } else {
                                      toast({ title: "Error", description: data.error || "Failed to complete", variant: "destructive" })
                                    }
                                  } catch (e) {
                                    toast({ title: "Error", description: "Failed to complete booking", variant: "destructive" })
                                  }
                                }}
                                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-400 px-4 py-3 font-bold text-black transition hover:bg-orange-300"
                              >
                                <CheckCircle2 className="h-5 w-5" />
                                Complete Booking
                              </button>
                            )}
                          </div>

                          {/* Price and actions */}
                          <div className="flex shrink-0 flex-row items-center justify-between gap-4 border-t border-white/[0.07] pt-4 lg:w-52 lg:flex-col lg:items-end lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                            <div className="lg:text-right">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                                Total amount
                              </p>
                              <p className="mt-1 text-2xl font-black text-orange-400">
                                {formatCurrency(booking.totalPrice)}
                              </p>
                              <p className="mt-1 text-[10px] text-slate-500">
                                Booked {formatDate(booking.createdAt)}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2 lg:w-full lg:flex-col">
                              {booking.status === "CONFIRMED" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={`h-11 flex-1 rounded-lg border px-4 text-xs font-semibold lg:w-full ${
                                    booking.isPublic
                                      ? "border-orange-400/30 bg-orange-400/10 text-orange-400 hover:bg-orange-400/15"
                                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-orange-400/30 hover:text-orange-400"
                                  }`}
                                  onClick={() => {
                                    if (!booking.isPublic) {
                                      handleOpenGame(booking.id)
                                    } else {
                                      togglePublic.mutate({
                                        bookingId: booking.id,
                                        isPublic: false,
                                      })
                                    }
                                  }}
                                  disabled={togglePublic.isPending}
                                >
                                  <Users className="mr-2 h-4 w-4" />
                                  {booking.isPublic ? "Stop recruiting" : "Find players"}
                                </Button>
                              )}

                              {booking.isPublic &&
                                booking.userId === session?.user?.id &&
                                booking.participants?.length > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-11 flex-1 rounded-lg border-amber-500/20 px-4 text-xs font-semibold text-amber-400 hover:bg-amber-500/10 lg:w-full"
                                    onClick={() => handleAttendance(booking)}
                                    disabled={markAttendance.isPending}
                                  >
                                    {markAttendance.isPending ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
                                    )}
                                    Mark attendance
                                  </Button>
                                )}

                               {(booking.status === "PENDING" ||
                                 booking.status === "CONFIRMED") &&
                                 (isOwner || session?.user?.role === "ADMIN" || booking.userId === session?.user?.id) && (
                                 <>
                                   <Button
                                     variant="outline"
                                     size="sm"
                                     className="h-11 flex-1 rounded-lg border-red-500/25 bg-red-500/[0.04] px-4 text-xs font-semibold text-red-400 hover:bg-red-500/10 lg:w-full"
                                     onClick={() => handleCancel(booking)}
                                     disabled={cancelBooking.isPending}
                                   >
                                     <XCircle className="mr-2 h-4 w-4" />
                                     Cancel booking
                                   </Button>
                                 </>
                               )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-white/[0.07] bg-[#0c1b15] px-5 py-16 text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-orange-400/10 bg-orange-400/[0.06]">
                <CalendarDays className="h-9 w-9 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-white">
                {statusFilter === "all"
                  ? "No bookings yet"
                  : `No ${statusFilter.toLowerCase()} bookings`}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
                {statusFilter === "all"
                  ? "Your turf reservations will appear here. Find a turf and book your first game."
                  : "Try another filter to see your bookings."}
              </p>
              {statusFilter === "all" ? (
                <Link href="/search">
                  <Button className="mt-6 rounded-xl bg-orange-400 px-6 font-bold text-black hover:bg-orange-300">
                    <Search className="mr-2 h-4 w-4" />
                    Explore turfs
                  </Button>
                </Link>
              ) : (
                <Button
                  onClick={() => setStatusFilter("all")}
                  className="mt-6 rounded-xl bg-orange-400 px-6 font-bold text-black hover:bg-orange-300"
                >
                  View all bookings
                </Button>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-white/[0.06] py-5 text-center text-xs text-slate-600 sm:flex-row sm:text-left">
            <p>Strikora · Your games, your team, your turf.</p>
            <p>Manage your reservations in one place.</p>
          </div>
        </div>
      </main>

      {/* Open game modal */}
      <OpenGameModal
        isOpen={openGameModalOpen}
        isLoading={togglePublic.isPending}
        onClose={() => {
          setOpenGameModalOpen(false)
          setOpenGameBookingId(null)
        }}
        onConfirm={(maxPlayers, offlineFriends) => {
          if (openGameBookingId) {
            togglePublic.mutate({
              bookingId: openGameBookingId,
              isPublic: true,
              maxPlayers,
              offlineFriends,
            })
          }
          setOpenGameModalOpen(false)
          setOpenGameBookingId(null)
        }}
      />

      {/* QR code modal */}
      <QRCodeModal
        isOpen={qrModalOpen}
        onClose={() => {
          setQrModalOpen(false)
          setQrBooking(null)
        }}
        booking={qrBooking}
      />

      {/* Cancellation confirmation */}
      <ConfirmCancelModal
        isOpen={cancelModalOpen}
        bookingName={cancelBookingName}
        requiresReason={cancelRequiresReason}
        isLoading={cancelBooking.isPending}
        onCancel={() => setCancelModalOpen(false)}
        onConfirm={async (reason) => {
          if (!cancelBookingId) return

          try {
            await cancelBooking.mutateAsync({
              id: cancelBookingId,
              reason,
            })

            toast({
              title: "Booking cancelled",
              description: "Your booking has been cancelled successfully.",
            })

            setCancelModalOpen(false)
            setCancelBookingId(null)
            refetch()
          } catch (e: any) {
            toast({
              title: "Cancellation failed",
              description: e.message || "Unable to cancel this booking.",
              variant: "destructive",
            })
          }
        }}
      />
    </>
  )
}


function TimeRemaining({ startTime }: { startTime: string | Date }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const start = new Date(startTime)
  const diff = start.getTime() - now.getTime()

  if (diff <= 0) {
    if (diff > -3600000) return <span className="text-orange-400 font-semibold text-xs">Starting now</span>
    return <span className="text-slate-500 text-xs">Started</span>
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  let text = ""
  if (days > 0) text += `${days}d `
  if (hours > 0) text += `${hours}h `
  if (minutes > 0 || (days === 0 && hours === 0)) text += `${minutes}m`

  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400">
      <Clock3 className="h-3 w-3" />
      Starts in {text.trim()}
    </span>
  )
}

function OverviewCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
}) {
  return (
    <Card className="rounded-2xl border border-white/[0.07] bg-[#0c1b15]">
      <CardContent className="flex items-center gap-3 p-4 sm:p-5">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] ${color}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xl font-black text-white">{value}</p>
          <p className="truncate text-[11px] text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
