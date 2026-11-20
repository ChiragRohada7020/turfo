"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, CalendarDays, Users, MapPin, Plus, Clock } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { trpc } from "@/lib/trpc"
import { toast } from "@/hooks/use-toast"
import { Sidebar } from "@/components/layout/Sidebar"

export default function TournamentsPage() {
  const { data: session } = useSession()

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FC] px-4 text-[#171A2B]">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-xl shadow-slate-900/5">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white">
            <Trophy className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Tournaments</h1>
          <p className="mt-2 text-sm text-slate-500">Please sign in to view and join tournaments.</p>
          <Link href="/auth/login?callbackUrl=/tournaments" className="mt-6 w-full">
            <Button className="w-full h-12 bg-orange-500 font-bold text-white hover:bg-orange-600 rounded-xl shadow-lg shadow-orange-500/20">Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  const { data, isLoading } = trpc.tournaments.list.useQuery({ limit: 20 })

  const isOwner = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN"

  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      <Sidebar session={session} />
      <div className="md:pt-0 md:pl-[262px]">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Tournaments</h1>
              <p className="text-sm text-slate-400">Compete, win, and earn rewards</p>
            </div>
            {isOwner && (
              <Link href="/dashboard/tournaments/new">
                <Button className="bg-lime-400 font-bold text-black hover:bg-lime-300">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Tournament
                </Button>
              </Link>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : data?.tournaments && data.tournaments.length > 0 ? (
            <div className="space-y-4">
              {data.tournaments.map((t: any) => (
                <Card key={t.id} className="bg-[#111a22] border-white/10 hover:border-lime-400/30 transition-colors overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row">
                      <div className="relative h-32 sm:h-auto sm:w-40 shrink-0 bg-[#1a3027]">
                        <img
                          src={t.imageUrl || "/placeholder.svg"}
                          alt={t.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2">
                          <Badge className={t.status === "REGISTRATION_OPEN" ? "bg-green-500/15 text-green-300 border-green-500/30" : t.status === "IN_PROGRESS" ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : "bg-slate-500/15 text-slate-300 border-slate-500/30"}>
                            {t.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-lg truncate">{t.name}</h3>
                            <p className="text-sm text-slate-400">{t.sportType} · {t.facility?.name}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-lime-400">{t._count?.teams || 0}/{t.maxTeams} teams</p>
                            {t.prizePool > 0 && <p className="text-[10px] text-slate-400">Prize: ₹{t.prizePool}</p>}
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-slate-300">
                            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                            {formatDate(t.startDate)}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-300">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {new Date(t.endDate).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-300">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            {t.facility?.city}
                          </div>
                        </div>
                        {t.entryFee > 0 && (
                          <p className="mt-2 text-xs text-slate-400">Entry fee: ₹{t.entryFee} per team</p>
                        )}
                      </div>
                      <div className="p-4 sm:border-l sm:border-white/10 flex items-center justify-center">
                        <Link href={`/tournaments/${t.id}`}>
                          <Button size="sm" className="bg-lime-400 font-bold text-black hover:bg-lime-300 w-full sm:w-auto">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Trophy className="w-16 h-16 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No tournaments</h3>
              <p className="text-slate-400 mb-6">No tournaments available right now.</p>
              {isOwner && (
                <Link href="/dashboard/tournaments/new">
                  <Button className="bg-lime-400 font-bold text-black hover:bg-lime-300">Create Tournament</Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}