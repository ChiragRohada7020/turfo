"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
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
import { ArrowLeft, Building2, MapPin, Plus } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { trpc } from "@/lib/trpc"
import { SportType } from "@prisma/client"
import { Sidebar } from "@/components/layout/Sidebar"

const facilitySchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
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
  { value: "TABLE_TENNIS", label: "Table Tennis" },
  { value: "MULTI_SPORT", label: "Multi-Sport" },
]

const AMENITY_OPTIONS = [
  "parking", "lights", "changing_room", "wifi", "cafeteria",
  "water", "first_aid", "locker", "shower", "ac",
]

export default function AddFacilityPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [selectedSports, setSelectedSports] = useState<string[]>([])
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([""])
  const [isLoading, setIsLoading] = useState(false)

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

  const { data: profile } = trpc.auth.getProfile.useQuery()

  const createFacility = trpc.facilities.create.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Facility created successfully!" })
      router.push("/dashboard/facilities")
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })


  const onSubmit = async (data: FacilityForm) => {
    setIsLoading(true)
    try {
      await createFacility.mutateAsync({
        ...data,
        sportTypes: selectedSports as SportType[],
        amenities: selectedAmenities,
        images: imageUrls.filter((u) => u.trim() !== ""),
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

  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      <Sidebar session={session} />
      <div className="pt-14 md:pt-0 md:pl-[262px]">
        <div className="max-w-3xl mx-auto p-4 sm:p-6 xl:p-7">
        <div className="mb-6">
          <Link href="/dashboard/facilities" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Facilities
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Add New Facility</h1>
          <p className="mt-1 text-sm text-slate-400">List your sports facility on TurfPlay</p>
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

              <p className="text-xs text-slate-500">Location will be auto-filled from your profile settings.</p>
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

              <div className="space-y-2">
                <Label className="text-slate-300">Images (URLs)</Label>
                {imageUrls.map((url, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={url}
                      onChange={(e) => {
                        const newUrls = [...imageUrls]
                        newUrls[idx] = e.target.value
                        setImageUrls(newUrls)
                      }}
                      placeholder="https://example.com/image.jpg"
                      className="bg-[#121b24] border-white/10 text-white placeholder:text-slate-500 focus:border-lime-400/50"
                    />
                    {imageUrls.length > 1 && (
                      <Button type="button" variant="outline" size="sm" className="border-white/10 text-white" onClick={() => setImageUrls(imageUrls.filter((_, i) => i !== idx))}>
                        ×
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="border-white/10 text-white" onClick={() => setImageUrls([...imageUrls, ""])}>
                  + Add Image URL
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

          <div className="flex gap-3">
            <Link href="/dashboard/facilities" className="flex-1">
              <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5">
                Cancel
              </Button>
            </Link>
            <Button type="submit" className="flex-1 bg-lime-400 font-bold text-black hover:bg-lime-300" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Facility"}
            </Button>
          </div>
        </form>
      </div>
      </div>
    </div>
  )
}
