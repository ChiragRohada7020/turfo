import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const verificationCode = body.verificationCode
    const action = body.action || "verify" // "verify" or "confirm"

    if (!verificationCode) {
      return NextResponse.json({ error: "Verification code required" }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({
      where: { verificationCode },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true, cibilScore: true } },
        facility: { select: { id: true, name: true, ownerId: true } },
        court: { select: { id: true, name: true } },
        payment: { select: { status: true, amount: true } },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 404 })
    }

    // Check if user is the facility owner or admin
    if (session.user.role !== "ADMIN" && booking.facility.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Check if booking is confirmed
    if (booking.status !== "CONFIRMED") {
      return NextResponse.json({
        error: `Booking is ${booking.status.toLowerCase()}, not confirmed`,
        booking: {
          id: booking.id,
          status: booking.status,
          user: booking.user,
          facility: booking.facility,
          court: booking.court,
          startTime: booking.startTime,
          endTime: booking.endTime,
        },
      }, { status: 400 })
    }

    // Check if booking time is valid (within 30 min before start to end)
    const now = new Date()
    const startTime = new Date(booking.startTime)
    const endTime = new Date(booking.endTime)
    const thirtyMinBefore = new Date(startTime.getTime() - 30 * 60 * 1000)

    if (now < thirtyMinBefore) {
      return NextResponse.json({
        error: "Booking not yet active. Please wait until 30 minutes before the start time.",
        booking: {
          id: booking.id,
          status: booking.status,
          user: booking.user,
          facility: booking.facility,
          court: booking.court,
          startTime: booking.startTime,
          endTime: booking.endTime,
        },
      }, { status: 400 })
    }

    if (now > endTime) {
      return NextResponse.json({
        error: "Booking has expired",
        booking: {
          id: booking.id,
          status: booking.status,
          user: booking.user,
          facility: booking.facility,
          court: booking.court,
          startTime: booking.startTime,
          endTime: booking.endTime,
        },
      }, { status: 400 })
    }

    // If action is "confirm", mark as completed and update CIBIL
    if (action === "confirm") {
      await prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: "COMPLETED" },
        })

        // Increase CIBIL score for completing a booking
        await tx.user.update({
          where: { id: booking.userId },
          data: { cibilScore: { increment: 10 } },
        })
      })

      return NextResponse.json({
        success: true,
        message: "Booking completed successfully",
        booking: {
          id: booking.id,
          status: "COMPLETED",
          user: booking.user,
          facility: booking.facility,
          court: booking.court,
          startTime: booking.startTime,
          endTime: booking.endTime,
          payment: booking.payment,
        },
      })
    }

    // Otherwise just verify (return booking details)
    return NextResponse.json({
      success: true,
      message: "Booking verified. Click OK to confirm completion.",
      booking: {
        id: booking.id,
        status: booking.status,
        user: booking.user,
        facility: booking.facility,
        court: booking.court,
        startTime: booking.startTime,
        endTime: booking.endTime,
        payment: booking.payment,
      },
    })
  } catch (error) {
    console.error("[Verify Booking] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}