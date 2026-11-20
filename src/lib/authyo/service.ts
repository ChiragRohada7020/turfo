const AUTHYO_BASE = "https://app.authyo.io"

interface OtpSession {
  maskId: string
  expiresAt: number
}

const otpStore = new Map<string, OtpSession>()

export class AuthYoService {
  private clientId: string
  private clientSecret: string
  private origin: string

  constructor() {
    this.clientId = process.env.AUTHYO_CLIENT_ID || ""
    this.clientSecret = process.env.AUTHYO_CLIENT_SECRET || ""
    this.origin = process.env.AUTHYO_ORIGIN || ""
  }

  private headers() {
    const h: Record<string, string> = {
      clientId: this.clientId,
      clientSecret: this.clientSecret,
    }
    if (this.origin) h.origin = this.origin
    return h
  }

  async sendOTP(mobile: string): Promise<{ success: boolean; message: string; maskId?: string }> {
    const to = mobile.replace("+", "")
    const url = `${AUTHYO_BASE}/api/v1/auth/sendotp?to=${encodeURIComponent(to)}&expiry=300&otpLength=6&authWay=SMS`
    try {
      const res = await fetch(url, { method: "GET", headers: this.headers() })
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.message || "AuthYo send OTP failed")
      }
      const maskId = data?.data?.results?.[0]?.maskId
      if (!maskId) throw new Error("No maskId returned")
      otpStore.set(mobile, { maskId, expiresAt: Date.now() + 5 * 60 * 1000 })
      return { success: true, message: data.message || "OTP sent", maskId }
    } catch (error: any) {
      console.error("[AuthYo] Send OTP error:", error.message)
      return { success: false, message: error.message }
    }
  }

  async verifyOTP(mobile: string, otp: string): Promise<{ success: boolean; message: string }> {
    const session = otpStore.get(mobile)
    if (!session) throw new Error("OTP not found or expired. Please request a new OTP.")
    if (Date.now() > session.expiresAt) {
      otpStore.delete(mobile)
      throw new Error("OTP expired. Please request a new OTP.")
    }
    const url = `${AUTHYO_BASE}/api/v1/auth/verifyotp?maskId=${encodeURIComponent(session.maskId)}&otp=${encodeURIComponent(otp)}`
    const res = await fetch(url, { method: "GET", headers: this.headers() })
    const data = await res.json()
    if (!data.success) {
      throw new Error(data.message || "Invalid OTP")
    }
    otpStore.delete(mobile)
    return { success: true, message: data.message || "OTP verified" }
  }
}

export const authyo = new AuthYoService()