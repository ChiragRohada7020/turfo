import prisma from "@/lib/prisma"
import { generateTasksForPlayer } from "./generator"
import { handleBookingCompleted, handleBookingCancelled } from "./verification"
import { creditPoints } from "./reward"
import { BookingStatus } from "@prisma/client"
import { analyzePlayer } from "./analysis"

export async function expireStaleTasks() {
  const now = new Date()
  await prisma.task.updateMany({
    where: { isActive: true, expiresAt: { lt: now }, status: { not: "COMPLETED" } },
    data: { status: "EXPIRED", isActive: false },
  })
  await prisma.userTask.updateMany({
    where: { task: { expiresAt: { lt: now } }, completed: false },
    data: { status: "EXPIRED" },
  })
  // Expire unstarted tasks older than 3 days
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  await prisma.task.updateMany({
    where: {
      isActive: true,
      status: { not: "COMPLETED" },
      createdAt: { lt: threeDaysAgo },
      userTasks: { none: { progress: { gt: 0 } } },
    },
    data: { status: "EXPIRED", isActive: false },
  })
  await prisma.userTask.updateMany({
    where: {
      completed: false,
      progress: 0,
      task: { createdAt: { lt: threeDaysAgo }, isActive: false },
    },
    data: { status: "EXPIRED" },
  })
}

export async function refreshTasksForPlayer(userId: string, event?: string, bookingId?: string) {
  await expireStaleTasks()
  if (event === "booking_completed") {
    await handleBookingCompleted(userId)
  }
  if (event === "booking_cancelled") {
    await handleBookingCancelled(userId, bookingId || "")
  }
  // generate if few active
  const activeCount = await prisma.userTask.count({
    where: { userId, status: { in: ["AVAILABLE", "IN_PROGRESS"] }, task: { isActive: true, expiresAt: { gte: new Date() } } },
  })
  if (activeCount < 5) {
    await generateTasksForPlayer(userId)
  }
  return { success: true }
}



export async function processReferralReward(userId: string) {
  const referral = await prisma.referral.findUnique({ where: { refereeId: userId } })
  if (!referral || referral.status !== "PENDING") return { rewarded: false }
  const completedCount = await prisma.booking.count({ where: { userId, status: BookingStatus.COMPLETED } })
  if (completedCount < 1) return { rewarded: false }
  await creditPoints({
    userId: referral.referrerId,
    points: referral.rewardPoints,
    description: `Referral reward for inviting a friend`,
    referenceId: `referral:${referral.id}`,
    idempotencyKey: `referral:${referral.id}`,
    type: "EARNED",
  })
  await prisma.referral.update({
    where: { id: referral.id },
    data: { status: "REWARDED", completedAt: new Date(), rewardedAt: new Date() },
  })
  return { rewarded: true }
}

export async function onBookingCompleted(userId: string, bookingId: string) {
  await handleBookingCompleted(userId)
  await processReferralReward(userId)
  await refreshTasksForPlayer(userId, "booking_completed")
  return { success: true }
}

export async function onBookingCancelled(userId: string, bookingId: string) {
  await handleBookingCancelled(userId, bookingId)
  await refreshTasksForPlayer(userId, "booking_cancelled", bookingId)
  try {
    const situation = await analyzePlayer(userId)
    if (situation.isInactive) {
      await generateTasksForPlayer(userId)
    }
  } catch (e) {
    console.error("comeback generation failed", e)
  }
  return { success: true }
}
