"use client"

import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { trpc } from "@/lib/trpc"

export default function RewardsPage() {
  const { data: session } = useSession()
  const { data: perks, refetch } = trpc.promotions.perks.useQuery()
  const redeem = trpc.promotions.redeemPerk.useMutation({ onSuccess: () => refetch() })

  if (!session) return <div className="p-8 text-white">Sign in required</div>

  return (
    <div className="min-h-screen bg-[#070d12] text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Reward Perks</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {perks?.map((perk: any) => (
          <Card key={perk.id} className="bg-[#111a22] border-white/10">
            <CardContent className="p-4">
              <p className="font-bold">{perk.name}</p>
              <p className="text-xs text-slate-400 mb-2">{perk.description}</p>
              <p className="text-sm text-lime-300 mb-3">Cost: {perk.costPoints} points</p>
              <Button
                className="bg-lime-400 text-black font-bold"
                onClick={() => redeem.mutate({ perkId: perk.id })}
                disabled={redeem.isPending}
              >
                {redeem.isPending ? "Redeeming..." : "Redeem"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
