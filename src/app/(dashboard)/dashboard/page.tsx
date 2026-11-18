"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  Activity,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  DollarSign,
  Gift,
  Home,
  LogOut,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Ticket,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  X,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { formatDate, formatTime } from "@/lib/utils"
import { trpc } from "@/lib/trpc"
import { QRCodeModal } from "@/components/booking/QRCodeModal"
import { BookingStatus } from "@prisma/client"

const PLAYER_NAV = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Book a Turf", href: "/search", icon: CalendarDays },
  { name: "My Bookings", href: "/dashboard/bookings", icon: Ticket },
  { name: "Open Games", href: "/dashboard/open-games", icon: Users },
  { name: "Find Players", href: "/find-players", icon: Users },
  { name: "Teams", href: "/dashboard/teams", icon: ShieldCheck },
  { name: "Tournaments", href: "/tournaments", icon: Trophy },
  { name: "Offers & Rewards", href: "/offers", icon: Gift },
  { name: "Wallet", href: "/wallet", icon: Wallet, badge: "Rs.2,500" },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Support", href: "/help", icon: ShieldCheck },
]

const OWNER_NAV = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "My Facilities", href: "/dashboard/facilities", icon: Building2 },
  { name: "Add Facility", href: "/dashboard/facilities/new", icon: CalendarDays },
  { name: "Bookings", href: "/dashboard/bookings", icon: Ticket },
  { name: "Payouts", href: "/dashboard/payouts", icon: Wallet },
  { name: "Analytics", href: "/dashboard/analytics", icon: TrendingUp },
  { name: "Offers", href: "/offers", icon: Gift },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Support", href: "/help", icon: ShieldCheck },
]

const MOCK_TURFS = [
  { id: "1", name: "Pachora Turf Arena", city: "Pachora, Jalgaon", distance: "1.2 km", price: 1200, rating: 4.8, reviews: 126, image: "/placeholder.svg", sports: ["Football", "Cricket"] },
  { id: "2", name: "GreenField Turf", city: "Pachora", distance: "2.4 km", price: 1000, rating: 4.7, reviews: 89, image: "/placeholder.svg", sports: ["Football", "Box Cricket"] },
  { id: "3", name: "Champion Turf", city: "Pachora", distance: "3.1 km", price: 1500, rating: 4.6, reviews: 64, image: "/placeholder.svg", sports: ["Football", "Cricket", "Multi-Sport"] },
]


function formatINR(value: number) {
  return "Rs." + value.toLocaleString("en-IN")
}

export default function DashboardPage() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [qrBooking, setQrBooking] = useState<any>(null)
  const [activeSport, setActiveSport] = useState("All Sports")

  const { data: upcomingBookings, isLoading: isLoadingBookings } = trpc.bookings.upcoming.useQuery()
  const upcoming = upcomingBookings ?? []
  const myBooking = upcoming[0] ?? null

  const { data: myFacilities } = trpc.facilities.myFacilities.useQuery(undefined, { keepPreviousData: true })

  const active = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"))

  if (status === "loading") return <DashboardSkeleton />

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070d12] px-4 text-white">
        <Card className="w-full max-w-md border-white/10 bg-[#111a22] text-white">
          <CardContent className="p-8 text-center">
            <Activity className="mx-auto mb-4 h-12 w-12 text-lime-400" />
            <h1 className="text-2xl font-bold">Sign In Required</h1>
            <p className="mt-2 text-sm text-slate-400">Please sign in to access your dashboard.</p>
            <Button asChild className="mt-6 w-full bg-lime-400 font-bold text-black hover:bg-lime-300">
              <Link href="/auth/login?callbackUrl=/dashboard">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const playerName = session.user?.name || "Player"
  const firstName = playerName.split(" ")[0]
  const role = session.user?.role || "PLAYER"
  const isOwner = role === "OWNER" || role === "ADMIN"
  const isAdmin = role === "ADMIN"

  const navItems = isOwner ? OWNER_NAV : PLAYER_NAV

  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      {sidebarOpen && (
        <button aria-label="Close menu" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden" />
      )}

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[262px] flex-col overflow-hidden border-r border-white/[0.08] bg-[#080f15] md:flex">
        <Brand />
        <Sidebar items={navItems} active={active} />
        <InviteFriends />
        <div className="border-t border-white/[0.08] p-4">
          <button onClick={() => signOut({ callbackUrl: "/" })} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col overflow-hidden border-r border-white/10 bg-[#080f15] transition-transform md:hidden", sidebarOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center justify-between">
          <Brand />
          <button onClick={() => setSidebarOpen(false)} aria-label="Close menu" className="mr-3 rounded-lg p-2 text-slate-400 hover:bg-white/5">
            <X className="h-5 w-5" />
          </button>
        </div>
        <Sidebar items={navItems} active={active} onNavigate={() => setSidebarOpen(false)} />
        <InviteFriends />
        <div className="border-t border-white/[0.08] p-4">
          <button onClick={() => signOut({ callbackUrl: "/" })} className="flex w-full items-center gap-3 px-3 py-2 text-sm text-slate-400">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      <div className="min-h-screen md:pl-[262px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-white/[0.08] bg-[#080f15]/95 px-4 backdrop-blur-xl sm:px-6">
          <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="rounded-lg border border-white/10 p-2 text-slate-300 md:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-[#121c25] px-3 py-2 text-sm text-slate-300 sm:flex">
            <MapPin className="h-4 w-4" />
            Pachora, MH
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </div>
          <div className="ml-auto" />
          <button aria-label="Notifications" className="relative rounded-full border border-white/10 bg-[#121b24] p-2.5 text-slate-300">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex shrink-0 items-center gap-2 rounded-xl p-1.5 hover:bg-white/5">
                <Avatar className="h-9 w-9 border border-white/10">
                  <AvatarImage src={session.user?.image || ""} alt={playerName} />
                  <AvatarFallback className="bg-lime-400 font-bold text-black">{playerName[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="hidden text-left xl:block">
                  <span className="block max-w-[130px] truncate text-sm font-semibold">{playerName}</span>
                  <span className="block text-xs text-slate-500">{role}</span>
                </span>
                <ChevronDown className="hidden h-4 w-4 text-slate-500 xl:block" />
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

        <main className="mx-auto max-w-[1800px] p-4 sm:p-6 xl:p-7">
          {isOwner ? <OwnerDashboard session={session} myFacilities={myFacilities} /> : <PlayerDashboard session={session} upcoming={upcoming} myBooking={myBooking} isLoading={isLoadingBookings} setQrBooking={setQrBooking} setQrModalOpen={setQrModalOpen} />}
        </main>
      </div>

      <QRCodeModal
        isOpen={qrModalOpen}
        onClose={() => {
          setQrModalOpen(false)
          setQrBooking(null)
        }}
        booking={qrBooking}
      />
    </div>
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

function PlayerDashboard({ session, upcoming, myBooking, isLoading, setQrBooking, setQrModalOpen }: any) {
  const playerName = session.user?.name || "Player"
  const firstName = playerName.split(" ")[0]

  return (
    <>
      <section className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 bg-[#10251a]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_50%,rgba(34,197,94,0.2),transparent_55%),linear-gradient(110deg,#07150f,#12351d_60%,#07120f)]" />
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(90deg,transparent_49%,rgba(255,255,255,0.08)_50%,transparent_51%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-6 p-6 sm:p-9">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-lime-400">
              <Activity className="h-4 w-4" /> Dashboard
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Hi {firstName}! <span className="text-lime-400">👋</span>
            </h1>
            <p className="mt-2 text-sm text-slate-300 sm:text-base">
              Book your next match, find players and stay in the game!
            </p>
          </div>
          <div className="hidden gap-3 sm:flex">
            <div className="min-w-[120px] rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-md">
              <CalendarDays className="mb-2 h-5 w-5 text-lime-400" />
              <p className="text-xl font-black">{upcoming.length}</p>
              <p className="text-[10px] text-slate-400">Upcoming</p>
            </div>
            <div className="min-w-[120px] rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-md">
              <Trophy className="mb-2 h-5 w-5 text-amber-400" />
              <p className="text-xl font-black">{MOCK_TURFS.length}</p>
              <p className="text-[10px] text-slate-400">Turfs Nearby</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <QuickAction href="/search" title="Book a Turf" subtitle="Find & book slots" icon={CalendarDays} primary />
        <QuickAction href="/find-players" title="Find Players" subtitle="Join or create a match" icon={Users} />
        <QuickAction href="/dashboard/teams" title="Create Team" subtitle="Build your squad" icon={ShieldCheck} />
        <QuickAction href="/tournaments" title="Tournaments" subtitle="Register & compete" icon={Trophy} />
      </section>

      <Card className="mb-6 overflow-hidden rounded-2xl border-white/10 bg-[#0c1916]">
        <CardHeader className="flex flex-row items-center justify-between px-5 pb-3 pt-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-bold">Your Next Booking</CardTitle>
            <Badge className="border border-green-400/20 bg-green-500/15 text-green-300 hover:bg-green-500/15">
              {myBooking ? "Confirmed" : "No booking"}
            </Badge>
          </div>
          <Link href="/dashboard/bookings" className="text-xs font-semibold text-lime-300 hover:text-lime-200">View all <ChevronRight className="inline h-3.5 w-3.5" /></Link>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {isLoading ? (
            <div className="h-32 animate-pulse rounded-xl bg-white/5" />
          ) : myBooking ? (
            <div className="grid gap-4 rounded-xl border border-white/[0.08] bg-[#17222d] p-4 sm:grid-cols-[190px_minmax(0,1fr)_auto] sm:items-center">
              <div className="relative h-32 overflow-hidden rounded-lg bg-[#263a32] sm:h-[120px]">
                <Image src="/placeholder.svg" alt="Booked turf" fill sizes="200px" className="object-cover" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold">{myBooking.facility?.name || "Your booked turf"}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400"><MapPin className="h-4 w-4" />{myBooking.facility?.address || "Pachora, Maharashtra"}</p>
                <Badge className="mt-3 border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/[0.06]">Football</Badge>
                <p className="mt-3 text-lg font-bold text-lime-300">{formatINR(Number(myBooking.totalPrice || 0))}</p>
                <div className="mt-2 flex items-center gap-3">
                  <TimeRemaining startTime={myBooking.startTime} />
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
                  <span>{formatDate(myBooking.startTime)}</span>
                  <Clock3 className="ml-2 h-3.5 w-3.5 text-slate-500" />
                  <span>{formatTime(myBooking.startTime)} – {formatTime(myBooking.endTime)}</span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-3 sm:border-l sm:border-white/10 sm:pl-5">
                {myBooking.verificationCode && (
                  <button
                    onClick={() => {
                      setQrBooking(myBooking)
                      setQrModalOpen(true)
                    }}
                    className="flex h-20 w-20 items-center justify-center rounded-xl bg-white p-2 transition hover:scale-105"
                  >
                    <Ticket className="h-10 w-10 text-black" />
                  </button>
                )}
                <p className="text-[10px] font-bold text-slate-500">ENTRY PASS</p>
                <Button asChild variant="outline" size="sm" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white">
                  <Link href="/dashboard/bookings">View Details <ChevronRight className="ml-1 h-3.5 w-3.5" /></Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#17222d] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Your next game starts here</p>
                <p className="mt-1 text-sm text-slate-400">Book a turf to see your confirmed booking details here.</p>
              </div>
              <Button asChild className="bg-lime-400 font-bold text-black hover:bg-lime-300"><Link href="/search">Book a Turf</Link></Button>
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500">Manage your reservation and entry pass in My Bookings.</span>
            <Button asChild variant="outline" size="sm" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white">
              <Link href="/dashboard/bookings">View booking details <ChevronRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Explore Turfs Near You</h2>
            <p className="mt-1 text-xs text-slate-500">Find a ground for your next game</p>
          </div>
          <Link href="/search" className="text-sm font-semibold text-lime-300">View All <ChevronRight className="inline h-4 w-4" /></Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {MOCK_TURFS.map((turf) => (
            <Card key={turf.id} className="group overflow-hidden rounded-2xl border-white/[0.09] bg-[#0c1916] transition-all duration-300 hover:-translate-y-1 hover:border-lime-400/40 hover:shadow-xl hover:shadow-black/20">
              <div className="relative h-32 overflow-hidden bg-[#1a3027]">
                <Image src={turf.image} alt={turf.name} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
              <CardContent className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold">{turf.name}</h3>
                  <span className="shrink-0 text-xs font-semibold text-amber-300">★ {turf.rating} <span className="text-slate-500">({turf.reviews})</span></span>
                </div>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{turf.city} ({turf.distance})</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {turf.sports.slice(0, 2).map((sport) => <Badge key={sport} className="bg-white/[0.07] text-[10px] text-slate-300 hover:bg-white/[0.07]">{sport}</Badge>)}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <p className="font-bold text-lime-300">{formatINR(turf.price)}<span className="text-xs font-normal text-slate-500"> /hour</span></p>
                  <Button asChild size="sm" className="rounded-lg bg-lime-400 font-bold text-black hover:bg-lime-300"><Link href="/search">Book Now <ChevronRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  )
}

function OwnerDashboard({ session, myFacilities }: any) {
  const ownerName = session.user?.name || "Owner"
  const firstName = ownerName.split(" ")[0]

  return (
    <>
      <section className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 bg-[#10251a]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_50%,rgba(34,197,94,0.2),transparent_55%),linear-gradient(110deg,#07150f,#12351d_60%,#07120f)]" />
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(90deg,transparent_49%,rgba(255,255,255,0.08)_50%,transparent_51%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-6 p-6 sm:p-9">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-lime-400">
              <Building2 className="h-4 w-4" /> Owner Dashboard
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Welcome, {firstName}! <span className="text-lime-400">👋</span>
            </h1>
            <p className="mt-2 text-sm text-slate-300 sm:text-base">
              Manage your facilities, bookings and revenue.
            </p>
          </div>
          <div className="hidden gap-3 sm:flex">
            <div className="min-w-[120px] rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-md">
              <Building2 className="mb-2 h-5 w-5 text-lime-400" />
              <p className="text-xl font-black">{myFacilities?.length || 0}</p>
              <p className="text-[10px] text-slate-400">Facilities</p>
            </div>
            <div className="min-w-[120px] rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-md">
              <Trophy className="mb-2 h-5 w-5 text-amber-400" />
              <p className="text-xl font-black">Rs.0</p>
              <p className="text-[10px] text-slate-400">Revenue</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <QuickAction href="/dashboard/facilities" title="My Facilities" subtitle={(myFacilities?.length || 0) + " listed"} icon={Building2} primary />
        <QuickAction href="/dashboard/bookings" title="Today's Bookings" subtitle="View & manage" icon={Ticket} />
        <QuickAction href="/dashboard/payouts" title="Payouts" subtitle="Process & track" icon={Wallet} />
        <QuickAction href="/dashboard/analytics" title="Analytics" subtitle="Revenue & stats" icon={TrendingUp} />
      </section>

      <Card className="mb-6 overflow-hidden rounded-2xl border-white/10 bg-[#0c1916]">
        <CardHeader className="flex flex-row items-center justify-between px-5 pb-3 pt-4">
          <CardTitle className="text-lg font-bold">My Facilities</CardTitle>
          <Link href="/dashboard/facilities/new" className="text-xs font-semibold text-lime-300 hover:text-lime-200">+ Add New</Link>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {myFacilities && myFacilities.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {myFacilities.map((facility: any) => (
                <Card key={facility.id} className="bg-[#17222d] border-white/10 overflow-hidden">
                  <div className="relative h-28 overflow-hidden bg-[#1a3027]">
                    <Image src={facility.images?.[0] || "/placeholder.svg"} alt={facility.name} fill sizes="200px" className="object-cover" />
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-bold text-sm">{facility.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{facility.city}, {facility.state}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span>{facility._count?.courts || 0} courts</span>
                      <span>{facility._count?.bookings || 0} bookings</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button asChild size="sm" variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/5">
                        <Link href={"/dashboard/facilities/" + facility.id + "/edit"}>Edit</Link>
                      </Button>
                      <Button asChild size="sm" className="flex-1 bg-lime-400 font-bold text-black hover:bg-lime-300">
                        <Link href={"/facility/" + facility.id}>View</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400">No facilities yet</p>
              <Button asChild className="mt-4 bg-lime-400 font-bold text-black hover:bg-lime-300">
                <Link href="/dashboard/facilities/new">Add Your First Facility</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6 overflow-hidden rounded-2xl border-white/10 bg-[#0c1916]">
        <CardHeader className="flex flex-row items-center justify-between px-5 pb-3 pt-4">
          <CardTitle className="text-lg font-bold">Revenue Overview</CardTitle>
          <Link href="/dashboard/analytics" className="text-xs font-semibold text-lime-300 hover:text-lime-200">View All</Link>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#17222d] border border-white/[0.08]">
              <p className="text-xs text-slate-400">Total Revenue</p>
              <p className="text-xl font-bold text-lime-300 mt-1">Rs.0</p>
            </div>
            <div className="p-4 rounded-xl bg-[#17222d] border border-white/[0.08]">
              <p className="text-xs text-slate-400">Platform Fee (10%)</p>
              <p className="text-xl font-bold text-slate-300 mt-1">Rs.0</p>
            </div>
            <div className="p-4 rounded-xl bg-[#17222d] border border-white/[0.08]">
              <p className="text-xs text-slate-400">Your Payout</p>
              <p className="text-xl font-bold text-green-400 mt-1">Rs.0</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

function Brand() {
  return (
    <div className="flex h-[76px] shrink-0 items-center gap-3 border-b border-white/[0.08] px-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-lime-400 text-lime-400"><Activity className="h-6 w-6" /></div>
      <div>
        <Link href="/dashboard" className="text-[22px] font-black tracking-tight">Turf<span className="text-lime-400">Play</span></Link>
        <p className="text-[10px] tracking-wide text-slate-500">Book · Play · Compete</p>
      </div>
    </div>
  )
}

function Sidebar({ items, active, onNavigate }: { items: any[]; active: (href: string) => boolean; onNavigate?: () => void }) {
  return (
    <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 py-6">
      {items.map((item: any) => (
        <Link key={item.name} href={item.href} onClick={onNavigate} className={cn(
          "flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition",
          active(item.href) ? "bg-green-600 text-white shadow-lg shadow-green-950/30" : "text-slate-300 hover:bg-white/[0.06] hover:text-white",
        )}>
          <item.icon className="h-[18px] w-[18px]" />{item.name}
          {item.badge && <span className="ml-auto text-[10px] font-bold text-slate-400">{item.badge}</span>}
        </Link>
      ))}
    </nav>
  )
}

function InviteFriends() {
  return (
    <div className="mx-4 mb-5 rounded-2xl border border-green-500/20 bg-gradient-to-br from-[#10271d] to-[#0b1714] p-4 text-center">
      <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-3xl">⚽</div>
      <p className="text-base font-bold">Invite Friends</p>
      <p className="mt-1 text-sm font-semibold text-amber-300">Get Rs.100 Credit</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">for each friend who books!</p>
      <Button asChild size="sm" className="mt-3 rounded-xl bg-lime-400 font-bold text-black hover:bg-lime-300"><Link href="/dashboard/teams">Invite Now <ChevronRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
    </div>
  )
}

function QuickAction({ href, title, subtitle, icon: Icon, primary = false }: { href: string; title: string; subtitle: string; icon: any; primary?: boolean }) {
  return (
    <Link href={href} className={cn("flex min-h-[88px] items-center gap-3 rounded-2xl border p-4 transition hover:-translate-y-1 hover:shadow-lg", primary ? "border-lime-400/30 bg-gradient-to-br from-[#15351c] to-[#0b1911] hover:border-lime-400/50" : "border-white/10 bg-[#0c1916] hover:border-lime-400/30 hover:bg-[#10231a]")}>
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", primary ? "bg-lime-400/10 text-lime-400" : "bg-white/[0.06] text-slate-300")}><Icon className="h-6 w-6" /></div>
      <div className="min-w-0"><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs text-slate-400">{subtitle}</p></div>
      <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-500" />
    </Link>
  )
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen animate-pulse bg-[#070d12] p-5 md:pl-[262px]">
      <div className="mb-6 h-14 rounded-xl bg-white/[0.06]" />
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_368px]">
        <div className="space-y-5">
          <div className="h-32 rounded-2xl bg-white/[0.06]" />
          <div className="h-24 rounded-xl bg-white/[0.06]" />
          <div className="h-56 rounded-2xl bg-white/[0.06]" />
          <div className="h-72 rounded-2xl bg-white/[0.06]" />
        </div>
        <div className="space-y-5"><div className="h-40 rounded-2xl bg-white/[0.06]" /><div className="h-64 rounded-2xl bg-white/[0.06]" /><div className="h-44 rounded-2xl bg-white/[0.06]" /></div>
      </div>
    </div>
  )
}

