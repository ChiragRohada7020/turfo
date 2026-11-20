"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Building2, MapPin, Plus, X, DollarSign, Clock, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { trpc } from "@/lib/trpc"
import { SportType } from "@prisma/client"
import { Sidebar } from "@/components/layout/Sidebar"

const facilitySchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  facilityType: z.string().default("OUTDOOR"),
  contactPhone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  address: z.string().min(3, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  country: z.string().default("India"),
  postalCode: z.string().optional(),
  landmark: z.string().optional(),
  sportTypes: z.array(z.string()).min(1, "Select at least one sport"),
  amenities: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  openTime: z.string().default("06:00"),
  closeTime: z.string().default("22:00"),
})

type FacilityForm = z.infer<typeof facilitySchema>

const SPORT_OPTIONS = [
  { value: "FOOTBALL", label: "Football" },
  { value: "CRICKET", label: "Cricket" },
  { value: "TENNIS", label: "Tennis" },
  { value: "BADMINTON", label: "Badminton" },
  { value: "BASKETBALL", label: "Basketball" },
  { value: "VOLLEYBALL", label: "Volleyball" },
  { value: "SWIMMING", label: "Swimming" },
  { value: "GYM", label: "Gym" },
  { value: "PICKLEBALL", label: "Pickleball" },
  { value: "PS_GAMES", label: "PS Games" },
  { value: "TABLE_TENNIS", label: "Table Tennis" },
  { value: "MULTI_SPORT", label: "Multi-Sport" },
]

const AMENITY_OPTIONS = [
  "parking", "lights", "changing_room", "wifi", "cafeteria",
  "water", "first_aid", "locker", "shower", "ac",
  "washroom", "drinking_water", "seating", "equipment_rental",
]

const SURFACE_OPTIONS = [
  { value: "ARTIFICIAL_TURF", label: "Artificial Turf" },
  { value: "GRASS", label: "Natural Grass" },
  { value: "WOOD", label: "Wooden" },
  { value: "HARD_COURT", label: "Hard Court" },
  { value: "CLAY", label: "Clay" },
  { value: "WARM_LIGHTNING_ROOM", label: "Warm Lightning Room" },
]

const COURT_FORMATS = ["5v5", "7v7", "9v9", "11v11", "Singles", "Doubles", "4v4"]

interface Court {
  name: string
  sportType: string
  surfaceType: string
  capacity: number | string
  isIndoor: boolean
  pricePerHour: number | string
}

export default function AddFacilityPage() {
  const router = useRouter()
  const params = useParams()
  const facilityId = params.id as string
  const { data: session } = useSession()
  const { data: facility, isLoading: loadingFacility, refetch } = trpc.facilities.get.useQuery({ id: facilityId })

  const createPricing = trpc.pricing.create.useMutation({
    onSuccess: () => {
      toast({ title: "Pricing Added", description: "Pricing rule created" })
      refetch()
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  })

  const deletePricing = trpc.pricing.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Deleted", description: "Pricing rule removed" })
      refetch()
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  })
  const [selectedSports, setSelectedSports] = useState<string[]>([])
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [courts, setCourts] = useState<Court[]>([])
  const [pricingRules, setPricingRules] = useState<any[]>([])
  const [newRule, setNewRule] = useState({ name: "Peak Hours", courtId: "", dayOfWeek: [0,1,2,3,4,5,6], startTime: "17:00", endTime: "22:00", pricePerHour: "800" })
  const [newCourt, setNewCourt] = useState<Court>({
    name: "",
    sportType: "FOOTBALL",
    surfaceType: "ARTIFICIAL_TURF",
    capacity: 10,
    isIndoor: false,
    pricePerHour: 500,
  })

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FacilityForm>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      sportTypes: [],
      amenities: [],
    },
  })

  useEffect(() => {
    if (!facility) return
    setValue("name", facility.name)
    setValue("description", facility.description || "")
    setValue("facilityType", facility.facilityType || "OUTDOOR")
    setValue("contactPhone", facility.contactPhone || "")
    setValue("whatsappNumber", facility.whatsappNumber || "")
    setValue("landmark", facility.landmark || "")
    setValue("address", facility.address)
    setValue("city", facility.city)
    setValue("state", facility.state)
    setValue("country", facility.country)
    setValue("postalCode", facility.postalCode)
    setValue("sportTypes", facility.sportTypes)
    setValue("amenities", facility.amenities)
    setValue("openTime", facility.openTime)
    setValue("closeTime", facility.closeTime)
    setSelectedSports(facility.sportTypes || [])
    setSelectedAmenities(facility.amenities || [])
    setImageUrls(facility.images || [])
    if (facility.courts) {
      setCourts(facility.courts.map((c: any) => ({
        name: c.name,
        sportType: c.sportType,
        surfaceType: c.surfaceType || "ARTIFICIAL_TURF",
        capacity: c.capacity,
        isIndoor: false,
        pricePerHour: c.pricingRules?.[0]?.pricePerHour || 500,
      })))
    }
  }, [facility, setValue])

  const updateFacility = trpc.facilities.update.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Facility updated successfully!" })
      router.push("/dashboard/facilities")
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  const onSubmit = async (data: FacilityForm) => {
    setIsLoading(true)
    try {
      await updateFacility.mutateAsync({
        id: facilityId,
        ...data,
        sportTypes: selectedSports as SportType[],
        amenities: selectedAmenities,
        images: imageUrls,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSport = (sport: string) => {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    )
  }

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    )
  }

  const addCourt = () => {
    if (!newCourt.name.trim()) {
      alert("Please enter a court name")
      return
    }
    setCourts([...courts, { ...newCourt }])
    setNewCourt({
      name: "",
      sportType: "FOOTBALL",
      surfaceType: "ARTIFICIAL_TURF",
      capacity: 10,
      isIndoor: false,
      pricePerHour: 500,
    })
  }

  const removeCourt = (idx: number) => {
    setCourts(courts.filter((_, i) => i !== idx))
  }

  if (loadingFacility) {
    return (
      <div className="min-h-screen bg-[#070d12] text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-lime-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      <Sidebar session={session} />
      <div className="md:pt-0 md:pl-[262px]">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 xl:p-8">
        {/* Hero */}
        <section className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 bg-[#17233A]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_50%,rgba(249,115,22,0.22),transparent_55%),linear-gradient(110deg,rgba(11,16,32,0.92),rgba(32,37,65,0.72),rgba(11,16,32,0.88))]" />
          <div className="absolute inset-0 opacity-20 bg-[linear-gradient(90deg,transparent_49%,rgba(255,255,255,0.08)_50%,transparent_51%)]" />
          <div className="relative flex flex-wrap items-center justify-between gap-6 p-6 sm:p-9">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-lime-400">
                <Building2 className="h-4 w-4" /> Add Facility
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                List Your <span className="text-lime-400">Turf</span>
              </h1>
              <p className="mt-2 text-sm text-slate-300 sm:text-base">
                Add your sports facility to Strikora and start accepting bookings.
              </p>
            </div>
            <Link href="/dashboard/facilities">
              <Button variant="outline" className="h-11 rounded-xl border-white/15 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Facilities
              </Button>
            </Link>
          </div>
        </section>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Basic Information */}
          <Card className="overflow-hidden rounded-2xl border-white/[0.09] bg-[#0c1916]">
            <CardHeader className="border-b border-white/[0.06] px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Building2 className="h-5 w-5 text-lime-400" /> Step 1: Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">Facility Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Green Field Sports Complex"
                  className="h-10 rounded-xl border border-white/10 bg-[#121b24] text-white placeholder:text-slate-500 focus:border-lime-400/50"
                  {...register("name")}
                />
                {errors.name && <p className="text-sm text-red-400">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-300">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your facility..."
                  className="min-h-[80px] rounded-xl border border-white/10 bg-[#121b24] text-white placeholder:text-slate-500 focus:border-lime-400/50"
                  {...register("description")}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Facility Type</Label>
                  <Select onValueChange={(v) => setValue("facilityType", v)} defaultValue="OUTDOOR">
                    <SelectTrigger className="h-10 rounded-xl border border-white/10 bg-[#121b24] text-white focus:border-lime-400/50">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INDOOR">Indoor</SelectItem>
                      <SelectItem value="OUTDOOR">Outdoor</SelectItem>
                      <SelectItem value="SEMI_INDOOR">Semi-Indoor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Contact Phone</Label>
                  <Input
                    placeholder="+91 98765 43210"
                    className="h-10 rounded-xl border border-white/10 bg-[#121b24] text-white placeholder:text-slate-500 focus:border-lime-400/50"
                    {...register("contactPhone")}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">WhatsApp Number</Label>
                  <Input
                    placeholder="+91 98765 43210"
                    className="h-10 rounded-xl border border-white/10 bg-[#121b24] text-white placeholder:text-slate-500 focus:border-lime-400/50"
                    {...register("whatsappNumber")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Location (Auto-filled from Profile) */}
          <Card className="overflow-hidden rounded-2xl border-white/[0.09] bg-[#0c1916]">
            <CardHeader className="border-b border-white/[0.06] px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <MapPin className="h-5 w-5 text-lime-400" /> Step 2: Location (Auto-filled from Profile)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-2">
                <Label htmlFor="address" className="text-slate-300">Address *</Label>
                <Input
                  id="address"
                  placeholder="Street address, building name"
                  className="h-10 rounded-xl border border-white/10 bg-[#121b24] text-white placeholder:text-slate-500 focus:border-lime-400/50"
                  {...register("address")}
                />
                {errors.address && <p className="text-sm text-red-400">{errors.address.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-slate-300">City *</Label>
                  <Input
                    id="city"
                    placeholder="e.g. Pachora"
                    className="h-10 rounded-xl border border-white/10 bg-[#121b24] text-white placeholder:text-slate-500 focus:border-lime-400/50"
                    {...register("city")}
                  />
                  {errors.city && <p className="text-sm text-red-400">{errors.city.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-slate-300">State *</Label>
                  <Input
                    id="state"
                    placeholder="e.g. Maharashtra"
                    className="h-10 rounded-xl border border-white/10 bg-[#121b24] text-white placeholder:text-slate-500 focus:border-lime-400/50"
                    {...register("state")}
                  />
                  {errors.state && <p className="text-sm text-red-400">{errors.state.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-slate-300">Country</Label>
                  <Input
                    id="country"
                    placeholder="India"
                    className="h-10 rounded-xl border border-white/10 bg-[#121b24] text-white placeholder:text-slate-500 focus:border-lime-400/50"
                    {...register("country")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode" className="text-slate-300">Postal Code</Label>
                  <Input
                    id="postalCode"
                    placeholder="e.g. 424201"
                    className="h-10 rounded-xl border border-white/10 bg-[#121b24] text-white placeholder:text-slate-500 focus:border-lime-400/50"
                    {...register("postalCode")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="landmark" className="text-slate-300">Nearby Landmark (optional)</Label>
                <Input
                  id="landmark"
                  placeholder="e.g. Near bus stand, opposite school"
                  className="h-10 rounded-xl border border-white/10 bg-[#121b24] text-white placeholder:text-slate-500 focus:border-lime-400/50"
                  {...register("landmark")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Sports */}
          <Card className="overflow-hidden rounded-2xl border-white/[0.09] bg-[#0c1916]">
            <CardHeader className="border-b border-white/[0.06] px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Plus className="h-5 w-5 text-lime-400" /> Step 3: Sports
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-2">
                <Label className="text-slate-300">Sport Types *</Label>
                <div className="flex flex-wrap gap-2">
                  {SPORT_OPTIONS.map((sport) => (
                    <button
                      key={sport.value}
                      type="button"
                      onClick={() => {
                        const newSports = selectedSports.includes(sport.value)
                          ? selectedSports.filter((s) => s !== sport.value)
                          : [...selectedSports, sport.value]
                        setSelectedSports(newSports)
                        setValue("sportTypes", newSports)
                      }}
                      className={
                        selectedSports.includes(sport.value)
                          ? "px-3 py-1.5 rounded-full text-xs font-semibold bg-lime-400 text-black border border-lime-400"
                          : "px-3 py-1.5 rounded-full text-xs font-semibold bg-[#121b24] text-slate-300 border border-white/10 hover:border-white/20"
                      }
                    >
                      {sport.label}
                    </button>
                  ))}
                </div>
                {errors.sportTypes && <p className="text-sm text-red-400">{errors.sportTypes.message}</p>}
              </div>

            </CardContent>
          </Card>

          {/* Step 4: Courts */}
          <Card className="overflow-hidden rounded-2xl border-white/[0.09] bg-[#0c1916]">
            <CardHeader className="border-b border-white/[0.06] px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Plus className="h-5 w-5 text-lime-400" /> Step 4: Courts & Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              {/* Existing courts */}
              {courts.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Added Courts</Label>
                  {courts.map((court, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-xl border border-white/10 bg-[#121b24] px-4 py-3">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{court.name}</p>
                        <p className="text-xs text-slate-400">
                          {court.sportType} · {court.surfaceType} · {court.capacity} players · ₹{court.pricePerHour}/hr · {court.isIndoor ? "Indoor" : "Outdoor"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCourt(idx)}
                        className="ml-3 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new court form */}
              <div className="rounded-xl border border-dashed border-white/20 bg-[#121b24]/50 p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Add a Court</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Court Name</Label>
                    <Input
                      value={newCourt.name}
                      onChange={(e) => setNewCourt({ ...newCourt, name: e.target.value })}
                      placeholder="e.g. Court 1"
                      className="h-10 rounded-xl border border-white/10 bg-[#121b24] text-white placeholder:text-slate-500 focus:border-lime-400/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Sport</Label>
                    <Select value={newCourt.sportType} onValueChange={(v) => setNewCourt({ ...newCourt, sportType: v })}>
                      <SelectTrigger className="h-10 rounded-xl border border-white/10 bg-[#121b24] text-white focus:border-lime-400/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SPORT_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Surface</Label>
                    <Select value={newCourt.surfaceType} onValueChange={(v) => setNewCourt({ ...newCourt, surfaceType: v })}>
                      <SelectTrigger className="h-10 rounded-xl border border-white/10 bg-[#121b24] text-white focus:border-lime-400/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SURFACE_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Capacity (players)</Label>
                    <Input
                      type="number"
                      value={newCourt.capacity}
                      onChange={(e) => setNewCourt({ ...newCourt, capacity: e.target.value })}
                      className="bg-[#121b24] border-white/10 text-white focus:border-lime-400/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">{newCourt?.sportType === "PS_GAMES" ? "Price per Person per Hour (₹)" : "Price per Hour (₹)"}</Label>
                    <Input
                      type="number"
                      value={newCourt.pricePerHour}
                      onChange={(e) => setNewCourt({ ...newCourt, pricePerHour: e.target.value })}
                      className="bg-[#121b24] border-white/10 text-white focus:border-lime-400/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Type</Label>
                    <Select value={newCourt.isIndoor ? "indoor" : "outdoor"} onValueChange={(v) => setNewCourt({ ...newCourt, isIndoor: v === "indoor" })}>
                      <SelectTrigger className="h-10 rounded-xl border border-white/10 bg-[#121b24] text-white focus:border-lime-400/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="outdoor">Outdoor</SelectItem>
                        <SelectItem value="indoor">Indoor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="button" onClick={addCourt} className="w-full bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 border border-lime-400/20">
                  <Plus className="h-4 w-4 mr-2" /> Add Court
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="openTime" className="text-slate-300">Opening Time</Label>
                  <Input
                    id="openTime"
                    type="time"
                    className="bg-[#121b24] border-white/10 text-white focus:border-lime-400/50"
                    {...register("openTime")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closeTime" className="text-slate-300">Closing Time</Label>
                  <Input
                    id="closeTime"
                    type="time"
                    className="bg-[#121b24] border-white/10 text-white focus:border-lime-400/50"
                    {...register("closeTime")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 5: Dynamic Pricing */}
          <Card className="overflow-hidden rounded-2xl border-white/[0.09] bg-[#0c1916]">
            <CardHeader className="border-b border-white/[0.06] px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <DollarSign className="h-5 w-5 text-lime-400" /> Step 5: Dynamic Pricing
              </CardTitle>
              <p className="mt-1 text-xs text-slate-500">Set different prices for different times and days</p>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              {facility?.pricingRules && facility.pricingRules.length > 0 && (
                <div className="space-y-2">
                  {facility.pricingRules.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-[#121b24] px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-white">{r.name}</p>
                        <p className="text-xs text-slate-400">{r.startTime} - {r.endTime} · Rs.{r.pricePerHour}/hr</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{r.dayOfWeek.map((d: number) => ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d]).join(", ")}</span>
                        <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => deletePricing.mutate({ id: r.id })} disabled={deletePricing.isPending}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {pricingRules.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Pricing Rules</Label>
                  {pricingRules.map((rule, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-xl border border-white/10 bg-[#121b24] px-4 py-3">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{rule.name}</p>
                        <p className="text-xs text-slate-400">
                          {rule.startTime} - {rule.endTime} · ₹{rule.pricePerHour}/hr
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPricingRules(pricingRules.filter((_, i) => i !== idx))}
                        className="ml-3 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-dashed border-white/20 bg-[#121b24]/50 p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Add Pricing Rule</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Court (optional)</Label>
                    <Select value={newRule.courtId || "all"} onValueChange={(v) => setNewRule({ ...newRule, courtId: v === "all" ? "" : v })}>
                      <SelectTrigger className="h-10 rounded-xl border border-white/10 bg-[#121b24] text-white focus:border-lime-400/50">
                        <SelectValue placeholder="All courts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All courts</SelectItem>
                        {courts.map((c, idx) => (
                          <SelectItem key={idx} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Rule Name</Label>
                    <Input
                      value={newRule.name}
                      onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                      placeholder="e.g. Peak Hours"
                      className="h-10 rounded-xl border border-white/10 bg-[#121b24] text-white placeholder:text-slate-500 focus:border-lime-400/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Start Time</Label>
                    <Input
                      type="time"
                      value={newRule.startTime}
                      onChange={(e) => setNewRule({ ...newRule, startTime: e.target.value })}
                      className="h-10 rounded-xl border border-white/10 bg-[#121b24] text-white focus:border-lime-400/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">End Time</Label>
                    <Input
                      type="time"
                      value={newRule.endTime}
                      onChange={(e) => setNewRule({ ...newRule, endTime: e.target.value })}
                      className="h-10 rounded-xl border border-white/10 bg-[#121b24] text-white focus:border-lime-400/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">{newCourt?.sportType === "PS_GAMES" ? "Price per Person per Hour (₹)" : "Price per Hour (₹)"}</Label>
                    <Input
                      type="number"
                      value={newRule.pricePerHour}
                      onChange={(e) => setNewRule({ ...newRule, pricePerHour: e.target.value })}
                      className="h-10 rounded-xl border border-white/10 bg-[#121b24] text-white focus:border-lime-400/50"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Days</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const days = newRule.dayOfWeek.includes(i)
                            ? newRule.dayOfWeek.filter((d) => d !== i)
                            : [...newRule.dayOfWeek, i]
                          setNewRule({ ...newRule, dayOfWeek: days })
                        }}
                        className={
                          newRule.dayOfWeek.includes(i)
                            ? "px-2.5 py-1 rounded-full text-[10px] font-semibold bg-lime-400 text-black"
                            : "px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#121b24] text-slate-300 border border-white/10"
                        }
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    if (!newRule.name.trim()) {
                      alert("Please enter a rule name")
                      return
                    }
                    setPricingRules([...pricingRules, { ...newRule, pricePerHour: Number(newRule.pricePerHour) || 0 }])
                    setNewRule({ name: "Peak Hours", courtId: "", dayOfWeek: [0,1,2,3,4,5,6], startTime: "17:00", endTime: "22:00", pricePerHour: "800" })
                  }}
                  className="w-full bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 border border-lime-400/20"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Pricing Rule
                </Button>
              </div>

              <p className="text-xs text-slate-500">
                Dynamic pricing lets you charge different rates for peak hours, weekends, and off-peak times.
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-2xl border-white/[0.09] bg-[#0c1916]">
            <CardHeader className="border-b border-white/[0.06] px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Plus className="h-5 w-5 text-lime-400" /> Step 6: Photos & Amenities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-2">
                <Label className="text-slate-300">Facility Images</Label>
                <div className="flex flex-wrap gap-3">
                  {imageUrls.map((url, idx) => (
                    <div key={idx} className="relative h-24 w-24 overflow-hidden rounded-xl border border-white/10 bg-[#121b24]">
                      <img src={url} alt={`Facility image ${idx + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageUrls(imageUrls.filter((_, i) => i !== idx))}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-500"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-[#121b24] text-slate-400 hover:border-lime-400/40 hover:text-lime-400">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || [])
                        if (files.length === 0) return
                        setIsUploading(true)
                        try {
                          for (const file of files) {
                            const formData = new FormData()
                            formData.append("file", file)
                            const res = await fetch("/api/upload/facility-image", { method: "POST", body: formData })
                            const data = await res.json()
                            if (!res.ok) throw new Error(data.error || "Upload failed")
                            setImageUrls((prev) => [...prev, data.url])
                          }
                        } catch (err: any) {
                          alert(err.message || "Upload failed")
                        } finally {
                          setIsUploading(false)
                        }
                      }}
                    />
                    {isUploading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" />
                    ) : (
                      <>
                        <Plus className="h-5 w-5" />
                        <span className="mt-1 text-[10px]">Upload</span>
                      </>
                    )}
                  </label>
                </div>
                <p className="text-xs text-slate-500">JPEG, PNG, WebP, GIF or SVG. Max 5MB per image.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Amenities</Label>
                <div className="flex flex-wrap gap-2">
                  {AMENITY_OPTIONS.map((amenity) => (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => {
                        const newAmenities = selectedAmenities.includes(amenity)
                          ? selectedAmenities.filter((a) => a !== amenity)
                          : [...selectedAmenities, amenity]
                        setSelectedAmenities(newAmenities)
                        setValue("amenities", newAmenities)
                      }}
                      className={
                        selectedAmenities.includes(amenity)
                          ? "px-3 py-1.5 rounded-full text-xs font-semibold bg-lime-400 text-black border border-lime-400"
                          : "px-3 py-1.5 rounded-full text-xs font-semibold bg-[#121b24] text-slate-300 border border-white/10 hover:border-white/20"
                      }
                    >
                      {amenity.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Link href="/dashboard/facilities" className="flex-1">
              <Button variant="outline" className="h-11 w-full rounded-xl border-white/10 bg-white/[0.03] text-white hover:bg-white/10 hover:text-white">
                Cancel
              </Button>
            </Link>
            <Button type="submit" className="h-11 flex-1 rounded-xl bg-lime-400 font-bold text-black hover:bg-lime-300" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Facility"}
            </Button>
          </div>
        </form>
      </div>
      </div>
    </div>
  )
}
