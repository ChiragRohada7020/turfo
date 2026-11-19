"use client"

import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { trpc } from "@/lib/trpc"

export default function AdminPromotionsPage() {
  const { data: session } = useSession()
  const { data, refetch } = trpc.promotions.campaigns.useQuery({ limit: 50 })
  const pause = trpc.promotions.pauseCampaign.useMutation({ onSuccess: () => refetch() })
  const resume = trpc.promotions.resumeCampaign.useMutation({ onSuccess: () => refetch() })

  if (!session || session.user?.role !== "ADMIN") return <div className="p-8 text-white">Admin only</div>

  return (
    <div className="min-h-screen bg-[#070d12] text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Promotion Campaigns</h1>
      <div className="space-y-3">
        {data?.campaigns.map((c: any) => (
          <Card key={c.id} className="bg-[#111a22] border-white/10">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-bold">{c.name}</p>
                <p className="text-xs text-slate-400">{c.type} · {c.status} · recipients: {c._count?.recipients ?? 0}</p>
              </div>
              <div className="flex gap-2">
                {c.status === "ACTIVE" ? (
                  <Button size="sm" variant="outline" onClick={() => pause.mutate({ id: c.id })}>Pause</Button>
                ) : (
                  <Button size="sm" className="bg-lime-400 text-black" onClick={() => resume.mutate({ id: c.id })}>Resume</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
