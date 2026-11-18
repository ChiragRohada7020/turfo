"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Gift, Tag, Clock, Building2, Percent, IndianRupee } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { trpc } from "@/lib/trpc"
import { Sidebar } from "@/components/layout/Sidebar"
import { toast } from "@/hooks/use-toast"
import { QRCodeDisplay } from "@/components/booking/QRCodeDisplay"

export default function OffersPage() {
  const { data: session } = useSession()
  const { data: offers, isLoading } = trpc.offers.getPersonalized.useQuery({})
  const { data: redemptions } = trpc.offers.myRedemptions.useQuery()

  const [redeemedCodes, setRedeemedCodes] = useState<Record<string, string>>({})

  const redeemOffer = trpc.offers.redeem.useMutation({
    onSuccess: (data) => {
      toast({ title: "Offer Redeemed!", description: `Discount of ₹${data.discount} applied` })
      if (data.redemption?.verificationCode) {
        setRedeemedCodes((prev) => ({ ...prev, [data.redemption.id]: data.redemption.verificationCode }))
      }
    },
    onError: (e) => {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    },
  })

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070d12] px-4 text-white">
        <div className="max-w-md w-full bg-[#111a22] border border-white/10 rounded-2xl p-8 text-center">
          <Gift className="w-12 h-12 text-lime-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Sign In Required</h1>
          <p className="mt-2 text-sm text-slate-400">Please sign in to view offers.</p>
          <Link href="/auth/login?callbackUrl=/dashboard/offers" className="mt-6 w-full">
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
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Your Offers</h1>
            <p className="text-sm text-slate-400">Personalized deals just for you</p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : offers && offers.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {offers.map((offer: any) => (
                <Card key={offer.id} className="bg-[#111a22] border-white/10 hover:border-lime-400/30 transition-colors overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-lime-400/15 text-lime-300 border-lime-400/30 text-[10px]">
                              {offer.sponsorName}
                            </Badge>
                          </div>
                          <h3 className="font-bold text-lg">{offer.title}</h3>
                          {offer.description && <p className="text-sm text-slate-400 mt-1">{offer.description}</p>}
                        </div>
                        <div className="shrink-0 text-center">
                          <div className="w-16 h-16 rounded-xl bg-lime-400/10 flex items-center justify-center">
                            {offer.discountType === "PERCENTAGE" ? (
                              <div className="text-center">
                                <span className="text-2xl font-bold text-lime-400">{offer.discountValue}%</span>
                                <p className="text-[10px] text-slate-400">OFF</p>
                              </div>
                            ) : (
                              <div className="text-center">
                                <span className="text-xl font-bold text-lime-400">₹{offer.discountValue}</span>
                                <p className="text-[10px] text-slate-400">OFF</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                        <Tag className="h-3.5 w-3.5" />
                        <span className="font-mono font-bold text-lime-300">{offer.code}</span>
                        {offer.maxDiscount && (
                          <span className="text-slate-400">· Max ₹{offer.maxDiscount}</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Clock className="h-3 w-3" />
                          Valid until {new Date(offer.validTo).toLocaleDateString()}
                        </div>
                        <Button
                          size="sm"
                          className="bg-lime-400 font-bold text-black hover:bg-lime-300"
                          onClick={() => redeemOffer.mutate({ offerId: offer.id })}
                          disabled={redeemOffer.isPending}
                        >
                          {redeemOffer.isPending ? "Redeeming..." : "Redeem"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Gift className="w-16 h-16 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No offers available</h3>
              <p className="text-slate-400 mb-6">Check back later for personalized deals!</p>
            </div>
          )}

          {/* My Redemptions */}
          {redemptions && redemptions.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-bold mb-3">My Redeemed Coupons</h2>
              <div className="space-y-3">
                {redemptions.map((r: any) => (
                  <Card key={r.id} className="bg-[#111a22] border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {r.status === "ACTIVE" && r.verificationCode && (
                          <div className="shrink-0">
                            <QRCodeDisplay value={r.verificationCode} size={80} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-lime-300">{r.offer?.code}</span>
                            <Badge className={r.status === "REDEEMED" ? "bg-green-500/15 text-green-300" : r.status === "EXPIRED" ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300"}>
                              {r.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-white">{r.offer?.title}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {r.offer?.sponsor?.name} · Discount: ₹{r.discountApplied}
                          </p>
                          {r.status === "ACTIVE" && (
                            <p className="text-[10px] text-slate-500 mt-1">Show this QR code at the store to redeem</p>
                          )}
                          {r.status === "REDEEMED" && r.usedAt && (
                            <p className="text-[10px] text-green-400 mt-1">Redeemed on {new Date(r.usedAt).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}