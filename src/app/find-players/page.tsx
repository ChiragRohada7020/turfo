"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  Search, MapPin, Users, Gamepad2, ChevronRight,
  ShieldCheck, Star, Clock, Heart, Trophy,
  CalendarDays, Zap, ArrowRight, Send,
  SlidersHorizontal, Activity, UserPlus
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Avatar, AvatarFallback, AvatarImage
} from "@/components/ui/avatar"
import { Sidebar } from "@/components/layout/Sidebar"

const SPORT_FILTERS = [
  "All Sports", "Football", "Cricket", "Badminton", "Box Cricket"
]

const MOCK_PLAYERS = [
  {
    id: "1",
    name: "Rohit Patil",
    distance: "0.8 km",
    availability: "Today",
    sport: "Football",
    skill: "Intermediate",
    rating: 4.8,
    matches: 60,
    position: "Midfielder",
    image: "https://images.unsplash.com/photo-1535713875002-d1d0cf390345?w=200&q=80"
  },
  {
    id: "2",
    name: "Sanket More",
    distance: "1.2 km",
    availability: "Today",
    sport: "Football",
    skill: "Advanced",
    rating: 4.9,
    matches: 120,
    position: "Forward",
    image: "https://images.unsplash.com/photo-1507003211169-0a1272c8774f?w=200&q=80"
  },
  {
    id: "3",
    name: "Tejas Wagh",
    distance: "1.5 km",
    availability: "Tomorrow",
    sport: "Cricket",
    skill: "Intermediate",
    rating: 4.7,
    matches: 45,
    position: "All-rounder",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80"
  },
  {
    id: "4",
    name: "Aditya Mahajan",
    distance: "2.1 km",
    availability: "Today",
    sport: "Football",
    skill: "Beginner",
    rating: 4.5,
    matches: 18,
    position: "Defender",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80"
  },
  {
    id: "5",
    name: "Kunal Chaudhari",
    distance: "3.4 km",
    availability: "Weekend",
    sport: "Badminton",
    skill: "Intermediate",
    rating: 4.8,
    matches: 70,
    position: "Singles / Doubles",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80"
  },
  {
    id: "6",
    name: "Pranav Shinde",
    distance: "4.2 km",
    availability: "Today",
    sport: "Box Cricket",
    skill: "Advanced",
    rating: 4.6,
    matches: 56,
    position: "Power Hitter",
    image: "https://images.unsplash.com/photo-1500618736431-4d39cd66c496?w=200&q=80"
  },
]

const UPCOMING_GAMES = [
  {
    sport: "Football 5v5",
    date: "Sat, 22 Nov · 7:00 PM",
    venue: "GreenField Turf",
    players: "3/10",
  },
  {
    sport: "Box Cricket",
    date: "Sun, 23 Nov · 6:30 PM",
    venue: "Champion Turf",
    players: "6/12",
  },
]

const DISTANCES = [
  "Within 5 km", "Within 10 km",
  "Within 20 km", "Within 50 km", "Any Distance"
]

function HeartButton() {
  const [liked, setLiked] = useState(false)

  return (
    <button
      onClick={() => setLiked(!liked)}
      aria-label={liked ? "Remove favourite" : "Add favourite"}
      className={`rounded-full border p-2 transition ${
        liked
          ? "border-red-400/20 bg-red-400/10 text-red-400"
          : "border-white/10 bg-white/5 text-slate-400 hover:text-red-400"
      }`}
    >
      <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
    </button>
  )
}

function PlayerCard({ player }: { player: typeof MOCK_PLAYERS[number] }) {
  return (
    <Card className="group overflow-hidden rounded-2xl border-white/[0.09] bg-[#0c1916] transition-all duration-300 hover:-translate-y-1 hover:border-lime-400/40 hover:shadow-xl hover:shadow-black/20">
      <CardContent className="p-4">

        {/* Player profile */}
        <div className="flex items-start gap-3">
          <Avatar className="h-14 w-14 shrink-0 border-2 border-lime-400/30">
            <AvatarImage src={player.image} alt={player.name} />
            <AvatarFallback className="bg-lime-400/10 text-lime-400">
              {player.name[0]}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-bold text-white">
              {player.name}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
              <MapPin className="h-3 w-3 text-lime-400" />
              {player.distance} away
            </p>
            <Badge className="mt-2 border border-lime-400/20 bg-lime-400/10 text-[10px] text-lime-400">
              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-lime-400" />
              Available {player.availability}
            </Badge>
          </div>

          <HeartButton />
        </div>

        {/* Sport and skill */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge className="border-white/10 bg-white/[0.06] text-slate-300">
            <Gamepad2 className="mr-1 h-3 w-3" />
            {player.sport}
          </Badge>

          <Badge className={`border-0 ${
            player.skill === "Advanced"
              ? "bg-purple-500/15 text-purple-300"
              : player.skill === "Intermediate"
                ? "bg-blue-500/15 text-blue-300"
                : "bg-emerald-500/15 text-emerald-300"
          }`}>
            {player.skill}
          </Badge>
        </div>

        {/* Player stats */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-2.5">
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="text-sm font-bold text-white">
                {player.rating}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">Player rating</p>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-2.5">
            <div className="flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-lime-400" />
              <span className="text-sm font-bold text-white">
                {player.matches}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">Matches played</p>
          </div>
        </div>

        {/* Position */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-slate-500">Playing position</span>
          <span className="font-medium text-slate-300">
            {player.position}
          </span>
        </div>

        {/* Actions */}
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <Button
            asChild
            className="h-10 rounded-xl bg-lime-400 text-xs font-bold text-black hover:bg-lime-300"
          >
            <Link href={`/players/${player.id}`}>
              <Send className="mr-2 h-3.5 w-3.5" />
              View & Invite
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            <Link href={`/players/${player.id}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function FindPlayersPage() {
  const { data: session, status } = useSession()

  const [searchQuery, setSearchQuery] = useState("")
  const [activeSport, setActiveSport] = useState("Football")
  const [distance, setDistance] = useState("Within 10 km")
  const [skillLevel, setSkillLevel] = useState("All Levels")
  const [availability, setAvailability] = useState("Any Day")
  const [sortBy, setSortBy] = useState("Nearest")

  const filteredPlayers = useMemo(() => {
    let result = MOCK_PLAYERS.filter(player => {
      const matchesSearch =
        player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.sport.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.position.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesSport =
        activeSport === "All Sports" || player.sport === activeSport

      const matchesSkill =
        skillLevel === "All Levels" || player.skill === skillLevel

      const matchesAvailability =
        availability === "Any Day" || player.availability === availability

      const km = parseFloat(player.distance)
      const maxDistance = distance === "Any Distance"
        ? Infinity
        : parseInt(distance.match(/\d+/)?.[0] || "10")

      return matchesSearch && matchesSport && matchesSkill &&
        matchesAvailability && km <= maxDistance
    })

    result = [...result].sort((a, b) => {
      if (sortBy === "Highest Rated") return b.rating - a.rating
      if (sortBy === "Most Active") return b.matches - a.matches
      return parseFloat(a.distance) - parseFloat(b.distance)
    })

    return result
  }, [searchQuery, activeSport, distance, skillLevel, availability, sortBy])

  const resetFilters = () => {
    setSearchQuery("")
    setActiveSport("Football")
    setDistance("Within 10 km")
    setSkillLevel("All Levels")
    setAvailability("Any Day")
    setSortBy("Nearest")
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070d12]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06100e] px-4 text-white">
        <Card className="w-full max-w-md border-white/10 bg-[#101c19]">
          <CardContent className="p-8 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-lime-400" />
            <h1 className="text-2xl font-bold">Sign In Required</h1>
            <p className="mt-2 text-sm text-slate-400">
              Sign in to find and connect with players.
            </p>
            <Button asChild className="mt-6 w-full bg-lime-400 font-bold text-black hover:bg-lime-300">
              <Link href="/auth/login?callbackUrl=/find-players">
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
      <Sidebar session={session} />

      <div className="min-h-screen pt-14 md:pt-0 md:pl-[262px]">

        {/* TOP HEADER */}
        <header className="sticky top-0 z-30 hidden h-[68px] items-center justify-between gap-4 border-b border-white/[0.08] bg-[#07120f]/95 px-6 backdrop-blur-xl md:flex">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <MapPin className="h-4 w-4 text-lime-400" />
            Pachora, Maharashtra
          </div>

          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search players, teams or sports..."
              className="h-10 w-full rounded-full border border-white/10 bg-white/[0.04] pl-11 pr-4 text-sm outline-none placeholder:text-slate-500 focus:border-lime-400/50"
            />
          </div>

          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-lime-400" />
            <Avatar className="h-9 w-9 border border-white/10">
              <AvatarImage src={session.user?.image || ""} />
              <AvatarFallback className="bg-lime-400/10 text-lime-400">
                {session.user?.name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="mx-auto max-w-[1700px] space-y-6 p-4 sm:p-6 xl:p-8">

          {/* HERO */}
          <section className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-[#10251a]">
            <div
              className="absolute inset-0 -z-10 bg-cover bg-center opacity-45"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1800&q=85')"
              }}
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#06100e] via-[#06100e]/85 to-[#06100e]/25" />

            <div className="flex flex-wrap items-center justify-between gap-6 p-6 sm:p-9">
              <div className="max-w-xl">
                <Badge className="mb-4 border-lime-400/20 bg-lime-400/10 text-lime-400">
                  <Users className="mr-1.5 h-3 w-3" />
                  TURFPLAY COMMUNITY
                </Badge>

                <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                  Find <span className="text-lime-400">Players</span>
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
                  Discover players near you, build your team and find your next match.
                </p>
              </div>

              <div className="hidden gap-3 sm:flex">
                <div className="min-w-[135px] rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-md">
                  <Users className="mb-3 h-6 w-6 text-lime-400" />
                  <p className="text-2xl font-black">{filteredPlayers.length}</p>
                  <p className="text-xs text-slate-400">Players shown</p>
                </div>
                <div className="min-w-[135px] rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-md">
                  <Activity className="mb-3 h-6 w-6 text-lime-400" />
                  <p className="text-2xl font-black">Nearby</p>
                  <p className="text-xs text-slate-400">Player discovery</p>
                </div>
              </div>
            </div>
          </section>

          {/* MOBILE SEARCH */}
          <div className="relative md:hidden">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search players, teams or sports..."
              className="h-12 w-full rounded-xl border border-white/10 bg-[#101c19] pl-11 pr-4 text-sm text-white outline-none focus:border-lime-400/50"
            />
          </div>

          {/* SPORT FILTERS */}
          <section>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {SPORT_FILTERS.map(sport => (
                <button
                  key={sport}
                  onClick={() => setActiveSport(sport)}
                  className={`shrink-0 rounded-full border px-5 py-2.5 text-xs font-bold transition ${
                    activeSport === sport
                      ? "border-lime-400 bg-lime-400 text-black shadow-lg shadow-lime-400/10"
                      : "border-white/10 bg-[#101c19] text-slate-300 hover:border-lime-400/40"
                  }`}
                >
                  {sport === "Football" && "⚽ "}
                  {sport === "Cricket" && "🏏 "}
                  {sport === "Badminton" && "🏸 "}
                  {sport}
                </button>
              ))}
            </div>
          </section>

          {/* FILTER PANEL */}
          <section className="rounded-2xl border border-white/10 bg-[#0c1916] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-lime-400" />
                <h2 className="text-sm font-bold">Find your ideal player</h2>
              </div>
              <button
                onClick={resetFilters}
                className="text-xs font-semibold text-lime-400 hover:text-lime-300"
              >
                Reset filters
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
              <FilterSelect
                label="Distance"
                icon={<MapPin className="h-4 w-4" />}
                value={distance}
                onChange={setDistance}
                options={DISTANCES}
              />

              <FilterSelect
                label="Skill level"
                icon={<Gamepad2 className="h-4 w-4" />}
                value={skillLevel}
                onChange={setSkillLevel}
                options={["All Levels", "Beginner", "Intermediate", "Advanced"]}
              />

              <FilterSelect
                label="Availability"
                icon={<CalendarDays className="h-4 w-4" />}
                value={availability}
                onChange={setAvailability}
                options={["Any Day", "Today", "Tomorrow", "Weekend"]}
              />

              <div className="col-span-2 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-xs text-slate-400 lg:col-span-1">
                <ShieldCheck className="h-4 w-4 shrink-0 text-lime-400" />
                Discover players and connect
              </div>
            </div>
          </section>

          {/* MAIN CONTENT */}
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">

            {/* PLAYERS */}
            <section className="min-w-0">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">
                    Players Near You
                    <span className="ml-2 text-sm font-medium text-lime-400">
                      ({filteredPlayers.length})
                    </span>
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Meet players who enjoy the same sport.
                  </p>
                </div>

                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="h-10 rounded-xl border border-white/10 bg-[#101c19] px-3 text-xs text-white outline-none focus:border-lime-400/50"
                >
                  <option>Nearest</option>
                  <option>Highest Rated</option>
                  <option>Most Active</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3">
                {filteredPlayers.map(player => (
                  <PlayerCard key={player.id} player={player} />
                ))}
              </div>

              {filteredPlayers.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/15 bg-[#0c1916] px-6 py-16 text-center">
                  <Users className="mx-auto mb-4 h-12 w-12 text-slate-500" />
                  <h3 className="text-lg font-bold">No players found</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Try another sport or change your filters.
                  </p>
                  <Button
                    onClick={resetFilters}
                    className="mt-5 bg-lime-400 font-bold text-black hover:bg-lime-300"
                  >
                    Reset Filters
                  </Button>
                </div>
              )}
            </section>

            {/* RIGHT SIDEBAR */}
            <aside className="space-y-5">

              {/* QUICK ACTIONS */}
              <Card className="rounded-2xl border-white/10 bg-[#0c1916]">
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-lime-400" />
                    <h3 className="font-bold">Quick Actions</h3>
                  </div>

                  <div className="space-y-2">
                    <QuickAction
                      href="/dashboard/teams"
                      icon={<Users className="h-4 w-4" />}
                      label="Create a Team"
                    />
                    <QuickAction
                      href="/dashboard/open-games"
                      icon={<Gamepad2 className="h-4 w-4" />}
                      label="Join Open Games"
                    />
                    <QuickAction
                      href="/search"
                      icon={<CalendarDays className="h-4 w-4" />}
                      label="Host a Match"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* UPCOMING GAMES */}
              <Card className="rounded-2xl border-white/10 bg-[#0c1916]">
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold">Community Games</h3>
                    <Link
                      href="/dashboard/open-games"
                      className="text-xs font-semibold text-lime-400"
                    >
                      View all <ArrowRight className="ml-1 inline h-3 w-3" />
                    </Link>
                  </div>

                  <div className="space-y-4">
                    {UPCOMING_GAMES.map((game, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-lime-400/10 bg-gradient-to-br from-lime-500/20 to-emerald-900/30">
                          {index === 0
                            ? <Gamepad2 className="h-6 w-6 text-lime-400" />
                            : <Trophy className="h-6 w-6 text-lime-400" />
                          }
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-white">
                            {game.sport}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                            <Clock className="h-3 w-3" /> {game.date}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                            <MapPin className="h-3 w-3" /> {game.venue}
                          </p>
                        </div>

                        <Badge className="shrink-0 border-lime-400/20 bg-lime-400/10 text-[10px] text-lime-400">
                          {game.players}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* COMMUNITY PROMO */}
              <div className="relative overflow-hidden rounded-2xl border border-lime-400/20 bg-gradient-to-br from-[#183820] to-[#08150e] p-5">
                <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-lime-400/10 blur-3xl" />

                <div className="relative">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-lime-400/10">
                    <UserPlus className="h-6 w-6 text-lime-400" />
                  </div>

                  <h3 className="text-lg font-black">
                    Play Together.
                    <br />
                    Grow Together.
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Build your team, invite friends and discover new players around you.
                  </p>

                  <Button asChild className="mt-5 w-full bg-lime-400 font-bold text-black hover:bg-lime-300">
                    <Link href="/dashboard/teams">
                      Create Your Team <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </aside>
          </div>

          {/* BOTTOM BANNER */}
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-lime-400/20 bg-gradient-to-r from-[#17351d] to-[#0b1911] p-5 sm:p-7">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lime-400/10">
                <Trophy className="h-7 w-7 text-lime-400" />
              </div>
              <div>
                <h3 className="font-bold">Ready for your next match?</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Find open games and meet new teammates.
                </p>
              </div>
            </div>

            <Button asChild className="bg-lime-400 font-bold text-black hover:bg-lime-300">
              <Link href="/dashboard/open-games">
                Explore Open Games <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </section>

        </main>
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  icon,
  value,
  onChange,
  options
}: {
  label: string
  icon: React.ReactNode
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2">
      <div className="mb-1 flex items-center gap-2 text-[10px] text-slate-500">
        <span className="text-lime-400">{icon}</span>
        {label}
      </div>

      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full cursor-pointer bg-transparent text-xs font-semibold text-white outline-none"
      >
        {options.map(option => (
          <option key={option} value={option} className="bg-[#101c19]">
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}

function QuickAction({
  href,
  icon,
  label
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 transition hover:border-lime-400/30 hover:bg-lime-400/[0.04]"
    >
      <div className="flex items-center gap-3">
        <span className="text-lime-400">{icon}</span>
        <span className="text-xs font-medium text-slate-300">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-500" />
    </Link>
  )
}
