"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { X, QrCode, ShieldCheck, MapPin, CalendarDays, Clock3, User, Trophy } from "lucide-react"
import { formatCurrency, formatDate, formatTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface QRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  booking: any
}

export function QRCodeModal({ isOpen, onClose, booking }: QRCodeModalProps) {
  const [svgContent, setSvgContent] = useState<string>("")

  useEffect(() => {
    if (!isOpen || !booking?.verificationCode) return
    QRCode.toString(booking.verificationCode, { type: "svg", width: 280, margin: 2 })
      .then((svg: string) => setSvgContent(svg))
      .catch((err: any) => console.error("QR generation failed:", err))
  }, [isOpen, booking?.verificationCode])

  if (!isOpen || !booking) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-lime-400/20 bg-gradient-to-br from-[#0c1b15] to-[#06110e] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-400/10">
              <QrCode className="h-5 w-5 text-lime-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Booking Verification</h2>
              <p className="text-[10px] text-slate-500">Show this to the turf owner</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center px-6 py-8">
          <div className="rounded-2xl border-4 border-lime-400/30 bg-white p-4 shadow-[0_0_40px_rgba(163,230,53,0.15)]">
            {svgContent ? (
              <div
                className="h-64 w-64 sm:h-72 sm:w-72 [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            ) : (
              <div className="flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" />
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            Scan this QR code to verify your booking
          </p>
        </div>

        {/* Booking details */}
        <div className="border-t border-white/[0.08] px-6 py-5">
          <h3 className="mb-3 text-sm font-bold text-white">Booking Details</h3>
          <div className="grid grid-cols-2 gap-3">
            <DetailItem
              icon={<Trophy className="h-4 w-4 text-lime-400" />}
              label="Facility"
              value={booking.facility?.name || "Turf booking"}
            />
            <DetailItem
              icon={<MapPin className="h-4 w-4 text-lime-400" />}
              label="Location"
              value={booking.facility?.city || "—"}
            />
            <DetailItem
              icon={<CalendarDays className="h-4 w-4 text-lime-400" />}
              label="Date"
              value={formatDate(booking.startTime)}
            />
            <DetailItem
              icon={<Clock3 className="h-4 w-4 text-lime-400" />}
              label="Time"
              value={`${formatTime(booking.startTime)} – ${formatTime(booking.endTime)}`}
            />
            <DetailItem
              icon={<User className="h-4 w-4 text-lime-400" />}
              label="Court"
              value={booking.court?.name || "—"}
            />
            <DetailItem
              icon={<ShieldCheck className="h-4 w-4 text-lime-400" />}
              label="Amount"
              value={formatCurrency(booking.totalPrice)}
            />
          </div>

          <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Verification Code
            </p>
            <p className="mt-1 break-all font-mono text-xs text-slate-300">
              {booking.verificationCode}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.08] px-6 py-4">
          <Button
            onClick={onClose}
            className="h-11 w-full rounded-lg bg-lime-400 font-bold text-black hover:bg-lime-300"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  )
}
