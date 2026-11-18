import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { fetchCashfreeOrder } from "@/lib/cashfree"
import { rateLimit } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const { allowed } = rateLimit(`verify:${ip}`, 20, 60000)
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const body = await request.json()
    const orderId = body.orderId

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
      include: { booking: true },
    })

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    // Fetch order from Cashfree
    let cfStatus = "PENDING"
    try {
      const cfOrder = await fetchCashfreeOrder(payment.cashfreeOrderId)
      cfStatus = cfOrder.order_status || "PENDING"
    } catch (e) {
      console.error("[Payment Verify] Cashfree fetch failed:", e)
    }

    // Map Cashfree status to our status
    let newStatus = payment.status
    if (cfStatus === "PAID") {
      newStatus = "SUCCEEDED" as any
    } else if (cfStatus === "EXPIRED" || cfStatus === "TERMINATED") {
      newStatus = "FAILED" as any
    }

    if (newStatus !== payment.status) {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: newStatus,
            paidAt: newStatus === ("SUCCEEDED" as any) ? new Date() : null,
          },
        })

        if (newStatus === ("SUCCEEDED" as any)) {
          await tx.booking.update({
            where: { id: payment.bookingId },
            data: { status: "CONFIRMED" },
          })
        } else if (newStatus === ("FAILED" as any)) {
          await tx.booking.update({
            where: { id: payment.bookingId },
            data: { status: "CANCELLED" },
          })
        }
      })
    }

    return NextResponse.json({
      status: newStatus,
      cfStatus,
      bookingId: payment.bookingId,
    })
  } catch (error) {
    console.error("[Payment Verify] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
