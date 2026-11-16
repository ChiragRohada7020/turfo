"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Calendar, Clock } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface BookingModalProps {
  facility: any
  courtId: string
  date: Date
  slot: { start: string; end: string; price: number }
  onClose: () => void
}

export function BookingModal({ facility, courtId, date, slot, onClose }: BookingModalProps) {
  const [notes, setNotes] = useState("")

  const court = facility.courts.find((c: any) => c.id === courtId)

  const durationMinutes = (new Date(`2000-01-01T${slot.end}`).getTime() - new Date(`2000-01-01T${slot.start}`).getTime()) / (1000 * 60)
  const totalPrice = (slot.price * durationMinutes) / 60

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">Confirm Booking</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>{facility.name}</span>
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
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold text-lg">₹{totalPrice.toFixed(0)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests..."
              className="w-full p-3 border rounded-lg min-h-[80px] resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={() => {
              // TODO: Create booking via tRPC
              onClose()
            }}>
              Confirm & Pay
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}