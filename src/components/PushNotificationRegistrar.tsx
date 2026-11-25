"use client"

import { useEffect, useState } from "react"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export default function PushNotificationRegistrar() {
  const [permission, setPermission] = useState<string>("default")

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      if ("Notification" in window) setPermission(Notification.permission)
      // auto-subscribe if permission already granted
      if (Notification.permission === "granted") await subscribe(reg)
    }).catch(() => {})
  }, [])

  const subscribe = async (reg: ServiceWorkerRegistration) => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) return
    try {
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      })
    } catch (e) {
      console.error("Push subscribe failed", e)
    }
  }

  const enable = async () => {
    if (!("Notification" in window)) return
    const p = await Notification.requestPermission()
    setPermission(p)
    if (p === "granted") {
      const reg = await navigator.serviceWorker.ready
      await subscribe(reg)
      new Notification("Strikora", { body: "Notifications enabled!", icon: "/placeholder.svg" })
    }
  }

  if (permission === "granted") return null

  return (
    <button
      onClick={enable}
      className="fixed bottom-4 right-4 z-50 rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-orange-400"
    >
      Enable Notifications
    </button>
  )
}
