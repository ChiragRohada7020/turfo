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

    if (!verificationCode) {
      return NextResponse.json({ error: "Verification code required" }, { status: 400 })
    }

    const redemption = await prisma.offerRedemption.findUnique({
      where: { verificationCode },
      include: {
        offer: { include: { sponsor: { include: { user: { select: { phone: true, name: true } } } } } },
        user: { select: { id: true, name: true, email: true, avatarUrl: true, phone: true } },
      },
    })

    if (!redemption) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 404 })
    }

    if (!redemption.offer || !redemption.offer.isActive) {
      return NextResponse.json({ error: "This coupon is not valid" }, { status: 400 })
    }

    // Check if sponsor or admin
    if (!redemption.offer.sponsor || (session.user.role !== "ADMIN" && session.user.role !== "SPONSOR")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const validityDays = (redemption.offer as any).validityDays || 30
    const expiresAt = new Date(redemption.redeemedAt.getTime() + validityDays * 24 * 60 * 60 * 1000)
    if (new Date() > expiresAt) {
      await prisma.offerRedemption.update({
        where: { id: redemption.id },
        data: { status: "EXPIRED" },
      })
      return NextResponse.json({ error: "This offer has expired" }, { status: 400 })
    }

    // Atomically mark as redeemed to prevent double-use under concurrent scans
    const updated = await prisma.offerRedemption.updateMany({
      where: { id: redemption.id, status: { not: "REDEEMED" } },
      data: { status: "REDEEMED", usedAt: new Date() },
    })

    if (updated.count === 0) {
      return NextResponse.json({
        error: "This coupon has already been redeemed",
        redemption: {
          id: redemption.id,
          status: "REDEEMED",
          usedAt: redemption.usedAt,
          user: redemption.user,
          offer: redemption.offer,
        },
      }, { status: 400 })
    }

    // Send WhatsApp messages to player and sponsor
    try {
      const { sendWhatsAppMessage } = await import("@/lib/whatsapp/service")
      const playerPhone = redemption.user?.phone
      const sponsorPhone = redemption.offer?.sponsor?.user?.phone
      const offerTitle = redemption.offer?.title || "Offer"
      const discount = redemption.discountApplied || 0
      if (playerPhone) {
        await sendWhatsAppMessage(playerPhone, `✅ *Coupon Redeemed*

Your coupon for *${offerTitle}* has been verified and used.
Discount applied: ₹${discount.toFixed(0)}
Thank you! 🌐 https://strikora.in`)
      }
      if (sponsorPhone) {
        await sendWhatsAppMessage(sponsorPhone, `✅ *Coupon Verified*

A customer redeemed *${offerTitle}*.
Discount: ₹${discount.toFixed(0)}
Customer: ${redemption.user?.name || "Player"}`)
      }
    } catch (e) {
      console.error("[Verify Offer] WhatsApp send failed:", e)
    }

    return NextResponse.json({
      success: true,
      message: "Coupon verified and redeemed successfully",
      redemption: {
        id: redemption.id,
        status: "REDEEMED",
        usedAt: new Date(),
        discountApplied: redemption.discountApplied,
        user: redemption.user,
        offer: {
          title: redemption.offer.title,
          code: redemption.offer.code,
          discountType: redemption.offer.discountType,
          discountValue: redemption.offer.discountValue,
        },
      },
    })
  } catch (error) {
    console.error("[Verify Offer] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}