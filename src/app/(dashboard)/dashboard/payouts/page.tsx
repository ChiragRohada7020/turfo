"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, DollarSign, TrendingUp, Clock3, CheckCircle2 } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { formatCurrency } from "@/lib/utils"
import { Sidebar } from "@/components/layout/Sidebar"

export default function PayoutsPage() {
  const { data: session } = useSession()
  const { data: earnings } = trpc.cashfree.ownerEarnings.useQuery()
  const { data: payoutsData } = trpc.cashfree.ownerPayouts.useQuery({ limit: 20 })
  const payouts = payoutsData?.payouts || []

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070d12] px-4 text-white">
        <div className="max-w-md w-full bg-[#111a22] border border-white/10 rounded-2xl p-8 text-center">
          <Wallet className="w-12 h-12 text-lime-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Sign In Required</h1>
          <p className="mt-2 text-sm text-slate-400">Please sign in to view payouts.</p>
          <Link href="/auth/login?callbackUrl=/dashboard/payouts" className="mt-6 w-full">
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
        <div className="max-w-[1800px] mx-auto p-4 sm:p-6 xl:p-7">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Payouts</h1>
          <p className="mt-1 text-sm text-slate-400">Track your earnings and payouts</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="bg-[#111a22] border-white/10 p-4">
            <CardContent className="p-0">
              <p className="text-xs text-slate-400">Total Earned</p>
              <p className="text-2xl font-bold text-lime-400 mt-1">{formatCurrency(earnings?.totalEarnings || 0)}</p>
            </CardContent>
          </Card>
          <Card className="bg-[#111a22] border-white/10 p-4">
            <CardContent className="p-0">
              <p className="text-xs text-slate-400">Pending Payout</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{formatCurrency(earnings?.pendingPayouts || 0)}</p>
            </CardContent>
          </Card>
          <Card className="bg-[#111a22] border-white/10 p-4">
            <CardContent className="p-0">
              <p className="text-xs text-slate-400">Completed Payouts</p>
              <p className="text-2xl font-bold text-green-400 mt-1">{formatCurrency(earnings?.completedPayouts || 0)}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-[#111a22] border-white/10 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between px-5 pb-3 pt-4">
            <CardTitle className="text-lg font-bold">Payout History</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {payouts.length > 0 ? (
              <div className="space-y-3">
                {payouts.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-[#17222d] rounded-lg border border-white/[0.08]">
                    <div>
                      <p className="text-sm font-medium text-white">{p.booking?.facility?.name || "Booking"}</p>
                      <p className="text-xs text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-400">{formatCurrency(p.ownerPayout)}</p>
                      <Badge className={p.payoutStatus === "SUCCESS" ? "bg-green-500/15 text-green-300" : p.payoutStatus === "PROCESSING" ? "bg-amber-500/15 text-amber-300" : "bg-slate-500/15 text-slate-300"}>
                        {p.payoutStatus}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Wallet className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400">No payouts yet</p>
                <p className="text-xs text-slate-500 mt-1">Payouts will appear here once you have confirmed bookings</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}
