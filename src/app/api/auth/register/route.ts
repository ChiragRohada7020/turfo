import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { Role } from "@prisma/client"
import { sendWelcomeEmail } from "@/lib/email/service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, phone, role, phoneVerified, referralCode, city } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    // Validate role (only PLAYER or OWNER allowed via registration)
    const userRole = role === "OWNER" ? Role.OWNER : role === "SPONSOR" ? Role.SPONSOR : Role.PLAYER

    const normalizedPhone = phone ? (phone.startsWith("+91") ? phone.trim() : phone.startsWith("91") ? `+${phone.trim()}` : `+91${phone.trim().replace(/\D/g, "").slice(-10)}`) : null

    if (normalizedPhone) {
      const last10 = normalizedPhone.replace(/\D/g, "").slice(-10)
      const existingPhone = await prisma.user.findFirst({
        where: {
          role: userRole,
          phone: { in: [`+91${last10}`, `91${last10}`, last10, normalizedPhone] },
        },
      })
      if (existingPhone) return NextResponse.json({ error: "Phone number already registered for this role" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 })
    }

    // Players are auto-verified; owners require admin approval before login
    const isAutoVerified = userRole === Role.PLAYER

    const passwordHash = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        name: name?.trim() || null,
        email: email.toLowerCase(),
        passwordHash,
        phone: normalizedPhone,
        role: userRole,
        isPhoneVerified: phoneVerified === true,
        isVerified: isAutoVerified,
        city: city?.trim() || null,
      },
    })

    // Generate referral code
    await prisma.user.update({
      where: { id: user.id },
      data: { referralCode: `REF${user.id.slice(-6).toUpperCase()}` },
    })

    // Handle referral
    if (referralCode && userRole === Role.PLAYER) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: String(referralCode).trim().toUpperCase() } })
      if (referrer && referrer.id !== user.id) {
          await prisma.$transaction(async (tx) => {
            await tx.referral.create({
              data: { referrerId: referrer.id, refereeId: user.id, code: String(referralCode).trim().toUpperCase(), rewardPoints: 1000 },
            })
            await tx.user.update({ where: { id: user.id }, data: { referredById: referrer.id } })
            const { creditPoints } = await import("@/lib/tasks/reward")
            await creditPoints({ userId: referrer.id, points: 1000, description: "Referral reward", referenceId: `referral:${user.id}`, idempotencyKey: `referral:${user.id}`, type: "EARNED" }, tx)
            await tx.referral.update({ where: { refereeId: user.id }, data: { status: "REWARDED", completedAt: new Date(), rewardedAt: new Date() } })
          })
      }
    }

    // TODO: Send welcome email via SendGrid
    // TODO: Send welcome SMS via MSG91 if phone provided

    // Send welcome email (non-blocking)
    if (user.email) {
      sendWelcomeEmail(user.email, user.name).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    )
  }
}