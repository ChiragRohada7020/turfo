"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, AlertTriangle } from "lucide-react"

interface ConfirmCancelModalProps {
  isOpen: boolean
  bookingName: string
  requiresReason: boolean
  onConfirm: (reason?: string) => void
  onCancel: () => void
  isLoading: boolean
}

export function ConfirmCancelModal({
  isOpen,
  bookingName,
  requiresReason,
  onConfirm,
  onCancel,
  isLoading,
}: ConfirmCancelModalProps) {
  const [reason, setReason] = useState("")

  if (!isOpen) return null

  const handleConfirm = () => {
    if (requiresReason && !reason.trim()) {
      return
    }
    onConfirm(reason.trim() || undefined)
    setReason("")
  }

  const handleCancel = () => {
    setReason("")
    onCancel()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111a22] rounded-2xl shadow-xl max-w-md w-full border border-white/10">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Cancel Booking
          </h2>
          <button onClick={handleCancel} className="p-1 hover:bg-white/5 rounded-lg text-slate-400" disabled={isLoading}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-slate-300">
            Are you sure you want to cancel your booking at <span className="font-semibold text-white">{bookingName}</span>?
          </p>

          {requiresReason && (
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">
                Cancellation Reason <span className="text-red-400">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a reason for cancellation..."
                className="w-full p-3 border border-white/10 rounded-lg min-h-[80px] resize-none bg-[#121b24] text-white placeholder:text-slate-500 focus:border-lime-400/50 focus:outline-none"
                rows={3}
                disabled={isLoading}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-white/10 text-white hover:bg-white/5"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Keep Booking
            </Button>
            <Button
              className="flex-1 bg-red-500 font-bold text-white hover:bg-red-600"
              onClick={handleConfirm}
              disabled={isLoading || (requiresReason && !reason.trim())}
            >
              {isLoading ? (
                <>
                  <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Cancelling...
                </>
              ) : (
                "Yes, Cancel"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}