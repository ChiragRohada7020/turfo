"use client"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Html5Qrcode } from "html5-qrcode"
import { Gift, CheckCircle2, XCircle, QrCode, User, Tag, Camera, ShieldCheck, ScanLine, AlertTriangle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Sidebar } from "@/components/layout/Sidebar"

export default function VerifyOfferPage() {
  const { data: session, status } = useSession()
  const [code, setCode] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const handleVerify = async (verificationCode?: string) => {
    const c = (verificationCode || code).trim()
    if (!c) {
      toast({ title: "Error", description: "Please enter a verification code", variant: "destructive" })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/offers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationCode: c }),
      })
      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, ...data })
        toast({ title: "Verified", description: "Coupon redeemed successfully!" })
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

  const startScanner = () => {
    setScanError(null)
    setScanning(true)
    setResult(null)
  }

  useEffect(() => {
    if (!scanning) return
    let cancelled = false
    const scanner = new Html5Qrcode("offer-qr-reader")
    scannerRef.current = scanner
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          scanner.stop().then(() => { scannerRef.current = null; setScanning(false) }).catch(() => {})
          handleVerify(decodedText)
        },
        () => {}
      )
      .catch((err: any) => {
        if (cancelled) return
        setScanError(err?.message || "Failed to start camera")
        setScanning(false)
      })
    return () => {
      cancelled = true
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [scanning])

  const stopScanner = () => {
    setScanning(false)
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) scannerRef.current.stop().catch(() => {})
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
        <div className="max-w-md w-full bg-[#111a22] border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-400/10">
            <Gift className="w-7 h-7 text-lime-400" />
          </div>
          <h1 className="text-2xl font-bold">Sign In Required</h1>
          <p className="mt-2 text-sm text-slate-400">Please sign in to verify coupons.</p>
          <Link href="/auth/login?callbackUrl=/dashboard/verify-offer" className="mt-6 w-full block">
            <Button className="w-full bg-lime-400 font-bold text-black hover:bg-lime-300">Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  const isAlreadyRedeemed = result && !result.success && result.redemption?.status === "REDEEMED"

  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      <Sidebar session={session} />
      <div className="pt-14 md:pt-0 md:pl-[262px]">
        <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-400/20 to-emerald-500/10 border border-lime-400/20">
              <ShieldCheck className="h-6 w-6 text-lime-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Verify Coupon</h1>
              <p className="text-sm text-slate-400">Scan a QR code or enter the verification code to redeem a coupon</p>
            </div>
          </div>

          {/* Scanner card */}
          <Card className="bg-[#111a22] border-white/10 mb-6 overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                  <div className="flex items-center gap-2">
                    <ScanLine className="h-5 w-5 text-lime-400" />
                    <h2 className="font-semibold text-lg">QR Scanner</h2>
                  </div>
                  <Button
                    variant={scanning ? "default" : "outline"}
                    className={scanning ? "bg-lime-400 text-black hover:bg-lime-300" : "border-white/10 text-white hover:bg-white/5"}
                    onClick={scanning ? stopScanner : startScanner}
                  >
                    <Camera className="w-4 h-4 mr-2" /> {scanning ? "Stop Scanner" : "Scan QR Code"}
                  </Button>
                </div>

                {scanning && (
                  <div className="mb-5">
                    <div className="relative mx-auto max-w-sm overflow-hidden rounded-2xl border border-lime-400/30 bg-black/40 shadow-inner">
                      <div id="offer-qr-reader" className="w-full" />
                      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-lime-400/20" />
                    </div>
                    {scanError && (
                      <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-400">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        {scanError}
                      </div>
                    )}
                    <p className="mt-3 text-center text-xs text-slate-500">
                      Point the camera at the QR code shown on the player's device
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Or enter verification code manually"
                    className="flex-1 bg-[#121b24] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-lime-400 focus:outline-none transition-colors"
                    onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  />
                  <Button
                    className="bg-lime-400 font-bold text-black hover:bg-lime-300 sm:w-32"
                    onClick={() => handleVerify()}
                    disabled={loading}
                  >
                    {loading ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Result */}
          {result && (
            <Card
              className={`border-2 ${
                result.success
                  ? "border-green-500/30 bg-green-500/5"
                  : isAlreadyRedeemed
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-red-500/30 bg-red-500/5"
              }`}
            >
              <CardContent className="p-6">
                {result.success ? (
                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/15">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="font-bold text-lg text-green-400">Coupon Redeemed</p>
                        <p className="text-xs text-slate-400">Successfully verified and marked as used</p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { label: "Player", value: result.redemption?.user?.name, icon: User },
                        { label: "Offer", value: result.redemption?.offer?.title, icon: Tag },
                        { label: "Code", value: result.redemption?.offer?.code, icon: QrCode, mono: true },
                        {
                          label: "Discount",
                          value:
                            result.redemption?.offer?.discountType === "PERCENTAGE"
                              ? `${result.redemption.offer.discountValue}%`
                              : `₹${result.redemption.offer.discountValue}`,
                          icon: Tag,
                        },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-3 rounded-xl bg-[#121b24] border border-white/5 px-4 py-3">
                          <item.icon className="h-4 w-4 text-slate-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wide text-slate-500">{item.label}</p>
                            <p className={`text-sm font-medium text-white truncate ${item.mono ? "font-mono text-lime-300" : ""}`}>{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-[#121b24] border border-white/5 px-4 py-3">
                      <span className="text-sm text-slate-400">Amount Saved</span>
                      <span className="text-lg font-bold text-lime-400">₹{result.redemption?.discountApplied}</span>
                    </div>
                  </div>
                ) : isAlreadyRedeemed ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="font-bold text-lg text-amber-400">Already Redeemed</p>
                        <p className="text-xs text-slate-400">This coupon has been used and cannot be redeemed again</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      {result.redemption?.user?.name && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Player</span>
                          <span className="text-white">{result.redemption.user.name}</span>
                        </div>
                      )}
                      {result.redemption?.offer?.title && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Offer</span>
                          <span className="text-white">{result.redemption.offer.title}</span>
                        </div>
                      )}
                      {result.redemption?.usedAt && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Redeemed on</span>
                          <span className="text-amber-300">{new Date(result.redemption.usedAt).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15">
                      <XCircle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-red-400">Verification Failed</p>
                      <p className="text-sm text-slate-300">{result.error || "Invalid coupon code"}</p>
                    </div>
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