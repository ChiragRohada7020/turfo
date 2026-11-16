import { NextRequest, NextResponse } from "next/server"
import { msg91 } from "@/lib/msg91/service"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { phone, otp } = await request.json()

    if (!phone || !otp) {
      return NextResponse.json({ error: "Phone number and OTP are required" }, { status: 400 })
    }

    // Normalize phone number
    const normalizedPhone = phone.startsWith("+91") ? phone : phone.startsWith("91") ? `+${phone}` : `+91${phone}`

    // Verify OTP via MSG91
    await msg91.verifyOTP(normalizedPhone, otp)

    // Update user with verified phone
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        phone: normalizedPhone,
        isPhoneVerified: true,
      },
    })

    return NextResponse.json({ success: true, message: "Phone verified successfully" })
  } catch (error) {
    console.error("Verify OTP error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid OTP" },
      { status: 400 }
    )
  }
}