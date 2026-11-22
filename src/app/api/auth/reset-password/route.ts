import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    const { email, otp, password } = await req.json()
    if (!email || !otp || !password) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user || !user.resetToken || !user.resetTokenExpiry) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 })
    }
    if (user.resetToken !== otp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 })
    }
    if (user.resetTokenExpiry < new Date()) {
      return NextResponse.json({ error: "OTP expired" }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    })

    return NextResponse.json({ success: true, message: "Password reset successful" })
  } catch (error) {
    console.error("[Reset Password] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
