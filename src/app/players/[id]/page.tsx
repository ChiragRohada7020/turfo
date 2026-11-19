"use client"

import { useSession } from "next-auth/react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { trpc } from "@/lib/trpc"
import { useState } from "react"

export default function PlayerProfilePage() {
  const params = useParams()
  const id = params?.id as string
  const { data: session } = useSession()
  const { data: player } = trpc.players.list.useQuery({})
  const invite = trpc.players.invite.useMutation()
  const [message, setMessage] = useState("")

  const p = player?.find((u: any) => u.id === id)

  if (!p) return <div className="p-8 text-white">Player not found</div>

  return (
    <div className="min-h-screen bg-[#070d12] text-white p-6">
      <Card className="bg-[#111a22] border-white/10 max-w-md mx-auto">
        <CardContent className="p-6 text-center space-y-4">
          <Avatar className="h-20 w-20 mx-auto border-2 border-lime-400/30">
            <AvatarImage src={p.avatarUrl ?? ""} alt={p.name ?? ""} />
            <AvatarFallback className="bg-lime-400/10 text-lime-400">{p.name?.[0]}</AvatarFallback>
          </Avatar>
          <h1 className="text-xl font-bold">{p.name}</h1>
          <p className="text-slate-400">{p.city || "Unknown city"}</p>
          <p className="text-sm text-lime-300">{p.playerPreference?.preferredSport || "Sport not set"}</p>
          <p className="text-sm">Reward points: {p.rewardPoints ?? 0}</p>
          <p className="text-xs text-slate-500">Phone: {p.phone || "N/A"}</p>
          <p className="text-xs text-slate-500">Address: {p.address || "N/A"} {p.state || ""} {p.postalCode || ""}</p>
          <p className="text-sm">Matches played: {p._count?.bookings ?? 0}</p>
          <p className="text-xs text-slate-500">Preferred times: {p.playerPreference?.preferredTimes?.join(", ") || "N/A"}</p>
          <p className="text-xs text-slate-500">Preferred days: {p.playerPreference?.preferredDays?.join(", ") || "N/A"}</p>
          <p className="text-xs text-slate-500">Engagement: {p.playerPreference?.engagementScore ?? 0}</p>
          {session && session.user?.id !== p.id && (
            <div className="space-y-2">
              <input
                className="w-full bg-[#121b24] border border-white/10 text-white rounded p-2"
                placeholder="Invite message (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button className="bg-lime-400 text-black font-bold w-full" onClick={() => invite.mutate({ userId: p.id, message })} disabled={invite.isPending}>
                {invite.isPending ? "Inviting..." : "Invite Player"}
              </Button>
              {invite.isSuccess && <p className="text-lime-300 text-sm">Invitation sent.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
