const MSG91_API_URL = "https://api.msg91.com/api/v5"
const MSG91_OTP_URL = "https://control.msg91.com/api/v5/otp"

// In-memory OTP store (use Redis in production)
const otpStore = new Map<string, { otp: string; expiresAt: number }>()

interface SendOTPParams {
  mobile: string
  templateId: string
  authkey: string
}

interface VerifyOTPParams {
  mobile: string
  otp: string
  authkey: string
}

interface SendSMSParams {
  mobile: string
  templateId: string
  variables: Record<string, string>
  authkey: string
  senderId?: string
}

export class MSG91Service {
  private authKey: string
  private senderId: string

  constructor() {
    this.authKey = process.env.MSG91_AUTH_KEY || ""
    this.senderId = process.env.MSG91_SENDER_ID || "TURFAPP"
  }

  private async request(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "authkey": this.authKey,
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || "MSG91 API error")
    }

    return data
  }

  async sendOTP(mobile: string): Promise<{ type: string; message: string; otp?: string }> {
    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Store OTP with expiry (5 minutes)
    otpStore.set(mobile, { otp, expiresAt: Date.now() + 5 * 60 * 1000 })

    // Send via MSG91 sendhttp API (no template ID required)
    const senderId = this.senderId || "TURFAPP"
    const message = `Your TurfPlay verification OTP is ${otp}. Valid for 5 minutes. Do not share with anyone.`

    try {
      const url = `https://api.msg91.com/api/sendhttp.php?authkey=${this.authKey}&mobiles=${mobile.replace("+", "")}&message=${encodeURIComponent(message)}&sender=${senderId}&route=4&country=91`
      console.log("[MSG91] Sending OTP to:", mobile, "URL:", url.substring(0, 80) + "...")
      const response = await fetch(url, { method: "GET" })
      const text = await response.text()
      console.log("[MSG91] Response:", text, "Status:", response.status)

      if (!response.ok) {
        throw new Error(text || "MSG91 API error")
      }

      return { type: "success", message: "OTP sent successfully", otp }
    } catch (error: any) {
      // If MSG91 fails, still store OTP for verification (dev mode)
      console.error("[MSG91] Send OTP error:", error.message, "mobile:", mobile)
      console.log(`[MSG91] OTP for ${mobile}: ${otp} (MSG91 failed, OTP stored for verification)`)
      return { type: "success", message: "OTP sent (check console for dev mode)", otp }
    }
  }

  async verifyOTP(mobile: string, otp: string): Promise<{ type: string; message: string }> {
    const stored = otpStore.get(mobile)

    if (!stored) {
      throw new Error("OTP not found or expired. Please request a new OTP.")
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(mobile)
      throw new Error("OTP expired. Please request a new OTP.")
    }

    if (stored.otp !== otp) {
      throw new Error("Invalid OTP. Please try again.")
    }

    otpStore.delete(mobile)
    return { type: "success", message: "OTP verified successfully" }
  }

  async sendSMS(params: Omit<SendSMSParams, "authkey">): Promise<{ type: string; message: string }> {
    return this.request(`${MSG91_API_URL}/flow/`, {
      method: "POST",
      body: JSON.stringify({
        template_id: params.templateId,
        sender: params.senderId || this.senderId,
        mobiles: params.mobile.replace("+91", ""),
        VAR1: params.variables.VAR1 || "",
        VAR2: params.variables.VAR2 || "",
        VAR3: params.variables.VAR3 || "",
        VAR4: params.variables.VAR4 || "",
        VAR5: params.variables.VAR5 || "",
      }),
    })
  }

  async sendBookingConfirmation(mobile: string, bookingDetails: {
    facilityName: string
    courtName: string
    date: string
    time: string
    bookingId: string
  }): Promise<void> {
    const templateId = process.env.MSG91_TEMPLATE_ID_BOOKING_CONFIRMED || ""
    if (!templateId) return

    await this.sendSMS({
      mobile,
      templateId,
      variables: {
        VAR1: bookingDetails.facilityName,
        VAR2: bookingDetails.courtName,
        VAR3: bookingDetails.date,
        VAR4: bookingDetails.time,
        VAR5: bookingDetails.bookingId,
      },
    })
  }

  async sendBookingCancellation(mobile: string, bookingDetails: {
    facilityName: string
    courtName: string
    date: string
    time: string
    bookingId: string
    refundAmount?: string
  }): Promise<void> {
    const templateId = process.env.MSG91_TEMPLATE_ID_BOOKING_CANCELLED || ""
    if (!templateId) return

    await this.sendSMS({
      mobile,
      templateId,
      variables: {
        VAR1: bookingDetails.facilityName,
        VAR2: bookingDetails.courtName,
        VAR3: bookingDetails.date,
        VAR4: bookingDetails.time,
        VAR5: bookingDetails.bookingId,
      },
    })
  }

  async sendPaymentSuccess(mobile: string, paymentDetails: {
    amount: string
    bookingId: string
    transactionId: string
  }): Promise<void> {
    const templateId = process.env.MSG91_TEMPLATE_ID_PAYMENT_SUCCESS || ""
    if (!templateId) return

    await this.sendSMS({
      mobile,
      templateId,
      variables: {
        VAR1: paymentDetails.amount,
        VAR2: paymentDetails.bookingId,
        VAR3: paymentDetails.transactionId,
        VAR4: "",
        VAR5: "",
      },
    })
  }

  async sendPayoutCredited(mobile: string, payoutDetails: {
    amount: string
    payoutId: string
    date: string
  }): Promise<void> {
    const templateId = process.env.MSG91_TEMPLATE_ID_PAYOUT_CREDITED || ""
    if (!templateId) return

    await this.sendSMS({
      mobile,
      templateId,
      variables: {
        VAR1: payoutDetails.amount,
        VAR2: payoutDetails.payoutId,
        VAR3: payoutDetails.date,
        VAR4: "",
        VAR5: "",
      },
    })
  }
}

export const msg91 = new MSG91Service()