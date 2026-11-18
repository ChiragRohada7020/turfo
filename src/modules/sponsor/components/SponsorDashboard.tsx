"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Gift, Plus, Building2, Tag, Users, DollarSign, TrendingUp, CheckCircle2, Clock } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { trpc } from "@/lib/trpc"
import { toast } from "@/hooks/use-toast"
import { Sidebar } from "@/components/layout/Sidebar"

export default function SponsorDashboardPage() {
  const { data: session, status } = useSession()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newOffer, setNewOffer] = useState({
    code: "",
    title: "",
    description: "",
    discountType: "PERCENTAGE",
    discountValue: 10,
    minBookingAmount: 0,
    maxDiscount: 0,
    validFrom: new Date().toISOString().split("T")[0],
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    maxUses: 100,
    maxUsesPerUser: 1,
    targetAudience: "ALL",
    targetCity: "",
  })

  const { data: sponsor } = trpc.sponsors.getByUser.useQuery()
  const { data: offers, isLoading, refetch } = trpc.offers.myOffers.useQuery()

  const createOffer = trpc.offers.create.useMutation({
    onSuccess: () => {
      toast({ title: "Offer Created", description: "Your offer is pending admin approval" })
      setShowCreateForm(false)
      refetch()
    },
    onError: (e) => {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    },
  })

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
          <Building2 className="w-12 h-12 text-lime-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Sign In Required</h1>
          <p className="mt-2 text-sm text-slate-400">Please sign in as a sponsor.</p>
          <Link href="/auth/login?callbackUrl=/dashboard/sponsor" className="mt-6 w-full">
            <Button className="w-full bg-lime-400 font-bold text-black hover:bg-lime-300">Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!sponsor) {
    return (
      <div className="min-h-screen bg-[#070d12] text-white">
        <Sidebar session={session} />
        <div className="pt-14 md:pt-0 md:pl-[262px]">
          <div className="max-w-4xl mx-auto p-4 sm:p-6">
            <div className="text-center py-16">
              <Building2 className="w-16 h-16 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Sponsor Account</h3>
              <p className="text-slate-400 mb-6">Your sponsor account hasn't been set up yet. Contact admin.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      <Sidebar session={session} />
      <div className="pt-14 md:pt-0 md:pl-[262px]">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">{sponsor.name}</h1>
              <p className="text-sm text-slate-400">Sponsor Dashboard</p>
            </div>
            <Button
              className="bg-lime-400 font-bold text-black hover:bg-lime-300"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Offer
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <Card className="bg-[#111a22] border-white/10">
              <CardContent className="p-4 text-center">
                <DollarSign className="w-5 h-5 text-lime-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">₹{sponsor.budget}</p>
                <p className="text-[10px] text-slate-400">Total Budget</p>
              </CardContent>
            </Card>
            <Card className="bg-[#111a22] border-white/10">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">₹{sponsor.spentBudget}</p>
                <p className="text-[10px] text-slate-400">Spent</p>
              </CardContent>
            </Card>
            <Card className="bg-[#111a22] border-white/10">
              <CardContent className="p-4 text-center">
                <Gift className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{offers?.length || 0}</p>
                <p className="text-[10px] text-slate-400">Offers</p>
              </CardContent>
            </Card>
            <Card className="bg-[#111a22] border-white/10">
              <CardContent className="p-4 text-center">
                <Users className="w-5 h-5 text-green-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{sponsor.isApproved ? "Approved" : "Pending"}</p>
                <p className="text-[10px] text-slate-400">Status</p>
              </CardContent>
            </Card>
          </div>

          {/* Create Offer Form */}
          {showCreateForm && (
            <Card className="bg-[#111a22] border-white/10 mb-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4">Create New Offer</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-slate-300">Coupon Code</Label>
                    <Input
                      value={newOffer.code}
                      onChange={(e) => setNewOffer({ ...newOffer, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., NIKE20"
                      className="bg-[#121b24] border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Title</Label>
                    <Input
                      value={newOffer.title}
                      onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })}
                      placeholder="e.g., 20% off on football bookings"
                      className="bg-[#121b24] border-white/10 text-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-slate-300">Description</Label>
                    <Textarea
                      value={newOffer.description}
                      onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
                      placeholder="Describe the offer..."
                      className="bg-[#121b24] border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Discount Type</Label>
                    <select
                      value={newOffer.discountType}
                      onChange={(e) => setNewOffer({ ...newOffer, discountType: e.target.value })}
                      className="w-full bg-[#121b24] border border-white/10 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED">Fixed Amount (₹)</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-slate-300">Discount Value</Label>
                    <Input
                      type="number"
                      value={newOffer.discountValue}
                      onChange={(e) => setNewOffer({ ...newOffer, discountValue: parseFloat(e.target.value) })}
                      className="bg-[#121b24] border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Min Booking Amount (₹)</Label>
                    <Input
                      type="number"
                      value={newOffer.minBookingAmount}
                      onChange={(e) => setNewOffer({ ...newOffer, minBookingAmount: parseFloat(e.target.value) })}
                      className="bg-[#121b24] border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Max Discount (₹)</Label>
                    <Input
                      type="number"
                      value={newOffer.maxDiscount}
                      onChange={(e) => setNewOffer({ ...newOffer, maxDiscount: parseFloat(e.target.value) })}
                      className="bg-[#121b24] border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Valid From</Label>
                    <Input
                      type="date"
                      value={newOffer.validFrom}
                      onChange={(e) => setNewOffer({ ...newOffer, validFrom: e.target.value })}
                      className="bg-[#121b24] border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Valid To</Label>
                    <Input
                      type="date"
                      value={newOffer.validTo}
                      onChange={(e) => setNewOffer({ ...newOffer, validTo: e.target.value })}
                      className="bg-[#121b24] border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Max Uses</Label>
                    <Input
                      type="number"
                      value={newOffer.maxUses}
                      onChange={(e) => setNewOffer({ ...newOffer, maxUses: parseInt(e.target.value) })}
                      className="bg-[#121b24] border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Target Audience</Label>
                    <select
                      value={newOffer.targetAudience}
                      onChange={(e) => setNewOffer({ ...newOffer, targetAudience: e.target.value })}
                      className="w-full bg-[#121b24] border border-white/10 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="ALL">All Players</option>
                      <option value="NEW">New Users</option>
                      <option value="FREQUENT">Frequent Bookers</option>
                      <option value="HIGH_RELIABILITY">High Reliability</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    className="bg-lime-400 font-bold text-black hover:bg-lime-300"
                    onClick={() => createOffer.mutate({ 
                      sponsorId: sponsor.id, 
                      code: newOffer.code,
                      title: newOffer.title,
                      description: newOffer.description || undefined,
                      discountType: newOffer.discountType as "PERCENTAGE" | "FIXED",
                      discountValue: newOffer.discountValue,
                      minBookingAmount: newOffer.minBookingAmount,
                      maxDiscount: newOffer.maxDiscount || undefined,
                      validFrom: newOffer.validFrom,
                      validTo: newOffer.validTo,
                      maxUses: newOffer.maxUses,
                      maxUsesPerUser: newOffer.maxUsesPerUser,
                      targetAudience: newOffer.targetAudience as any,
                      targetCity: newOffer.targetCity || undefined,
                    })}
                    disabled={createOffer.isPending || !newOffer.code || !newOffer.title}
                  >
                    {createOffer.isPending ? "Creating..." : "Create Offer"}
                  </Button>
                  <Button variant="outline" className="border-white/10 text-white" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Offers list */}
          <h3 className="text-lg font-bold mb-3">Your Offers</h3>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />)}
            </div>
          ) : offers && offers.length > 0 ? (
            <div className="space-y-3">
              {offers.map((offer: any) => (
                <Card key={offer.id} className="bg-[#111a22] border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-lime-300">{offer.code}</span>
                          <Badge className={offer.isActive ? "bg-green-500/15 text-green-300" : "bg-slate-500/15 text-slate-300"}>
                            {offer.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-white">{offer.title}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {offer.discountType === "PERCENTAGE" ? `${offer.discountValue}% off` : `₹${offer.discountValue} off`} · 
                          Used: {offer.usedCount}/{offer.maxUses} · 
                          {offer.targetAudience}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-400">Valid until</p>
                        <p className="text-sm text-white">{new Date(offer.validTo).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Gift className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400">No offers yet. Create your first offer!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}