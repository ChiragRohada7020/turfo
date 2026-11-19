"use client"

import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { trpc } from "@/lib/trpc"
import { Sidebar } from "@/components/layout/Sidebar"

export default function PreferencesPage() {
  const { data: session } = useSession()
  const { data: pref, refetch } = trpc.promotions.myPreference.useQuery()
  const refresh = trpc.promotions.refreshMyPreference.useMutation({ onSuccess: () => refetch() })

  if (!session) return <div className="p-8 text-white">Sign in required</div>

  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      <Sidebar session={session} />
      <div className="md:pl-[262px] p-6">
        <h1 className="text-2xl font-bold mb-6">My Preferences</h1>
        <Card className="bg-[#111a22] border-white/10 max-w-xl">
          <CardContent className="p-4 space-y-2">
            <p>Preferred Sport: {pref?.preferredSport || "N/A"}</p>
            <p>Preferred Times: {pref?.preferredTimes?.join(", ") || "N/A"}</p>
            <p>Preferred Days: {pref?.preferredDays?.join(", ") || "N/A"}</p>
            <p>Bookings (30d): {pref?.bookingCount30d ?? 0}</p>
            <p>Avg Value: {pref?.avgBookingValue ?? 0}</p>
            <p>Inactivity Days: {pref?.inactivityDays ?? 0}</p>
            <p>Engagement Score: {pref?.engagementScore ?? 0}</p>
            <Button className="bg-lime-400 text-black font-bold mt-4" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
              {refresh.isPending ? "Refreshing..." : "Refresh Preferences"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
