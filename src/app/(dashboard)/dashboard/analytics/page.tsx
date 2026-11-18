"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, BarChart3, CalendarDays, Users, DollarSign } from "lucide-react"
import { Sidebar } from "@/components/layout/Sidebar"

export default function AnalyticsPage() {
  const { data: session, status } = useSession()

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
          <TrendingUp className="w-12 h-12 text-lime-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Sign In Required</h1>
          <p className="mt-2 text-sm text-slate-400">Please sign in to view analytics.</p>
          <Link href="/auth/login?callbackUrl=/dashboard/analytics" className="mt-6 w-full">
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
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-slate-400">Revenue and booking statistics</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-[#111a22] border-white/10 p-4">
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-lime-400/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-lime-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Total Revenue</p>
                  <p className="text-xl font-bold text-lime-400">Rs.0</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#111a22] border-white/10 p-4">
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-400/10 flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Total Bookings</p>
                  <p className="text-xl font-bold text-blue-400">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#111a22] border-white/10 p-4">
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-400/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Unique Players</p>
                  <p className="text-xl font-bold text-amber-400">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#111a22] border-white/10 p-4">
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-400/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Occupancy Rate</p>
                  <p className="text-xl font-bold text-purple-400">0%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-[#111a22] border-white/10 rounded-2xl">
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Analytics Coming Soon</h3>
            <p className="text-slate-400 mb-6">Detailed charts and reports will be available once you have bookings</p>
            <Link href="/dashboard/facilities">
              <Button className="bg-lime-400 font-bold text-black hover:bg-lime-300">Manage Facilities</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}
