"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { trpc } from "@/lib/trpc"
import { Sidebar } from "@/components/layout/Sidebar"
import { OWNER_NAV } from "@/modules/shared/constants/navigation"

export default function TaskManagementPage() {
  const { data: session, status } = useSession()
  const { data: analytics } = trpc.tasks.ownerAnalytics.useQuery(undefined, { enabled: !!session })
  const { data: settings } = trpc.tasks.ownerSettings.useQuery(undefined, { enabled: !!session })
  const update = trpc.tasks.updateOwnerSettings.useMutation()
  const generate = trpc.tasks.adminGenerateAll.useMutation()
  const [form, setForm] = useState({
    aiEnabled: true,
    maxActiveTasks: 5,
    maxRewardPointsPerTask: 200,
    monthlyRewardBudget: 0,
    defaultExpiryDays: 7,
    minBookingValue: 0,
  })
  useEffect(() => {
    if (settings) {
      setForm({
        aiEnabled: settings.aiEnabled ?? true,
        maxActiveTasks: settings.maxActiveTasks ?? 5,
        maxRewardPointsPerTask: settings.maxRewardPointsPerTask ?? 200,
        monthlyRewardBudget: settings.monthlyRewardBudget ?? 0,
        defaultExpiryDays: settings.defaultExpiryDays ?? 7,
        minBookingValue: settings.minBookingValue ?? 0,
      })
    }
  }, [settings])

  if (status === "loading") return <div className="p-8 text-white">Loading...</div>
  if (!session) return <div className="p-8 text-white">Sign in required</div>

  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      <Sidebar session={session} />
      <div className="md:pl-[262px] p-6 space-y-6">
        <h1 className="text-2xl font-bold">Task Management & Analytics</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-[#111a22] border-white/10"><CardContent className="p-4"><p className="text-xs text-slate-400">Total Tasks</p><p className="text-2xl font-bold">{analytics?.totalTasksGenerated ?? 0}</p></CardContent></Card>
          <Card className="bg-[#111a22] border-white/10"><CardContent className="p-4"><p className="text-xs text-slate-400">Active</p><p className="text-2xl font-bold">{analytics?.activeTasks ?? 0}</p></CardContent></Card>
          <Card className="bg-[#111a22] border-white/10"><CardContent className="p-4"><p className="text-xs text-slate-400">Completed</p><p className="text-2xl font-bold">{analytics?.completedTasks ?? 0}</p></CardContent></Card>
          <Card className="bg-[#111a22] border-white/10"><CardContent className="p-4"><p className="text-xs text-slate-400">Expired</p><p className="text-2xl font-bold">{analytics?.expiredTasks ?? 0}</p></CardContent></Card>
        </div>

        <Card className="bg-[#111a22] border-white/10">
          <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4 max-w-2xl">
            <div className="flex items-center justify-between">
              <Label>Enable AI Task Generation</Label>
              <input type="checkbox" checked={form.aiEnabled} onChange={(e) => setForm({ ...form, aiEnabled: e.target.checked })} />
            </div>
            <div><Label>Max Active Tasks</Label><Input type="number" value={form.maxActiveTasks} onChange={(e) => setForm({ ...form, maxActiveTasks: Number(e.target.value) })} className="bg-[#121b24] border-white/10 text-white" /></div>
            <div><Label>Max Reward Points Per Task</Label><Input type="number" value={form.maxRewardPointsPerTask} onChange={(e) => setForm({ ...form, maxRewardPointsPerTask: Number(e.target.value) })} className="bg-[#121b24] border-white/10 text-white" /></div>
            <div><Label>Monthly Reward Budget</Label><Input type="number" value={form.monthlyRewardBudget} onChange={(e) => setForm({ ...form, monthlyRewardBudget: Number(e.target.value) })} className="bg-[#121b24] border-white/10 text-white" /></div>
            <div><Label>Default Expiry Days</Label><Input type="number" value={form.defaultExpiryDays} onChange={(e) => setForm({ ...form, defaultExpiryDays: Number(e.target.value) })} className="bg-[#121b24] border-white/10 text-white" /></div>
            <Button onClick={() => update.mutate(form)} disabled={update.isPending}>{update.isPending ? "Saving..." : "Save"}</Button>
          </CardContent>
        </Card>

        <Card className="bg-[#111a22] border-white/10">
          <CardHeader><CardTitle>Category Effectiveness</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(analytics?.categoryEffectiveness || []).map((c: any) => (
                <div key={c.category} className="flex justify-between text-sm">
                  <span>{c.category}</span>
                  <span>{c.completed}/{c.total} ({Math.round(c.rate * 100)}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}