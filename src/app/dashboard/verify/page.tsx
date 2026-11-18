"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Clock3, MapPin, Users, CheckCircle2, XCircle, QrCode, Camera, Keyboard, User } from "lucide-react"
import { formatCurrency, formatDate, formatTime } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { Sidebar } from "@/components/layout/Sidebar"
import { Html5Qrcode } from "html5-qrcode"

export default function VerifyBookingPage() {
  const { data: session, status } = useSession()
  const [code, setCode] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [verifiedBooking, setVerifiedBooking] = useState<any>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const handleVerify = async (verificationCode: string) => {
    if (!verificationCode.trim()) {
      toast({ title: "Error", description: "Please enter a verification code", variant: "destructive" })
      return
    }

    setLoading(true)
    setResult(null)
    setShowConfirm(false)

    try {
      const response = await fetch("/api/bookings/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationCode: verificationCode.trim(), action: "verify" }),
      })
      const data = await response.json()

      if (response.ok) {
        setVerifiedBooking(data.booking)
        setShowConfirm(true)
        toast({ title: "Verified", description: "Booking found. Review details below." })
        setCode("")
      } else {
        setResult({ success: false, ...data })
        toast({ title: "Error", description: data.error || "Verification failed", variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error", description: "Verification failed", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmComplete = async () => {
    if (!verifiedBooking) return
    setLoading(true)

    try {
      const response = await fetch("/api/bookings/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationCode: verifiedBooking.verificationCode || code, action: "confirm" }),
      })
      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, ...data })
        setShowConfirm(false)
        setVerifiedBooking(null)
        toast({ title: "Completed", description: "Booking marked as completed. Player's CIBIL score increased." })
      } else {
        toast({ title: "Error", description: data.error || "Failed to complete", variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to complete booking", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const startScanner = async () => {
    setScanError(null)
    setScanning(true)
    setResult(null)
    setShowConfirm(false)

    try {
      const scanner = new Html5Qrcode("qr-reader")
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          scanner.stop().then(() => {
            scannerRef.current = null
            setScanning(false)
          }).catch(() => {})
          handleVerify(decodedText)
        },
        () => {}
      )
    } catch (err: any) {
      console.error("Scanner error:", err)
      setScanError(err.message || "Failed to start camera")
      setScanning(false)
    }
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current = null
        setScanning(false)
      }).catch(() => {
        setScanning(false)
      })
    } else {
      setScanning(false)
    }
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070d12]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070d12] px-4 text-white">
        <div className="max-w-md w-full bg-[#111a22] border border-white/10 rounded-2xl p-8 text-center">
          <QrCode className="w-12 h-12 text-lime-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Sign In Required</h1>
          <p className="mt-2 text-sm text-slate-400">Please sign in to verify bookings.</p>
          <Link href="/auth/login?callbackUrl=/dashboard/verify" className="mt-6 w-full">
            <Button className="w-full bg-lime-400 font-bold text-black hover:bg-lime-300">Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      <Sidebar session={session} />
      <div className="pt-14 md:pt-0 md:pl-[262px]">
        <div className="max-w-2xl mx-auto p-4 sm:p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Verify Booking</h1>
            <p className="text-sm text-slate-400">Scan QR code or enter verification code to confirm player arrival</p>
          </div>

          {/* Scanner / Manual toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={scanning ? "default" : "outline"}
              className={scanning ? "bg-lime-400 text-black" : "border-white/10 text-white"}
              onClick={scanning ? stopScanner : startScanner}
            >
              <Camera className="w-4 h-4 mr-2" />
              {scanning ? "Stop Scanner" : "Scan QR Code"}
            </Button>
          </div>

          {/* QR Scanner */}
          {scanning && (
            <Card className="bg-[#111a22] border-white/10 mb-4">
              <CardContent className="p-4">
                <div id="qr-reader" className="w-full" />
                {scanError && (
                  <p className="text-red-400 text-sm mt-2">{scanError}</p>
                )}
                <p className="text-xs text-slate-400 mt-2 text-center">
                  Point camera at the QR code on the player's booking
                </p>
              </CardContent>
            </Card>
          )}

          {/* Manual entry */}
          {!scanning && !showConfirm && (
            <Card className="bg-[#111a22] border-white/10 mb-6">
              <CardContent className="p-6">
                <div className="flex gap-2">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter verification code"
                    className="flex-1 bg-[#121b24] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-lime-400 focus:outline-none"
                    onKeyDown={(e) => e.key === "Enter" && handleVerify(code)}
                  />
                  <Button
                    className="bg-lime-400 font-bold text-black hover:bg-lime-300"
                    onClick={() => handleVerify(code)}
                    disabled={loading}
                  >
                    {loading ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Confirmation dialog */}
          {showConfirm && verifiedBooking && (
            <Card className="bg-[#111a22] border-2 border-lime-400/30 mb-6">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lime-400">
                    <QrCode className="w-6 h-6" />
                    <span className="font-bold text-lg">Confirm Booking Completion</span>
                  </div>

                  <div className="space-y-2 p-4 bg-[#17222d] rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Player</span>
                      <span className="text-white font-medium">{verifiedBooking.user?.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Facility</span>
                      <span className="text-white">{verifiedBooking.facility?.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Court</span>
                      <span className="text-white">{verifiedBooking.court?.name || "N/A"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Date</span>
                      <span className="text-white">{formatDate(verifiedBooking.startTime)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Time</span>
                      <span className="text-white">{formatTime(verifiedBooking.startTime)} - {formatTime(verifiedBooking.endTime)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">CIBIL Score</span>
                      <span className="text-white">{verifiedBooking.user?.cibilScore || 750}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">
                    Click "Confirm Completion" to mark this booking as completed. This will increase the player's CIBIL score by 10 points.
                  </p>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 border-white/10 text-white hover:bg-white/5"
                      onClick={() => {
                        setShowConfirm(false)
                        setVerifiedBooking(null)
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-green-500 font-bold text-white hover:bg-green-600"
                      onClick={handleConfirmComplete}
                      disabled={loading}
                    >
                      {loading ? "Processing..." : "Confirm Completion"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Result */}
          {result && (
            <Card className={`border-2 ${result.success ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
              <CardContent className="p-6">
                {result.success ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle2 className="w-6 h-6" />
                      <span className="font-bold text-lg">Booking Completed</span>
                    </div>
                    <p className="text-sm text-slate-300">
                      The booking has been marked as completed. Player's CIBIL score increased by 10 points.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-400">
                    <XCircle className="w-6 h-6" />
                    <span className="font-bold">{result.error}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}