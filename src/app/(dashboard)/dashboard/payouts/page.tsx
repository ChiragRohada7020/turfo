"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, DollarSign, TrendingUp, Clock3, CheckCircle2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { trpc } from "@/lib/trpc"

export default function PayoutsPage() {
  const { data: session } = useSession()

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
      <div className="max-w-[1800px] mx-auto p-4 sm:p-6 xl:p-7">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Payouts</h1>
          <p className="mt-1 text-sm text-slate-400">Track your earnings and payouts</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="bg-[#111a22] border-white/10 p-4">
            <CardContent className="p-0">
              <p className="text-xs text-slate-400">Total Earned</p>
              <p className="text-2xl font-bold text-lime-400 mt-1">Rs.0</p>
            </CardContent>
          </Card>
          <Card className="bg-[#111a22] border-white/10 p-4">
            <CardContent className="p-0">
              <p className="text-xs text-slate-400">Pending Payout</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">Rs.0</p>
            </CardContent>
          </Card>
          <Card className="bg-[#111a22] border-white/10 p-4">
            <CardContent className="p-0">
              <p className="text-xs text-slate-400">Completed Payouts</p>
              <p className="text-2xl font-bold text-green-400 mt-1">Rs.0</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-[#111a22] border-white/10 rounded-2xl">
          <CardContent className="p-8 text-center">
            <Wallet className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No payouts yet</h3>
            <p className="text-slate-400 mb-6">Payouts will appear here once you have confirmed bookings</p>
            <Link href="/dashboard/facilities">
              <Button className="bg-lime-400 font-bold text-black hover:bg-lime-300">Manage Facilities</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
