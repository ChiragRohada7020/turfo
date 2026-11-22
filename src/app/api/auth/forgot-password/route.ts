import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { sendEmail } from "@/lib/email/service"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user) {
      // Don't reveal existence
      return NextResponse.json({ success: true, message: "If an account exists, a reset link was sent." })
    }

    const token = Math.floor(100000 + Math.random() * 900000).toString()
    const expiry = new Date(Date.now() + 10 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    })

    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f0fdf4;padding:24px">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.08)">
          <div style="background:linear-gradient(135deg,#16a34a,#059669);padding:32px 24px;text-align:center;color:#fff">
            <h1 style="margin:0;font-size:28px;font-weight:900">Strikora</h1>
          </div>
          <div style="padding:32px 24px">
            <h2 style="margin:0 0 12px;font-size:22px;color:#0f172a">Reset your password</h2>
            <p style="margin:0 0 16px;color:#475569;line-height:1.6">Use this OTP to reset your password. It expires in 10 minutes.</p>
            <div style="display:inline-block;background:#f0fdf4;border:2px dashed #16a34a;border-radius:16px;padding:16px 32px;margin:16px 0">
              <span style="font-size:32px;font-weight:900;letter-spacing:8px;color:#166534">${token}</span>
            </div>
            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center">If you didn't request this, ignore this email.</p>
          </div>
        </div>
      </div>`
    await sendEmail(user.email, "Reset your Strikora password", html)

    return NextResponse.json({ success: true, message: "If an account exists, a reset link was sent." })
  } catch (error) {
    console.error("[Forgot Password] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
