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

    if (staleBookings.length === 0) {
      return NextResponse.json({ cancelled: 0 })
    }

    const bookingIds = staleBookings.map((b) => b.id)

    // Cancel bookings and their pending payments
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

    console.log(`[Auto-cancel] Cancelled ${staleBookings.length} stale pending bookings`)

    return NextResponse.json({ cancelled: staleBookings.length })
  } catch (error) {
    console.error("[Auto-cancel] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}