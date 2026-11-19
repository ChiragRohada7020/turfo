"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { trpc } from "@/lib/trpc"
import { Sidebar } from "@/components/layout/Sidebar"
import { OWNER_NAV } from "@/modules/shared/constants/navigation"

export default function PromotionsPage() {
  const { data: session, status } = useSession()
  const { data: settings } = trpc.promotions.ownerSettings.useQuery()
  const update = trpc.promotions.updateOwnerSettings.useMutation()

  const [form, setForm] = useState({
    enabled: true,
    maxDiscountPct: 20,
    maxFlatDiscount: 0,
    minBookingPrice: 0,
    allowedStartHour: 0,
    allowedEndHour: 23,
    monthlyBudget: 0,
    autoApprove: false,
  })

  useEffect(() => {
    if (settings) {
      setForm({
        enabled: settings.enabled ?? true,
        maxDiscountPct: settings.maxDiscountPct ?? 20,
        maxFlatDiscount: settings.maxFlatDiscount ?? 0,
        minBookingPrice: settings.minBookingPrice ?? 0,
        allowedStartHour: settings.allowedStartHour ?? 0,
        allowedEndHour: settings.allowedEndHour ?? 23,
        monthlyBudget: settings.monthlyBudget ?? 0,
        autoApprove: settings.autoApprove ?? false,
      })
    }
  }, [settings])

  if (status === "loading") return <div className="p-8 text-white flex items-center gap-2"><div className="h-5 w-5 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" /></div>
  if (!session) return <div className="p-8 text-white">Sign in required</div>

  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      <Sidebar session={session} />
      <div className="md:pl-[262px] p-6">
        <h1 className="text-2xl font-bold mb-6">Promotion Settings</h1>
        <Card className="bg-[#111a22] border-white/10 max-w-2xl">
          <CardHeader><CardTitle>AI Promotion Controls</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable AI Promotions</Label>
              <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
            </div>
            <div>
              <Label>Max Discount %</Label>
              <Input type="number" value={form.maxDiscountPct} onChange={(e) => setForm({ ...form, maxDiscountPct: Number(e.target.value) })} className="bg-[#121b24] border-white/10 text-white" />
            </div>
            <div>
              <Label>Max Flat Discount</Label>
              <Input type="number" value={form.maxFlatDiscount} onChange={(e) => setForm({ ...form, maxFlatDiscount: Number(e.target.value) })} className="bg-[#121b24] border-white/10 text-white" />
            </div>
            <div>
              <Label>Min Booking Price</Label>
              <Input type="number" value={form.minBookingPrice} onChange={(e) => setForm({ ...form, minBookingPrice: Number(e.target.value) })} className="bg-[#121b24] border-white/10 text-white" />
            </div>
            <div>
              <Label>Allowed Start Hour</Label>
              <Input type="number" value={form.allowedStartHour} onChange={(e) => setForm({ ...form, allowedStartHour: Number(e.target.value) })} className="bg-[#121b24] border-white/10 text-white" />
            </div>
            <div>
              <Label>Allowed End Hour</Label>
              <Input type="number" value={form.allowedEndHour} onChange={(e) => setForm({ ...form, allowedEndHour: Number(e.target.value) })} className="bg-[#121b24] border-white/10 text-white" />
            </div>
            <div>
              <Label>Monthly Budget</Label>
              <Input type="number" value={form.monthlyBudget} onChange={(e) => setForm({ ...form, monthlyBudget: Number(e.target.value) })} className="bg-[#121b24] border-white/10 text-white" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Auto Approve</Label>
              <input type="checkbox" checked={form.autoApprove} onChange={(e) => setForm({ ...form, autoApprove: e.target.checked })} />
            </div>
            <Button
              className="bg-lime-400 font-bold text-black hover:bg-lime-300"
              onClick={() => update.mutate(form)}
              disabled={update.isPending}
            >
              {update.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
