"use client"

import { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Lock, Unlock } from "lucide-react"
import { trpc } from "@/lib/trpc"

export function LockedFeatureGate({ children }: { children: ReactNode }) {
  const { data, refetch, isLoading } = trpc.tasks.isUnlocked.useQuery()
  const unlock = trpc.tasks.unlockFeatures.useMutation({
    onSuccess: () => refetch(),
  })

  if (isLoading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-slate-400">Loading...</div>
  }

  if (data?.unlocked) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="w-full max-w-md border-white/10 bg-[#131C2E] text-white">
        <CardContent className="p-8 text-center">
          <Lock className="mx-auto mb-4 h-12 w-12 text-orange-400" />
          <h2 className="text-2xl font-bold">Feature Locked</h2>
          <p className="mt-2 text-sm text-slate-400">
            Unlock Find Players, Teams & Tournaments for 1 month with 1500 reward points.
          </p>
          <p className="mt-4 text-sm text-slate-300">
            Your points: <span className="font-bold text-orange-400">{data?.rewardPoints ?? 0}</span>
          </p>
          <Button
            className="mt-6 w-full bg-orange-400 font-bold text-black hover:bg-orange-300"
            disabled={unlock.isPending || (data?.rewardPoints ?? 0) < 1500}
            onClick={() => unlock.mutate()}
          >
            {unlock.isPending ? "Unlocking..." : "Unlock with 1500 points"}
          </Button>
          {unlock.isError && (
            <p className="mt-3 text-xs text-red-400">{(unlock.error as any)?.message || "Unlock failed"}</p>
          )}
          {(data?.rewardPoints ?? 0) < 1500 && (
            <p className="mt-3 text-xs text-slate-500">Earn more reward points by completing tasks.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}