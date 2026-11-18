"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Users } from "lucide-react"

interface OpenGameModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (maxPlayers: number) => void
  isLoading: boolean
}

export function OpenGameModal({ isOpen, onClose, onConfirm, isLoading }: OpenGameModalProps) {
  const [additionalPlayers, setAdditionalPlayers] = useState("2")

  if (!isOpen) return null

  const handleConfirm = () => {
    const num = parseInt(additionalPlayers)
    if (isNaN(num) || num < 1 || num > 19) return
    onConfirm(num + 1) // +1 for the host
    setAdditionalPlayers("2")
  }

  const handleClose = () => {
    setAdditionalPlayers("2")
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111a22] rounded-2xl shadow-xl max-w-md w-full border border-white/10">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-lime-400" />
            Open for Players
          </h2>
          <button onClick={handleClose} className="p-1 hover:bg-white/5 rounded-lg text-slate-400" disabled={isLoading}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-slate-300">
            How many additional players do you want to invite? (You are already included as the host)
          </p>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">
              Additional Players
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAdditionalPlayers(String(Math.max(1, parseInt(additionalPlayers || "1") - 1)))}
                className="w-10 h-10 rounded-lg border border-white/10 bg-[#121b24] text-white font-bold hover:bg-white/5"
                disabled={isLoading}
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max="19"
                value={additionalPlayers}
                onChange={(e) => setAdditionalPlayers(e.target.value)}
                className="flex-1 bg-[#121b24] border border-white/10 rounded-lg px-4 py-2 text-center text-white text-lg font-bold focus:border-lime-400 focus:outline-none"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setAdditionalPlayers(String(Math.min(19, parseInt(additionalPlayers || "1") + 1)))}
                className="w-10 h-10 rounded-lg border border-white/10 bg-[#121b24] text-white font-bold hover:bg-white/5"
                disabled={isLoading}
              >
                +
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Total players: {parseInt(additionalPlayers || "1") + 1} (including you)
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-white/10 text-white hover:bg-white/5"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-lime-400 font-bold text-black hover:bg-lime-300"
              onClick={handleConfirm}
              disabled={isLoading || !additionalPlayers || parseInt(additionalPlayers) < 1}
            >
              {isLoading ? (
                <>
                  <span className="inline-block h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                  Opening...
                </>
              ) : (
                "Open for Players"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}