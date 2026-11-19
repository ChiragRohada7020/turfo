"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronRight, MapPin, Menu, Search as SearchIcon, Star, Users, Trophy, Gift, CalendarDays, Bell, X, Zap, Shield, Activity, Target, Home, Ticket, ShieldCheck, Wallet } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { Sidebar } from "@/components/layout/Sidebar"
import { trpc } from "@/lib/trpc"

const NAV_ITEMS = [
  { name: "Home", href: "/", icon: Home },
  { name: "Book a Game", href: "/search", icon: CalendarDays },
  { name: "My Bookings", href: "/dashboard/bookings", icon: Ticket },
  { name: "Find Players", href: "/teams", icon: Users },
  { name: "Teams", href: "/teams", icon: ShieldCheck },
  { name: "Tournaments", href: "/tournaments", icon: Trophy },
  { name: "Offers & Rewards", href: "/offers", icon: Gift },
  { name: "Wallet", href: "/wallet", icon: Wallet },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Support", href: "/help", icon: ShieldCheck },
]

const SPORTS = [
  { name: "Football", icon: "⚽", count: "150+ turfs", color: "from-green-600 to-emerald-700" },
  { name: "Cricket", icon: "🏏", count: "90+ nets", color: "from-blue-600 to-indigo-700" },
  { name: "Badminton", icon: "🏸", count: "120+ courts", color: "from-orange-600 to-red-700" },
  { name: "Tennis", icon: "🎾", count: "80+ courts", color: "from-yellow-600 to-amber-700" },
  { name: "Pickleball", icon: "🏓", count: "40+ courts", color: "from-pink-600 to-rose-700" },
  { name: "Basketball", icon: "🏀", count: "60+ courts", color: "from-purple-600 to-violet-700" },
  { name: "Swimming", icon: "🏊", count: "50+ pools", color: "from-cyan-600 to-teal-700" },
  { name: "Table Tennis", icon: "🏓", count: "30+ tables", color: "from-amber-600 to-orange-700" },
]

const FEATURES = [
  { icon: Zap, title: "Instant Booking", desc: "Book your turf in under 60 seconds" },
  { icon: Shield, title: "Secure Payments", desc: "UPI, Cards, Net Banking via Cashfree" },
  { icon: Users, title: "Team Management", desc: "Create teams, invite friends, play together" },
  { icon: Trophy, title: "Tournaments", desc: "Join leagues & compete for prizes" },
  { icon: Gift, title: "Rewards", desc: "Earn credits for every booking" },
  { icon: CalendarDays, title: "Flexible Slots", desc: "30 min to 4 hour bookings" },
]

function getSportIcon(sport: string): string {
  const icons: Record<string, string> = {
    FOOTBALL: "⚽", CRICKET: "🏏", TENNIS: "🎾", BADMINTON: "🏸",
    BASKETBALL: "🏀", VOLLEYBALL: "🏐", SWIMMING: "🏊", GYM: "💪",
    MULTI_SPORT: "🏟️", PICKLEBALL: "🏓", TABLE_TENNIS: "🏓", OTHER: "🏃",
  }
  return icons[sport] || "🏃"
}

export default function HomePageContent() {
  const { data: session, status } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data: sportTypesData } = trpc.facilities.sportTypes.useQuery()
  const sports = sportTypesData ?? []

  const { data: facilitiesData } = trpc.facilities.list.useQuery({ city: "Pachora", sportTypes: [], page: 1, limit: 4 })
  const realTurfs = facilitiesData?.facilities ?? []

  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      {session && <Sidebar session={session} />}

      <div className={session ? "min-h-screen pt-14 md:pt-0 md:pl-[262px]" : "min-h-screen"}>
        <header className="sticky top-0 z-20 h-[60px] flex items-center justify-between border-b border-white/[0.08] bg-[#080f15]/95 px-4 backdrop-blur-xl sm:px-6">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-lg border border-white/10 p-2 text-slate-300 md:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-[#121c25] px-3 py-2 text-sm text-slate-300">
            <MapPin className="h-4 w-4" />
            Pachora, MH
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </div>
          <div className="relative flex-1 max-w-[400px] mx-4">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search turfs..."
              className="h-9 w-full rounded-lg border border-white/10 bg-[#121b24] pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-lime-400/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <button aria-label="Notifications" className="relative rounded-full border border-white/10 bg-[#121b24] p-2 text-slate-300">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>
            {session ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:block text-sm font-medium">{session.user?.name || "User"}</span>
                <span className="h-8 w-8 border border-white/10 rounded-full flex items-center justify-center bg-lime-400 text-black text-xs font-bold">
                  {session.user?.name?.[0] || "U"}
                </span>
              </div>
            ) : (
              <Link href="/auth/login">
                <Button size="sm" className="bg-lime-400 font-bold text-black hover:bg-lime-300">Sign In</Button>
              </Link>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-[1800px] p-4 sm:p-6 xl:p-7">
          {/* Hero Section */}
          <section className="relative -mx-1 mb-6 min-h-[200px] overflow-hidden rounded-2xl px-5 py-6 sm:px-7">
            <Image src="/hero-bg.png" alt="Illuminated football turf" fill priority sizes="100vw" className="absolute inset-0 -z-20 object-cover object-center" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#070d12] via-[#070d12]/85 to-[#070d12]/30" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#070d12]/70 to-transparent" />
            <div className="relative z-10 max-w-2xl">
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Welcome to TurfPlay</h1>
              <p className="mt-2 text-sm text-slate-200 sm:text-base">India's premier sports facility booking platform. Book turfs, courts, gyms & pools instantly.</p>
              <div className="flex flex-wrap gap-3 mt-5">
                <Link href="/search">
                  <Button size="lg" className="px-6 bg-lime-400 font-bold text-black hover:bg-lime-300">
                    Book a Game
                  </Button>
                </Link>
                <Link href="/dashboard/teams" className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-sm font-medium text-white transition-colors">
                  <Users className="h-4 w-4" />
                  Find Players
                </Link>
              </div>
            </div>
          </section>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {[
              { label: "Turfs", value: "500+", icon: MapPin },
              { label: "Bookings", value: "50K+", icon: CalendarDays },
              { label: "Players", value: "25K+", icon: Users },
              { label: "Cities", value: "15+", icon: MapPin },
              { label: "Sports", value: "10+", icon: Trophy },
              { label: "Rating", value: "4.8", icon: Star },
            ].map((stat) => (
              <Card key={stat.label} className="bg-[#111a22] border-white/10 p-3 text-center">
                <CardContent className="p-0">
                  <p className="text-xl font-black text-lime-400">{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sports Categories */}
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3">Popular Sports</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {sports.map((sport: any) => (
                <Link key={sport.sport} href={`/search?sport=${sport.sport.toLowerCase()}`} className="group">
                  <Card className={`bg-gradient-to-br ${sport.color} border-0 p-3 text-center hover:scale-105 transition-transform`}>
                    <CardContent className="p-0">
                      <div className="text-2xl mb-1">{getSportIcon(sport.sport)}</div>
                      <p className="text-xs font-bold text-white">{sport.sport}</p>
                      <p className="text-[10px] text-white/70">{sport.count} facilities</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3">Why Choose TurfPlay?</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {FEATURES.map((feature) => (
                <Card key={feature.title} className="bg-[#111a22] border-white/10 p-3 hover:border-lime-400/30 transition-colors">
                  <CardContent className="p-0">
                    <feature.icon className="h-6 w-6 text-lime-400 mb-2" />
                    <p className="text-xs font-bold">{feature.title}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{feature.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Recommended Turfs */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold">Recommended Facilities Near You</h2>
              <Link href="/search" className="text-sm text-lime-400 hover:underline">View All</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {realTurfs.map((turf: any) => (
                <Card key={turf.id} className="bg-[#111a22] border-white/10 overflow-hidden hover:border-lime-400/30 transition-colors">
                  <div className="relative h-28 overflow-hidden bg-[#1a3027]">
                    <Image src={turf.images?.[0] || "/placeholder.svg"} alt={turf.name} fill sizes="200px" className="object-cover" />
                  </div>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-sm font-medium">{turf.name}</h3>
                      <span className="text-xs font-semibold text-amber-300">★ {turf.rating}</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">
                      <MapPin className="h-3 w-3 mr-1 inline" />{turf.city}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{turf.distance}</span>
                      <span className="font-bold text-lime-400">{turf.minPrice ? formatCurrency(turf.minPrice) : "Contact"}/hr</span>
                    </div>
                    <Button size="sm" className="w-full mt-3 bg-lime-400 font-bold text-black hover:bg-lime-300" asChild>
                      <Link href="/search">Book Now</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Tournament Banner */}
          <div className="relative rounded-2xl bg-gradient-to-r from-[#124d29] via-[#0d351f] to-[#10221b] border border-lime-400/15 overflow-hidden h-40">
            <div className="relative z-10 p-6 flex flex-col justify-between h-full">
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-900/30 text-yellow-400 text-xs font-medium">🏆 Tournament</span>
                <h3 className="text-lg font-bold mt-1">5v5 Football Cup</h3>
                <p className="text-xs text-green-100/75 mt-1">Join the biggest football tournament in your city</p>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex items-center gap-1 text-sm font-medium text-green-100">
                  <Trophy className="h-3 w-3" />
                  <span>Prize Pool: ₹25,000</span>
                </div>
                <Button size="sm" variant="outline" className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black">
                  Register Now
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/[0.08] text-center text-xs text-slate-500">
            © 2024 TurfPlay. All rights reserved. | Book · Play · Compete
          </div>
        </main>
      </div>
    </div>
  )
}
