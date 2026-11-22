import prisma from "@/lib/prisma"
import { BookingStatus } from "@prisma/client"
import { creditPoints, reversePoints } from "./reward"

export interface TaskCriteria {
  type: string
  count?: number
  sport?: string
  days?: number
  windowDays?: number
  minParticipants?: number
  since?: string
}

function maxDate(a: Date | null, b: Date | null): Date | null {
  if (!a) return b
  if (!b) return a
  return a.getTime() >= b.getTime() ? a : b
}

export async function evaluateTask(userId: string, task: any, db: any = prisma): Promise<{ progress: number; completed: boolean }> {
  const criteria: TaskCriteria = (task.completionCriteria as any) || { type: task.type }
  const target = task.target || 1
  let progress = 0

  const taskStart = task.startDate ? new Date(task.startDate) : null

  // base by type
  switch (criteria.type) {
    case "completed_bookings": {
      const since = maxDate(criteria.since ? new Date(criteria.since) : null, taskStart) || new Date(0)
      progress = await db.booking.count({
        where: { userId, status: BookingStatus.COMPLETED, createdAt: { gte: since } },
      })
      break
    }
    case "total_completed_bookings": {
      progress = await db.booking.count({ where: { userId, status: BookingStatus.COMPLETED } })
      break
    }
    case "distinct_bookings": {
      const windowDays = criteria.windowDays || 7
      const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
      const since = maxDate(taskStart, windowStart) || new Date(0)
      const bookings = await db.booking.findMany({
        where: { userId, status: BookingStatus.COMPLETED, createdAt: { gte: since } },
        select: { id: true },
      })
      progress = bookings.length
      break
    }
    case "sport_booking": {
      const sport = criteria.sport
      const where: any = {
        userId,
        status: BookingStatus.COMPLETED,
        court: { sportType: sport as any },
      }
      if (taskStart) where.createdAt = { gte: taskStart }
      progress = await db.booking.count({ where })
      break
    }
    case "weekend_booking": {
      const where: any = { userId, status: BookingStatus.COMPLETED }
      if (taskStart) where.createdAt = { gte: taskStart }
      const bookings = await db.booking.findMany({
        where,
        select: { startTime: true },
      })
      progress = bookings.filter((b: any) => {
        const d = new Date(b.startTime).getDay()
        return d === 0 || d === 6
      }).length
      break
    }
    case "group_booking": {
      const where: any = { userId, status: BookingStatus.COMPLETED }
      if (taskStart) where.createdAt = { gte: taskStart }
      const bookings = await db.booking.findMany({
        where,
        include: { participants: true },
      })
      progress = bookings.filter((b: any) => (b.participants?.length || 0) >= (criteria.minParticipants || 2) || (b.offlineFriends || 0) > 0).length
      break
    }
    case "booking_within_days": {
      const days = criteria.days || 3
      const windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      const since = maxDate(taskStart, windowStart) || new Date(0)
      progress = await db.booking.count({
        where: { userId, status: BookingStatus.COMPLETED, createdAt: { gte: since } },
      })
      break
    }
    case "join_open_games": {
      const ut = await db.userTask.findUnique({ where: { userId_taskId: { userId, taskId: task.id } } })
      progress = ut?.progress || 0
      break
    }
    default: {
      const ut = await db.userTask.findUnique({ where: { userId_taskId: { userId, taskId: task.id } } })
      progress = ut?.progress || 0
      break
    }
  }

  progress = Math.min(target, progress)
  return { progress, completed: progress >= target }
}

export async function verifyAndCreditTask(userId: string, taskId: string) {
  const run = async (tx: any) => {
    const task = await tx.task.findUnique({ where: { id: taskId } })
    if (!task || !task.isActive) return { completed: false, pointsAwarded: 0 }
    if (task.userId && task.userId !== userId) return { completed: false, pointsAwarded: 0 }
    // expiry
    if (task.expiresAt && new Date(task.expiresAt) < new Date()) {
      await tx.userTask.updateMany({ where: { userId, taskId }, data: { status: "EXPIRED" } })
      await tx.task.update({ where: { id: taskId }, data: { status: "EXPIRED" } }).catch(() => {})
      return { completed: false, pointsAwarded: 0, expired: true }
    }

    const { progress, completed } = await evaluateTask(userId, task, tx)

    const userTask = await tx.userTask.upsert({
      where: { userId_taskId: { userId, taskId } },
      create: { userId, taskId, progress, status: completed ? "COMPLETED" : progress > 0 ? "IN_PROGRESS" : "AVAILABLE", completed, completedAt: completed ? new Date() : null, startedAt: progress > 0 ? new Date() : null },
      update: { progress, status: completed ? "COMPLETED" : progress > 0 ? "IN_PROGRESS" : "AVAILABLE", completed: completed, completedAt: completed ? new Date() : undefined },
    })

    if (!completed) {
      return { completed: false, pointsAwarded: 0, progress }
    }

    // re-check rewardTransactionId inside transaction
    const fresh = await tx.userTask.findUnique({ where: { userId_taskId: { userId, taskId } } })
    if (fresh?.rewardTransactionId) {
      return { completed: true, pointsAwarded: 0, alreadyCredited: true }
    }

    const idempotencyKey = `task:${userId}:${taskId}`
    const txCredit = await creditPoints(
      {
        userId,
        points: task.rewardPoints,
        description: `Task completed: ${task.title}`,
        referenceId: taskId,
        idempotencyKey,
        type: "EARNED",
      },
      tx
    )

    if (txCredit) {
      await tx.userTask.update({
        where: { id: userTask.id },
        data: { rewardTransactionId: txCredit.id, verifiedAt: new Date(), status: "COMPLETED" },
      })
      // Create notification for task completion
      await tx.notification.create({
        data: {
          userId,
          type: "SYSTEM",
          title: "Task Completed",
          message: `You completed "${task.title}" and earned ${task.rewardPoints} reward points.`,
          data: { taskId: task.id, rewardPoints: task.rewardPoints },
        },
      }).catch(() => {})
    }

    // update task status
    await tx.task.update({ where: { id: taskId }, data: { status: "COMPLETED", isActive: false } }).catch(() => {})

    return { completed: true, pointsAwarded: task.rewardPoints, progress }
  }

  // retry on serialization failure
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(run, { isolationLevel: "Serializable" })
    } catch (e: any) {
      const code = e?.code || e?.meta?.code
      if ((code === "P2034" || code === "40001") && attempt < 2) continue
      throw e
    }
  }
  return { completed: false, pointsAwarded: 0 }
}

export async function handleBookingCompleted(userId: string) {
  // evaluate all active tasks for user
  const tasks = await prisma.task.findMany({
    where: {
      isActive: true,
      OR: [{ userId }, { userId: null }],
      expiresAt: { gte: new Date() },
    },
  })
  const results = []
  for (const task of tasks) {
    const r = await verifyAndCreditTask(userId, task.id)
    results.push({ taskId: task.id, ...r })
  }
  return results
}

export async function handleBookingCancelled(userId: string, bookingId: string) {
  const userTasks = await prisma.userTask.findMany({
    where: { userId, completed: true, rewardTransactionId: { not: null } },
    include: { task: true },
  })
  const reversed = []
  for (const ut of userTasks) {
    const { progress, completed } = await evaluateTask(userId, ut.task)
    await prisma.userTask.update({
      where: { id: ut.id },
      data: {
        progress,
        status: completed ? "COMPLETED" : progress > 0 ? "IN_PROGRESS" : "AVAILABLE",
        completed,
      },
    })
    if (!completed && ut.rewardTransactionId) {
      await reversePoints({ originalTransactionId: ut.rewardTransactionId, reason: `Task no longer valid after booking cancellation ${bookingId}` })
      await prisma.userTask.update({
        where: { id: ut.id },
        data: { completed: false, status: "AVAILABLE", rewardTransactionId: null },
      })
      reversed.push(ut.taskId)
    }
  }
  return reversed
}
export const verifyTask = verifyAndCreditTask
export const creditTaskPoints = verifyAndCreditTask
