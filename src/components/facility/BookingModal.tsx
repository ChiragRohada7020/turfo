"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { X, Calendar, Clock, Loader2, MapPin, Users, CheckCircle, AlertCircle } from "lucide-react"
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

declare global {
  interface Window {
    Cashfree: any
  }
}

export function BookingModal({ facility, courtId, date, slot, onClose }: BookingModalProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null)
  const [cfOrderId, setCfOrderId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null)
  const [isSdkLoaded, setIsSdkLoaded] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [playerCount, setPlayerCount] = useState("1")
  const court = facility.courts.find((c: any) => c.id === courtId)
  const isPS = court?.sportType === "PS_GAMES"

  const handleClose = async () => {
    if (createdBookingId && isLoading) {
      // Cancel the booking if modal is closed while payment is in progress
      try {
        await fetch("/api/trpc/bookings.cancel?batch=1", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ "0": { json: { id: createdBookingId, reason: "Payment not completed" } } }),
        })
      } catch (e) {
        console.error("Cancel failed:", e)
      }
    }
    onClose()
  }

  const [sh, sm] = slot.start.split(":").map(Number)
  const [eh, em] = (slot.end || "").split(":").map(Number)
  const startMins = sh * 60 + sm
  let endMins = slot.end ? (eh * 60 + em) : startMins + 30
  if (endMins <= startMins) endMins += 24 * 60
  const durationMinutes = endMins - startMins
  const totalPrice = (slot.price * (isPS ? (parseInt(playerCount) || 1) : 1) * durationMinutes) / 60




  const utils = trpc.useUtils()

  const createBooking = trpc.bookings.create.useMutation({
    onSuccess: (data) => {
      if (data.paymentLink) {
        // Online payment flow (disabled for now)
        setCreatedBookingId(data.booking.id)
        const url = new URL(data.paymentLink)
        const sessionId = url.searchParams.get("payment_session_id")
        if (sessionId && data.cfOrderId) {
          setPaymentSessionId(sessionId)
          setCfOrderId(data.cfOrderId)
          openCashfreeCheckout(sessionId, data.cfOrderId, data.booking.id)
        } else {
          setError("Failed to initialize payment")
          setIsLoading(false)
        }
      } else {
        // Offline payment - booking confirmed immediately
        toast({ title: "Booking Confirmed!", description: "Your booking has been confirmed. Payment to be collected at venue." })
        utils.bookings.myBookings.invalidate()
        utils.bookings.ownerBookings.invalidate()
        utils.bookings.upcoming.invalidate()
        onClose()
        router.push(`/search`)
      }
    },
    onError: (error) => {
      if (error.message.includes("Time slot not available")) {
        alert("This time slot is no longer available. Please select another slot.")
        onClose()
      } else {
        setError(error.message)
      }
      setIsLoading(false)
    },
  })

  const openCashfreeCheckout = (sessionId: string, orderId: string, bookingId: string) => {
    if (!window.Cashfree) {
      // Wait for SDK to load
      let attempts = 0
      const maxAttempts = 20
      const interval = setInterval(() => {
        if (window.Cashfree) {
          clearInterval(interval)
          doCheckout(sessionId, orderId, bookingId)
        }
        attempts++
        if (attempts >= maxAttempts) {
          clearInterval(interval)
          setError("Payment SDK not loaded. Please refresh the page.")
          setIsLoading(false)
        }
      }, 500)
      return
    }
    doCheckout(sessionId, orderId, bookingId)
  }

  const doCheckout = (sessionId: string, orderId: string, bookingId: string) => {
    try {
      const mode = process.env.NEXT_PUBLIC_CASHFREE_ENV === "PRODUCTION" ? "production" : "sandbox"
      const cashfree = window.Cashfree({
        mode,
      })

      cashfree.checkout({
        paymentSessionId: sessionId,
        redirectTarget: "_modal",
      }).then(async (result: any) => {
        console.log("Cashfree result:", result)
        if (result.error) {
          setError(result.error.message || "Payment failed")
          setIsLoading(false)
          // Cancel the booking
          try {
            await fetch("/api/trpc/bookings.cancel?batch=1", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ "0": { json: { id: bookingId, reason: "Payment not completed" } } }),
            })
          } catch (e) {
            console.error("Cancel failed:", e)
          }
        } else if (result.paymentDetails) {
          handlePaymentSuccess(orderId)
        } else if (result.redirect) {
          window.location.href = result.redirect
        } else {
          // User closed the modal without paying
          setError("Payment was not completed")
          setIsLoading(false)
          // Cancel the booking
          try {
            await fetch("/api/trpc/bookings.cancel?batch=1", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ "0": { json: { id: bookingId, reason: "Payment not completed" } } }),
            })
          } catch (e) {
            console.error("Cancel failed:", e)
          }
        }
      }).catch((err: any) => {
        console.error("Cashfree checkout error:", err)
        setError(err.message || "Payment failed")
        setIsLoading(false)
      })
    } catch (err) {
      console.error("Cashfree init error:", err)
      setError("Failed to open payment modal")
      setIsLoading(false)
    }
  }

  const handlePaymentSuccess = async (orderId: string) => {
    toast({ title: "Success", description: "Payment completed! Verifying..." })
    // Poll for payment status
    let attempts = 0
    const maxAttempts = 10
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payments/status?orderId=${orderId}`)
        const data = await response.json()
        if (data.status === "SUCCEEDED") {
          clearInterval(interval)
          toast({ title: "Success", description: "Booking confirmed!" })
          onClose()
          router.push(`/search`)
        } else if (data.status === "FAILED") {
          clearInterval(interval)
          setError("Payment failed. Please try again.")
          setIsLoading(false)
        }
      } catch (e) {
        console.error("Payment status check failed:", e)
      }
      attempts++
      if (attempts >= maxAttempts) {
        clearInterval(interval)
        // Try to verify payment from Cashfree directly
        try {
          const verifyResponse = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId }),
          })
          const verifyData = await verifyResponse.json()
          if (verifyData.status === "SUCCEEDED") {
            toast({ title: "Success", description: "Booking confirmed!" })
            onClose()
            router.push(`/search`)
            return
          }
        } catch (e) {
          console.error("Payment verify failed:", e)
        }
        toast({ title: "Payment processing", description: "Your payment is being verified. Check your bookings for status." })
        onClose()
        router.push(`/search`)
      }
    }, 3000)
  }

  const handleConfirm = async () => {
    if (!session) {
      toast({ title: "Error", description: "Please sign in to book", variant: "destructive" })
      return
    }

    if (!acknowledged) {
      toast({ title: "Acknowledgment Required", description: "Please acknowledge the cancellation policy before proceeding", variant: "destructive" })
      return
    }

    setIsLoading(true)
    setError(null)

    const [startHour, startMin] = slot.start.split(":").map(Number)
    let endHour, endMin
    if (slot.end) {
      [endHour, endMin] = slot.end.split(":").map(Number)
    } else {
      endHour = startHour
      endMin = startMin + 30
      if (endMin >= 60) { endHour += Math.floor(endMin / 60); endMin = endMin % 60 }
    }

    const startTime = new Date(date)
    startTime.setHours(startHour, startMin, 0, 0)

    const endTime = new Date(date)
    endTime.setHours(endHour, endMin, 0, 0)
    // Handle overnight: if end time is before start time, add 1 day
    if (endTime <= startTime) {
      endTime.setDate(endTime.getDate() + 1)
    }

    try {
      await createBooking.mutateAsync({
        facilityId: facility.id,
        courtId: courtId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes: notes || undefined,
        ...(isPS ? { players: parseInt(playerCount) || 1 } : {}),
      })
    } catch (error) {
      // Error handled by onError
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111a22] rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/10">
         <div className="p-4 border-b border-white/10 flex items-center justify-between">
           <h2 className="text-xl font-bold text-white">Confirm Booking</h2>
         </div>
        <div className="p-4 space-y-4">
          <div className="p-4 bg-[#17222d] rounded-xl space-y-3 border border-white/[0.08]">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white">{facility.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Court</span>
              <span className="text-white">{court?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Date</span>
              <span className="text-white">{formatDate(date)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Time</span>
              <span className="text-white">{slot.start} - {slot.end}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Duration</span>
              <span className="text-white">{durationMinutes} mins</span>
            </div>
            <div className="flex justify-between text-sm border-t border-white/10 pt-2">
              <span className="text-slate-400">{isPS ? "Price per person/hr" : "Price/hr"}</span>
              <span className="text-white">₹{slot.price}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-2">
              <span className="text-white">Total</span>
              <span className="text-lime-400">₹{totalPrice.toFixed(0)}</span>
            </div>
          </div>

{error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {isPS && (
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">Number of Players</label>
              <input
                type="number"
                min={1}
                value={playerCount}
                onChange={(e) => setPlayerCount(e.target.value)}
                className="w-full p-3 border border-white/10 rounded-lg bg-[#121b24] text-white placeholder:text-slate-500 focus:border-lime-400/50 focus:outline-none"
                disabled={isLoading}
              />
            </div>
          )}

          {/* Payment Method */}
          <div className="p-4 bg-[#17222d] rounded-xl border border-white/[0.08]">
            <p className="text-xs font-bold text-slate-400 uppercase mb-3">Payment Method</p>
            <div className="flex items-center gap-3 p-3 bg-lime-400/10 border border-lime-400/30 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-lime-400/20 flex items-center justify-center">
                <span className="text-lg">💵</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Cash at Venue</p>
                <p className="text-xs text-slate-400">Pay at the facility when you arrive</p>
              </div>
              <CheckCircle className="w-5 h-5 text-lime-400 ml-auto" />
            </div>
          </div>

          {/* Cancellation Policy Warning */}
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-400 mb-1">Cancellation Policy</p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  By confirming this booking, you agree to the following terms:
                </p>
                <ul className="text-xs text-slate-300 mt-2 space-y-1 list-disc list-inside">
                  <li><span className="text-red-400 font-bold">Repeated cancellations will negatively impact your CIBIL score</span></li>
                  <li><span className="text-red-400 font-bold">Your account may be suspended for excessive cancellations</span></li>
                  <li>Cancellation is subject to facility owner's discretion</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Acknowledgment */}
          <label className="flex items-start gap-3 p-3 bg-[#17222d] rounded-lg border border-white/[0.08] cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-white/20 bg-[#121b24] text-lime-400 focus:ring-lime-400"
              disabled={isLoading}
            />
            <span className="text-xs text-slate-300">
              I understand and agree to the cancellation policy. I acknowledge that repeated cancellations may affect my credit score and could result in account suspension.
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests..."
              className="w-full p-3 border border-white/10 rounded-lg min-h-[80px] resize-none bg-[#121b24] text-white placeholder:text-slate-500 focus:border-lime-400/50 focus:outline-none"
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/5" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button className="flex-1 bg-lime-400 font-bold text-black hover:bg-lime-300" onClick={handleConfirm} disabled={isLoading || !acknowledged}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirm Booking"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}