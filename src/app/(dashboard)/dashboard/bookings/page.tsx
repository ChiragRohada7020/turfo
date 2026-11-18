"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
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
  { label: "All bookings", value: "all" },
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
]

export default function BookingsPage() {
  const { data: session, status } = useSession()

  const [statusFilter, setStatusFilter] = useState("all")
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null)
  const [cancelBookingName, setCancelBookingName] = useState("")
  const [cancelRequiresReason, setCancelRequiresReason] = useState(false)
  const [openGameModalOpen, setOpenGameModalOpen] = useState(false)
  const [openGameBookingId, setOpenGameBookingId] = useState<string | null>(null)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [qrBooking, setQrBooking] = useState<any>(null)

  const { data, isLoading, refetch } = trpc.bookings.myBookings.useQuery({
    status:
      statusFilter !== "all"
        ? (statusFilter as BookingStatus)
        : undefined,
    limit: 20,
  }, {
    keepPreviousData: true,
  })

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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#06110e] flex items-center justify-center px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1c17] p-8 text-center">
          <CalendarDays className="mx-auto mb-5 h-12 w-12 text-lime-400" />
          <h1 className="text-2xl font-bold">Sign in to continue</h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to view and manage your turf bookings.
          </p>
          <Link href="/auth/login?callbackUrl=/dashboard/bookings">
            <Button className="mt-6 w-full bg-lime-400 font-bold text-black hover:bg-lime-300">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const bookings = data?.bookings || []

  const getStatusStyle = (status: string) => {
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
      <Sidebar session={session} />

      <main className="min-h-screen bg-[#06110e] text-white md:pl-[262px] pt-14 md:pt-0">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="relative mb-7 overflow-hidden rounded-3xl border border-emerald-400/10 bg-[#102c20]">
            <div
              className="absolute inset-0 -z-10 bg-cover bg-center opacity-30"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1551958219-acbc6247805f?w=1800&q=85')"
              }}
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#06110e] via-[#06110e]/85 to-[#06110e]/40" />
            <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-lime-400/10 blur-3xl" />
            <div className="relative flex flex-col justify-between gap-5 p-6 sm:p-8 sm:flex-row sm:items-center">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-lime-400">
                  <CalendarCheck className="h-4 w-4" />
                  Your activity
                </div>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                  My <span className="text-lime-400">Bookings</span>
                </h1>
                <p className="mt-2 max-w-lg text-sm text-slate-400">
                  Manage your reservations, organize your team and invite
                  players to join your game.
                </p>
              </div>

              <Link href="/search">
                <Button className="h-12 rounded-xl bg-lime-400 px-5 font-bold text-black shadow-lg shadow-lime-400/10 hover:bg-lime-300">
                  <Plus className="mr-2 h-5 w-5" />
                  Book a Turf
                </Button>
              </Link>
            </div>
          </div>

          {/* Booking overview */}
          <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <OverviewCard
              label="Bookings shown"
              value={isLoading ? "—" : bookings.length}
              icon={<CalendarDays />}
              color="text-lime-400"
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

          {/* Filters */}
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Your reservations</h2>
                <p className="text-xs text-slate-500">
                  Only bookings made by your account are shown here.
                </p>
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
                      ? "bg-lime-400 text-black shadow-lg shadow-lime-400/10"
                      : "border border-white/[0.07] bg-[#102019] text-slate-400 hover:border-lime-400/30 hover:text-white"
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
                    className="group overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c1b15] transition-all duration-300 hover:border-lime-400/30 hover:bg-[#10231a]"
                  >
                    <CardContent className="p-0">
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                          {/* Booking details */}
                          <div className="min-w-0 flex-1">
                            <div className="mb-4 flex flex-wrap items-center gap-2">
                              <Badge className={`gap-1.5 rounded-full border px-3 py-1 ${getStatusStyle(booking.status)}`}>
                                {getStatusIcon(booking.status)}
                                {booking.status}
                              </Badge>

                              {booking.isPublic && (
                                <Badge className="rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1 text-lime-400">
                                  <Users className="mr-1.5 h-3 w-3" />
                                  Open for players
                                </Badge>
                              )}
                            </div>

                            <div className="flex flex-col gap-4 sm:flex-row">
                              {/* Turf image placeholder */}
                              <div className="flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#173c27] to-[#08130e] sm:w-36">
                                <div className="text-center">
                                  <Trophy className="mx-auto h-8 w-8 text-lime-400/80" />
                                  <span className="mt-2 block text-[10px] font-semibold uppercase tracking-widest text-lime-400/70">
                                    Turf booking
                                  </span>
                                </div>
                              </div>

                              <div className="min-w-0 flex-1">
                                <h3 className="truncate text-xl font-bold text-white sm:text-2xl">
                                  {booking.facility?.name || "Turf booking"}
                                </h3>
                                <p className="mt-1 text-sm text-slate-400">
                                  {booking.court?.name || "Facility booking"}
                                </p>

                                <div className="mt-4 grid gap-3 text-sm text-slate-400 sm:grid-cols-2">
                                  <div className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 shrink-0 text-lime-400" />
                                    <span>{formatDate(booking.startTime)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock3 className="h-4 w-4 shrink-0 text-lime-400" />
                                    <span>
                                      {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 shrink-0 text-lime-400" />
                                    <span>{booking.facility?.city || "Location not available"}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 shrink-0 text-lime-400" />
                                    <span>
                                      {participantCount > 0
                                        ? `${participantCount} players`
                                        : "Player details"}
                                    </span>
                                  </div>
                                </div>

                                {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && (
                                  <div className="mt-3">
                                    <TimeRemaining startTime={booking.startTime} />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Team requirement / available seats */}
                            {booking.isPublic && (
                              <div className="mt-5 rounded-xl border border-lime-400/15 bg-lime-400/[0.04] p-4">
                                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                  <div>
                                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                                      <UserPlus className="h-4 w-4 text-lime-400" />
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
                                          ? "bg-lime-400/10 text-lime-400"
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
                            {booking.status === "CONFIRMED" &&
                              booking.verificationCode && (
                                <button
                                  onClick={() => {
                                    setQrBooking(booking)
                                    setQrModalOpen(true)
                                  }}
                                  className="mt-5 flex w-full items-center justify-between gap-4 rounded-xl border border-lime-400/20 bg-lime-400/[0.04] p-4 transition hover:border-lime-400/40 hover:bg-lime-400/[0.08]"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lime-400/10">
                                      <ShieldCheck className="h-6 w-6 text-lime-400" />
                                    </div>
                                    <div className="text-left">
                                      <p className="text-sm font-bold text-white">Booking Verification</p>
                                      <p className="mt-0.5 text-xs text-slate-400">
                                        Tap to view full-screen QR code
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-xs font-semibold text-lime-400">
                                    View QR →
                                  </span>
                                </button>
                              )}
                          </div>

                          {/* Price and actions */}
                          <div className="flex shrink-0 flex-row items-center justify-between gap-4 border-t border-white/[0.07] pt-4 lg:w-52 lg:flex-col lg:items-end lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                            <div className="lg:text-right">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                                Total amount
                              </p>
                              <p className="mt-1 text-2xl font-black text-lime-400">
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
                                      ? "border-lime-400/30 bg-lime-400/10 text-lime-400 hover:bg-lime-400/15"
                                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-lime-400/30 hover:text-lime-400"
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
                                booking.status === "CONFIRMED") && (
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
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-lime-400/10 bg-lime-400/[0.06]">
                <CalendarDays className="h-9 w-9 text-lime-400" />
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
                  <Button className="mt-6 rounded-xl bg-lime-400 px-6 font-bold text-black hover:bg-lime-300">
                    <Search className="mr-2 h-4 w-4" />
                    Explore turfs
                  </Button>
                </Link>
              ) : (
                <Button
                  onClick={() => setStatusFilter("all")}
                  className="mt-6 rounded-xl bg-lime-400 px-6 font-bold text-black hover:bg-lime-300"
                >
                  View all bookings
                </Button>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-white/[0.06] py-5 text-center text-xs text-slate-600 sm:flex-row sm:text-left">
            <p>TurfPlay · Your games, your team, your turf.</p>
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
    if (diff > -3600000) return <span className="text-lime-400 font-semibold text-xs">Starting now</span>
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
