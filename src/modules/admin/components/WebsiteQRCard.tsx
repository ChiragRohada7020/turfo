"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"

const WEBSITE_URL = "https://strikora.in"

export function WebsiteQRCard() {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    generateQR()
  }, [])

  const generateQR = async () => {
    setLoading(true)
    try {
      const dataUrl = await QRCode.toDataURL(WEBSITE_URL, {
        width: 500,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
      setQrDataUrl(dataUrl)
    } catch (err) {
      console.error("QR generation failed:", err)
    } finally {
      setLoading(false)
    }
  }

  const downloadQR = () => {
    if (!qrDataUrl) return
    const link = document.createElement("a")
    link.download = "strikora-website-qr.png"
    link.href = qrDataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#131C2E] p-8 shadow-xl shadow-black/10 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-3 9-3 9H3s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white">Website QR Code</h3>
        <p className="text-sm text-slate-400">Scan to open Strikora</p>
      </div>

      <div className="mt-6 flex items-center justify-center">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-400 border-t-transparent mb-3" />
              <p className="text-xs text-slate-400">Generating QR...</p>
            </div>
          ) : qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Strikora Website QR"
              className="rounded-lg shadow-lg"
            />
          ) : null}
        </div>
      </div>

      {qrDataUrl && (
        <div className="mt-6 flex gap-3 justify-center">
          <button
            onClick={downloadQR}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl transition shadow-lg shadow-orange-500/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            Download PNG
          </button>
          <a
            href={WEBSITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 border border-white/10 hover:bg-white/5 text-white font-semibold rounded-xl transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" x2="21" y1="14" y2="14" />
            </svg>
            Visit Website
          </a>
        </div>
      )}

      <div className="mt-6 px-4">
        <div className="bg-[#17222d] rounded-lg p-3 border border-white/10">
          <p className="text-xs font-mono text-slate-400 break-all">{WEBSITE_URL}</p>
        </div>
      </div>
    </div>
  )
}
