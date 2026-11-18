"use client"

import { useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronRight, MapPin, Menu, Search as SearchIcon, Users, LogOut, Home, CalendarDays, Ticket, ShieldCheck, Trophy, Gift, Wallet, Bell } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { trpc } from "@/lib/trpc"
import { Sidebar } from "@/components/layout/Sidebar"


const SPORT_FILTERS = ["All Sports", "Football", "Cricket", "Badminton", "Tennis", "Pickleball", "Basketball", "Swimming", "Box Cricket", "Multi-Sport"]

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

function getSportCards(facility: any): { sport: string; price: number; courtName: string }[] {
  const cards: { sport: string; price: number; courtName: string }[] = []
  const seen = new Set<string>()
  facility.courts?.forEach((court: any) => {
    if (!seen.has(court.sportType)) {
      seen.add(court.sportType)
      const price = court.pricingRules?.length > 0
        ? Math.min(...court.pricingRules.map((p: any) => p.pricePerHour))
        : null
      cards.push({ sport: court.sportType, price: price || 0, courtName: court.name })
    }
  })
  // Fallback to facility sportTypes if no courts
  if (cards.length === 0 && facility.sportTypes?.length > 0) {
    const price = facility.minPrice || 0
    facility.sportTypes.forEach((sport: string) => {
      cards.push({ sport, price, courtName: facility.name })
    })
  }
  return cards
}

export default function SearchPageContent() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const sportParam = searchParams.get("sport") || ""
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState(sportParam ? sportParam.charAt(0).toUpperCase() + sportParam.slice(1) : "All Sports")

  const { data: facilitiesData } = trpc.facilities.list.useQuery({
    city: "Pachora",
    sportTypes: [],
    page: 1,
    limit: 12,
  })

  const allTurfs = (facilitiesData ? facilitiesData.facilities : []) as any[]

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
      const norm = (s: string) => s.toLowerCase().replace(/_/g, " ")
      result = result.filter((t: any) =>
        t.sportTypes?.some((s: string) => norm(s) === norm(activeFilter)) ||
        t.sports?.some((s: string) => norm(s) === norm(activeFilter))
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
          <h1 className="text-2xl font-bold">Book a Game</h1>
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
      <Sidebar session={session} />

      <Sidebar session={session} />

      <div className="min-h-screen pt-14 md:pt-0 md:pl-[262px]">
        <header className="sticky top-0 z-20 flex h-[64px] items-center gap-3 border-b border-white/[0.08] bg-[#080f15]/95 px-4 backdrop-blur-xl sm:px-6">
          <div className="hidden shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-[#121c25] px-3 py-2 text-sm text-slate-300 sm:flex">
            <MapPin className="h-4 w-4" />
            Pachora, MH
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </div>
          <div className="relative mx-auto w-full max-w-[590px]">
            <SearchIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search turfs, sports, or locations..." className="h-10 w-full rounded-xl border border-white/10 bg-[#121b24] pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-lime-400/50" />
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
                  <AvatarFallback className="bg-lime-400 font-bold text-black">{(session.user?.name || "U")[0]?.toUpperCase()}</AvatarFallback>
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

        <main className="mx-auto max-w-[1800px] space-y-6 p-4 sm:p-6 xl:p-8">
          {/* Hero */}
          <section className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 bg-[#10251a]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_50%,rgba(34,197,94,0.2),transparent_55%),linear-gradient(110deg,#07150f,#12351d_60%,#07120f)]" />
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(90deg,transparent_49%,rgba(255,255,255,0.08)_50%,transparent_51%)]" />
            <div className="relative flex flex-wrap items-center justify-between gap-6 p-6 sm:p-9">
              <div>
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-lime-400">
                  <CalendarDays className="h-4 w-4" /> Book a Game
                </div>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                  Find & <span className="text-lime-400">Book</span> Turfs
                </h1>
                <p className="mt-2 text-sm text-slate-300 sm:text-base">
                  Find, compare and book the best turfs near you.
                </p>
              </div>
              <div className="hidden gap-3 sm:flex">
                <div className="min-w-[120px] rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-md">
                  <MapPin className="mb-2 h-5 w-5 text-lime-400" />
                  <p className="text-xl font-black">Pachora</p>
                  <p className="text-[10px] text-slate-400">Your location</p>
                </div>
              </div>
            </div>
          </section>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Available Turfs</h2>
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

          {/* Search Bar */}
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-lg">
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
              <h2 className="text-lg font-bold">{filteredTurfs.length} Games Found in Pachora</h2>
              <p className="mt-1 text-xs text-slate-500">Showing 1-{Math.min(filteredTurfs.length, 12)}</p>
            </div>
          </div>

          {filteredTurfs.map((facility: any) => {
            const sportCards = getSportCards(facility).filter((card: any) =>
              activeFilter === "All Sports" || card.sport.toLowerCase().replace(/_/g, " ") === activeFilter.toLowerCase().replace(/_/g, " ")
            )
            if (sportCards.length === 0) return null
            return (
              <div key={facility.id} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-bold text-white">{facility.name}</h3>
                  <span className="text-xs text-slate-500">{facility.city}, {facility.state}</span>
                  {facility.avgRating > 0 && (
                    <span className="text-xs text-amber-300 ml-auto">★ {facility.avgRating.toFixed(1)} ({facility.reviewCount})</span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {sportCards.map((card, idx) => (
                    <div key={idx} className="group overflow-hidden rounded-xl border-white/10 bg-[#111a22] transition hover:-translate-y-1 hover:border-lime-400/30">
                      <div className="relative h-24 overflow-hidden bg-[#1a3027]">
                        <Image src={facility.images?.[0] || "/placeholder.svg"} alt={facility.name} fill sizes="200px" className="object-cover transition duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute top-2 left-2 px-2 py-1 rounded bg-lime-400 text-black text-xs font-bold">{card.sport.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()).toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}</div>
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-slate-400">{card.courtName}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <p className="font-bold text-lime-300">{card.price ? formatCurrency(card.price) : "Contact"}<span className="text-xs font-normal text-slate-500"> /hr</span></p>
                          <Button asChild size="sm" className="rounded-lg bg-lime-400 font-bold text-black hover:bg-lime-300">
                            <Link href={"/facility/" + facility.id + "?sport=" + encodeURIComponent(card.sport)} replace>
                              Book Now
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

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
