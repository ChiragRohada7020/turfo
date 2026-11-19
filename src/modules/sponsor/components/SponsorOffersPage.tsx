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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Gift,
  Plus,
  Tag,
  CalendarDays,
  Menu,
  LogOut,
  User,
  Building2,
} from "lucide-react"
import { Sidebar } from "@/components/layout/Sidebar"
import { trpc } from "@/lib/trpc"
import { toast } from "@/hooks/use-toast"

export default function SponsorOffersPage() {
  const { data: session, status } = useSession()
  const [createOpen, setCreateOpen] = useState(false)
  const [offerSearch, setOfferSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
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
    couponCount: 100,
    imageUrl: "",
  })

  const { data: sponsor } = trpc.sponsors.getByUser.useQuery()
  const { data: offers, isLoading, refetch } = trpc.offers.myOffers.useQuery()

  const createOffer = trpc.offers.create.useMutation({
    onSuccess: () => {
      toast({ title: "Offer Created", description: "Your offer is pending admin approval" })
      setCreateOpen(false)
      refetch()
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  })

  const toggleOffer = trpc.offers.update.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch("/api/upload/offer-image", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")
      setNewOffer((prev) => ({ ...prev, imageUrl: data.url }))
      toast({ title: "Uploaded", description: "Image uploaded" })
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  }

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
          <Link href="/auth/login?callbackUrl=/dashboard/sponsor/offers" className="mt-6 w-full block">
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
        <div className="w-full px-6 py-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400/10">
                <Tag className="h-5 w-5 text-lime-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">My Offers</h1>
                <p className="text-sm text-slate-400">Create, manage and track your sponsor offers</p>
              </div>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-lime-400 font-bold text-black flex items-center gap-2 hover:bg-lime-300 w-full sm:w-auto">
                  <Plus className="w-4 h-4" /> Create New Offer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-[#111a22] border-white/10 text-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Offer</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Offer Code</Label>
                      <Input value={newOffer.code} onChange={(e) => setNewOffer({ ...newOffer, code: e.target.value })} placeholder="e.g. SAVE20" className="bg-[#121b24] border-white/10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input value={newOffer.title} onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })} placeholder="Offer title" className="bg-[#121b24] border-white/10 text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={newOffer.description} onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })} placeholder="Describe your offer" className="bg-[#121b24] border-white/10 text-white" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Discount Type</Label>
                      <select value={newOffer.discountType} onChange={(e) => setNewOffer({ ...newOffer, discountType: e.target.value })} className="w-full bg-[#121b24] border border-white/10 rounded-md px-3 py-2 text-white">
                        <option value="PERCENTAGE">Percentage</option>
                        <option value="FIXED">Fixed Amount</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Discount Value</Label>
                      <Input type="number" value={newOffer.discountValue} onChange={(e) => setNewOffer({ ...newOffer, discountValue: Number(e.target.value) })} className="bg-[#121b24] border-white/10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Discount (₹)</Label>
                      <Input type="number" value={newOffer.maxDiscount} onChange={(e) => setNewOffer({ ...newOffer, maxDiscount: Number(e.target.value) })} className="bg-[#121b24] border-white/10 text-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valid From</Label>
                      <Input type="date" value={newOffer.validFrom} onChange={(e) => setNewOffer({ ...newOffer, validFrom: e.target.value })} className="bg-[#121b24] border-white/10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label>Valid To</Label>
                      <Input type="date" value={newOffer.validTo} onChange={(e) => setNewOffer({ ...newOffer, validTo: e.target.value })} className="bg-[#121b24] border-white/10 text-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Number of Coupons</Label>
                      <Input type="number" value={newOffer.couponCount} onChange={(e) => setNewOffer({ ...newOffer, couponCount: Number(e.target.value) })} className="bg-[#121b24] border-white/10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label>Offer Image</Label>
                      <Input type="file" accept="image/*" onChange={handleImageUpload} className="bg-[#121b24] border-white/10 text-white" />
                      {newOffer.imageUrl && (
                        <img src={newOffer.imageUrl} alt="preview" className="mt-2 h-20 w-full object-cover rounded-lg border border-white/10" />
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" className="border-white/10 text-white" onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button
                      className="bg-lime-400 font-bold text-black hover:bg-lime-300"
                      disabled={createOffer.isPending || !newOffer.code || !newOffer.title}
                      onClick={() =>
                        createOffer.mutate({
                          sponsorId: sponsor?.id,
                          code: newOffer.code,
                          title: newOffer.title,
                          description: newOffer.description,
                          discountType: newOffer.discountType as any,
                          discountValue: newOffer.discountValue,
                          minBookingAmount: newOffer.minBookingAmount,
                          maxDiscount: newOffer.maxDiscount || undefined,
                          validFrom: new Date(newOffer.validFrom).toISOString(),
                          validTo: new Date(newOffer.validTo).toISOString(),
                          maxUses: newOffer.couponCount,
                          imageUrl: newOffer.imageUrl || undefined,
                        })
                      }
                    >
                      {createOffer.isPending ? "Creating..." : "Create Offer"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="bg-[#111a22] border-white/10">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-lime-400" />
                  <h3 className="text-sm font-bold">My Offers</h3>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Input
                    placeholder="Search offers..."
                    value={offerSearch}
                    onChange={(e) => setOfferSearch(e.target.value)}
                    className="bg-[#121b24] border-white/10 text-white text-xs h-9"
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-[#121b24] border border-white/10 rounded-md px-2 py-1.5 text-xs text-white h-9"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(offers || [])
                  .filter((o: any) => {
                    const matchesSearch = !offerSearch || o.title?.toLowerCase().includes(offerSearch.toLowerCase()) || o.code?.toLowerCase().includes(offerSearch.toLowerCase())
                    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? o.isActive : !o.isActive)
                    return matchesSearch && matchesStatus
                  })
                  .map((offer: any) => (
                    <div key={offer.id} className="rounded-xl border border-white/10 bg-[#0c1916] p-4 hover:border-lime-400/30 transition-colors">
                      {offer.imageUrl && (
                        <img src={offer.imageUrl} alt={offer.title} className="mb-3 h-32 w-full object-cover rounded-lg border border-white/10" />
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs font-bold text-lime-300">{offer.code}</span>
                            <Badge className={offer.isActive ? "bg-green-500/15 text-green-300" : "bg-slate-500/15 text-slate-300"}>
                              {offer.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-white text-sm">{offer.title}</h4>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{offer.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-lime-400">
                            {offer.discountType === "PERCENTAGE" ? `${offer.discountValue}%` : `₹${offer.discountValue}`}
                          </p>
                          <p className="text-[10px] text-slate-500">OFF</p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                        <div className="rounded-lg bg-white/5 p-2">
                          <p className="text-xs font-bold text-white">{Number(offer.maxUses || 0)}</p>
                          <p className="text-[9px] text-slate-500">Total</p>
                        </div>
                        <div className="rounded-lg bg-white/5 p-2">
                          <p className="text-xs font-bold text-white">{Number(offer.distributedCount || 0)}</p>
                          <p className="text-[9px] text-slate-500">Distributed</p>
                        </div>
                        <div className="rounded-lg bg-white/5 p-2">
                          <p className="text-xs font-bold text-white">{Number(offer.redeemedCount || 0)}</p>
                          <p className="text-[9px] text-slate-500">Redeemed</p>
                        </div>
                        <div className="rounded-lg bg-white/5 p-2">
                          <p className="text-xs font-bold text-white">{Math.max(0, Number(offer.maxUses || 0) - Number(offer.redeemedCount || 0))}</p>
                          <p className="text-[9px] text-slate-500">Remaining</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
                        <span>Valid until {new Date(offer.validTo).toLocaleDateString()}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] border-white/10 text-white hover:bg-white/5"
                          disabled={toggleOffer.isPending}
                          onClick={() => toggleOffer.mutate({ offerId: offer.id, isActive: !offer.isActive })}
                        >
                          {offer.isActive ? "Pause" : "Activate"}
                        </Button>
                      </div>
                    </div>
                  ))}
                {(offers?.length || 0) === 0 && (
                  <div className="col-span-full text-center py-8 text-slate-400 text-sm">No offers yet. Create your first offer.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}