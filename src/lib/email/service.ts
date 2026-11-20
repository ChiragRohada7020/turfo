import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
})

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[Email] SMTP not configured; skipping email")
    return { success: false, message: "SMTP not configured" }
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    })
    return { success: true, message: "Email sent" }
  } catch (error: any) {
    console.error("[Email] Send failed:", error.message)
    return { success: false, message: error.message }
  }
}

export async function sendWelcomeEmail(to: string, name?: string | null) {
  const html = `
  <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f0fdf4;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.08)">
      <div style="background:linear-gradient(135deg,#16a34a,#059669);padding:32px 24px;text-align:center;color:#fff">
        <h1 style="margin:0;font-size:28px;font-weight:900;letter-spacing:-0.5px">Strikora</h1>
        <p style="margin:8px 0 0;font-size:14px;opacity:.9">Book · Play · Compete</p>
      </div>
      <div style="padding:32px 24px">
        <h2 style="margin:0 0 12px;font-size:22px;color:#0f172a">Welcome${name ? ", " + name : ""}! 🎉</h2>
        <p style="margin:0 0 16px;color:#475569;line-height:1.6">Thanks for joining Strikora. Your account is ready — discover nearby turfs, book instantly, join tournaments, and earn rewards.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0">
          <div style="background:#f0fdf4;border-radius:12px;padding:14px;text-align:center">
            <div style="font-size:22px">🏟️</div>
            <div style="font-size:12px;font-weight:700;color:#166534;margin-top:4px">Book Turfs</div>
          </div>
          <div style="background:#f0fdf4;border-radius:12px;padding:14px;text-align:center">
            <div style="font-size:22px">🏆</div>
            <div style="font-size:12px;font-weight:700;color:#166534;margin-top:4px">Tournaments</div>
          </div>
          <div style="background:#f0fdf4;border-radius:12px;padding:14px;text-align:center">
            <div style="font-size:22px">🎁</div>
            <div style="font-size:12px;font-weight:700;color:#166534;margin-top:4px">Offers & Rewards</div>
          </div>
          <div style="background:#f0fdf4;border-radius:12px;padding:14px;text-align:center">
            <div style="font-size:22px">👥</div>
            <div style="font-size:12px;font-weight:700;color:#166534;margin-top:4px">Find Players</div>
          </div>
        </div>
        <div style="text-align:center;margin:24px 0">
          <a href="https://strikora.in/search" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;padding:12px 28px;border-radius:12px;text-decoration:none">Book Your First Game</a>
        </div>
        <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center">Need help? Reply to this email — Team Strikora</p>
      </div>
    </div>
  </div>`
  return sendEmail(to, "Welcome to Strikora! 🎉", html)
}

export async function sendOTPEmail(to: string, otp: string) {
  const html = `
  <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f0fdf4;padding:24px">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.08)">
      <div style="background:linear-gradient(135deg,#16a34a,#059669);padding:24px;text-align:center;color:#fff">
        <h1 style="margin:0;font-size:24px;font-weight:900">Strikora</h1>
      </div>
      <div style="padding:32px 24px;text-align:center">
        <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a">Your verification code</h2>
        <p style="margin:0 0 20px;color:#64748b;font-size:14px">Use this code to verify your account</p>
        <div style="display:inline-block;background:#f0fdf4;border:2px dashed #16a34a;border-radius:16px;padding:16px 32px">
          <span style="font-size:32px;font-weight:900;letter-spacing:8px;color:#166534">${otp}</span>
        </div>
        <p style="margin:20px 0 0;color:#94a3b8;font-size:12px">Valid for 5 minutes. Do not share this code.</p>
      </div>
    </div>
  </div>`
  return sendEmail(to, "Your Strikora OTP", html)
}