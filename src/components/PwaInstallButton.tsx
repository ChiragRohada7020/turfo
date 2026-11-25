"use client"

import { useEffect, useState } from "react"

export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setShow(false)
  }

  if (!show) return null

  return (
    <button
      onClick={install}
      className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white shadow hover:bg-slate-800"
    >
      Download App
    </button>
  )
}
