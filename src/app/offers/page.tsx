"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  Search,
  SearchIcon,
  MapPin,
  Users,
  ChevronDown,
  Bell,
  CalendarDays,
  Gift,
  ShieldCheck,
  Star,
  Clock,
  Menu,
  ChevronRight,
  LogOut,
  Info,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sidebar } from "@/components/layout/Sidebar"
import { trpc } from "@/lib/trpc"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const FILTERS = [
  { name: "All Offers" },
  { name: "Partner Offers" },
  { name: "My Rewards" },
  { name: "Challenges" },
  { name: "Claimed Offers" },
]

const PARTNER_OFFERS: any[] = []

export default function OffersPage() {
  const { data: session } = useSession()
  const [activeFilter, setActiveFilter] = useState("All Offers")
  const [selectedOffer, setSelectedOffer] = useState<any>(null)
  const [termsOfferId, setTermsOfferId] = useState<string | null>(null)
  const utils = trpc.useUtils()
  const createRedemption = trpc.offers.createRedemption.useMutation({
    onSuccess: () => {
      utils.offers.myRedemptions.invalidate()
    },
  })
  const { data: myRedemptions } = trpc.offers.myRedemptions.useQuery()
  const redeemedCount = (myRedemptions || []).filter((r: any) => r.status === "REDEEMED").length
  const totalRedemptions = (myRedemptions || []).length
  const pendingCount = totalRedemptions - redeemedCount
  const redeemedPoints = (myRedemptions || []).filter((r: any) => r.status === "REDEEMED").reduce((sum: number, r: any) => sum + (r.discountApplied || 0), 0)
  const handleUseOffer = async (offer: any) => {
    const existing = myRedemptions?.find((r: any) => r.offerId === offer.id || r.offer?.id === offer.id)
    if (existing?.verificationCode) {
      setSelectedOffer({ ...offer, verificationCode: existing.verificationCode })
      return
    }
    try {
      const res = await createRedemption.mutateAsync({ offerId: offer.id })
      setSelectedOffer({ ...offer, verificationCode: res.verificationCode })
    } catch (e: any) {
      alert(e?.message || "Failed to generate code")
    }
  }

  const { data: personalizedOffers } = trpc.offers.received.useQuery()

  const displayOffers = personalizedOffers && personalizedOffers.length > 0 ? personalizedOffers : null
  const generateTasks = trpc.offers.generateTasks.useMutation({ onSuccess: () => refetchTasks() })
  const { data: tasks, refetch: refetchTasks } = trpc.offers.myTasks.useQuery()
  const verifyAll = trpc.tasks.verifyAll.useMutation({ onSuccess: () => refetchTasks() })

  useEffect(() => {
    verifyAll.mutate()
  }, [])

  useEffect(() => {
    if (tasks && tasks.length < 5 && !generateTasks.isPending) {
      generateTasks.mutate()
    }
  }, [tasks])
  const { data: rewardPoints } = trpc.offers.myRewardPoints.useQuery()
  const [showRewardInfo, setShowRewardInfo] = useState(false)
  const trackImpression = trpc.promotions.trackOfferImpression.useMutation()
  const trackClick = trpc.promotions.trackOfferClick.useMutation()

  useEffect(() => {
    if (personalizedOffers) {
      personalizedOffers.forEach((o: any) => {
        if (o.id) trackImpression.mutate({ offerId: o.id })
      })
    }
  }, [personalizedOffers])

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070d12] px-4 text-white">
        <Card className="max-w-md w-full bg-[#111a22] border border-white/10 rounded-2xl p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-orange-400 text-black flex items-center justify-center">
            <Gift className="text-lg" />
          </div>
          <h1 className="text-2xl font-bold">Sign In Required</h1>
          <p className="mt-2 text-sm text-slate-400">Please sign in to view offers and rewards.</p>
          <Link href="/auth/login?callbackUrl=/offers" className="mt-6 w-full">
            <Button className="w-full bg-orange-400 font-bold text-black hover:bg-orange-300">Sign In</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      <Sidebar session={session} />

      <div className="min-h-screen md:pt-0 md:pl-[262px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-white/[0.08] bg-[#080f15]/95 px-4 backdrop-blur-xl sm:px-6">
          <button onClick={() => {}} aria-label="Open menu" className="rounded-lg border border-white/10 p-2 text-slate-300 md:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto" />
          <Link href="/notifications" aria-label="Notifications" className="relative rounded-full border border-white/10 bg-[#121b24] p-2.5 text-slate-300">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex shrink-0 items-center gap-2 rounded-xl p-1.5 hover:bg-white/5">
                <Avatar className="h-9 w-9 border border-white/10">
                  <AvatarImage src={session.user?.image || ""} alt={session.user?.name || "User"} />
                  <AvatarFallback className="bg-orange-400 font-bold text-black">
                    {(session.user?.name || "U")[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-left xl:block">
                  <span className="block max-w-[130px] truncate text-sm font-semibold">{session.user?.name}</span>
                  <span className="block text-xs text-slate-500">{session.user?.role}</span>
                </span>
                <ChevronDown className="hidden h-4 w-4 text-slate-500 xl:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-white/10 bg-[#111a22] text-white">
              <DropdownMenuItem>{session.user?.email || "Account"}</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => {}}>
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto max-w-[1800px] p-4 sm:p-6 xl:p-8">
          {/* Hero */}
          <section className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 bg-[#17233A]">
            <div
              className="absolute inset-0 -z-10 bg-cover bg-center opacity-40"
              style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544937577-9e9d9469f340?w=1800&q=80')" }}
            />
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_50%,rgba(249,115,22,0.22),transparent_55%),linear-gradient(110deg,rgba(11,16,32,0.92),rgba(32,37,65,0.72),rgba(11,16,32,0.88))]" />
            <div className="relative p-6 sm:p-9">
              <div className="mb-4 flex items-center gap-2">
                <Gift className="h-5 w-5 text-orange-400" />
                <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                  Offers <span className="text-orange-400">& Rewards</span>
                </h1>
              </div>
            </div>
          </section>

           {/* Sponsored Offers */}
          {(activeFilter === "All Offers" || activeFilter === "Partner Offers") && (
          <div className="mb-6">
             <div className="mb-4 flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <Gift className="h-4 w-4 text-orange-400" />
                 <h2 className="text-lg font-bold">Sponsored Offers</h2>
               </div>
             </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {(displayOffers || []).map((offer: any) => {
                const redemption = myRedemptions?.find((r: any) => r.offerId === offer.id || r.offer?.id === offer.id)
                const isUsed = redemption?.status === "REDEEMED"
                const isClaimed = !!redemption
                return (
                <Card key={offer.id || offer.brand} className={`relative shrink-0 w-64 overflow-hidden rounded-2xl border-white/[0.09] bg-[#131C2E] transition hover:border-orange-400/30 ${isUsed ? "opacity-70" : ""}`}>
                  {isUsed && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 pointer-events-none">
                      <span className="text-3xl font-black text-white/80 rotate-[-20deg] border-4 border-white/60 px-4 py-1 rounded-lg">USED</span>
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div>
                    <div className="relative h-32 overflow-hidden rounded-xl border-white/[0.05] bg-[#17271e] flex items-center justify-center">
                      {offer.sponsorLogo ? (
                        <img src={offer.sponsorLogo} alt={offer.sponsorName} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      ) : (
                        <Gift className="h-12 w-12 text-orange-400/40" />
                      )}
                    </div>
                    <div className="mt-4 flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-orange-400">{offer.sponsor?.name || offer.sponsorName || offer.category}</p>
                        {(offer.sponsor?.city || offer.sponsorCity) && <p className="text-[10px] text-slate-500">{offer.sponsor?.city || offer.sponsorCity}{(offer.sponsor?.state || offer.sponsorState) ? `, ${offer.sponsor?.state || offer.sponsorState}` : ""}</p>}
                        <h3 className="mt-1 font-bold text-white">{offer.title}</h3>
                        {offer.terms && (
                          <button onClick={() => setTermsOfferId(termsOfferId === offer.id ? null : offer.id)} className="text-slate-400 hover:text-orange-400">
                            <Info className="h-4 w-4" />
                          </button>
                        )}
                        <p className="mt-1 text-xs text-slate-400">{offer.description || offer.subtitle}</p>
                        <p className="mt-1 text-[10px] text-slate-500">Valid till {offer.validTo ? new Date(offer.validTo).toLocaleDateString() : "-"}</p>
                        {(offer.sponsor?.user?.city || offer.targetCity) && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([offer.sponsor?.user?.city || offer.targetCity, offer.sponsor?.user?.state].filter(Boolean).join(", "))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-[10px] text-orange-300 hover:text-orange-200"
                          >
                            <MapPin className="h-3 w-3" /> {offer.sponsor?.user?.city || offer.targetCity}{offer.sponsor?.user?.state ? `, ${offer.sponsor.user.state}` : ""}
                          </a>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-orange-400">
                          {offer.discountType === "PERCENTAGE" ? `${offer.discountValue}%` : `₹${offer.discountValue}`}
                        </span>
                        <p className="text-[10px] text-slate-400">OFF</p>
                      </div>
                    </div>
                    {termsOfferId === offer.id && offer.terms && (
                      <p className="mt-2 text-xs text-slate-400 border-t border-white/10 pt-2">{offer.terms}</p>
                    )}
                    <div className="mt-4">
                      <Button className="w-full bg-orange-400 font-bold text-black hover:bg-orange-300 text-sm py-2.5" onClick={() => handleUseOffer(offer)} disabled={createRedemption.isPending || isUsed}>
                        {isUsed ? "Used" : createRedemption.isPending ? "Generating..." : "Use Offer"}
                      </Button>
                    </div>
                    </div>
                  </CardContent>
                </Card>
                )
              })}
              {(!displayOffers || displayOffers.length === 0) && (
                <div className="flex-1 min-w-[200px] rounded-2xl border border-white/10 bg-[#131C2E] p-6 text-center text-sm text-slate-400">
                  No offers available right now. Check back soon!
                </div>
              )}
            </div>
          </div>
          )}

          {/* Rewards grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* My Rewards */}
            <Card className="col-span-1 md:col-span-2 rounded-2xl border-white/10 bg-[#131C2E]">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">My Rewards</h2>
                  <button onClick={() => setShowRewardInfo((v) => !v)} className="text-slate-400 hover:text-orange-400">
                    <Info className="h-5 w-5" />
                  </button>
                </div>
                {showRewardInfo && (
                  <p className="text-xs text-slate-400 mb-3">
                    You earn reward points after every game you book. 1 hour of booking = 5 reward points. Points are credited after the booking is completed.
                  </p>
                )}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <Gift className="h-12 w-12 text-orange-400" />
                    <div>
                      <p className="text-4xl font-black text-white">{rewardPoints ?? 0}</p>
                      <p className="text-xs text-slate-500">Reward Points</p>
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-orange-400/10">
                      <Star className="h-12 w-12 text-orange-400" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Complete Tasks */}
            <Card className="col-span-1 md:col-span-1 xl:col-span-1 rounded-2xl border-white/10 bg-[#131C2E]">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-400" />
                    <h3 className="font-bold text-sm">Complete Tasks</h3>
                  </div>
                </div>
                <div className="space-y-3">
                  {(tasks || []).map((task: any) => (
                    <div key={task.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-white">{task.title}</h4>
                          <p className="mt-0.5 text-xs text-slate-400">{task.description}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-orange-400">+{task.rewardPoints} pts</span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-2 w-full rounded-full border border-white/[0.08] bg-white/[0.02]">
                          <div className={`h-2 rounded-full bg-orange-400 transition-all duration-300`} style={{ width: `${Math.min(100, (task.progress / task.target) * 100)}%` }}></div>
                        </div>
                        <span className="text-xs text-slate-400">
                          {task.completed ? "Complete" : `${task.progress} / ${task.target}`}
                        </span>
                      </div>
                      {task.completed ? (
                        <Badge className="mt-2 border-orange-400/20 bg-orange-400/10 text-xs font-medium text-orange-400 hover:bg-orange-400/10">
                          Completed
                        </Badge>
                      ) : (
                        <Badge className="mt-2 border-white/10 bg-white/[0.05] text-xs font-medium text-slate-400 hover:bg-white/[0.05]">
                          In Progress
                        </Badge>
                      )}
                    </div>
                  ))}
                  {(!tasks || tasks.length === 0) && (
                    <p className="text-xs text-slate-500 text-center py-4">No tasks available yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* How It Works */}
            <Card className="col-span-1 md:col-span-1 xl:col-span-1 rounded-2xl border-white/10 bg-[#131C2E]">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-orange-400" />
                  <h3 className="font-bold text-sm">How It Works?</h3>
                </div>
                <div className="space-y-4">
                  {[
                    "Complete tasks (play, book, refer, etc.)",
                    "Earn reward points & unlock offers",
                    "Redeem offers from our partner brands",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-400/10 text-xs font-bold text-orange-400">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">{step}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {i === 0
                            ? "Play matches, book turfs and refer friends to earn points."
                            : i === 1
                              ? "Points accumulate in your wallet automatically."
                              : "Redeem your points for discounts and exclusive partner offers."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Button asChild className="w-full bg-orange-400 font-bold text-black hover:bg-orange-300">
                    <Link href="/offers">Start Earning <ChevronRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        {selectedOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-[#111a22] border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center">
              <h2 className="text-xl font-bold mb-2">{selectedOffer.title}</h2>
              <p className="text-sm text-slate-400 mb-4">Show this QR to the sponsor to redeem.</p>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedOffer.verificationCode)}`}
                alt="QR Code"
                className="mx-auto mb-4"
              />
              <p className="text-lg font-bold text-orange-400 mb-4">{selectedOffer.verificationCode}</p>
              <Button className="w-full bg-orange-400 text-black font-bold" onClick={() => setSelectedOffer(null)}>Close</Button>
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  )
}
