"use client"

import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { trpc } from "@/lib/trpc"
import { Sidebar } from "@/components/layout/Sidebar"

export default function OwnerCampaignsPage() {
  const { data: session } = useSession()
  const { data } = trpc.promotions.myCampaigns.useQuery({ limit: 50 })
  if (!session) return <div className="p-8 text-white">Sign in required</div>
  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      <Sidebar session={session} />
      <div className="md:pl-[262px] p-6">
        <h1 className="text-2xl font-bold mb-6">My Promotion Campaigns</h1>
        <div className="space-y-3">
          {data?.campaigns.map((c: any) => (
            <Card key={c.id} className="bg-[#111a22] border-white/10">
              <CardContent className="p-4">
                <p className="font-bold">{c.name}</p>
                <p className="text-xs text-slate-400">{c.type} · {c.status} · recipients: {c._count?.recipients ?? 0}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
