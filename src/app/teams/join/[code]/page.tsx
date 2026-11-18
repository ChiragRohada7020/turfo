"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ShieldCheck, Users, Loader2, CheckCircle2, XCircle } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc"

function sportLabel(sport: string) {
  return sport.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

export default function JoinTeamPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const inviteCode = params.code as string

  const { data: team, isLoading, error } = trpc.teams.getByInviteCode.useQuery({ inviteCode })
  const joinByInvite = trpc.teams.joinByInvite.useMutation({
    onSuccess: () => {
      router.push("/dashboard/teams")
    },
  })

  if (status === "loading" || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06100e] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-lime-400" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06100e] px-4 text-white">
        <Card className="w-full max-w-md border-white/10 bg-[#101c19] text-white">
          <CardContent className="p-8 text-center">
            <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-lime-400" />
            <h1 className="text-2xl font-bold">Sign In to Join</h1>
            <p className="mt-2 text-sm text-slate-400">
              You need to sign in to join this team.
            </p>
            <Button asChild className="mt-6 w-full bg-lime-400 font-bold text-black hover:bg-lime-300">
              <Link href={`/auth/login?callbackUrl=/teams/join/${inviteCode}`}>Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !team) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06100e] px-4 text-white">
        <Card className="w-full max-w-md border-white/10 bg-[#101c19] text-white">
          <CardContent className="p-8 text-center">
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h1 className="text-2xl font-bold">Invalid Invite Link</h1>
            <p className="mt-2 text-sm text-slate-400">
              This invite link is invalid or has expired.
            </p>
            <Button asChild className="mt-6 w-full bg-lime-400 font-bold text-black hover:bg-lime-300">
              <Link href="/dashboard/teams">Go to Teams</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#06100e] px-4 text-white">
      <Card className="w-full max-w-md border-white/10 bg-[#101c19] text-white">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-lime-500/20 to-emerald-500/5 text-2xl font-black text-lime-400">
            {team.imageUrl ? (
              <img src={team.imageUrl} alt={team.name} className="h-full w-full rounded-2xl object-cover" />
            ) : (
              initials(team.name)
            )}
          </div>
          <h1 className="text-2xl font-bold">{team.name}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {sportLabel(team.sportType || "FOOTBALL")} · {team._count?.members || 0} members
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Captain: {team.captain?.name || "Unknown"}
          </p>

          {joinByInvite.isSuccess ? (
            <div className="mt-6 flex items-center justify-center gap-2 text-lime-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-bold">Joined successfully!</span>
            </div>
          ) : (
            <Button
              className="mt-6 w-full bg-lime-400 font-bold text-black hover:bg-lime-300"
              onClick={() => joinByInvite.mutate({ inviteCode })}
              disabled={joinByInvite.isPending}
            >
              {joinByInvite.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Joining...</>
              ) : (
                <>Join Team</>
              )}
            </Button>
          )}

          {joinByInvite.isError && (
            <p className="mt-3 text-sm text-red-400">{joinByInvite.error?.message}</p>
          )}

          <Link href="/dashboard/teams" className="mt-4 block text-sm text-slate-400 hover:text-white">
            ← Back to Teams
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
