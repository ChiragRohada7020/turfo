"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { X, Calendar, Clock, Loader2 } from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/utils"
import { trpc } from "@/lib/trpc"
import { toast } from "@/hooks/use-toast"

interface BookingModalProps {
  facility: any
  courtId: string
  date: Date
  slot: { start: string; end: string; price: number }
  onClose: () => void
}

export function BookingModal({ facility, courtId, date, slot, onClose }: BookingModalProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const court = facility.courts.find((c: any) => c.id === courtId)

  const durationMinutes = (new Date(`2000-01-01T${slot.end}`).getTime() - new Date(`2000-01-01T${slot.start}`).getTime()) / (1000 * 60)
  const totalPrice = (slot.price * durationMinutes) / 60

  const createBooking = trpc.bookings.create.useMutation({
    onSuccess: (data) => {
      toast({ title: "Success", description: "Booking created! Proceeding to payment." })
      onClose()
      // Redirect to payment page or show payment modal
      router.push(`/dashboard/bookings`)
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
      setIsLoading(false)
    },
  })

  const handleConfirm = async () => {
    if (!session) {
      toast({ title: "Error", description: "Please sign in to book", variant: "destructive" })
      return
    }

    setIsLoading(true)

    // Build start and end datetime
    const [startHour, startMin] = slot.start.split(":").map(Number)
    const [endHour, endMin] = slot.end.split(":").map(Number)

    const startTime = new Date(date)
    startTime.setHours(startHour, startMin, 0, 0)

    const endTime = new Date(date)
    endTime.setHours(endHour, endMin, 0, 0)

    try {
      await createBooking.mutateAsync({
        facilityId: facility.id,
        courtId: courtId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes: notes || undefined,
      })
    } catch (error) {
      // Error handled by onError
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">Confirm Booking</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg" disabled={isLoading}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">{facility.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Court</span>
              <span>{court?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>{formatDate(date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time</span>
              <span>{slot.start} - {slot.end}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span>{durationMinutes} mins</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">Price/hr</span>
              <span>₹{slot.price}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">₹{totalPrice.toFixed(0)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests..."
              className="w-full p-3 border rounded-lg min-h-[80px] resize-none bg-background"
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleConfirm} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Booking...
                </>
              ) : (
                "Confirm & Pay"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
