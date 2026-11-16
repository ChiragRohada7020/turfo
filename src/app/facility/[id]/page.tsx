"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Map } from "@/components/ui/map"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, MapPin, Clock, Star, Users, Shield, Check, X, ChevronLeft, ChevronRight, Heart, Share2 } from "lucide-react"
import { formatDate, formatTime, cn, getInitials, formatCurrency } from "@/lib/utils"
import { trpc } from "@/lib/trpc"
import { BookingStatus } from "@prisma/client"
import { useDebounce } from "@/hooks/use-debounce"
import Image from "next/image"
import { BookingModal } from "@/components/facility/BookingModal"
import { FacilitySkeleton } from "@/components/facility/FacilitySkeleton"

export default function FacilityDetailPage() {
  const params = useParams()
  const facilityId = params.id as string
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string; price: number } | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const { data: facility, isLoading: facilityLoading } = trpc.facilities.get.useQuery({ id: facilityId })
  const { data: availability, isLoading: availabilityLoading } = trpc.courts.availability.useQuery(
    { courtId: selectedCourt || "", date: selectedDate.toISOString().split("T")[0] },
    { enabled: !!selectedCourt }
  )

  const courts = facility?.courts || []
  const images = facility?.images || []

  const handleBooking = () => {
    if (selectedCourt && selectedSlot) {
      setShowBookingModal(true)
    }
  }

  const mapMarkers = facility ? [
    {
      id: facility.id,
      coordinates: [facility.longitude, facility.latitude] as [number, number],
      title: facility.name,
      description: facility.address,
      sportTypes: facility.sportTypes,
      pricePerHour: facility.minPrice ?? undefined,
    }
  ] : []

  if (facilityLoading) {
    return <FacilitySkeleton />
  }

  if (!facility) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Facility Not Found</h1>
        <Link href="/search"><Button>Back to Search</Button></Link>
      </div>
    )
  }

  const avgRating = facility.avgRating || 0
  const reviewCount = facility.reviewCount || 0

  return (
    <div className="min-h-screen bg-background">
      {/* Image Gallery */}
      <div className="relative h-[400px] w-full">
        {images.length > 0 ? (
          <>
            <Image
              src={images[activeImageIndex]}
              alt={`${facility.name} - Image ${activeImageIndex + 1}`}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImageIndex((i) => (i === 0 ? images.length - 1 : i - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setActiveImageIndex((i) => (i === images.length - 1 ? 0 : i + 1))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImageIndex(i)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        i === activeImageIndex ? "bg-primary w-6" : "bg-white/50 hover:bg-white"
                      )}
                      aria-label={`View image ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <span className="text-8xl">🏟️</span>
          </div>
        )}
        <div className="absolute bottom-4 right-4 flex gap-2">
          <Button variant="secondary" size="icon" className="bg-background/80 backdrop-blur-sm">
            <Heart className="w-5 h-5" />
          </Button>
          <Button variant="secondary" size="icon" className="bg-background/80 backdrop-blur-sm">
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                {facility.sportTypes?.map((sport: string) => (
                  <Badge key={sport} variant="secondary">{sport}</Badge>
                ))}
                <Badge variant="outline">{facility.city}, {facility.state}</Badge>
              </div>
              <h1 className="text-3xl font-bold mb-2">{facility.name}</h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {facility.address}, {facility.city}, {facility.state}
                </span>
                {avgRating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{avgRating.toFixed(1)}</span>
                    <span className="text-sm">({reviewCount} reviews)</span>
                  </span>
                )}
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="courts" className="space-y-4">
              <TabsList>
                <TabsTrigger value="courts">Courts & Pricing</TabsTrigger>
                <TabsTrigger value="availability">Availability</TabsTrigger>
                <TabsTrigger value="amenities">Amenities</TabsTrigger>
                <TabsTrigger value="reviews">Reviews ({reviewCount})</TabsTrigger>
                <TabsTrigger value="location">Location</TabsTrigger>
              </TabsList>

              {/* Courts Tab */}
              <TabsContent value="courts" className="space-y-4">
                {courts.map((court) => (
                  <Card key={court.id} className={selectedCourt === court.id ? "ring-2 ring-primary" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Users className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{court.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {court.sportType} • {court.surfaceType || "Standard"} • {court.capacity} players max
                            </p>
                            {court.dimensions && <p className="text-sm text-muted-foreground">{court.dimensions}</p>}
                          </div>
                        </div>
                        <Button
                          variant={selectedCourt === court.id ? "default" : "outline"}
                          onClick={() => setSelectedCourt(selectedCourt === court.id ? null : court.id)}
                        >
                          {selectedCourt === court.id ? "Selected" : "Select"}
                        </Button>
                      </div>

                      {selectedCourt === court.id && court.pricingRules?.length > 0 && (
                        <div className="mt-4 pt-4 border-t space-y-2">
                          <h4 className="font-medium">Pricing Rules</h4>
                          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                            {court.pricingRules.map((rule: any) => (
                              <div key={rule.id} className="p-3 bg-muted/50 rounded-lg">
                                <p className="font-medium">{rule.name}</p>
                                <p className="text-muted-foreground">
                                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].filter((_, i) => rule.dayOfWeek.includes(i)).join(", ")}
                                </p>
                                <p className="text-muted-foreground">{rule.startTime} - {rule.endTime}</p>
                                <p className="font-semibold text-primary">₹{rule.pricePerHour}/hr</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {courts.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">No courts available at this facility</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Availability Tab */}
              <TabsContent value="availability" className="space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <label className="text-sm font-medium">Select Date:</label>
                  <input
                    type="date"
                    value={selectedDate.toISOString().split("T")[0]}
                    onChange={(e) => {
                      setSelectedDate(new Date(e.target.value))
                      setSelectedSlot(null)
                    }}
                    min={new Date().toISOString().split("T")[0]}
                    className="border rounded-lg px-3 py-2"
                  />
                </div>

                {selectedCourt ? (
                  <>
                    {availabilityLoading ? (
                      <div className="grid grid-cols-3 gap-2">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="p-4 bg-muted/50 rounded-lg animate-pulse">
                            <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                            <div className="h-4 bg-muted rounded w-1/3" />
                          </div>
                        ))}
                      </div>
                    ) : availability?.isBlocked ? (
                      <Card>
                        <CardContent className="p-6 text-center">
                          <X className="w-12 h-12 text-destructive mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">Not Available</h3>
                          <p className="text-muted-foreground">{availability.note || "This court is blocked for the selected date"}</p>
                        </CardContent>
                      </Card>
                    ) : availability?.slots && availability.slots.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {availability.slots?.map((slot: any) => (
                          <Button
                            key={`${slot.startTime}-${slot.endTime}`}
                            variant={selectedSlot?.start === slot.startTime && selectedSlot?.end === slot.endTime ? "default" : "outline"}
                            className="h-auto py-3"
                            onClick={() => setSelectedSlot({ start: slot.startTime, end: slot.endTime, price: slot.pricePerHour })}
                          >
                            <div className="text-center">
                              <div className="font-medium">{slot.startTime} - {slot.endTime}</div>
                              <div className="text-sm text-muted-foreground">₹{slot.pricePerHour}/hr</div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="p-6 text-center">
                          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">No Slots Available</h3>
                          <p className="text-muted-foreground">All slots are booked for this date</p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">Select a Court First</h3>
                      <p className="text-muted-foreground">Choose a court from the Courts tab to check availability</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Amenities Tab */}
              <TabsContent value="amenities" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {facility.amenities?.map((amenity: string) => (
                    <div key={amenity} className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <Check className="w-5 h-5 text-green-500" />
                      <span className="capitalize">{amenity.replace("_", " ")}</span>
                    </div>
                  ))}
                </div>
                {facility.description && (
                  <div className="prose max-w-none">
                    <h4 className="font-medium mb-2">About this facility</h4>
                    <p className="text-muted-foreground">{facility.description}</p>
                  </div>
                )}
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="space-y-4">
                {facility.reviews?.length > 0 ? (
                  facility.reviews.map((review: any) => (
                    <Card key={review.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="font-medium text-primary">{getInitials(review.user?.name || "User")}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{review.user?.name || "Anonymous"}</p>
                                <p className="text-sm text-muted-foreground">{formatDate(review.createdAt)}</p>
                              </div>
                              <div className="flex items-center gap-1 text-yellow-500">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={cn(
                                      "w-4 h-4",
                                      i < review.rating ? "fill-current" : "text-muted-foreground"
                                    )}
                                  />
                                ))}
                              </div>
                            </div>
                            {review.comment && <p className="mt-2">{review.comment}</p>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Star className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
                  </div>
                )}
              </TabsContent>

              {/* Location Tab */}
              <TabsContent value="location" className="space-y-4">
                <div className="h-[400px] rounded-lg overflow-hidden">
                  <Map
                    center={[facility.longitude, facility.latitude]}
                    zoom={15}
                    markers={mapMarkers}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Address</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{facility.address}</p>
                      <p className="text-muted-foreground">{facility.city}, {facility.state} {facility.postalCode}</p>
                      <p className="text-muted-foreground">{facility.country}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Coordinates</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground font-mono text-sm">
                        {facility.latitude.toFixed(6)}, {facility.longitude.toFixed(6)}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Booking Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Book Now</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedCourt && selectedSlot ? (
                  <>
                    <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date</span>
                        <span className="font-medium">{formatDate(selectedDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time</span>
                        <span className="font-medium">{selectedSlot.start} - {selectedSlot.end}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration</span>
                        <span className="font-medium">
                          {(new Date(`2000-01-01T${selectedSlot.end}`).getTime() - new Date(`2000-01-01T${selectedSlot.start}`).getTime()) / (1000 * 60)} mins
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-muted-foreground">Price per hour</span>
                        <span className="font-medium">₹{selectedSlot.price}/hr</span>
                      </div>
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total</span>
                        <span>
                          ₹{
                            (selectedSlot.price *
                              (new Date(`2000-01-01T${selectedSlot.end}`).getTime() - new Date(`2000-01-01T${selectedSlot.start}`).getTime()) /
                              (1000 * 60 * 60)
                          ).toFixed(0)
                          }
                        </span>
                      </div>
                    </div>
                    <Button className="w-full" size="lg" onClick={handleBooking}>
                      Proceed to Payment
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => setSelectedSlot(null)}>
                      Change Selection
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      {selectedCourt ? "Select a time slot" : "Select a court and date to see pricing"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <BookingModal
          facility={facility}
          courtId={selectedCourt!}
          date={selectedDate}
          slot={selectedSlot!}
          onClose={() => setShowBookingModal(false)}
        />
      )}
    </div>
  )
}