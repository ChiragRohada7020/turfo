import prisma from "@/lib/prisma"
import { RewardType } from "@prisma/client"

export async function creditPoints(params: {
  userId: string
  points: number
  description: string
  referenceId?: string
  idempotencyKey?: string
  type?: RewardType
}, txClient?: any) {
  const { userId, points, description, referenceId, idempotencyKey, type = "EARNED" } = params
  if (points <= 0) return null

  const run = async (tx: any) => {
    // idempotency check
    if (idempotencyKey) {
      const existing = await tx.rewardTransaction.findUnique({ where: { idempotencyKey } })
      if (existing) return existing
    }

    // duplicate reference check
    if (referenceId) {
      const dup = await tx.rewardTransaction.findFirst({
        where: { userId, referenceId, type: "EARNED", status: "COMPLETED" },
      })
      if (dup) return dup
    }

    const transaction = await tx.rewardTransaction.create({
      data: {
        userId,
        points,
        type,
        status: "COMPLETED",
        description,
        referenceId: referenceId || null,
        idempotencyKey: idempotencyKey || null,
      },
    })
    await tx.user.update({
      where: { id: userId },
      data: { rewardPoints: { increment: points } },
    })
    return transaction
  }

  if (txClient) {
    try {
      return await run(txClient)
    } catch (e: any) {
      if (idempotencyKey) {
        const existing = await txClient.rewardTransaction.findUnique({ where: { idempotencyKey } })
        if (existing) return existing
      }
      if (referenceId) {
        const existing = await txClient.rewardTransaction.findFirst({ where: { userId, referenceId, type: "EARNED", status: "COMPLETED" } })
        if (existing) return existing
      }
      throw e
    }
  }

  try {
    const tx = await prisma.$transaction(async (prismaTx) => run(prismaTx), { isolationLevel: "Serializable" })
    return tx
  } catch (e: any) {
    if (idempotencyKey) {
      const existing = await prisma.rewardTransaction.findUnique({ where: { idempotencyKey } })
      if (existing) return existing
    }
    if (referenceId) {
      const existing = await prisma.rewardTransaction.findFirst({ where: { userId, referenceId, type: "EARNED", status: "COMPLETED" } })
      if (existing) return existing
    }
    throw e
  }
}

export async function reversePoints(params: {
  originalTransactionId: string
  reason: string
}, txClient?: any) {
  const { originalTransactionId, reason } = params

  const run = async (tx: any) => {
    const original = await tx.rewardTransaction.findUnique({ where: { id: originalTransactionId } })
    if (!original) throw new Error("Transaction not found")
    if (original.status === "REVERSED") return original

    const existingReversal = await tx.rewardTransaction.findFirst({
      where: { reversalOfId: original.id },
    })
    if (existingReversal) return existingReversal

    const rev = await tx.rewardTransaction.create({
      data: {
        userId: original.userId,
        points: -Math.abs(original.points),
        type: original.type,
        status: "COMPLETED",
        description: `Reversal: ${reason}`,
        referenceId: original.referenceId,
        reversalOfId: original.id,
        reversalReason: reason,
      },
    })
    await tx.user.update({
      where: { id: original.userId },
      data: { rewardPoints: { decrement: Math.abs(original.points) } },
    })
    await tx.rewardTransaction.update({
      where: { id: original.id },
      data: { status: "REVERSED", reversedAt: new Date(), reversalReason: reason },
    })
    return rev
  }

  if (txClient) return run(txClient)
  return prisma.$transaction(run, { isolationLevel: "Serializable" })
}

export async function getRewardLiability(ownerId?: string | null) {
  if (ownerId) {
    const facilities = await prisma.facility.findMany({ where: { ownerId }, select: { id: true } })
    const facilityIds = facilities.map((f: any) => f.id)
    const bookings = await prisma.booking.findMany({ where: { facilityId: { in: facilityIds } }, select: { userId: true } })
    const playerIds = Array.from(new Set(bookings.map((b: any) => b.userId)))
    if (playerIds.length === 0) return 0
    const agg = await prisma.user.aggregate({ where: { id: { in: playerIds } }, _sum: { rewardPoints: true } })
    return agg._sum.rewardPoints || 0
  }
  const agg = await prisma.user.aggregate({ _sum: { rewardPoints: true } })
  return agg._sum.rewardPoints || 0
}
