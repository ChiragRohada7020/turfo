import { makeWASocket, useMultiFileAuthState as createMultiFileAuthState, DisconnectReason, WASocket } from "baileys"
import { Boom } from "@hapi/boom"
import { writeFileSync, existsSync, mkdirSync, rmSync } from "fs"
import { join } from "path"
import QRCode from "qrcode"

const WHATSAPP_SESSION_DIR = join(process.cwd(), ".whatsapp_sessions")

interface WhatsAppOtpSession {
  otp: string
  expiresAt: number
}

const whatsappOtpStore = new Map<string, WhatsAppOtpSession>()

let sock: WASocket | null = null
let isConnecting = false
let qrCode: string | null = null
let isAuthenticated = false
let baileysError: string | null = null
let pendingSaveCreds: (() => Promise<void>) | null = null

export function ensureSessionDir() {
  if (!existsSync(WHATSAPP_SESSION_DIR)) {
    mkdirSync(WHATSAPP_SESSION_DIR, { recursive: true })
  }
}

export function getQrCode() {
  return qrCode
}

export function isWhatsAppAuthenticated() {
  return isAuthenticated
}

export function getWhatsAppError() {
  return baileysError
}

export async function connectWhatsApp(force = false) {
  if (force) {
    await disconnectWhatsApp()
  }
  if (sock || isConnecting) return sock
  isConnecting = true
  ensureSessionDir()

  try {
    const { state, saveCreds } = await createMultiFileAuthState(WHATSAPP_SESSION_DIR)
    pendingSaveCreds = saveCreds

    const newSock = makeWASocket({
      printQRInTerminal: false,
      auth: state,
    }) as WASocket

    newSock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update
      if (qr) {
        let cleanQr = qr
        const prefix = "https://wa.me/settings/linked_devices#"
        if (cleanQr.startsWith(prefix)) {
          cleanQr = cleanQr.slice(prefix.length)
        }
        qrCode = cleanQr
        isAuthenticated = false
        baileysError = null
        console.log("[Baileys] QR code received, length:", qrCode.length)
      }
      if (connection === "open") {
        isAuthenticated = true
        qrCode = null
        baileysError = null
        console.log("[Baileys] WhatsApp connected")
      }
      if (connection === "close") {
        const reason = ((lastDisconnect?.error as Boom)?.output?.statusCode as number) || "unknown"
        isAuthenticated = false
        console.log(`[Baileys] WhatsApp disconnected due to ${reason}`)
        // After pairing (515 restart required), save creds then reconnect with delay
        if (reason !== DisconnectReason.loggedOut) {
          ;(async () => {
            try {
              if (pendingSaveCreds) {
                await pendingSaveCreds()
                console.log("[Baileys] Credentials saved to disk")
              }
            } catch (e) {
              console.error("[Baileys] Failed to save creds:", e)
            }
            // Wait longer so WhatsApp server releases the old session
            setTimeout(() => {
              sock = null
              isConnecting = false
              connectWhatsApp().catch((err) => {
                baileysError = err.message
                console.error("[Baileys] reconnect failed:", err.message)
              })
            }, 8000)
          })()
        } else {
          sock = null
          isConnecting = false
        }
      }
    })

    newSock.ev.on("creds.update", async () => {
      if (pendingSaveCreds) {
        try { await pendingSaveCreds() } catch (e) { console.error("[Baileys] creds.update save failed:", e) }
      }
    })

    sock = newSock
    isConnecting = false
    baileysError = null
    return sock
  } catch (err: any) {
    isConnecting = false
    baileysError = err.message
    console.error("[Baileys] connectWhatsApp failed:", err.message)
    throw err
  }
}

export async function disconnectWhatsApp() {
  if (sock) {
    try { await (sock as any).end() } catch (e) { console.error("[Baileys] end error:", e) }
    sock = null
  }
  isAuthenticated = false
  qrCode = null
  isConnecting = false
  baileysError = null
  pendingSaveCreds = null
}

export async function forceNewQR() {
  try { rmSync(WHATSAPP_SESSION_DIR, { recursive: true, force: true }) } catch (e) { /* ignore */ }
  await disconnectWhatsApp()
  return connectWhatsApp(true)
}

export async function sendWhatsAppMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const socket = await connectWhatsApp()
    if (!isAuthenticated || !socket) {
      return { success: false, error: "WhatsApp not authenticated. Scan QR code first." }
    }

    const jid = `${to.replace("+", "").replace(/\s/g, "")}@s.whatsapp.net`
    const result = await socket.sendMessage(jid, { text: message })
    return { success: true, messageId: (result as any)?.key?.id || "" }
  } catch (error: any) {
    console.error("[Baileys] Send message error:", error.message)
    return { success: false, error: error.message }
  }
}

export async function sendBookingNotification(ownerPhone: string, booking: {
  facilityName: string
  courtName?: string | null
  playerName: string
  playerPhone: string
  startTime: Date
  endTime: Date
  totalPrice: number
  duration: number
  bookingId: string
  notes?: string | null
  scannerUrl?: string | null
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const startIST = new Date(booking.startTime.getTime() + 5.5 * 60 * 60 * 1000)
  const endIST = new Date(booking.endTime.getTime() + 5.5 * 60 * 60 * 1000)

  const dateStr = startIST.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  const timeStr = `${startIST.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} - ${endIST.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`

  const scannerLine = booking.scannerUrl ? `📷 *Scan Player QR:* ${booking.scannerUrl}\n` : ""

  const message = `
🏟️ *New Booking Confirmed*

📍 *Facility:* ${booking.facilityName}
${booking.courtName ? `🏸 *Court:* ${booking.courtName}\n` : ""}
👤 *Player:* ${booking.playerName}
📱 *Player Phone:* ${booking.playerPhone}
📅 *Date:* ${dateStr}
🕒 *Time:* ${timeStr}
⏱️ *Duration:* ${booking.duration} minutes
💰 *Amount:* ₹${booking.totalPrice.toFixed(0)}
${booking.notes ? `📝 *Notes:* ${booking.notes}\n` : ""}
🔖 *Booking ID:* ${booking.bookingId}
${scannerLine}

Please prepare the court for the player.
🌐 *Website:* https://strikora.in
`.trim()

  return sendWhatsAppMessage(ownerPhone, message)
}

export async function sendBookingConfirmationToPlayer(playerPhone: string, booking: {
  facilityName: string
  courtName?: string | null
  facilityAddress?: string | null
  facilityLatitude?: number | null
  facilityLongitude?: number | null
  startTime: Date
  endTime: Date
  totalPrice: number
  duration: number
  bookingId: string
  verificationCode?: string | null
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const startIST = new Date(booking.startTime.getTime() + 5.5 * 60 * 60 * 1000)
  const endIST = new Date(booking.endTime.getTime() + 5.5 * 60 * 60 * 1000)

  const dateStr = startIST.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  const timeStr = `${startIST.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} - ${endIST.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`

  const mapsLink = booking.facilityLatitude && booking.facilityLongitude
    ? `https://www.google.com/maps/search/?api=1&query=${booking.facilityLatitude},${booking.facilityLongitude}`
    : null

  const message = `
✅ *Booking Confirmed*

🏟️ *Facility:* ${booking.facilityName}
${booking.courtName ? `🏸 *Court:* ${booking.courtName}\n` : ""}
📅 *Date:* ${dateStr}
🕒 *Time:* ${timeStr}
⏱️ *Duration:* ${booking.duration} minutes
💰 *Amount:* ₹${booking.totalPrice.toFixed(0)}
🔖 *Booking ID:* ${booking.bookingId}
${booking.verificationCode ? `🔐 *Verification Code:* ${booking.verificationCode}\n` : ""}
${booking.facilityAddress ? `📍 *Address:* ${booking.facilityAddress}\n` : ""}
${mapsLink ? `🗺️ *Location:* ${mapsLink}\n` : ""}

Show this QR code at the facility. Enjoy your game!
🌐 *Website:* https://strikora.in
`.trim()

  try {
    const socket = await connectWhatsApp()
    if (!socket) {
      return { success: false, error: "WhatsApp not connected" }
    }

    const jid = `${playerPhone.replace("+", "").replace(/\s/g, "")}@s.whatsapp.net`

    // Generate QR code image from booking verification code
    const qrData = booking.verificationCode || booking.bookingId
    const qrBuffer = await QRCode.toBuffer(qrData, {
      width: 300,
      margin: 2,
      color: { dark: "#000000ff", light: "#FFFFFFFF" },
    })

    const result = await socket.sendMessage(jid, {
      image: qrBuffer,
      caption: message,
    })

    return { success: true, messageId: (result as any)?.key?.id || "" }
  } catch (error: any) {
    console.error("[Baileys] Send booking QR error:", error.message)
    return { success: false, error: error.message }
  }
}

export async function sendBookingCancellationToPlayer(playerPhone: string, booking: {
  facilityName: string
  courtName?: string | null
  startTime: Date
  endTime: Date
  totalPrice: number
  duration: number
  bookingId: string
  cancelledBy: string
  reason?: string | null
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const startIST = new Date(booking.startTime.getTime() + 5.5 * 60 * 60 * 1000)
  const endIST = new Date(booking.endTime.getTime() + 5.5 * 60 * 60 * 1000)

  const dateStr = startIST.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  const timeStr = `${startIST.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} - ${endIST.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`

  const message = `
❌ *Booking Cancelled*

🏟️ *Facility:* ${booking.facilityName}
${booking.courtName ? `🏸 *Court:* ${booking.courtName}\n` : ""}
📅 *Date:* ${dateStr}
🕒 *Time:* ${timeStr}
⏱️ *Duration:* ${booking.duration} minutes
💰 *Amount:* ₹${booking.totalPrice.toFixed(0)}
🔖 *Booking ID:* ${booking.bookingId}
🚫 *Cancelled by:* ${booking.cancelledBy}
${booking.reason ? `📝 *Reason:* ${booking.reason}\n` : ""}

You can book another slot anytime.
🌐 *Website:* https://strikora.in
`.trim()

  return sendWhatsAppMessage(playerPhone, message)
}

export async function sendBookingCancellationToOwner(ownerPhone: string, booking: {
  facilityName: string
  courtName?: string | null
  playerName: string
  playerPhone: string
  startTime: Date
  endTime: Date
  totalPrice: number
  duration: number
  bookingId: string
  reason?: string | null
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const startIST = new Date(booking.startTime.getTime() + 5.5 * 60 * 60 * 1000)
  const endIST = new Date(booking.endTime.getTime() + 5.5 * 60 * 60 * 1000)

  const dateStr = startIST.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  const timeStr = `${startIST.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} - ${endIST.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`

  const message = `
❌ *Booking Cancelled by Player*

🏟️ *Facility:* ${booking.facilityName}
${booking.courtName ? `🏸 *Court:* ${booking.courtName}\n` : ""}
👤 *Player:* ${booking.playerName}
📱 *Player Phone:* ${booking.playerPhone}
📅 *Date:* ${dateStr}
🕒 *Time:* ${timeStr}
⏱️ *Duration:* ${booking.duration} minutes
💰 *Amount:* ₹${booking.totalPrice.toFixed(0)}
🔖 *Booking ID:* ${booking.bookingId}
${booking.reason ? `📝 *Reason:* ${booking.reason}\n` : ""}

The slot is now available for other players.
🌐 *Website:* https://strikora.in
`.trim()

  return sendWhatsAppMessage(ownerPhone, message)
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function sendWhatsAppOTP(to: string): Promise<{ type: string; message: string; otp?: string }> {
  const otp = generateOTP()
  whatsappOtpStore.set(to, { otp, expiresAt: Date.now() + 5 * 60 * 1000 })

  const message = `*Strikora Verification*\nYour OTP code is *${otp}*. Valid for 5 minutes. Do not share with anyone.\n\n🌐 Visit us: https://strikora.in`

  const result = await sendWhatsAppMessage(to, message)
  if (!result.success) {
    whatsappOtpStore.delete(to)
    return { type: "error", message: result.error || "Failed to send WhatsApp OTP" }
  }

  return { type: "success", message: "WhatsApp OTP sent successfully", otp }
}

export async function verifyWhatsAppOTP(to: string, otp: string): Promise<{ type: string; message: string }> {
  const stored = whatsappOtpStore.get(to)

  if (!stored) {
    throw new Error("OTP not found or expired. Please request a new OTP.")
  }

  if (Date.now() > stored.expiresAt) {
    whatsappOtpStore.delete(to)
    throw new Error("OTP expired. Please request a new OTP.")
  }

  if (stored.otp !== otp) {
    throw new Error("Invalid OTP. Please try again.")
  }

  whatsappOtpStore.delete(to)
  return { type: "success", message: "WhatsApp OTP verified successfully" }
}

// Auto-start WhatsApp so the session stays alive (persistent pm2 process).
// Skipped during build/export to avoid hanging compilation.
const isBuildOrExport = /^(phase-production-build|phase-export)$/.test(process.env.NEXT_PHASE || "")
if (typeof window === "undefined" && !isBuildOrExport) {
  connectWhatsApp().catch((err) => {
    baileysError = err.message
    console.error("[Baileys] auto-connect failed:", err.message)
  })
}
