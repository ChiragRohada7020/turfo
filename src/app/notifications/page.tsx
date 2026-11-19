"use client"

import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { trpc } from "@/lib/trpc"
import { Sidebar } from "@/components/layout/Sidebar"
import { Bell, CheckCircle2, Clock3 } from "lucide-react"

export default function NotificationsPage() {
  const { data: session } = useSession()
  const { data, refetch } = trpc.notifications.list.useQuery({ limit: 50 })
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: () => refetch() })
  const markAll = trpc.notifications.markAllRead.useMutation({ onSuccess: () => refetch() })

  if (!session) return <div className="p-8 text-white">Sign in required</div>

  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      <Sidebar session={session} />
      <div className="md:pl-[262px] p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6 text-lime-400" /> Notifications</h1>
          <Button variant="outline" className="border-white/10 text-white" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            Mark all read
          </Button>
        </div>
        <div className="space-y-3">
          {data?.notifications?.map((n: any) => (
            <Card key={n.id} className={`border-white/10 ${n.isRead ? "bg-[#111a22]" : "bg-[#17222d] border-lime-400/30"}`}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className={`mt-1 h-2 w-2 rounded-full ${n.isRead ? "bg-slate-500" : "bg-lime-400"}`} />
                  <div>
                    <p className="font-bold text-white">{n.title}</p>
                    <p className="text-sm text-slate-300 mt-1">{n.message}</p>
                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1"><Clock3 className="h-3 w-3" /> {new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                {!n.isRead && (
                  <Button size="sm" className="bg-lime-400 text-black font-bold shrink-0" onClick={() => markRead.mutate({ id: n.id })} disabled={markRead.isPending}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Read
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {(!data?.notifications || data.notifications.length === 0) && (
            <div className="text-center text-slate-400 py-12">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No notifications yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
