"use client"

import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, CheckCircle2, XCircle, Clock } from "lucide-react"

interface JoinRequestsPanelProps {
  bookingId: string
  approveRequest: any
  rejectRequest: any
}

export function JoinRequestsPanel({ bookingId, approveRequest, rejectRequest }: JoinRequestsPanelProps) {
  const { data: requests, isLoading, refetch } = trpc.bookings.getJoinRequests.useQuery({ bookingId })

  if (isLoading) return null
  if (!requests || requests.length === 0) return null

  return (
    <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
      <p className="text-xs font-bold text-amber-400 uppercase mb-2">
        Pending Join Requests ({requests.length})
      </p>
      <div className="space-y-2">
        {requests.map((req: any) => (
          <div key={req.id} className="flex items-center justify-between gap-3 p-2 bg-white/5 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{req.user?.name || "Player"}</p>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span>Reliability: {req.user?.reliabilityScore || 100}%</span>
                {req.user?.noShowCount > 0 && (
                  <span className="text-amber-400">⚠ {req.user.noShowCount} no-show{req.user.noShowCount > 1 ? "s" : ""}</span>
                )}
                {req.message && <span className="text-slate-500">"{req.message}"</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="sm"
                className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border-green-500/30 h-7 px-2"
                onClick={() => approveRequest.mutate({ requestId: req.id })}
                disabled={approveRequest.isPending}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30 h-7 px-2"
                onClick={() => rejectRequest.mutate({ requestId: req.id })}
                disabled={rejectRequest.isPending}
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}