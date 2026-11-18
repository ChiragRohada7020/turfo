content = r'''"use client"

import { useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Trophy, Clock, MapPin, ChevronLeft, Plus, CalendarDays, Star } from "lucide-react"
import { formatDate, formatTime, formatCurrency } from "@/lib/utils"
import { trpc } from "@/lib/trpc"
import { Sidebar } from "@/components/layout/Sidebar"

export default function FacilityDetailInner() {
  const params = useParams()
  const { data: session } = useSession()
  const [selectedDate, setSelectedDate] = useState(new Date())

  const { data: team, isLoading } = trpc.teams.get.useQuery({ id: params.id as string })

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070d12] px-4 text-white">
        <div className="max-w-md w-full bg-[#111a22] border border-white/10 rounded-2xl p-8 text-center">
          <Users className="w-12 h-12 text-lime-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Sign In Required</h1>
          <p className="mt-2 text-sm text-slate-400">Please sign in to view teams.</p>
          <Link href="/auth/login?callbackUrl=/teams" className="mt-6 w-full">
            <Button className="w-full bg-lime-400 font-bold text-black hover:bg-lime-300">Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-[#070d12] flex items-center justify-center px-4 text-white">
        <div className="max-w-md w-full bg-[#111a22] border border-white/10 rounded-2xl p-8 text-center">
          <Users className="w-12 h-12 text-lime-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Team Not Found</h1>
          <p className="mt-2 text-sm text-slate-400">This team does not exist.</p>
          <Link href="/teams" className="mt-6 w-full">
            <Button className="w-full bg-lime-400 font-bold text-black hover:bg-lime-300">Back to Teams</Button>
          </Link>
        </div>
      </div>
    )
  }

  const isMember = team.members.some((court: any) => m.userId === session?.user?.id)
  const isCaptain = team.ownerId === session?.user?.id || team.captainId === session?.user?.id
  const userMembership = team.members.find((m: any) => m.userId === session?.user?.id)

  const totalPrice = selectedSlot?.price ?? team.pricingRules?.[0]?.pricePerHour ?? 0

  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      <Sidebar session={session} />
      <div className="md:pl-[262px]">
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="relative h-32 w-32 rounded-full bg-[#070d12] flex items-center justify-center overflow-hidden border border-white/10">
                <Image src={team.logoUrl} alt={team.name} fill className="object-cover" />
                <div className="absolute -top-3 -right-3 flex items-center gap-2">
                  <Badge className="bg-lime-400 text-black">
                    {team.isPublic ? "Public" : "Private"}
                  </Badge>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{team.name}</h1>
                <p className="text-xs text-slate-400">{team.sportType?.replace(/_/g, " ")}</p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/10 text-white"
                  onClick={() => {
                    if (team.ownerId === session?.user?.id) {
                      setShowCreateForm(true)
                    } else {
                      setSelectedCourt(team.id)
                      setSelectedSlot(null)
                    }
                  }}
                >
                  {team.ownerId === session?.user?.id ? "Manage Team" : "Create Team"}
                </Button>
              </div>
            </div>

            {/* Court info row */}
            <div className="mt-8">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-white/10 bg-[#080f15]">
                <div className="relative h-32 w-32 rounded-full bg-[#070d12] flex items-center justify-center overflow-hidden border border-white/10">
                  <Image src={court.images?.[0] || facility.images?.[0] || "/placeholder.svg"} alt={court.name} fill className="object-cover" />
                  <div className="absolute -top-3 -right-3 flex items-center gap-2">
                    <Badge className="bg-lime-400 text-black">
                      {court.pricingRules?.[0]?.pricePerHour}/hr
                    </Badge>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white">{court.name}</h3>
                  <p className="text-xs text-slate-500">{court.sportType.replace(/_/g, " ")}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="h-3 w-3 text-slate-400 mr-1" />
                    {court.sportType?.replace(/_/g, " ")}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-slate-400">Court Size</p>
                  <span className="text-sm font-bold text-white">{court.dimensions}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-slate-400">Surface</span>
                  <p className="text-sm font-bold text-white">{court.surfaceType?.replace(/_/g, " ")}</p>
                </div>
              </div>
              <div className="mt-8">
                <h2 className="text-lg font-bold">Available Slots</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {courts.map((court: any) => {
                    const active = selectedCourtId === court.id
                    return (
                      <button
                        key={court.id}
                        onClick={() => { setSelectedCourtId(court.id); setSelectedSlot(null) }}
                        className={`rounded-lg border px-2 py-2 text-[10px] font-medium transition ${selectedCourtId === court.id ? "border-lime-400 bg-[#080f15]" : "border-white/10 bg-[#080f15]/50 hover:border-lime-400/50"}`}
                      >
                        {court.name}
                        <p className="text-xs text-slate-500">{formatCurrency(court.pricingRules?.[0]?.pricePerHour ?? facility.minPrice ?? 0)} / hour</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {courts.length === 0 && (
                <p className="text-center py-8 text-slate-400">No courts available for this sport.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FacilityDetailPage() {
  return <FacilityDetailInner />
}
'''

with open('src/app/teams/[id]/page.tsx', 'w') as f:
    f.write(content)
print("done")
