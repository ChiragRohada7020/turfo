"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronRight, MapPin, Menu, Search as SearchIcon, Users } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { trpc } from "@/lib/trpc"

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Book a Turf", href: "/search" },
  { name: "My Bookings", href: "/dashboard/bookings" },
  { name: "Find Players", href: "/teams" },
  { name: "Teams", href: "/teams" },
  { name: "Tournaments", href: "/tournaments" },
  { name: "Offers & Rewards", href: "/offers" },
  { name: "Wallet", href: "/wallet" },
  { name: "Notifications", href: "/notifications" },
  { name: "Support", href: "/help" },
]

const SPORT_FILTERS = ["All Sports", "Football", "Cricket", "Box Cricket", "Multi-Sport"]

const MOCK_TURFS = [
  {
    id: "1",
    name: "Pachora Turf Arena",
    city: "Pachora, Jalgaon",
    distance: "1.2 km",
    price: 1200,
    rating: 4.8,
    reviews: 126,
    image: "/placeholder.svg",
    sports: ["Football", "Cricket"],
    tags: ["Available Today"],
  },
  {
    id: "2",
    name: "GreenField Turf",
    city: "Pachora",
    distance: "2.4 km",
    price: 1000,
    rating: 4.7,
    reviews: 89,
    image: "/placeholder.svg",
    sports: ["Football", "Box Cricket"],
    tags: ["Available Today"],
  },
  {
    id: "3",
    name: "Champion Turf",
    city: "Pachora",
    distance: "3.1 km",
    price: 1500,
    rating: 4.6,
    reviews: 64,
    image: "/placeholder.svg",
    sports: ["Football", "Cricket", "Multi-Sport"],
    tags: ["Few Slots Left"],
  },
  {
    id: "4",
    name: "JM4D Turf",
    city: "Pachora, Jalgaon",
    distance: "3.8 km",
    price: 1200,
    rating: 4.5,
    reviews: 208,
    image: "/placeholder.svg",
    sports: ["Football", "Cricket"],
    tags: ["Available Today"],
  },
  {
    id: "5",
    name: "Sports Arena Turf",
    city: "Pachora, Jalgaon",
    distance: "4.2 km",
    price: 1000,
    rating: 4.6,
    reviews: 388,
    image: "/placeholder.svg",
    sports: ["Football", "Cricket"],
    tags: ["Available Today"],
  },
  {
    id: "6",
    name: "Skyline Turf",
    city: "Pachora, Jalgaon",
    distance: "4.5 km",
    price: 1400,
    rating: 4.7,
    reviews: 196,
    image: "/placeholder.svg",
    sports: ["Football", "Box Cricket"],
    tags: ["Few Slots Left"],
  },
]

export default function SearchPageContent() {
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("All Sports")

  const { data: facilitiesData } = trpc.facilities.list.useQuery({
    sportTypes: [],
    page: 1,
    limit: 12,
  })

  const allTurfs = (facilitiesData ? facilitiesData.facilities : MOCK_TURFS) as any[]

  // Filter turfs based on search query and sport filter
  const filteredTurfs = useMemo(() => {
    let result = allTurfs
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((t: any) =>
        t.name?.toLowerCase().includes(q) ||
        t.city?.toLowerCase().includes(q) ||
        t.sports?.some((s: string) => s.toLowerCase().includes(q))
      )
    }
    if (activeFilter !== "All Sports") {
      result = result.filter((t: any) =>
        t.sports?.some((s: string) => s.toLowerCase().includes(activeFilter.toLowerCase()))
      )
    }
    return result
  }, [allTurfs, searchQuery, activeFilter])

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070d12] px-4 text-white">
        <div className="max-w-md w-full bg-[#111a22] border border-white/10 rounded-2xl p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-lime-400 text-black flex items-center justify-center">
            <span className="text-lg">🏟️</span>
          </div>
          <h1 className="text-2xl font-bold">Book a Turf</h1>
          <p className="mt-2 text-sm text-slate-400">Please sign in to book turfs.</p>
          <Link href="/auth/login?callbackUrl=/search" className="mt-6 w-full">
            <Button className="w-full bg-lime-400 font-bold text-black hover:bg-lime-300">Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      <aside className="hidden w-[262px] flex-col border-r border-white/[0.08] bg-[#080f15] md:flex fixed inset-y-0 left-0 z-30">
        <div className="flex h-[76px] shrink-0 items-center gap-3 border-b border-white/[0.08] px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-lime-400 text-lime-400">
            <span className="text-lg">🏟️</span>
          </div>
          <div>
            <Link href="/" className="text-[22px] font-black tracking-tight">
              Turf<span className="text-lime-400">Play</span>
            </Link>
            <p className="text-[10px] tracking-wide text-slate-500">Book · Play · Compete</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition text-slate-300 hover:bg-white/[0.06] hover:text-white"
            >
              <span className="truncate">{item.name}</span>
            </Link>
          ))}
        </nav>
        <div className="mx-4 mb-5 rounded-2xl border border-green-500/20 bg-gradient-to-br from-[#10271d] to-[#0b1714] p-4 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-3xl">⚽</div>
          <p className="text-base font-bold">Invite Friends</p>
          <p className="mt-1 text-sm font-semibold text-amber-300">Get ₹100 Credit</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">for each friend who books!</p>
          <Button size="sm" className="mt-3 rounded-xl bg-lime-400 font-bold text-black hover:bg-lime-300">
            Invite Now
          </Button>
        </div>
      </aside>

      <div className="min-h-screen md:pl-[262px]">
        <header className="md:hidden sticky top-0 z-20 h-[72px] flex items-center justify-between border-b border-white/[0.08] bg-[#080f15]/95 px-4 backdrop-blur-xl sm:px-6">
          <button className="rounded-lg border border-white/10 p-2 text-slate-300 md:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#121c25] px-3 py-2 text-sm text-slate-300 sm:flex">
            <MapPin className="h-4 w-4" />
            Pachora, MH
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </div>
          <div className="relative mx-auto w-full max-w-[590px] flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search turfs, sports, or locations..."
                className="h-10 w-full rounded-xl border border-white/10 bg-[#121b24] pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-lime-400/50"
              />
            </div>
            <button className="px-4 py-2 rounded-xl bg-lime-400 text-black font-bold text-sm hover:bg-lime-300 transition shrink-0">
              Search
            </button>
          </div>
          <button aria-label="Notifications" className="relative rounded-full border border-white/10 bg-[#121b24] p-2.5 text-slate-300">
            <BellIcon />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex shrink-0 items-center gap-2 rounded-full p-1 text-white">
              <span className="h-9 w-9 border border-white/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">C</span>
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1800px] p-4 sm:p-6 xl:p-7">
          <div className="mb-6 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Book a Turf</h1>
              <p className="mt-1 text-sm text-slate-400">Find, compare and book the best turfs near you</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <div className="flex items-center gap-1">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-black font-bold">1</span>
                <span>Select Turf</span>
              </div>
              <ChevronRight className="h-4 w-4" />
              <div className="flex items-center gap-1 opacity-30">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-white font-bold">2</span>
                <span>Choose Slot</span>
              </div>
              <ChevronRight className="h-4 w-4 opacity-30" />
              <div className="flex items-center gap-1 opacity-30">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-white font-bold">3</span>
                <span>Confirm & Pay</span>
              </div>
              <ChevronRight className="h-4 w-4 opacity-30" />
              <div className="flex items-center gap-1 opacity-30">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-white font-bold">4</span>
                <span>Booking Confirmed</span>
              </div>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex gap-2 flex-wrap">
              {SPORT_FILTERS.map((sport) => (
                <button
                  key={sport}
                  onClick={() => setActiveFilter(sport)}
                  className={
                    activeFilter === sport
                      ? "shrink-0 rounded-full border border-lime-400 bg-lime-400 text-black px-4 py-2 text-xs font-semibold transition"
                      : "shrink-0 rounded-full border border-white/10 bg-[#111a22] text-slate-300 px-4 py-2 text-xs font-semibold transition hover:border-white/20 hover:text-white"
                  }
                >
                  {sport}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{filteredTurfs.length} Turfs Found in Pachora</h2>
              <p className="mt-1 text-xs text-slate-500">Showing 1-{Math.min(filteredTurfs.length, 12)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredTurfs.map((turf: any) => (
              <div key={turf.id} className="group overflow-hidden rounded-xl border-white/10 bg-[#111a22] transition hover:-translate-y-1 hover:border-lime-400/30">
                <div className="relative h-32 overflow-hidden bg-[#1a3027]">
                  <Image src={turf.image || turf.images?.[0] || "/placeholder.svg"} alt={turf.name} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <button className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition">
                    <span className="h-4 w-4">❤️</span>
                  </button>
                  {turf.tags?.[0] && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded bg-black/60 backdrop-blur-sm text-[10px] font-semibold">
                      <span className="text-[10px]">{turf.tags[0] === "Available Today" ? "🟢" : "🟠"}</span>
                      {turf.tags[0]}
                    </div>
                  )}
                </div>
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold">{turf.name}</h3>
                    <span className="shrink-0 text-xs font-semibold text-amber-300">★ {turf.rating}</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3 w-3" /> {turf.city} ({turf.distance})
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {turf.sports?.slice(0, 2).map((sport: string) => (
                      <Badge key={sport} className="bg-white/[0.07] text-[10px] text-slate-300 hover:bg-white/[0.07]">
                        {sport}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="font-bold text-lime-300">
                      {formatCurrency(turf.price)}<span className="text-xs font-normal text-slate-500"> /hour</span>
                    </p>
                    <Button asChild size="sm" className="rounded-lg bg-lime-400 font-bold text-black hover:bg-lime-300">
                      <Link href="/facility/[id]" replace>
                        Book Now
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredTurfs.length === 0 && (
            <div className="text-center py-16">
              <MapPin className="w-16 h-16 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No turfs found</h3>
              <p className="text-slate-400 mb-6">Try adjusting your search or filters</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function BellIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.505-7.5a3 3 0 01-5.5-.5m-1.505-7.5a3 3 0 00-5.5.5M18 12l-1.5-7.5A3 3 0 015.254 7.5m-5.5 7.5a3 3 0 015.5-.5m-5.5 7.5a3 3 0 005.5-.5" />
    </svg>
  )
}
