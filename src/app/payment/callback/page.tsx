"use client"

import { useEffect, useState, Suspense } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle, ArrowRight, Clock } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { trpc } from "@/lib/trpc"
import { toast } from "@/hooks/use-toast"

function PaymentCallbackContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = searchParams.get("order_id") || searchParams.get("orderId")
  const paymentStatus = searchParams.get("payment_status") || searchParams.get("paymentStatus")

  const [status, setStatus] = useState<"loading" | "success" | "failed" | "pending">("loading")
  const [bookingData, setBookingData] = useState<any>(null)

  const { data: paymentData, isLoading: paymentLoading } = trpc.payments.getByOrderId.useQuery(
    { orderId: orderId || "" },
    { enabled: !!orderId }
  )

  useEffect(() => {
    if (!orderId) {
      setStatus("failed")
      return
    }

    const checkStatus = async () => {
      if (paymentStatus === "SUCCEEDED" || paymentStatus === "FAILED") {
        setStatus(paymentStatus === "SUCCEEDED" ? "success" : "failed")
        return
      }

      // Poll for status if not immediately available
      let attempts = 0
      const maxAttempts = 5
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/payments/status?orderId=${orderId}`)
          const data = await response.json()
          if (data.status && data.status !== "PENDING") {
            clearInterval(interval)
            setStatus(data.status === "SUCCEEDED" ? "success" : "failed")
          }
        } catch (e) {
          console.error("Payment status check failed:", e)
        }
        attempts++
        if (attempts >= maxAttempts) {
          clearInterval(interval)
          // Try verify endpoint
          try {
            const verifyResponse = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId }),
            })
            const verifyData = await verifyResponse.json()
            if (verifyData.status === "SUCCEEDED") {
              setStatus("success")
              return
            } else if (verifyData.status === "PENDING" && verifyData.cfStatus === "ACTIVE") {
              // Payment not completed - cancel the booking
              if (verifyData.bookingId) {
                try {
                  await fetch("/api/trpc/bookings.cancel?batch=1", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ "0": { json: { id: verifyData.bookingId, reason: "Payment not completed" } } }),
                  })
                } catch (e) {
                  console.error("Cancel failed:", e)
                }
              }
              setStatus("failed")
              return
            }
          } catch (e) {
            console.error("Payment verify failed:", e)
          }
          setStatus("pending")
        }
      }, 3000)
    }

    checkStatus()
  }, [orderId, paymentStatus])

  useEffect(() => {
    if (paymentData?.status) {
      setStatus(
        paymentData.status === ("SUCCEEDED" as any)
          ? "success"
          : paymentData.status === ("FAILED" as any)
            ? "failed"
            : "pending"
      )
      setBookingData(paymentData.booking)
    }
  }, [paymentData])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#070d12] flex items-center justify-center px-4 text-white">
        <div className="max-w-md w-full bg-[#111a22] border border-white/10 rounded-2xl p-8 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-lime-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Processing Payment</h1>
          <p className="text-slate-400">Please wait while we verify your payment...</p>
        </div>
      </div>
    )
  }

  if (status === "pending") {
    return (
      <div className="min-h-screen bg-[#070d12] flex items-center justify-center px-4 text-white">
        <div className="max-w-md w-full bg-[#111a22] border border-white/10 rounded-2xl p-8 text-center">
          <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2 text-yellow-500">Payment Processing</h1>
          <p className="text-slate-400 mb-6">Your payment is being verified. This may take a few moments. You can check your bookings for the latest status.</p>
          <Link href="/dashboard/bookings">
            <Button className="w-full bg-lime-400 font-bold text-black hover:bg-lime-300">View Bookings</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (status === "failed") {
    return (
      <div className="min-h-screen bg-[#070d12] flex items-center justify-center px-4 text-white">
        <div className="max-w-md w-full bg-[#111a22] border border-white/10 rounded-2xl p-8 text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2 text-red-500">Payment Failed</h1>
          <p className="text-slate-400 mb-6">Your payment could not be processed. Please try again or contact support.</p>
          <Link href="/search">
            <Button className="w-full bg-lime-400 font-bold text-black hover:bg-lime-300">Back to Turfs</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070d12] flex items-center justify-center px-4 text-white">
      <div className="max-w-md w-full bg-[#111a22] border border-white/10 rounded-2xl p-8 text-center">
        <CheckCircle className="h-12 w-12 text-lime-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2 text-lime-400">Payment Successful!</h1>
        <p className="text-slate-400 mb-6">Your booking has been confirmed.</p>
        
        {bookingData && (
          <div className="mb-6 p-4 bg-[#080f15] rounded-xl text-left border border-white/10">
            <p className="text-sm text-slate-400 mb-1">Booking ID</p>
            <p className="font-mono text-white">{bookingData.id.slice(-8).toUpperCase()}</p>
            <p className="text-sm text-slate-400 mt-4 mb-1">Facility</p>
            <p className="font-medium text-white">{bookingData.facility?.name}</p>
            <p className="text-sm text-slate-400 mt-4 mb-1">Amount Paid</p>
            <p className="font-bold text-lime-400 text-xl">{formatCurrency(bookingData.totalPrice)}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/dashboard/bookings">
            <Button className="flex-1 bg-lime-400 font-bold text-black hover:bg-lime-300">
              View Bookings <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <Link href="/search">
            <Button variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/5">
              Book Another
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070d12] flex items-center justify-center text-white"><Loader2 className="h-12 w-12 animate-spin text-lime-400" /></div>}>
      <PaymentCallbackContent />
    </Suspense>
  )
}