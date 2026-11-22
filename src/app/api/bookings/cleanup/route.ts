import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    // Cancel bookings that are PENDING for more than 15 minutes without payment
    const staleTime = new Date(Date.now() - 1 * 60 * 1000) // 1 minute ago

    const staleBookings = await prisma.booking.findMany({
      where: {
        status: "PENDING",
        createdAt: { lt: staleTime },
        OR: [
          { payment: null },
          { payment: { status: "PENDING" } },
        ],
      },
      select: { id: true },
    })

    const bookingIds = staleBookings.map((b) => b.id)

    // Cancel bookings and their pending payments
    if (bookingIds.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.booking.updateMany({
          where: { id: { in: bookingIds } },
          data: { status: "CANCELLED" },
        })

        await tx.payment.updateMany({
          where: {
            bookingId: { in: bookingIds },
            status: "PENDING",
          },
          data: { status: "FAILED" },
        })
      })
    }

    // No-show penalty: confirmed bookings that expired without completion
    const expiredConfirmed = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        endTime: { lt: new Date() },
      },
      select: { id: true, userId: true },
    })

    if (expiredConfirmed.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.booking.updateMany({
          where: { id: { in: expiredConfirmed.map((b) => b.id) } },
          data: { status: "CANCELLED", notes: "No-show: booking not completed" },
        })
        const banUntil = new Date(Date.now() + 24 * 60 * 60 * 1000)
        for (const b of expiredConfirmed) {
          const user = await tx.user.findUnique({ where: { id: b.userId }, select: { role: true } })
          if (user?.role === "OWNER" || user?.role === "ADMIN") continue
          await tx.user.update({
            where: { id: b.userId },
            data: { cibilScore: { decrement: 75 }, bookingBanUntil: banUntil },
          })
        }
      })
    }

    console.log(`[Auto-cancel] Cancelled ${staleBookings.length} stale pending, ${expiredConfirmed.length} no-show bookings`)

    return NextResponse.json({ cancelled: staleBookings.length + expiredConfirmed.length })
  } catch (error) {
    console.error("[Auto-cancel] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}