"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Gift, CheckCircle2, XCircle, QrCode, User, Building2, Tag, CalendarDays } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { Sidebar } from "@/components/layout/Sidebar"

export default function VerifyOfferPage() {
  const { data: session } = useSession()
  const [code, setCode] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleVerify = async () => {
    if (!code.trim()) {
      toast({ title: "Error", description: "Please enter a verification code", variant: "destructive" })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/offers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationCode: code.trim() }),
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

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070d12] px-4 text-white">
        <div className="max-w-md w-full bg-[#111a22] border border-white/10 rounded-2xl p-8 text-center">
          <Gift className="w-12 h-12 text-lime-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Sign In Required</h1>
          <p className="mt-2 text-sm text-slate-400">Please sign in to verify coupons.</p>
          <Link href="/auth/login?callbackUrl=/dashboard/verify-offer" className="mt-6 w-full">
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
            <h1 className="text-2xl font-bold">Verify Coupon</h1>
            <p className="text-sm text-slate-400">Scan or enter the coupon verification code</p>
          </div>

          <Card className="bg-[#111a22] border-white/10 mb-6">
            <CardContent className="p-6">
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter coupon verification code"
                  className="flex-1 bg-[#121b24] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-lime-400 focus:outline-none"
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                />
                <Button
                  className="bg-lime-400 font-bold text-black hover:bg-lime-300"
                  onClick={handleVerify}
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Verify"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {result && (
            <Card className={`border-2 ${result.success ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
              <CardContent className="p-6">
                {result.success ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle2 className="w-6 h-6" />
                      <span className="font-bold text-lg">Coupon Redeemed</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Player</span>
                        <span className="text-white font-medium">{result.redemption?.user?.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Offer</span>
                        <span className="text-white">{result.redemption?.offer?.title}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Code</span>
                        <span className="font-mono text-lime-300">{result.redemption?.offer?.code}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Discount</span>
                        <span className="text-white font-bold">
                          {result.redemption?.offer?.discountType === "PERCENTAGE" ? `${result.redemption.offer.discountValue}%` : `₹${result.redemption.offer.discountValue}`}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Amount Saved</span>
                        <span className="text-lime-400 font-bold">₹{result.redemption?.discountApplied}</span>
                      </div>
                    </div>
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