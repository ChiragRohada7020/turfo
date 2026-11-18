"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"

interface QRCodeDisplayProps {
  value: string
  size?: number
}

export function QRCodeDisplay({ value, size = 128 }: QRCodeDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string>("")

  useEffect(() => {
    QRCode.toDataURL(value, { width: size, margin: 1 })
      .then(setDataUrl)
      .catch(console.error)
  }, [value, size])

  if (!dataUrl) return <div className="w-32 h-32 bg-white/5 animate-pulse rounded" />

  return (
    <img
      src={dataUrl}
      alt="Booking QR Code"
      width={size}
      height={size}
      className="rounded-lg"
    />
  )
}