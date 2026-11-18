"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Trophy } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { Sidebar } from "@/components/layout/Sidebar"

export default function TeamDetailPage() {
  const params = useParams()
  const { data: session } = useSession()
  const { data: team, isLoading } = trpc.teams.get.useQuery({ teamId: params.id as string })

  const joinTeam = trpc.teams.join.useMutation({
    onSuccess: () => window.location.reload(),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070d12] text-white flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" />
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-[#070d12] text-white flex items-center justify-center px-4">
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

  const isMember = (team.members || []).some((m: any) => m.userId === session?.user?.id)

  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      <Sidebar session={session} />
      <div className="pt-14 md:pt-0 md:pl-[262px]">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <Link href="/teams" className="text-sm text-slate-400 hover:text-white mb-4 inline-block">
            ← Back to Teams
          </Link>
          <Card className="bg-[#111a22] border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">{team.name}</h1>
                <Badge className="bg-lime-400 text-black">{team.members?.length || 0} members</Badge>
              </div>
              <div className="space-y-2">
                {(team.members || []).map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-sm">{m.user?.name || m.userId}</span>
                    <span className="text-xs text-slate-400">{m.role}</span>
                  </div>
                ))}
              </div>
              {!isMember && session && (
                <Button
                  className="mt-4 bg-lime-400 font-bold text-black hover:bg-lime-300"
                  onClick={() => joinTeam.mutate({ teamId: team.id })}
                  disabled={joinTeam.isPending}
                >
                  Join Team
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
