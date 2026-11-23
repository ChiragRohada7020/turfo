"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  MapPin,
  Clock,
  Star,
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2,
  Calendar,
  X,
  Check,
  Building2,
  Users,
  Trophy,
  Gift,
  Ticket,
  Home,
  Bell,
  Sun,
  Droplets,
  Wifi,
  Coffee,
  PlusCircle,
  Loader2,
} from "lucide-react"
import { formatDate, cn, formatCurrency } from "@/lib/utils"
import { trpc } from "@/lib/trpc"
import { BookingModal } from "@/components/facility/BookingModal"
import { FacilitySkeleton } from "@/components/facility/FacilitySkeleton"
import { Sidebar } from "@/components/layout/Sidebar"

const AMENITY_ICONS: Record<string, any> = {
  parking: Building2,
  lights: Sun,
  changing_room: Building2,
  drinking_water: Droplets,
  wifi: Wifi,
  cafeteria: Coffee,
  first_aid: PlusCircle,
  shower: Droplets,
}
function FacilityDetailInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const facilityId = params.id as string
  const sportParam = (searchParams.get("sport") || "").toUpperCase().replace(/ /g, "_")
  const courtParam = searchParams.get("court") || ""
  const bookMode = searchParams.get("book") === "1"

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string; price: number } | null>(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [showBookingModal, setShowBookingModal] = useState(false)

  const { data: facility, isLoading: facilityLoading } = trpc.facilities.get.useQuery({ id: facilityId })
  const isOwner = !!session?.user?.id && facility?.ownerId === session.user.id
  const courtForQuery = selectedCourtId || ""
const { data: availability, isLoading: availabilityLoading, refetch: refetchAvailability } = trpc.courts.availability.useQuery(
    { courtId: selectedCourtId || "", date: selectedDate.toISOString().split("T")[0] },
    { enabled: !!selectedCourtId }
  )

  // Refetch availability when booking modal closes
  useEffect(() => {
    if (!showBookingModal) {
      refetchAvailability()
    }
  }, [showBookingModal, refetchAvailability])

  // Refetch availability when page becomes visible (user returns from payment)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refetchAvailability()
        fetch("/api/bookings/cleanup", { method: "POST" }).catch(() => {})
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [refetchAvailability])

  const courts = useMemo(
    () => facility?.courts || [],
    [facility]
  )
  const images = facility?.images || []

  const selectedCourt = courts.find((c: any) => c.id === selectedCourtId) || courts[0]
  // Calculate price based on selected time (dynamic pricing)
  const getPriceForTime = (timeStr: string) => {
    const rules = selectedCourt?.pricingRules?.length > 0
      ? selectedCourt.pricingRules
      : (facility?.pricingRules || [])
    if (rules.length === 0) {
      return facility?.minPrice ?? 0
    }
    const [h, m] = timeStr.split(":").map(Number)
    const mins = h * 60 + m
    const dayOfWeek = selectedDate.getDay()
    const matchingRules = rules.filter((r: any) => {
      const [sh, sm] = r.startTime.split(":").map(Number)
      const [eh, em] = r.endTime.split(":").map(Number)
      const startMins = sh * 60 + sm
      const endMins = eh * 60 + em
      return r.dayOfWeek.includes(dayOfWeek) && mins >= startMins && mins < endMins
    })
    const applicable = matchingRules.sort((a: any, b: any) => {
      const aDur = (parseInt(a.endTime.split(":")[0]) * 60 + parseInt(a.endTime.split(":")[1])) - (parseInt(a.startTime.split(":")[0]) * 60 + parseInt(a.startTime.split(":")[1]))
      const bDur = (parseInt(b.endTime.split(":")[0]) * 60 + parseInt(b.endTime.split(":")[1])) - (parseInt(b.startTime.split(":")[0]) * 60 + parseInt(b.startTime.split(":")[1]))
      return aDur - bDur
    })[0]
    return applicable?.pricePerHour ?? rules[0]?.pricePerHour ?? facility?.minPrice ?? 0
  }

  const slotPrice = selectedSlot?.price ?? getPriceForTime(selectedSlot?.start || "06:00")

  const availableSlotKeys = new Set<string>()
  if (availability?.slots) {
    availability.slots.forEach((s: any) => {
      availableSlotKeys.add(`${s.startTime}-${s.endTime}`)
    })
  }

  useEffect(() => {
    if (courtParam && courts.some((c: any) => c.id === courtParam)) {
      setSelectedCourtId(courtParam)
    } else if (courts.length > 0 && !selectedCourtId) {
      setSelectedCourtId(courts[0].id)
    }
  }, [courts, selectedCourtId, courtParam])

  useEffect(() => {
    setSelectedSlot(null)
  }, [selectedCourtId, selectedDate])

  if (facilityLoading) return <FacilitySkeleton />
  if (!facility) {
    return (
      <div className="min-h-screen bg-[#070d12] flex items-center justify-center px-4 text-white">
        <div className="max-w-md p-8 bg-[#111a22] border border-white/10 rounded-2xl text-center">
          <h1 className="text-2xl font-bold mb-4">Facility Not Found</h1>
          <Link href="/search"><Button>Back to Search</Button></Link>
        </div>
      </div>
    )
  }

  const isOwnerOrAdmin = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN"
  if (!facility.owner?.isVerified && !isOwnerOrAdmin) {
    return (
      <div className="min-h-screen bg-[#070d12] flex items-center justify-center px-4 text-white">
        <div className="max-w-md p-8 bg-[#111a22] border border-white/10 rounded-2xl text-center">
          <h1 className="text-2xl font-bold mb-4">Facility Not Available</h1>
          <p className="text-sm text-slate-400 mb-4">This facility is not yet verified and is not available for booking.</p>
          <Link href="/search"><Button>Back to Search</Button></Link>
        </div>
      </div>
    )
  }

  const avgRating = facility.avgRating || 0
  const reviewCount = facility.reviewCount || 0
  const sportLabel = sportParam ? sportParam.replace(/_/g, " ") : facility.sportTypes?.[0]?.replace(/_/g, " ") || "Pickleball"

  const goDay = (delta: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    setSelectedDate(d)
  }

  const isToday = (d: Date) => d.toDateString() === new Date().toDateString()

  const dateOptions = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    dateOptions.push(d)
  }

  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      <Sidebar session={session as any} />

      <div className="md:pt-0 md:pl-[262px] pb-20 md:pb-0">
        <header className="sticky top-0 z-20 bg-[#070d12]/80 backdrop-blur border-b border-white/10 px-4 py-3 pl-14 md:pl-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Button variant="outline" size="sm" asChild className="border-white/10 text-white px-2 shrink-0">
                <Link href="/search"><span>←</span></Link>
              </Button>
              <span className="text-xs text-lime-400 font-semibold truncate">{facility.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-2 rounded-lg border border-white/10 bg-[#080f15] px-3 py-1.5 text-xs text-slate-300">
                <MapPin className="h-3 w-3" /> {facility?.city || "Location"}
              </div>
              <Button variant="outline" size="icon" className="border-white/10 text-slate-300 hover:text-white h-8 w-8">
                <Bell className="h-4 w-4" />
              </Button>
              <Image src="/placeholder.svg" alt="user" width={28} height={28} className="rounded-full border border-white/10" />
            </div>
          </div>
        </header>

        <div className="px-4 py-6 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <main className="lg:col-span-7 space-y-6">
              {!bookMode && (
                <>
              {/* Image Gallery */}
              <div className="relative group rounded-2xl overflow-hidden border border-white/10 bg-[#080f15]">
                <div className="relative h-[420px] w-full">
                  {images.length > 0 ? (
                    <>
                      <Image
                        src={images[activeImageIndex]}
                        alt={facility.name}
                        fill
                        className="object-cover"
                        priority
                        sizes="(max-width: 1024px) 100vw, 560px"
                      />
                      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-xs font-medium text-white">
                        {activeImageIndex + 1} / {images.length}
                      </div>
                      {images.length > 1 && (
                        <>
                          <button
                            onClick={() => setActiveImageIndex((i) => (i === 0 ? images.length - 1 : i - 1))}
                            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/60 backdrop-blur rounded-full hover:bg-black/80"
                            aria-label="Previous"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setActiveImageIndex((i) => (i === images.length - 1 ? 0 : i + 1))}
                            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/60 backdrop-blur rounded-full hover:bg-black/80"
                            aria-label="Next"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </>
                      )}


                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center"><span className="text-6xl">🏟️</span></div>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="flex gap-1 px-4 py-3 overflow-x-auto scrollbar-hidden">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImageIndex(i)}
                        className={cn(
                          "shrink-0 w-12 h-12 rounded-lg border overflow-hidden",
                          i === activeImageIndex ? "border-lime-400" : "border-white/10"
                        )}
                      >
                        <Image src={images[i]} alt="" fill className="object-cover" sizes="48px" />
                      </button>
                    ))}
                  </div>
                )}
               </div>
                </>
              )}

              {!bookMode && (
                <>
                <h1 className="text-3xl font-bold tracking-tight">{facility.name}</h1>

                <div className="flex flex-wrap items-center gap-3 mt-2">
                <Button asChild size="sm" className="rounded-lg bg-orange-400 font-bold text-black hover:bg-orange-300">
                  <a href={(facility.owner?.latitude && facility.owner?.longitude) ? `https://www.google.com/maps/dir/?api=1&destination=${facility.owner.latitude},${facility.owner.longitude}` : (facility.latitude && facility.longitude ? `https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}` : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((facility.address || "") + ", " + (facility.city || ""))}`)} target="_blank" rel="noopener noreferrer">
                    <MapPin className="mr-1.5 h-4 w-4" /> Directions
                  </a>
                </Button>
                  <span className="flex items-center gap-1 text-sm text-slate-400"><Clock className="w-4 h-4" /> Open: 6:00 AM – 12:00 AM</span>
                  <span className="flex items-center gap-1 text-sm text-slate-400"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /><span className="font-medium">{avgRating.toFixed(1)}</span> ({reviewCount} reviews)</span>
                </div>
               </>
             )}

              {/* Available Sports */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Available Sports at this Turf</p>
                <div className="flex gap-2">
                  {facility.sportTypes?.map((sport: string) => (
                    <Badge
                      key={sport}
                      variant={sportParam && sport === sportParam ? "default" : "outline"}
                      className={cn(
                        sportParam && sport === sportParam
                          ? "bg-lime-400 text-black border-lime-400"
                          : "border-white/10 text-slate-300 hover:border-lime-400/50 hover:text-white"
                      )}
                      onClick={() => {
                        const url = new URL(window.location.href)
                        url.searchParams.set("sport", sport.replace(/_/g, " "))
                        window.history.pushState(null, "", url.toString())
                        setSelectedCourtId(courts.find((c: any) => c.sportType === sport)?.id || null)
                        setSelectedSlot(null)
                      }}
                    >
                      {sport.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>

               {/* Court Info Row */}
               {!bookMode && (
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-white/10 bg-[#080f15]">
                   <div className="text-center">
                     <p className="text-xs text-slate-500">Courts</p>
                     <p className="font-semibold text-white">{courts.length} Courts</p>
                   </div>
                   <div className="text-center border-l border-white/10 pl-4">
                     <p className="text-xs text-slate-500">Court Size</p>
                     <p className="font-semibold text-white">{selectedCourt?.dimensions || "—"}</p>
                   </div>
                   <div className="text-center border-l border-white/10 pl-4">
                     <p className="text-xs text-slate-500">Surface</p>
                     <p className="font-semibold text-white">{selectedCourt?.surfaceType?.replace(/_/g, " ") || "—"}</p>
                   </div>
                   <div className="text-center border-l border-white/10 pl-4">
                     <p className="text-xs text-slate-500">Game Type</p>
                     <p className="font-semibold text-white">Singles / Doubles</p>
                   </div>
                 </div>
               )}


              {!bookMode && (
                <>
               {/* About */}
               <div className="hidden">
                 <h2 className="text-sm font-bold text-white mb-3">About This Turf</h2>
                 <p className="text-sm text-slate-400 leading-relaxed">
                   {facility.description || `Premium multi-sport turf with dedicated ${sportLabel} courts, professional lighting, clean amenities, and a great playing experience.`}
                 </p>
               </div>

              {/* Amenities */}
              <div>
                <h2 className="text-sm font-bold text-white mb-3">Amenities</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(facility.amenities || []).map((amenity: string) => {
                    const Icon = AMENITY_ICONS[amenity] || MapPin
                    return (
                      <div key={amenity} className="flex items-center gap-2 p-3 rounded-lg border border-white/10 bg-[#080f15]">
                        <Icon className="h-5 w-5 text-lime-400" />
                        <span className="text-xs text-slate-300 capitalize">{amenity.replace(/_/g, " ")}</span>
                      </div>
                    )
                  })}
                </div>
               </div>
                </>
              )}

                {/* Courts grid */}
              <div>
                <h2 className="text-sm font-bold text-white mb-3">Select Court</h2>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {courts.map((court: any) => {
                    const active = selectedCourtId === court.id
                    return (
                      <button
                        key={court.id}
                        onClick={() => { setSelectedCourtId(court.id); setSelectedSlot(null) }}
                        className={cn(
                          "shrink-0 w-64 flex items-center gap-3 rounded-xl border p-3 text-left transition",
                          active
                            ? "border-lime-400 bg-[#080f15]"
                            : "border-white/10 bg-[#080f15]/50 hover:border-white/20"
                        )}
                      >
                        <div className="shrink-0 w-10 h-10 rounded bg-[#080f15] flex items-center justify-center border border-white/10">
                          {active ? <Check className="w-5 h-5 text-lime-400" /> : <Users className="w-5 h-5 text-slate-400" />}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{court.name}</p>
                          <p className="text-xs text-slate-500">{court.sportType.replace(/_/g, " ")}</p>
                        </div>
                        <span className="ml-auto text-xs font-bold text-lime-400">
                          from {formatCurrency(Math.min(...(court.pricingRules?.map((r: any) => r.pricePerHour) || [facility.minPrice ?? 0])))}/hr
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>


             </main>

            <aside className="lg:col-span-5">
              <div className="sticky top-5">
                <Card className="bg-[#080f15] border border-white/10 overflow-hidden">
                  <CardContent className="p-4">

                    {/* Select Date */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => goDay(-7)}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          <ChevronLeft className="w-3 h-3 mr-1" /> Prev
                        </button>
                        <span className="text-sm font-medium text-white">{formatDate(selectedDate)}</span>
                        <button
                          onClick={() => goDay(7)}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          Next <ChevronRight className="w-3 h-3 ml-1" />
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {dateOptions.map((d) => {
                          const selected = d.toDateString() === selectedDate.toDateString()
                          return (
                            <button
                              key={d.toISOString()}
                              onClick={() => setSelectedDate(d)}
                              className={cn(
                                "aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition",
                                selected
                                  ? "bg-lime-400 text-[#070d12] font-bold"
                                  : isToday(d)
                                  ? "border border-white/20 text-slate-300"
                                  : "text-slate-500 hover:text-white hover:bg-white/5"
                              )}
                            >
                              <span>{d.toDateString().slice(0, 3)}</span>
                              <span className="font-medium">{d.getDate()}</span>
                              <span className="text-[10px]">{d.toDateString().slice(4, 7)}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Select Time Slot */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-slate-400 uppercase">Select Time Slot</p>
                        <div className="flex gap-1 text-[10px]">
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-lime-400" /> Available</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Booked</span>
                        </div>
                      </div>
{availabilityLoading ? (
  <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="h-4 w-4 animate-spin" /></div>
) : availability?.isBlocked ? (
  <p className="text-slate-400 text-sm">{availability.note || "No slots available on this date."}</p>
) : (
   <div className="space-y-3">
     <div id="slot-grid" className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
      {(() => {
        const ot = facility?.openTime || "06:00"
        const ct = facility?.closeTime || "22:00"
        const [oh, om] = ot.split(":").map(Number)
        const [ch, cm] = ct.split(":").map(Number)
        const s = oh * 60 + om
        let e = ch * 60 + cm
        if (e <= s) e += 24 * 60
        const times = []
        for (let m = s; m < e; m += 30) {
          const hh = String(Math.floor((m % 1440) / 60)).padStart(2, "0")
          const mm = String(m % 60).padStart(2, "0")
          times.push(`${hh}:${mm}`)
        }
         return times.map((time) => {
           const isStartSelected = selectedSlot?.start === time
           const isEndSelected = selectedSlot?.end === time
           const isInRange = selectedSlot?.start && selectedSlot?.end && time > selectedSlot.start && time < selectedSlot.end
           const isBooked = !availability?.slots?.some((s: any) => s.startTime <= time && s.endTime > time) && !availability?.slots?.some((s: any) => s.startTime === time)
           const isAvailableTime = availability?.slots?.some((s: any) => s.startTime <= time && s.endTime > time) ?? false
           const canSelectAsStart = !selectedSlot?.start || selectedSlot.start === time
           const canSelectAsEnd = selectedSlot?.start && time > selectedSlot.start
           const isInBookedRange = !availability?.slots?.some((s: any) => s.startTime <= time && s.endTime > time)
           let wouldOverlapBooked = false
           if (selectedSlot?.start && time > selectedSlot.start) {
             const startMins = parseInt(selectedSlot.start.split(":")[0]) * 60 + parseInt(selectedSlot.start.split(":")[1])
             const endMins = parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1])
             for (let m = startMins + 30; m < endMins; m += 30) {
               const hh = String(Math.floor(m / 60)).padStart(2, "0")
               const mm = String(m % 60).padStart(2, "0")
               const t = `${hh}:${mm}`
               if (!availability?.slots?.some((s: any) => s.startTime <= t && s.endTime > t)) {
                 const slotExists = availability?.slots?.some((s: any) => s.startTime === t || (s.startTime < t && s.endTime > t))
                 if (!slotExists) { wouldOverlapBooked = true; break }
               }
             }
           }
           let bgClass = "border-white/10 text-white hover:border-lime-400/50 active:bg-white/5"
           if (isStartSelected || isEndSelected) bgClass = "bg-lime-400 border-lime-400 text-[#070d12] font-bold"
           else if (isInRange) bgClass = "bg-lime-400/20 border-lime-400/30 text-lime-300"
           else if (selectedSlot?.start && wouldOverlapBooked) bgClass = "border-red-500/50 text-red-400 bg-red-500/10 cursor-not-allowed"
           else if (!isAvailableTime && !selectedSlot?.start) bgClass = "border-red-500/50 text-red-400 bg-red-500/10 cursor-not-allowed"
           else if (selectedSlot?.start && time <= selectedSlot.start) bgClass = "border-white/5 text-slate-600 cursor-not-allowed opacity-40"
           else if (!isOwner && selectedSlot?.start && (() => { const sm2 = parseInt(selectedSlot.start.split(":")[0]) * 60 + parseInt(selectedSlot.start.split(":")[1]); const em2 = parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1]); return (em2 - sm2) > 60 })()) bgClass = "border-white/5 text-slate-600 cursor-not-allowed opacity-40"
            const isDisabled = selectedSlot?.start ? (time < selectedSlot.start || wouldOverlapBooked || (!isOwner && (() => { const sm2 = parseInt(selectedSlot.start.split(":")[0]) * 60 + parseInt(selectedSlot.start.split(":")[1]); const em2 = parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1]); return (em2 - sm2) > 60 })())) : !isAvailableTime
           return (
                <button key={time} onClick={() => { 
                  if (selectedSlot?.start === time) { 
                    setSelectedSlot(null); 
                    return; 
                  } 
                  if (!selectedSlot?.start) { 
                    if (!isAvailableTime) return; 
                    setSelectedSlot({ start: time, end: "", price: getPriceForTime(time) }); 
                  } else if (time > selectedSlot.start && !wouldOverlapBooked) { 
                    setSelectedSlot({ ...selectedSlot, end: time }) 
                  } 
                }} disabled={isDisabled} className={cn("rounded-lg border px-1 py-2 text-[11px] font-medium transition min-h-[36px]", bgClass)}>
               {time}
             </button>
           )
         })
      })()
      }
    </div>
    {selectedSlot?.start && selectedSlot?.end && (
      <div className="p-3 bg-[#17222d] rounded-lg border border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Duration</span>
          <span className="text-sm font-bold text-white">
            {(() => {
              const [sh, sm] = selectedSlot.start.split(":").map(Number)
              const [eh, em] = selectedSlot.end.split(":").map(Number)
              const mins = (eh * 60 + em) - (sh * 60 + sm)
              return `${mins} mins (${(mins / 60).toFixed(1)} hrs)`
            })()}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm text-slate-400">Price (per hour)</span>
          <span className="text-sm font-bold text-lime-400">{formatCurrency(slotPrice)}/hr</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm text-slate-400">Est. Total</span>
          <span className="text-sm font-bold text-lime-400">
            {formatCurrency((() => {
              const [sh, sm] = selectedSlot.start.split(":").map(Number)
              const [eh, em] = selectedSlot.end.split(":").map(Number)
              const mins = (eh * 60 + em) - (sh * 60 + sm)
              return (slotPrice * mins) / 60
            })())}
          </span>
        </div>
        <button
          onClick={() => setSelectedSlot(null)}
          className="mt-2 w-full py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition font-medium"
        >
          Reset Selection
        </button>
      </div>
    )}
  </div>
)}
                    </div>

                    {/* Booking Summary */}
                    <div className="border-t border-white/10 pt-4">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-3">Booking Summary</p>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Sport</span>
                          <span className="text-white">{sportLabel}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Date</span>
                          <span className="text-white">{formatDate(selectedDate)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Time</span>
                          <span className="text-white">{selectedSlot ? `${selectedSlot.start} – ${selectedSlot.end} (${(() => { const [sh,sm]=selectedSlot.start.split(":").map(Number); const [eh,em]=selectedSlot.end.split(":").map(Number); const mins=(eh*60+em)-(sh*60+sm); return `${mins} min` })()})` : "—"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Court</span>
                          <span className="text-white">{selectedCourt?.name || "—"}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold">
                          <span className="text-slate-400">Price</span>
                          <span className="text-lime-400">₹{slotPrice}</span>
                        </div>
                      </div>
                       <Button
                         className="w-full bg-lime-400 font-bold text-black hover:bg-lime-300 mt-4"
                         onClick={() => {
                           if (!selectedSlot?.start || !selectedSlot?.end) {
                             document.getElementById("slot-grid")?.scrollIntoView({ behavior: "smooth", block: "center" })
                             return
                           }
                           setShowBookingModal(true)
                         }}
                       >
                        Book Now →
                      </Button>
                    </div>

                    <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-[#070d12]/95 backdrop-blur border-t border-white/10 p-3">
                      <Button
                        className="w-full bg-lime-400 font-bold text-black hover:bg-lime-300"
                        onClick={() => {
                          if (!selectedSlot?.start || !selectedSlot?.end) {
                            document.getElementById("slot-grid")?.scrollIntoView({ behavior: "smooth", block: "center" })
                            return
                          }
                          setShowBookingModal(true)
                        }}
                      >
                        Book Now →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {showBookingModal && selectedCourt && selectedSlot && (
        <BookingModal
          facility={facility}
          courtId={selectedCourt.id}
          date={selectedDate}
          slot={selectedSlot}
          onClose={() => setShowBookingModal(false)}
        />
      )}
    </div>
  )
}

export default function FacilityDetailPage() {
  return (
    <Suspense fallback={<FacilitySkeleton />}>
      <FacilityDetailInner />
    </Suspense>
  )
}
