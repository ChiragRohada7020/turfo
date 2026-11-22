"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import {
  CalendarDays, Clock3, MapPin, Users, User,
  Search, Trophy, Zap, Plus, ArrowRight,
  ShieldCheck, Gamepad2, ChevronRight, Loader2,
  CheckCircle, Activity, Menu, LogOut
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import {
  formatCurrency,
  formatDate,
  formatTime
} from "@/lib/utils"

import { trpc } from "@/lib/trpc"
import { toast } from "@/hooks/use-toast"
import { Sidebar } from "@/modules/shared/components/layout/Sidebar"

export default function OpenGamesPage() {
  const { data: session, status } = useSession()
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState("All Games")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const {
    data: openGames,
    isLoading,
    refetch
  } = trpc.bookings.publicBookings.useQuery(
    { limit: 20 },
    {
      keepPreviousData: true,
    }
  )

  const joinBooking = trpc.bookings.joinBooking.useMutation({
    onSuccess: () => {
      toast({
        title: "Request Sent!",
        description: "The host will review your request."
      })
      refetch()
    },
    onError: (e) => {
      toast({
        title: "Unable to join",
        description: e.message,
        variant: "destructive"
      })
    }
  })

  const leaveBooking = trpc.bookings.leaveBooking.useMutation({
    onSuccess: () => {
      toast({
        title: "Left Game",
        description: "You've left this game."
      })
      refetch()
    },
    onError: (e) => {
      toast({
        title: "Error",
        description: e.message,
        variant: "destructive"
      })
    }
  })

  const games = useMemo(() => {
    return (openGames || []).filter((game: any) => {
      const query = search.toLowerCase()

      const searchable = [
        game.facility?.name,
        game.facility?.city,
        game.court?.name,
        game.user?.name
      ].join(" ").toLowerCase()

      return searchable.includes(query)
    })
  }, [openGames, search])

  const totalSpots = (openGames || []).reduce(
    (sum: number, game: any) => sum + Math.max(0, game.spotsLeft || 0),
    0
  )

  const totalPlayers = (openGames || []).reduce(
    (sum: number, game: any) =>
      sum + 1 + (game.participants?.length || 0),
    0
  )

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070d12]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06100e] px-4 text-white">
        <Card className="w-full max-w-md border-white/10 bg-[#182238] text-white">
          <CardContent className="p-8 text-center">
            <Gamepad2 className="mx-auto mb-4 h-12 w-12 text-orange-400" />
            <h1 className="text-2xl font-bold">Join the Game</h1>
            <p className="mt-2 text-sm text-slate-400">
              Sign in to discover and join open games.
            </p>
            <Button asChild className="mt-6 w-full bg-orange-400 font-bold text-black hover:bg-orange-300">
              <Link href="/auth/login?callbackUrl=/dashboard/open-games">
                Sign In
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#06100e] text-white">
      <Sidebar session={session} mobileOpen={sidebarOpen} onMobileOpenChange={setSidebarOpen} />

      <div className="md:pl-[262px]">
 
        {/* TOP NAVIGATION */}
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between gap-4 border-b border-white/[0.07] bg-[#07120f]/95 px-5 backdrop-blur-xl md:px-8">
          <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="rounded-lg border border-white/10 p-2 text-slate-300 md:hidden">
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden w-full max-w-md md:block">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search games, turfs or players..."
                className="h-10 rounded-full border-white/10 bg-white/[0.04] pl-11 text-sm text-white placeholder:text-slate-500 focus:border-orange-400/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-orange-400" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex shrink-0 items-center gap-2 rounded-xl p-1.5 hover:bg-white/5">
                  <Avatar className="h-9 w-9 border border-white/10">
                    <AvatarImage src={session.user?.image || ""} />
                    <AvatarFallback className="bg-orange-400/20 text-orange-400">
                      {session.user?.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-white/10 bg-[#111a22] text-white">
                <DropdownMenuItem>{session.user?.email || "Account"}</DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={() => (window.location.href = "/dashboard")}>
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto max-w-[1700px] space-y-7 p-4 sm:p-6 xl:p-8">

          {/* HERO BANNER */}
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#17233A]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_50%,rgba(249,115,22,0.22),transparent_55%),linear-gradient(110deg,rgba(11,16,32,0.92),rgba(32,37,65,0.72),rgba(11,16,32,0.88))]" />

            <div className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: "linear-gradient(90deg,transparent 49%,rgba(255,255,255,.1) 50%,transparent 51%)",
                backgroundSize: "55px 55px"
              }}
            />

            <div className="relative grid items-center gap-6 p-6 sm:p-9 lg:grid-cols-[1fr_auto]">
              <div>
                <Badge className="mb-4 border-orange-400/20 bg-orange-400/10 text-orange-400">
                  <Zap className="mr-1 h-3 w-3" />
                  JOIN THE ACTION
                </Badge>

                <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                  Open <span className="text-orange-400">Games</span>
                </h1>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    onClick={() => document.getElementById("game-list")?.scrollIntoView({ behavior: "smooth" })}
                    className="h-11 rounded-xl bg-orange-400 px-6 font-bold text-black hover:bg-orange-300"
                  >
                    Explore Games <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <Button asChild variant="outline" className="h-11 rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10">
                    <Link href="/search">
                      <Plus className="mr-2 h-4 w-4" /> Host a Game
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="hidden gap-3 sm:flex">
                <div className="min-w-[135px] rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-md">
                  <Users className="mb-3 h-6 w-6 text-orange-400" />
                  <p className="text-2xl font-black">{openGames?.length || 0}</p>
                  <p className="text-xs text-slate-400">Open Games</p>
                </div>
                <div className="min-w-[135px] rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-md">
                  <Zap className="mb-3 h-6 w-6 text-orange-400" />
                  <p className="text-2xl font-black">{totalSpots}</p>
                  <p className="text-xs text-slate-400">Available Spots</p>
                </div>
              </div>
            </div>
          </section>

          {/* MOBILE SEARCH */}
          <div className="relative md:hidden">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search games or turfs..."
              className="h-12 rounded-xl border-white/10 bg-[#182238] pl-11 text-white"
            />
          </div>

          {/* FILTER BAR */}
          <section id="game-list">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
                {["All Games", "Football", "Cricket", "Badminton", "PS Games"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-full border px-4 py-2.5 text-xs font-semibold transition text-center ${
                      activeFilter === filter
                        ? "border-orange-400 bg-orange-400 text-black"
                        : "border-white/10 bg-[#182238] text-slate-300 hover:border-orange-400/40"
                    }`}
                  >
                    {filter === "All Games" ? "⚽ " : ""}
                    {filter}
                  </button>
                ))}
              </div>

              </div>
          </section>

          {/* CONTENT GRID */}
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">

            {/* GAME LIST */}
            <section className="min-w-0">
              <div className="mb-4 flex items-center justify-between">
                <div>
                   <h2 className="text-xl font-bold">Games Near You</h2>
                 </div>
              </div>

              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-64 animate-pulse rounded-2xl bg-white/5" />
                  ))}
                </div>
              ) : games.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {games.map((game: any) => {
                    const isJoined = game.participants?.some(
                      (p: any) => p.userId === session.user.id
                    )
                    const isPendingRequest = game.joinRequests?.some(
                      (r: any) => r.userId === session.user.id && r.status === "PENDING"
                    )
                    const isHost = game.userId === session.user.id

                    const spotsLeft = game.spotsLeft
                    const totalPlayers = game.totalSpots
                    const currentPlayers = 1 + (game.participants?.length || 0)

                    const progress = totalPlayers > 0
                      ? Math.min(100, (currentPlayers / totalPlayers) * 100)
                      : 0

                    return (
                      <Card
                        key={game.id}
                        className="group overflow-hidden rounded-2xl border-white/[0.09] bg-[#131C2E] transition-all duration-300 hover:-translate-y-1 hover:border-orange-400/40 hover:shadow-[0_15px_40px_rgba(0,0,0,0.3)]"
                      >
                        <CardContent className="p-0">

                          {/* IMAGE */}
                          <div className="relative h-40 overflow-hidden bg-[#17271e]">
                            <img
                              src={game.court?.images?.[0] || game.facility?.images?.[0] || "/placeholder.svg"}
                              alt={game.facility?.name || "Turf"}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />

                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20" />

                            <Badge className="absolute left-3 top-3 border border-orange-400/30 bg-orange-400 text-black shadow-lg">
                              {spotsLeft > 0
                                ? `${spotsLeft} spots left`
                                : "Fully booked"}
                            </Badge>

                            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                              <div>
                                <p className="text-xs font-medium text-white/80">
                                  {game.facility?.city || "Nearby"}
                                </p>
                                <h3 className="text-lg font-bold text-white">
                                  {game.facility?.name || "Sports Turf"}
                                </h3>
                              </div>
                              <div className="rounded-xl border border-white/20 bg-black/50 px-3 py-2 text-right backdrop-blur-md">
                                <p className="text-lg font-black text-orange-400">
                                  {formatCurrency(game.totalPrice)}
                                </p>
                                <p className="text-[10px] text-slate-300">Total price</p>
                              </div>
                            </div>
                          </div>

                          {/* DETAILS */}
                          <div className="space-y-4 p-4">

                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-white">
                                {game.court?.name || "Open Match"}
                              </p>
                              {isHost && (
                                <Badge className="shrink-0 border-blue-400/20 bg-blue-400/10 text-blue-300">
                                  Your Game
                                </Badge>
                              )}
                            </div>

                            {/* DATE AND LOCATION */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <CalendarDays className="h-4 w-4 shrink-0 text-orange-400" />
                                <span>{formatDate(game.startTime)}</span>
                              </div>

                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Clock3 className="h-4 w-4 shrink-0 text-orange-400" />
                                <span>
                                  {formatTime(game.startTime)} - {formatTime(game.endTime)}
                                </span>
                              </div>

                              <div className="col-span-2 flex items-center gap-2 text-xs text-slate-400">
                                <MapPin className="h-4 w-4 shrink-0 text-orange-400" />
                                <span>
                                  {game.court?.name
                                    ? `${game.court.name}, `
                                    : ""}
                                  {game.facility?.city || "Location"}
                                </span>
                              </div>
                            </div>

                            {/* PLAYERS PROGRESS */}
                            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                              <div className="mb-2 flex items-center justify-between">
                                <span className="flex items-center gap-2 text-xs font-semibold">
                                  <Users className="h-4 w-4 text-orange-400" />
                                  Players joined
                                </span>
                                <span className="text-xs font-bold text-orange-400">
                                  {currentPlayers}/{totalPlayers}
                                </span>
                              </div>

                              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>

                              <div className="mt-3 flex items-center justify-between">
                                <div className="flex -space-x-2">
                                  <Avatar className="h-7 w-7 border-2 border-[#0c1916]">
                                    <AvatarImage src={game.user?.image || ""} />
                                    <AvatarFallback className="bg-orange-400/20 text-[10px] text-orange-400">
                                      {game.user?.name?.[0] || "H"}
                                    </AvatarFallback>
                                  </Avatar>

                                  {(game.participants || []).slice(0, 4).map((p: any) => (
                                    <Avatar key={p.userId} className="h-7 w-7 border-2 border-[#0c1916]">
                                      <AvatarImage src={p.user?.avatarUrl || ""} />
                                      <AvatarFallback className="bg-slate-700 text-[10px]">
                                        {p.user?.name?.[0] || "P"}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                </div>

                                <span className="text-[11px] text-slate-500">
                                  {spotsLeft > 0
                                    ? `${spotsLeft} more needed`
                                    : "Game full"}
                                </span>
                              </div>
                            </div>

                            {/* HOST */}
                            <div className="flex items-center justify-between border-t border-white/[0.07] pt-3">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-400/10">
                                  <User className="h-4 w-4 text-orange-400" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-500">Hosted by</p>
                                  <p className="text-xs font-semibold text-white">
                                    {game.user?.name || "Player"}
                                  </p>
                                </div>
                              </div>

                              {game.user?.noShowCount > 0 ? (
                                <Badge className="border-amber-400/20 bg-amber-400/10 text-[10px] text-amber-400">
                                  {game.user.noShowCount} no-shows
                                </Badge>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                  <ShieldCheck className="h-3.5 w-3.5 text-orange-400" />
                                  Host profile
                                </span>
                              )}
                            </div>

                            {/* ACTION */}
                            {isHost ? (
                              <Button disabled className="h-10 w-full bg-blue-400/10 text-blue-300">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                You are hosting this game
                              </Button>
                            ) : isJoined ? (
                              <Button
                                variant="outline"
                                className="h-10 w-full border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500/10"
                                onClick={() => leaveBooking.mutate({ bookingId: game.id })}
                                disabled={leaveBooking.isPending}
                              >
                                {leaveBooking.isPending
                                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  : null}
                                Leave Game
                              </Button>
                            ) : isPendingRequest ? (
                              <Button disabled className="h-10 w-full bg-amber-400/10 text-amber-300">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Reviewing
                              </Button>
                            ) : spotsLeft > 0 ? (
                              <Button
                                className="h-10 w-full bg-orange-400 font-bold text-black shadow-[0_5px_20px_rgba(249,115,22,0.12)] hover:bg-orange-300"
                                onClick={() => joinBooking.mutate({ bookingId: game.id })}
                                disabled={joinBooking.isPending}
                              >
                                {joinBooking.isPending ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Gamepad2 className="mr-2 h-4 w-4" />
                                )}
                                Join Game <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                            ) : (
                              <Button disabled className="h-10 w-full bg-white/5 text-slate-400">
                                Game Full
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-white/10 bg-[#131C2E] px-6 py-16 text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-400/10">
                    <Gamepad2 className="h-8 w-8 text-orange-400" />
                  </div>
                  <h3 className="text-xl font-bold">No Open Games Found</h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
                    No matches are available for your search. Be the first to create a game!
                  </p>
                  <Button asChild className="mt-6 bg-orange-400 font-bold text-black hover:bg-orange-300">
                    <Link href="/search">
                      <Plus className="mr-2 h-4 w-4" /> Book a Turf
                    </Link>
                  </Button>
                </div>
              )}
            </section>

            {/* RIGHT SIDEBAR */}
            <aside className="space-y-5">

              {/* QUICK STATS */}
              <Card className="rounded-2xl border-white/10 bg-[#131C2E]">
                <CardContent className="p-4">
                  <h3 className="mb-4 font-bold">Open Games Stats</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                      <Users className="mb-3 h-5 w-5 text-orange-400" />
                      <p className="text-2xl font-black">{openGames?.length || 0}</p>
                      <p className="text-[11px] text-slate-400">Open Games</p>
                    </div>

                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                      <Zap className="mb-3 h-5 w-5 text-orange-400" />
                      <p className="text-2xl font-black">{totalSpots}</p>
                      <p className="text-[11px] text-slate-400">Spots Available</p>
                    </div>

                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                      <Activity className="mb-3 h-5 w-5 text-blue-400" />
                      <p className="text-2xl font-black">{totalPlayers}</p>
                      <p className="text-[11px] text-slate-400">Players Joined</p>
                    </div>

                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                      <Trophy className="mb-3 h-5 w-5 text-amber-400" />
                      <p className="text-2xl font-black">Play</p>
                      <p className="text-[11px] text-slate-400">Together</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* HOW IT WORKS */}
              <Card className="overflow-hidden rounded-2xl border-orange-400/20 bg-gradient-to-br from-[#142d1c] to-[#0b1712]">
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-orange-400" />
                    <h3 className="font-bold">How Open Games Work</h3>
                  </div>

                  <div className="space-y-4">
                    {[
                      "Discover games near you",
                      "Check available player slots",
                      "Send a request to join",
                      "Play and meet new friends"
                    ].map((item, i) => (
                      <div key={item} className="flex items-center gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-400/15 text-xs font-bold text-orange-400">
                          {i + 1}
                        </div>
                        <p className="text-xs text-slate-300">{item}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* CREATE GAME */}
              <Card className="overflow-hidden rounded-2xl border-white/10 bg-[#131C2E]">
                <CardContent className="relative p-5">
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-orange-400/10 blur-3xl" />

                  <div className="relative">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-400/10">
                      <Users className="h-6 w-6 text-orange-400" />
                    </div>

                    <h3 className="text-lg font-bold">Create Your Own Game</h3>
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      Book a turf, open your match to other players and build your team.
                    </p>

                    <Button asChild className="mt-5 h-11 w-full bg-orange-400 font-bold text-black hover:bg-orange-300">
                      <Link href="/search">
                        <Plus className="mr-2 h-4 w-4" />
                        Book & Host Game
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

            </aside>
          </div>

          {/* BOTTOM BANNER */}
          <section className="flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-orange-400/20 bg-gradient-to-r from-[#15351c] via-[#102319] to-[#07140e] p-5 sm:p-7">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-400/10">
                <Trophy className="h-8 w-8 text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Ready for the next challenge?</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Explore tournaments and compete with other teams.
                </p>
              </div>
            </div>

            <Button asChild className="bg-orange-400 font-bold text-black hover:bg-orange-300">
              <Link href="/tournaments">
                Explore Tournaments <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </section>

        </main>
      </div>
    </div>
  )
}
