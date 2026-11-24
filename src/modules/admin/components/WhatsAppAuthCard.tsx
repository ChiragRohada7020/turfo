"use client"

import { useEffect, useRef, useState } from "react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Phone, Scan, LogOut, AlertTriangle } from "lucide-react"
import QRCode from "qrcode"

export function WhatsAppAuthCard() {
  const statusQuery = trpc.auth.whatsappStatus.useQuery()
  const connectMutation = trpc.auth.whatsappConnect.useMutation()
  const disconnectMutation = trpc.auth.whatsappDisconnect.useMutation()

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [waitingForQr, setWaitingForQr] = useState(false)
  const pollRef = useRef<number | null>(null)

  const data = statusQuery.data
  const authenticated = data?.authenticated ?? false
  const qrCode = data?.qrCode ?? null
  const error = data?.error ?? null

  useEffect(() => {
    if (!qrCode || authenticated) {
      setQrDataUrl(null)
      return
    }
    QRCode.toDataURL(qrCode, { margin: 1, scale: 6, color: { dark: "#000", light: "#fff" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
  }, [qrCode, authenticated])

  // Poll for QR code and connection status after clicking Connect
  // (Baileys emits QR asynchronously, then connection happens after you scan)
  useEffect(() => {
    if (!authenticated && waitingForQr && !loading) {
      pollRef.current = window.setInterval(() => {
        void statusQuery.refetch()
      }, 2000)
      return () => {
        if (pollRef.current) window.clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
    return
  }, [authenticated, waitingForQr, loading, statusQuery])

  useEffect(() => {
    if (authenticated && pollRef.current) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
      setWaitingForQr(false)
    }
  }, [authenticated])

  const handleConnect = async () => {
    setWaitingForQr(true)
    setLoading(true)
    try {
      await connectMutation.mutateAsync()
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setWaitingForQr(false)
    setLoading(true)
    try {
      await disconnectMutation.mutateAsync()
      setQrDataUrl(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#131C2E] p-6 shadow-xl shadow-black/10">
      <div className="flex items-center gap-2 mb-4">
        <Phone className="h-5 w-5 text-orange-400" />
        <h3 className="text-lg font-bold text-white">WhatsApp OTP</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Session status</p>
            <p className={`font-medium ${authenticated ? "text-green-400" : error ? "text-red-400" : "text-red-400"}`}>
              {authenticated ? "Connected" : error ? "Error" : "Not connected"}
            </p>
          </div>
          <Badge variant={authenticated ? "default" : "outline"}>
            {authenticated ? "Online" : "Offline"}
          </Badge>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertTriangle className="mr-2 h-4 w-4" />
            {error}
          </div>
        )}

        {!authenticated ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
            <p className="text-sm text-slate-400 mb-3">Scan this QR code with WhatsApp (Linked Devices)</p>
            {qrDataUrl ? (
              <div className="flex items-center justify-center p-2 bg-white/5 rounded-lg border border-white/10">
                <img src={qrDataUrl} alt="WhatsApp QR" className="rounded" />
              </div>
            ) : qrCode ? (
              <div className="flex items-center justify-center text-xs font-mono text-slate-400 text-center p-2 bg-white/5 rounded-lg border border-white/10 max-h-[200px] overflow-hidden">
                {qrCode.slice(0, 120)}...
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {!authenticated ? (
            <Button
              onClick={handleConnect}
              disabled={loading || connectMutation.isPending}
              className="w-full bg-orange-500 font-bold text-white hover:bg-orange-400 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading || connectMutation.isPending ? <Scan className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />} Connect WhatsApp
            </Button>
          ) : (
            <Button
              onClick={handleDisconnect}
              disabled={loading}
              variant="destructive"
              className="w-full flex items-center justify-center gap-2"
            >
              {loading ? <LogOut className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Disconnect
            </Button>
          )}
        </div>

        {!authenticated && qrDataUrl && (
          <p className="text-xs text-slate-400 text-center">
            Open WhatsApp &rarr; Settings &rarr; Linked Devices &rarr; Link a device
          </p>
        )}
      </div>
    </div>
  )
}
