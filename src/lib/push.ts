import prisma from "@/lib/prisma"

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:noreply@strikora.in"
  if (!vapidPublicKey || !vapidPrivateKey) return

  const webpushModule: any = await import("web-push")
  const webpush = webpushModule.default || webpushModule
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ icon: "/placeholder.svg", badge: "/placeholder.svg", ...payload })
      )
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
      }
    }
  }
}
