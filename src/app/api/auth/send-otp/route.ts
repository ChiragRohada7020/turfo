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

    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    // Validate phone format (Indian numbers)
    const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json({ error: "Invalid Indian phone number format" }, { status: 400 })
    }

    // Normalize phone number
    const normalizedPhone = phone.startsWith("+91") ? phone : phone.startsWith("91") ? `+${phone}` : `+91${phone}`

    // Check if phone is already verified for another user
    const existingUser = await prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
        isPhoneVerified: true,
        NOT: { id: session.user.id },
      },
    })

    if (existingUser) {
      return NextResponse.json({ error: "This phone number is already verified with another account" }, { status: 400 })
    }

    // Send OTP via MSG91
    await msg91.sendOTP(normalizedPhone)

    return NextResponse.json({ success: true, message: "OTP sent successfully" })
  } catch (error) {
    console.error("Send OTP error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send OTP" },
      { status: 500 }
    )
  }
}