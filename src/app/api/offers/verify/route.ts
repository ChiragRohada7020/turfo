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
        offer: { include: { sponsor: true } },
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    })

    if (!redemption) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 404 })
    }

    if (!redemption.offer || !redemption.offer.isActive) {
      return NextResponse.json({ error: "This coupon is not valid" }, { status: 400 })
    }

    // Check if sponsor or admin
    if (!redemption.offer.sponsor || (session.user.role !== "ADMIN" && redemption.offer.sponsor.userId !== session.user.id)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Check if expired
    if (new Date() > redemption.offer.validTo) {
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