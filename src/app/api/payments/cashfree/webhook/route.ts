import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import prisma from "@/lib/prisma"
import crypto from "crypto"
import { rateLimit } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 100 requests per minute per IP
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const { allowed } = rateLimit(`webhook:${ip}`, 100, 60000)
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }
    const headersList = await headers()
    const signature = headersList.get("x-webhook-signature")
    const timestamp = headersList.get("x-webhook-timestamp")
    const body = await request.text()

    // Use API secret key for webhook verification (Cashfree uses this)
    const secretKey = process.env.CASHFREE_SECRET_KEY
    if (!secretKey || !signature) {
      console.error("[Cashfree Webhook] Missing secret or signature")
      return NextResponse.json({ error: "Invalid configuration" }, { status: 400 })
    }

    // Verify signature: HMAC-SHA256(timestamp + body, secretKey)
    // Cashfree sends timestamp in x-webhook-timestamp header
    let isValid = false
    if (timestamp) {
      const expectedSig = crypto.createHmac("sha256", secretKey).update(timestamp + body).digest("base64")
      isValid = expectedSig === signature
    }
    // Fallback: some Cashfree versions sign just the body
    if (!isValid) {
      const expectedSig2 = crypto.createHmac("sha256", secretKey).update(body).digest("base64")
      isValid = expectedSig2 === signature
    }

    if (!isValid) {
      console.error("[Cashfree Webhook] Invalid signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const event = JSON.parse(body)
    const eventType = event.type
    const orderId = event.data?.order?.order_id || event.data?.payment?.order_id
    const cfOrderId = event.data?.order?.cf_order_id || event.data?.payment?.cf_payment_id

    console.log("[Cashfree Webhook] Event:", eventType, "Order:", orderId)

    if (!orderId) {
      return NextResponse.json({ received: true, test: true })
    }

    // Look up payment by our order ID
    const payment = await prisma.payment.findFirst({
      where: { cashfreeOrderId: orderId },
      include: { booking: true },
    })

    if (!payment) {
      console.warn("[Cashfree Webhook] Payment not found for order:", orderId)
      return NextResponse.json({ received: true })
    }

    // Verify payment amount matches
    const webhookAmount = event.data?.payment?.payment_amount || event.data?.order?.order_amount
    if (webhookAmount && Math.abs(webhookAmount - payment.amount) > 0.01) {
      console.error("[Cashfree Webhook] Amount mismatch:", webhookAmount, "vs", payment.amount)
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 })
    }

    // Idempotency check: don't reprocess if already in final state
    const isFinalState = payment.status === "SUCCEEDED" || payment.status === "FAILED" || payment.status === "REFUNDED"
    if (isFinalState && (eventType.includes("SUCCESS") || eventType.includes("FAILED"))) {
      console.log("[Cashfree Webhook] Already processed:", payment.status)
      return NextResponse.json({ received: true })
    }

    let newStatus = payment.status
    let paidAt: Date | null = null

    switch (eventType) {
      case "PAYMENT_SUCCESS":
      case "PAYMENT_SUCCESS_WEBHOOK":
        newStatus = "SUCCEEDED" as any
        paidAt = new Date()
        break
      case "PAYMENT_FAILED":
      case "PAYMENT_FAILED_WEBHOOK":
        newStatus = "FAILED" as any
        break
      case "PAYMENT_REFUNDED":
      case "PAYMENT_REFUNDED_WEBHOOK":
        newStatus = "REFUNDED" as any
        break
      case "ORDER_EXPIRED":
      case "ORDER_EXPIRED_WEBHOOK":
        newStatus = "FAILED" as any
        break
      default:
        console.log("[Cashfree Webhook] Unhandled event type:", eventType)
        return NextResponse.json({ received: true })
    }

    // Only update if status actually changed
    if (newStatus === payment.status) {
      return NextResponse.json({ received: true })
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          paidAt,
          ...(cfOrderId && { cashfreePaymentId: cfOrderId }),
        },
      })

      if (newStatus === "SUCCEEDED" as any) {
        await tx.booking.update({
          where: { id: payment.bookingId },
          data: { status: "CONFIRMED" },
        })

        await tx.notification.create({
          data: {
            userId: payment.booking.userId,
            type: "BOOKING_CONFIRMED",
            title: "Booking Confirmed",
            message: `Your booking #${payment.booking.id.slice(-6)} has been confirmed. Payment of ₹${payment.amount} received.`,
            data: { bookingId: payment.bookingId },
          },
        })
      } else if (newStatus === "FAILED") {
        await tx.booking.update({
          where: { id: payment.booking.id },
          data: { status: "CANCELLED" },
        })

        await tx.notification.create({
          data: {
            userId: payment.booking.userId,
            type: "BOOKING_CANCELLED",
            title: "Payment Failed",
            message: `Your booking #${payment.booking.id.slice(-6)} was cancelled due to payment failure. Please try again.`,
            data: { bookingId: payment.bookingId },
          },
        })
      }
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[Cashfree Webhook] Error:", error)
    return NextResponse.json({ received: true, error: "Processed with error" })
  }
}