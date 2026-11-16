"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Building2, MapPin, Plus, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { trpc } from "@/lib/trpc"
import { SportType } from "@prisma/client"

const facilitySchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  country: z.string().min(2, "Country is required"),
  postalCode: z.string().min(4, "Postal code is required"),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  sportTypes: z.array(z.string()).min(1, "Select at least one sport"),
  amenities: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
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
  { value: "MULTI_SPORT", label: "Multi-Sport" },
]

const AMENITY_OPTIONS = [
  "parking", "lights", "changing_room", "wifi", "cafeteria",
  "water", "first_aid", "locker", "shower", "ac",
]

export default function EditFacilityPage() {
  const params = useParams()
  const router = useRouter()
  const facilityId = params.id as string
  const [selectedSports, setSelectedSports] = useState<string[]>([])
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isActive, setIsActive] = useState(true)

  const { data: facility, isLoading: loadingFacility } = trpc.facilities.get.useQuery({ id: facilityId })

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FacilityForm>({
    resolver: zodResolver(facilitySchema),
  })

  useEffect(() => {
    if (facility) {
      reset({
        name: facility.name,
        description: facility.description || "",
        address: facility.address,
        city: facility.city,
        state: facility.state,
        country: facility.country,
        postalCode: facility.postalCode,
        latitude: facility.latitude,
        longitude: facility.longitude,
        sportTypes: facility.sportTypes,
        amenities: facility.amenities,
        isActive: facility.isActive,
      })
      setSelectedSports(facility.sportTypes || [])
      setSelectedAmenities(facility.amenities || [])
      setIsActive(facility.isActive)
    }
  }, [facility, reset])

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
        isActive,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSport = (sport: string) => {
    const newSports = selectedSports.includes(sport)
      ? selectedSports.filter((s) => s !== sport)
      : [...selectedSports, sport]
    setSelectedSports(newSports)
    setValue("sportTypes", newSports)
  }

  const toggleAmenity = (amenity: string) => {
    const newAmenities = selectedAmenities.includes(amenity)
      ? selectedAmenities.filter((a) => a !== amenity)
      : [...selectedAmenities, amenity]
    setSelectedAmenities(newAmenities)
    setValue("amenities", newAmenities)
  }

  if (loadingFacility) {
    return (
      <div className="min-h-screen bg-[#070d12] text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-lime-400" />
      </div>
    )
  }

  if (!facility) {
    return (
      <div className="min-h-screen bg-[#070d12] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Facility Not Found</h1>
          <Link href="/dashboard/facilities" className="text-lime-400 hover:underline">Back to Facilities</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 xl:p-7">
        <div className="mb-6">
          <Link href="/dashboard/facilities" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Facilities
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Edit Facility</h1>
          <p className="mt-1 text-sm text-slate-400">Update your facility details</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card className="bg-[#111a22] border-white/10 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-lime-400" /> Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">Facility Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Green Field Sports Complex"
                  className="bg-[#121b24] border-white/10 text-white placeholder:text-slate-500 focus:border-lime-400/50"
                  {...register("name")}
                />
                {errors.name && <p className="text-sm text-red-400">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-300">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your facility..."
                  className="bg-[#121b24] border-white/10 text-white placeholder:text-slate-500 focus:border-lime-400/50 min-h-[80px]"
                  {...register("description")}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-slate-300">Address</Label>
                  <Input
                    id="address"
                    placeholder="Street address"
                    className="bg-[#121b24] border-white/10 text-white placeholder:text-slate-500 focus:border-lime-400/50"
                    {...register("address")}
                  />
                  {errors.address && <p className="text-sm text-red-400">{errors.address.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-slate-300">City</Label>
                  <Input
                    id="city"
                    placeholder="City"
                    className="bg-[#121b24] border-white/10 text-white placeholder:text-slate-500 focus:border-lime-400/50"
                    {...register("city")}
                  />
                  {errors.city && <p className="text-sm text-red-400">{errors.city.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-slate-300">State</Label>
                  <Input
                    id="state"
                    placeholder="State"
                    className="bg-[#121b24] border-white/10 text-white placeholder:text-slate-500 focus:border-lime-400/50"
                    {...register("state")}
                  />
                  {errors.state && <p className="text-sm text-red-400">{errors.state.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-slate-300">Country</Label>
                  <Input
                    id="country"
                    placeholder="Country"
                    className="bg-[#121b24] border-white/10 text-white placeholder:text-slate-500 focus:border-lime-400/50"
                    {...register("country")}
                  />
                  {errors.country && <p className="text-sm text-red-400">{errors.country.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode" className="text-slate-300">Postal Code</Label>
                  <Input
                    id="postalCode"
                    placeholder="560001"
                    className="bg-[#121b24] border-white/10 text-white placeholder:text-slate-500 focus:border-lime-400/50"
                    {...register("postalCode")}
                  />
                  {errors.postalCode && <p className="text-sm text-red-400">{errors.postalCode.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude" className="text-slate-300">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder="12.9716"
                    className="bg-[#121b24] border-white/10 text-white placeholder:text-slate-500 focus:border-lime-400/50"
                    {...register("latitude")}
                  />
                  {errors.latitude && <p className="text-sm text-red-400">{errors.latitude.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude" className="text-slate-300">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder="77.5946"
                    className="bg-[#121b24] border-white/10 text-white placeholder:text-slate-500 focus:border-lime-400/50"
                    {...register("longitude")}
                  />
                  {errors.longitude && <p className="text-sm text-red-400">{errors.longitude.message}</p>}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-white/10 bg-[#121b24]"
                  />
                  Active (visible to players)
                </label>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#111a22] border-white/10 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Plus className="h-5 w-5 text-lime-400" /> Sports & Amenities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Sport Types</Label>
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
              <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5">
                Cancel
              </Button>
            </Link>
            <Button type="submit" className="flex-1 bg-lime-400 font-bold text-black hover:bg-lime-300" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Facility"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
