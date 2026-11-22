"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { trpc } from "@/lib/trpc"
import { Sidebar } from "@/components/layout/Sidebar"

export default function ReferralsPage() {
  const { data: session, status } = useSession()
  const { data: code } = trpc.tasks.myReferralCode.useQuery(undefined, { enabled: !!session })
  const { data: referrals } = trpc.tasks.myReferrals.useQuery(undefined, { enabled: !!session })
  const [copied, setCopied] = useState(false)

  if (status === "loading") return <div className="p-8 text-white">Loading...</div>
  if (!session) return <div className="p-8 text-white">Sign in required</div>

  const link = typeof window !== "undefined" ? `${window.location.origin}/auth/register?ref=${code}` : ""

  const copy = async () => {
    if (!code) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      <Sidebar session={session} />
      <div className="md:pl-[262px] p-6 space-y-6">
        <h1 className="text-2xl font-bold">Invite Friends & Earn Points</h1>
        <Card className="bg-[#111a22] border-white/10 max-w-xl">
          <CardHeader><CardTitle>Your Referral Code</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={code || ""} readOnly className="bg-[#121b24] border-white/10 text-white" />
              <Button onClick={copy} className="bg-orange-400 text-black font-bold">{copied ? "Copied!" : "Copy Link"}</Button>
              <Button onClick={async () => { if (navigator.share) { await navigator.share({ title: "Join Strikora", text: "Use my referral code to sign up and earn rewards!", url: link }) } else { await copy() } }} variant="outline" className="border-white/10 text-white">Share</Button>
            </div>
            <p className="text-sm text-slate-400">Share this link. When a friend signs up and completes their first booking, you earn 1000 points.</p>
          </CardContent>
        </Card>

        <Card className="bg-[#111a22] border-white/10">
          <CardHeader><CardTitle>Your Referrals</CardTitle></CardHeader>
          <CardContent>
            {(!referrals || referrals.length === 0) && <p className="text-slate-400 text-sm">No referrals yet.</p>}
            <div className="space-y-2">
              {(referrals || []).map((r: any) => (
                <div key={r.id} className="flex justify-between text-sm border-b border-white/5 pb-2">
                  <span>{r.code}</span>
                  <span className={r.status === "REWARDED" ? "text-green-400" : "text-amber-400"}>{r.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}