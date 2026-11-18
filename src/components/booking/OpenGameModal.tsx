"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Users, UserPlus } from "lucide-react"

interface OpenGameModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (maxPlayers: number, offlineFriends: number) => void
  isLoading: boolean
  currentMaxPlayers?: number
}

export function OpenGameModal({ isOpen, onClose, onConfirm, isLoading, currentMaxPlayers }: OpenGameModalProps) {
  const [offlineFriends, setOfflineFriends] = useState("0")
  const [onlinePlayers, setOnlinePlayers] = useState("2")

  if (!isOpen) return null

  const offline = Math.max(0, parseInt(offlineFriends || "0"))
  const online = Math.max(1, parseInt(onlinePlayers || "1"))
  const total = 1 + offline + online // 1 for host

  const handleConfirm = () => {
    if (online < 1 || online > 19) return
    onConfirm(online, offline)
    setOfflineFriends("0")
    setOnlinePlayers("2")
  }

  const handleClose = () => {
    setOfflineFriends("0")
    setOnlinePlayers("2")
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111a22] rounded-2xl shadow-xl max-w-md w-full border border-white/10 p-0">
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
            You are the host. Add your offline friends and specify how many
            additional online players you want to invite.
          </p>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">
              Offline friends coming (not on TurfPlay)
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOfflineFriends(String(Math.max(0, parseInt(offlineFriends || "0") - 1)))}
                className="w-10 h-10 rounded-lg border border-white/10 bg-[#121b24] text-white font-bold hover:bg-white/5"
                disabled={isLoading}
              >
                -
              </button>
              <input
                type="number"
                min="0"
                max="19"
                value={offlineFriends}
                onChange={(e) => setOfflineFriends(e.target.value)}
                className="flex-1 bg-[#121b24] border border-white/10 rounded-lg px-4 py-2 text-center text-white text-lg font-bold focus:border-lime-400 focus:outline-none"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setOfflineFriends(String(Math.min(19, parseInt(offlineFriends || "0") + 1)))}
                className="w-10 h-10 rounded-lg border border-white/10 bg-[#121b24] text-white font-bold hover:bg-white/5"
                disabled={isLoading}
              >
                +
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Friends who are not on TurfPlay but will be playing with you.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">
              Additional online players to find
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOnlinePlayers(String(Math.max(1, parseInt(onlinePlayers || "1") - 1)))}
                className="w-10 h-10 rounded-lg border border-white/10 bg-[#121b24] text-white font-bold hover:bg-white/5"
                disabled={isLoading}
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max="19"
                value={onlinePlayers}
                onChange={(e) => setOnlinePlayers(e.target.value)}
                className="flex-1 bg-[#121b24] border border-white/10 rounded-lg px-4 py-2 text-center text-white text-lg font-bold focus:border-lime-400 focus:outline-none"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setOnlinePlayers(String(Math.min(19, parseInt(onlinePlayers || "1") + 1)))}
                className="w-10 h-10 rounded-lg border border-white/10 bg-[#121b24] text-white font-bold hover:bg-white/5"
                disabled={isLoading}
              >
                +
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Players from TurfPlay who can join your game.
            </p>
          </div>

          <div className="rounded-xl border border-lime-400/20 bg-lime-400/5 p-3 text-center">
            <p className="text-sm font-bold text-lime-400">
              Total players: {total} (1 host + {offline} offline + {online} online)
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-white/10 text-white hover:bg-white/5 h-11 rounded-lg px-4"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-lime-400 font-bold text-black hover:bg-lime-300 h-11 rounded-lg px-4"
              onClick={handleConfirm}
              disabled={isLoading || !onlinePlayers || parseInt(onlinePlayers) < 1}
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
