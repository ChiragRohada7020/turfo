import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { fetchCashfreeOrder } from "@/lib/cashfree"
import { rateLimit } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Rate limit: 30 requests per minute per user
    const { allowed } = rateLimit(`status:${session.user.id}`, 30, 60000)
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const searchParams = request.nextUrl.searchParams
    const orderId = searchParams.get("orderId")

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 })
    }

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { cashfreeOrderId: orderId },
          { cashfreePaymentId: orderId },
        ],
      },
      include: {
        booking: {
          include: {
            facility: true,
            court: true,
          },
        },
      },
    })

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    // Verify the payment belongs to the authenticated user
    if (payment.booking && payment.booking.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // If payment is still PENDING, check Cashfree directly
    if (payment.status === "PENDING") {
      try {
        const cfOrder = await fetchCashfreeOrder(payment.cashfreeOrderId)
        const cfStatus = cfOrder.order_status || "PENDING"

        if (cfStatus === "PAID") {
          await prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: payment.id },
              data: { status: "SUCCEEDED" as any, paidAt: new Date() },
            })
            await tx.booking.update({
              where: { id: payment.bookingId },
              data: { status: "CONFIRMED" },
            })
          })
          payment.status = "SUCCEEDED" as any
        } else if (cfStatus === "EXPIRED" || cfStatus === "TERMINATED") {
          await prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: payment.id },
              data: { status: "FAILED" as any },
            })
            await tx.booking.update({
              where: { id: payment.bookingId },
              data: { status: "CANCELLED" },
            })
          })
          payment.status = "FAILED" as any
        }
      } catch (e) {
        console.error("[Payment Status] Cashfree fetch failed:", e)
      }
    }

    return NextResponse.json({
      status: payment.status,
      paidAt: payment.paidAt,
      booking: payment.booking
        ? {
            id: payment.booking.id,
            facilityId: payment.booking.facilityId,
            courtId: payment.booking.courtId,
            totalPrice: payment.booking.totalPrice,
            status: payment.booking.status,
            startTime: payment.booking.startTime,
            endTime: payment.booking.endTime,
            facility: payment.booking.facility,
            court: payment.booking.court,
          }
        : null,
    })
  } catch (error) {
    console.error("[Payment Status] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}