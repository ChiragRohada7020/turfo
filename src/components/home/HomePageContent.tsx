"use client"

import Link from "next/link"
import Image from "next/image"
import { motion, useReducedMotion } from "motion/react"
import {
  ArrowRight,
  Bell,
  CalendarDays,
  MapPin,
  Search,
  Star,
  Ticket,
  Trophy,
  Users,
  Zap,
  Gift,
  ShieldCheck,
  Activity,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const NAV_LINKS = [
  { name: "Home", href: "/" },
  { name: "Discover Turfs", href: "/search" },
  { name: "Tournaments", href: "/tournaments" },
  { name: "Offers", href: "/offers" },
  { name: "Blog", href: "/blogs" },
  { name: "Leaderboard", href: "/leaderboard" },
]

const SPORTS = [
  { name: "Football", icon: "⚽", count: "150+ turfs", tone: "from-orange-100 to-amber-50" },
  { name: "Cricket", icon: "🏏", count: "120+ nets", tone: "from-violet-100 to-indigo-50" },
  { name: "Pickleball", icon: "🏓", count: "60+ courts", tone: "from-rose-100 to-pink-50" },
  { name: "Badminton", icon: "🏸", count: "90+ courts", tone: "from-sky-100 to-cyan-50" },
  { name: "Tennis", icon: "🎾", count: "70+ courts", tone: "from-lime-100 to-green-50" },
  { name: "Volleyball", icon: "🏐", count: "40+ courts", tone: "from-amber-100 to-yellow-50" },
  { name: "Basketball", icon: "🏀", count: "50+ courts", tone: "from-fuchsia-100 to-purple-50" },
  { name: "More sports", icon: "＋", count: "Explore all", tone: "from-slate-100 to-gray-50" },
]

const OFFERS = [
  {
    title: "Pizza Point",
    discount: "₹20 OFF",
    desc: "On orders above ₹199",
    code: "TURFPIZZA20",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRmy14NgyDEjjXcCZ3-tJ0eBqozUvwLjwEqgWiYusIS3Q&s=10",
  },
  {
    title: "Book 3 Slots",
    discount: "15% OFF",
    desc: "On your next booking",
    code: "PLAY15",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRS-KlxO9AldLG4UxiCrsDPMtygEzMAku-ujsobLefDBg&s=10",
  },
  {
    title: "Weekly Challenge",
    discount: "WIN 100 PTS",
    desc: "Book and play 4 days",
    code: "",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTYBaq0gieLhC2CHEV_7Y3NVZfj2eaIhhoH3BmBKxD3uSayPNef_SqLFiKm&s=10",
  },
  {
    title: "Refer a Friend",
    discount: "₹50 OFF",
    desc: "For you and your friend",
    code: "REFER50",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQid6eF41ZayXWoRvmY6dLY1QLimDs_ymglN3FaAff0Vw&s=10",
  },
]

const TOURNAMENTS = [
  {
    title: "Pachora Turf Cup 2026",
    sport: "Football · 5v5",
    date: "5 – 7 Dec",
    teams: "32 Teams",
    prize: "₹25,000",
  },
]

const TURFS = [
  {
    name: "GreenField Turf",
    city: "Pachora, Maharashtra",
    rating: "4.8",
    reviews: "126 reviews",
    sports: ["Football", "Cricket"],
    price: 499,
    image: "https://www.ebaco.co.in/wp-content/uploads/2018/09/shutterstock_123684637-320x420.jpg",
  },
  {
    name: "Pachora Turf Arena",
    city: "Pachora, Maharashtra",
    rating: "4.7",
    reviews: "89 reviews",
    sports: ["Football", "Box Cricket"],
    price: 549,
    image: "https://www.ebaco.co.in/wp-content/uploads/2018/09/shutterstock_123684637-320x420.jpg",
  },
  {
    name: "Champion Turf",
    city: "Pachora, Maharashtra",
    rating: "4.6",
    reviews: "64 reviews",
    sports: ["Football", "Pickleball"],
    price: 449,
    image: "https://www.ebaco.co.in/wp-content/uploads/2018/09/shutterstock_123684637-320x420.jpg",
  },
]

const STATS = [
  { label: "Players", value: 10000, suffix: "+" },
  { label: "Turfs", value: 15, suffix: "+" },
  { label: "Bookings", value: 5000, suffix: "+" },
  { label: "Tournaments", value: 50, suffix: "+" },
]

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

function SectionHeading({
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  eyebrow?: string
  title: string
  href?: string
  linkLabel?: string
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-600">
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl font-black tracking-tight text-[#171A2B] sm:text-3xl">
          {title}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="group mb-1 inline-flex shrink-0 items-center gap-1 text-sm font-bold text-[#55516F] transition-colors hover:text-orange-600"
        >
          {linkLabel ?? "View all"}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  )
}

export default function HomePageContent() {
  const shouldReduceMotion = useReducedMotion()

  const fadeUp = shouldReduceMotion
    ? {}
    : {
        initial: "hidden",
        whileInView: "visible",
        variants: reveal,
        viewport: { once: true, amount: 0.15 },
        transition: { duration: 0.55, ease: "easeOut" as const },
      }

  return (
    <div className="min-h-screen overflow-hidden bg-[#F7F8FC] font-sans text-[#171A2B]">
      <header className="sticky top-0 z-50 border-b border-white/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#171A2B] text-lg font-black text-white shadow-lg shadow-slate-900/15 transition-transform group-hover:rotate-[-8deg]">
              S
            </span>
            <span className="text-[23px] font-black tracking-[-0.06em] text-[#171A2B]">
              strikora<span className="text-orange-500">.</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="group relative py-2 text-[13px] font-semibold text-slate-600 transition-colors hover:text-[#171A2B]"
              >
                {item.name}
                <span className="absolute inset-x-0 -bottom-1 h-0.5 origin-left scale-x-0 rounded-full bg-orange-500 transition-transform duration-300 group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/search"
              aria-label="Search turfs"
              className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-500 transition hover:border-orange-200 hover:text-orange-600 sm:flex"
            >
              <Search className="h-4 w-4" />
              Search turfs
            </Link>
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-[#171A2B]"
            >
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-orange-500 ring-2 ring-white" />
            </button>
            <Link
              href="/search"
              className="hidden rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-600 sm:inline-flex"
            >
              Book a turf
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8 lg:px-8">
          <div className="relative isolate min-h-[560px] overflow-hidden rounded-[32px] bg-[#171A2B] shadow-2xl shadow-slate-900/10 sm:min-h-[600px]">
            <div className="absolute inset-0 -z-20">
              <Image
                src="/turf.png"
                alt="Sports turf"
                fill
                priority
                unoptimized
                className="object-cover opacity-35"
                sizes="100vw"
              />
            </div>
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#111426] via-[#171A2B]/95 to-[#171A2B]/35" />
            <div className="absolute -right-24 -top-28 -z-10 h-96 w-96 rounded-full bg-orange-500/20 blur-[100px]" />
            <div className="absolute bottom-[-120px] right-[20%] -z-10 h-80 w-80 rounded-full bg-violet-500/20 blur-[100px]" />

            <div className="grid min-h-[560px] items-center gap-10 px-6 py-14 sm:px-10 lg:min-h-[600px] lg:grid-cols-[1.1fr_.9fr] lg:px-16">
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="max-w-2xl"
              >
                <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/90 backdrop-blur-md">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  Now playing in Pachora
                </div>

                <h1 className="max-w-[720px] text-[42px] font-black leading-[1.06] tracking-[-0.055em] text-white sm:text-6xl lg:text-[68px]">
                  Your game.
                  <br />
                  Your ground.
                  <br />
                  <span className="bg-gradient-to-r from-orange-300 via-orange-400 to-amber-200 bg-clip-text text-transparent">
                    Your moment.
                  </span>
                </h1>
                <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                  Discover the best sports venues around you. Book your slot,
                  bring your squad and make every game count.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/search"
                    className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 text-sm font-extrabold text-white shadow-xl shadow-orange-500/25 transition duration-300 hover:-translate-y-1 hover:bg-orange-400"
                  >
                    Find your turf
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="/tournaments"
                    className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
                  >
                    Explore tournaments
                  </Link>
                </div>

                <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-slate-300">
                  <span className="inline-flex items-center gap-2"><Zap className="h-4 w-4 text-orange-300" /> Instant booking</span>
                  <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-orange-300" /> Trusted venues</span>
                  <span className="inline-flex items-center gap-2"><Gift className="h-4 w-4 text-orange-300" /> Player rewards</span>
                </div>
              </motion.div>

              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.94, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.15 }}
                className="relative hidden h-[390px] lg:block"
              >
                <div className="absolute right-0 top-2 h-[340px] w-[82%] overflow-hidden rounded-[28px] border border-white/20 bg-white/10 shadow-2xl shadow-black/30">
                  <Image
                    src="/turf.png"
                    alt="Book a sports turf"
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="500px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
                  <div className="absolute bottom-6 left-6 text-white">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">Find your next game</p>
                    <p className="mt-1 text-2xl font-black">Game on.</p>
                  </div>
                </div>
                <motion.div
                  animate={shouldReduceMotion ? undefined : { y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -left-2 top-16 rounded-2xl border border-white/70 bg-white p-4 shadow-2xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-xl">⚽</span>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Your next match</p>
                      <p className="text-sm font-extrabold text-[#171A2B]">Starts with a booking</p>
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  animate={shouldReduceMotion ? undefined : { y: [0, 9, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute bottom-0 left-8 rounded-2xl border border-white/70 bg-white p-4 shadow-2xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><Trophy className="h-5 w-5" /></span>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Play. Compete. Win.</p>
                      <p className="text-sm font-extrabold text-[#171A2B]">Earn player rewards</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Activity className="h-4 w-4" /></span>
              <div>
                <p className="text-sm font-extrabold text-[#171A2B]">The local sports scene is active</p>
                <p className="text-xs text-slate-500">Find a venue and get your game started</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">Live in Pachora</span>
          </div>
        </div>

        <motion.section {...fadeUp} className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-3 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:grid-cols-4 sm:p-7">
            {STATS.map((stat, index) => (
              <div key={stat.label} className={`py-3 text-center ${index > 0 ? "sm:border-l sm:border-slate-100" : ""}`}>
                <p className="text-3xl font-black tracking-tight text-[#171A2B] sm:text-4xl">
                  {stat.value.toLocaleString("en-IN")}{stat.suffix}
                </p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section {...fadeUp} className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Choose your game" title="What do you want to play?" href="/search" linkLabel="All sports" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {SPORTS.map((sport, index) => (
              <motion.div
                key={sport.name}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.055, duration: 0.4 }}
                whileHover={shouldReduceMotion ? undefined : { y: -6 }}
              >
                <Link href="/search" className="group block h-full">
                  <Card className="h-full rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm transition-all duration-300 group-hover:border-orange-200 group-hover:shadow-xl group-hover:shadow-orange-900/5">
                    <CardContent className="flex flex-col items-center p-2 text-center">
                      <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${sport.tone} text-3xl transition-transform duration-300 group-hover:scale-110`}>
                        {sport.icon}
                      </div>
                      <h3 className="text-sm font-extrabold text-[#171A2B]">{sport.name}</h3>
                      <p className="mt-1 text-[10px] font-semibold text-slate-400">{sport.count}</p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section {...fadeUp} className="bg-[#171A2B] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="More play, more perks" title="Offers worth showing up for" href="/offers" linkLabel="All offers" />
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
              {OFFERS.map((offer, index) => (
                <motion.div
                  key={offer.title}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  whileHover={shouldReduceMotion ? undefined : { y: -7 }}
                  className="shrink-0 w-[300px] snap-start"
                >
                  <Card className="group h-full overflow-hidden rounded-2xl border border-white/10 bg-white text-[#171A2B] shadow-xl shadow-black/10">
                    <div className="relative h-36 overflow-hidden bg-slate-200">
                      <img src={offer.image} alt={offer.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <span className="absolute bottom-3 left-4 text-xl font-black text-white">{offer.discount}</span>
                      <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold text-orange-600">SPECIAL OFFER</span>
                    </div>
                    <CardContent className="p-5">
                      <h3 className="font-extrabold">{offer.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">{offer.desc}</p>
                      <div className="mt-4 flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{offer.code || "Player challenge"}</span>
                        <Link href="/offers" className="inline-flex items-center gap-1 text-xs font-extrabold text-orange-600 hover:text-orange-700">
                          Explore <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section {...fadeUp} className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Bring your A-game" title="Compete for something bigger" href="/tournaments" linkLabel="All tournaments" />
          <div className="grid gap-5 lg:grid-cols-2">
            {TOURNAMENTS.map((tournament) => (
              <Card key={tournament.title} className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="grid sm:grid-cols-[.9fr_1.1fr]">
                  <div className="relative min-h-[220px] overflow-hidden bg-[#252943]">
                    <Image src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSfAeSu7H2bt_eJ_FU4pAlo55HvW5L1SX4Dy427lQefwtEFdIZYN3iDCb8&s=10" alt={tournament.title} fill unoptimized className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="400px" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#171A2B]/80 to-transparent" />
                    <span className="absolute left-4 top-4 rounded-full bg-orange-500 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white">Registration open</span>
                    <div className="absolute bottom-4 left-4 flex items-center gap-2 text-sm font-bold text-white">
                      <CalendarDays className="h-4 w-4 text-orange-300" /> {tournament.date}
                    </div>
                  </div>
                  <CardContent className="flex flex-col justify-center p-6 sm:p-7">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">{tournament.sport}</p>
                    <h3 className="mt-2 text-2xl font-black tracking-tight text-[#171A2B]">{tournament.title}</h3>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <Users className="mb-2 h-4 w-4 text-slate-400" />
                        <p className="text-sm font-extrabold">{tournament.teams}</p>
                        <p className="text-[10px] text-slate-400">Team capacity</p>
                      </div>
                      <div className="rounded-xl bg-orange-50 p-3">
                        <Trophy className="mb-2 h-4 w-4 text-orange-500" />
                        <p className="text-sm font-extrabold text-orange-700">{tournament.prize}</p>
                        <p className="text-[10px] text-orange-500/70">Prize pool</p>
                      </div>
                    </div>
                    <Link href="/tournaments" className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#171A2B] px-5 text-sm font-bold text-white transition hover:bg-orange-500">
                      View tournament <ArrowRight className="h-4 w-4" />
                    </Link>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </motion.section>

        <motion.section {...fadeUp} className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="Find your home ground" title="Popular turfs near you" href="/search" linkLabel="Explore all turfs" />
            <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory">
              {TURFS.map((turf, index) => (
                <motion.div
                  key={turf.name}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  whileHover={shouldReduceMotion ? undefined : { y: -6 }}
                  className="shrink-0 w-[320px] snap-start"
                >
                  <Card className="group h-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-slate-900/10">
                    <div className="relative h-56 overflow-hidden bg-slate-200">
                      <Image src={turf.image} alt={turf.name} fill unoptimized className="object-cover transition-transform duration-700 group-hover:scale-110" sizes="(max-width: 768px) 100vw, 33vw" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-[#171A2B] shadow-lg">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {turf.rating}
                      </div>
                      <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                        {turf.sports.map((sport) => (
                          <span key={sport} className="rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[10px] font-bold text-white backdrop-blur">{sport}</span>
                        ))}
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-black text-[#171A2B]">{turf.name}</h3>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                            <MapPin className="h-3.5 w-3.5 text-orange-500" /> {turf.city}
                          </p>
                          <p className="mt-2 text-[11px] text-slate-400">{turf.reviews}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xl font-black text-[#171A2B]">₹{turf.price}</p>
                          <p className="text-[10px] font-semibold text-slate-400">per hour</p>
                        </div>
                      </div>
                      <Link href="/search" className="mt-5 flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-extrabold text-[#171A2B] transition-all hover:border-orange-500 hover:bg-orange-500 hover:text-white">
                        View availability <ArrowRight className="h-4 w-4" />
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-orange-500 to-[#F47B45] px-6 py-12 text-center text-white sm:px-12">
            <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[36px] border-white/10" />
            <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full border-[40px] border-white/10" />
            <div className="relative">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/75">Your squad is waiting</p>
              <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Less scrolling. More scoring.</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/85">Find a nearby venue, choose your time and get the team together.</p>
              <Link href="/search" className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-extrabold text-orange-600 shadow-xl transition hover:-translate-y-1 hover:bg-slate-50">
                Book your next game <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-9 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <Link href="/" className="text-xl font-black tracking-[-0.05em] text-[#171A2B]">
            strikora<span className="text-orange-500">.</span>
          </Link>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} Strikora. All rights reserved. Book · Play · Compete.</p>
          <div className="flex flex-wrap gap-5 text-xs font-semibold text-slate-500">
            <Link href="/search" className="hover:text-orange-600">Discover</Link>
            <Link href="/tournaments" className="hover:text-orange-600">Tournaments</Link>
            <Link href="/offers" className="hover:text-orange-600">Offers</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
