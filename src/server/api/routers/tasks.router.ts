import { z } from "zod"
import { createTRPCRouter, protectedProcedure, ownerProcedure, adminProcedure } from "@/server/trpc/init"
import prisma from "@/lib/prisma"
import { generateTasksForPlayer } from "@/lib/tasks/generator"
import { verifyAndCreditTask, handleBookingCompleted } from "@/lib/tasks/verification"
import { getTaskSettings, updateTaskSettings } from "@/lib/tasks/settings"
import { expireStaleTasks, refreshTasksForPlayer } from "@/lib/tasks/refresh"
import { creditPoints, reversePoints, getRewardLiability } from "@/lib/tasks/reward"
import { analyzePlayer } from "@/lib/tasks/analysis"

export const tasksRouter = createTRPCRouter({
  unlockFeatures: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await prisma.user.findUnique({ where: { id: ctx.session.user.id }, select: { rewardPoints: true, unlockedUntil: true } })
    if (!user) throw new Error("User not found")
    const now = new Date()
    if (user.unlockedUntil && user.unlockedUntil > now) {
      return { success: true, alreadyUnlocked: true, unlockedUntil: user.unlockedUntil }
    }
    if ((user.rewardPoints || 0) < 1500) {
      throw new Error("Insufficient reward points. Need 1500.")
    }
    const until = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: ctx.session.user.id }, data: { rewardPoints: { decrement: 1500 }, unlockedUntil: until } })
      await tx.rewardTransaction.create({ data: { userId: ctx.session.user.id, points: -1500, type: "REDEEMED", status: "COMPLETED", description: "Unlocked Find Players, Teams, Tournaments for 1 month" } })
      await tx.notification.create({ data: { userId: ctx.session.user.id, type: "SYSTEM", title: "Features Unlocked", message: "You unlocked Find Players, Teams & Tournaments for 1 month." } })
    })
    return { success: true, unlockedUntil: until }
  }),

  isUnlocked: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({ where: { id: ctx.session.user.id }, select: { unlockedUntil: true, rewardPoints: true } })
    const now = new Date()
    return { unlocked: !!(user?.unlockedUntil && user.unlockedUntil > now), unlockedUntil: user?.unlockedUntil || null, rewardPoints: user?.rewardPoints || 0 }
  }),
  generate: protectedProcedure.mutation(async ({ ctx }) => {
    return generateTasksForPlayer(ctx.session.user.id)
  }),

  myTasks: protectedProcedure.query(async ({ ctx }) => {
    await expireStaleTasks()
    const now = new Date()
    const tasks = await prisma.task.findMany({
      where: {
        isActive: true,
        OR: [{ userId: null }, { userId: ctx.session.user.id }],
      },
      orderBy: { createdAt: "desc" },
    })

    const userTasks = await prisma.userTask.findMany({
      where: { userId: ctx.session.user.id },
    })
    const userTaskMap = new Map(userTasks.map((ut) => [ut.taskId, ut]))

    return tasks.map((task) => {
      const ut = userTaskMap.get(task.id)
      const expired = !!(task.expiresAt && new Date(task.expiresAt) < now)
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        type: task.type,
        category: task.category,
        target: task.target,
        rewardPoints: task.rewardPoints,
        progress: ut?.progress || 0,
        completed: ut?.completed || false,
        completedAt: ut?.completedAt,
        status: expired ? "EXPIRED" : ut?.status || task.status,
        isAiGenerated: task.isAiGenerated,
        expiresAt: task.expiresAt,
        startDate: task.startDate,
        targetSport: task.targetSport,
        targetTurfId: task.targetTurfId,
        completionCriteria: task.completionCriteria,
      }
    })
  }),

  updateProgress: protectedProcedure
    .input(z.object({ taskId: z.string(), increment: z.number().min(1).default(1) }))
    .mutation(async ({ ctx, input }) => {
      const { trackTaskProgress } = await import("@/lib/rewards/taskProgress")
      await trackTaskProgress(ctx.session.user.id, (await prisma.task.findUnique({ where: { id: input.taskId } }))?.type as any, input.increment)
      const r = await verifyAndCreditTask(ctx.session.user.id, input.taskId)
      return r
    }),

  verifyTask: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return verifyAndCreditTask(ctx.session.user.id, input.taskId)
    }),

  verifyAll: protectedProcedure.mutation(async ({ ctx }) => {
    const res = await handleBookingCompleted(ctx.session.user.id)
    await refreshTasksForPlayer(ctx.session.user.id)
    return res
  }),

  refresh: protectedProcedure.mutation(async ({ ctx }) => {
    return refreshTasksForPlayer(ctx.session.user.id)
  }),

  situation: protectedProcedure.query(async ({ ctx }) => {
    return analyzePlayer(ctx.session.user.id)
  }),

  myRewardPoints: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({ where: { id: ctx.session.user.id }, select: { rewardPoints: true } })
    return user?.rewardPoints || 0
  }),

  myRewardTransactions: protectedProcedure.query(async ({ ctx }) => {
    return prisma.rewardTransaction.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
  }),

  // Owner
  ownerAnalytics: ownerProcedure.query(async ({ ctx }) => {
    // tasks for players who booked owner's facilities
    const facilities = await prisma.facility.findMany({ where: { ownerId: ctx.session.user.id }, select: { id: true } })
    const facilityIds = facilities.map((f) => f.id)
    const bookings = await prisma.booking.findMany({ where: { facilityId: { in: facilityIds } }, select: { userId: true } })
    const playerIds = Array.from(new Set(bookings.map((b) => b.userId)))
    const tasks = await prisma.task.findMany({ where: { userId: { in: playerIds } } })
    const userTasks = await prisma.userTask.findMany({ where: { userId: { in: playerIds } } })

    const totalTasks = tasks.length
    const activeTasks = tasks.filter((t) => t.isActive && t.status !== "COMPLETED" && t.status !== "EXPIRED").length
    const completedTasks = userTasks.filter((u) => u.completed).length
    const expiredTasks = tasks.filter((t) => t.status === "EXPIRED").length
    const completedTaskIds = new Set(userTasks.filter((u) => u.completed).map((u) => u.taskId))
    const rewardTx = await prisma.rewardTransaction.findMany({ where: { userId: { in: playerIds }, type: "EARNED", status: "COMPLETED" }, select: { points: true } })
    const pointsDistributed = rewardTx.reduce((s, t) => s + t.points, 0)

    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0

    // category effectiveness
    const categoryMap: Record<string, { total: number; completed: number }> = {}
    for (const t of tasks) {
      const cat = t.category
      if (!categoryMap[cat]) categoryMap[cat] = { total: 0, completed: 0 }
      categoryMap[cat].total++
      if (completedTaskIds.has(t.id)) categoryMap[cat].completed++
    }

    return {
      totalTasksGenerated: totalTasks,
      activeTasks,
      completedTasks,
      expiredTasks,
      totalPointsDistributed: pointsDistributed,
      completionRate,
      rewardLiability: await getRewardLiability(ctx.session.user.id),
      categoryEffectiveness: Object.entries(categoryMap).map(([category, v]) => ({
        category,
        total: v.total,
        completed: v.completed,
        rate: v.total > 0 ? v.completed / v.total : 0,
      })),
      // bookings attributed: count completed bookings by these players after task creation? placeholder
      bookingsFromTasks: completedTasks,
      repeatBookingsAttributed: Math.max(0, completedTasks - 1),
    }
  }),

  ownerSettings: ownerProcedure.query(async ({ ctx }) => {
    return getTaskSettings(ctx.session.user.id)
  }),

  updateOwnerSettings: ownerProcedure
    .input(
      z.object({
        aiEnabled: z.boolean().optional(),
        maxActiveTasks: z.number().min(1).max(50).optional(),
        maxRewardPointsPerTask: z.number().min(0).optional(),
        monthlyRewardBudget: z.number().min(0).optional(),
        defaultExpiryDays: z.number().min(1).optional(),
        minBookingValue: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return updateTaskSettings(ctx.session.user.id, input)
    }),

  pauseAi: ownerProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return updateTaskSettings(ctx.session.user.id, { aiEnabled: input.enabled })
    }),

  // Admin
  adminAnalytics: adminProcedure.query(async () => {
    const tasks = await prisma.task.findMany()
    const userTasks = await prisma.userTask.findMany()
    const completedTaskIds = new Set(userTasks.filter((u) => u.completed).map((u) => u.taskId))
    const pointsDistributed = tasks.filter((t) => completedTaskIds.has(t.id)).reduce((s, t) => s + t.rewardPoints, 0)
    const categoryMap: Record<string, { total: number; completed: number }> = {}
    for (const t of tasks) {
      const cat = t.category
      if (!categoryMap[cat]) categoryMap[cat] = { total: 0, completed: 0 }
      categoryMap[cat].total++
      if (completedTaskIds.has(t.id)) categoryMap[cat].completed++
    }
    return {
      totalTasksGenerated: tasks.length,
      activeTasks: tasks.filter((t) => t.isActive && t.status !== "COMPLETED" && t.status !== "EXPIRED").length,
      completedTasks: userTasks.filter((u) => u.completed).length,
      expiredTasks: tasks.filter((t) => t.status === "EXPIRED").length,
      totalPointsDistributed: pointsDistributed,
      completionRate: tasks.length > 0 ? userTasks.filter((u) => u.completed).length / tasks.length : 0,
      rewardLiability: await getRewardLiability(),
      categoryEffectiveness: Object.entries(categoryMap).map(([category, v]) => ({
        category,
        total: v.total,
        completed: v.completed,
        rate: v.total > 0 ? v.completed / v.total : 0,
      })),
    }
  }),

  adminGenerateForUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      return generateTasksForPlayer(input.userId)
    }),

  adminGenerateAll: adminProcedure.mutation(async () => {
    const users = await prisma.user.findMany({ where: { role: "PLAYER" }, select: { id: true } })
    let totalCreated = 0
    for (const u of users) {
      const r = await generateTasksForPlayer(u.id)
      totalCreated += r.created
    }
    return { users: users.length, created: totalCreated }
  }),

  expireTasks: adminProcedure.mutation(async () => {
    await expireStaleTasks()
    return { success: true }
  }),

  globalSettings: adminProcedure.query(async () => {
    return getTaskSettings(null)
  }),

  updateGlobalSettings: adminProcedure
    .input(
      z.object({
        aiEnabled: z.boolean().optional(),
        maxActiveTasks: z.number().min(1).max(50).optional(),
        maxRewardPointsPerTask: z.number().min(0).optional(),
        monthlyRewardBudget: z.number().min(0).optional(),
        defaultExpiryDays: z.number().min(1).optional(),
        minBookingValue: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return updateTaskSettings(null, input)
    }),

  reverseTransaction: adminProcedure
    .input(z.object({ transactionId: z.string(), reason: z.string() }))
    .mutation(async ({ input }) => {
      return reversePoints({ originalTransactionId: input.transactionId, reason: input.reason })
    }),


  // Referral
  myReferralCode: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({ where: { id: ctx.session.user.id }, select: { referralCode: true } })
    if (!user?.referralCode) {
      const code = `REF${ctx.session.user.id.slice(-6).toUpperCase()}`
      await prisma.user.update({ where: { id: ctx.session.user.id }, data: { referralCode: code } })
      return code
    }
    return user.referralCode
  }),

  myReferrals: protectedProcedure.query(async ({ ctx }) => {
    return prisma.referral.findMany({ where: { referrerId: ctx.session.user.id }, orderBy: { createdAt: "desc" } })
  }),

  applyReferralCode: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const code = input.code.trim().toUpperCase()
      const referrer = await prisma.user.findUnique({ where: { referralCode: code } })
      if (!referrer || referrer.id === ctx.session.user.id) throw new Error("Invalid referral code")
      const existing = await prisma.referral.findUnique({ where: { refereeId: ctx.session.user.id } })
      if (existing) throw new Error("Referral already applied")
       const referral = await prisma.referral.create({
         data: { referrerId: referrer.id, refereeId: ctx.session.user.id, code, rewardPoints: 1000 },
       })
      await prisma.user.update({ where: { id: ctx.session.user.id }, data: { referredById: referrer.id } })
      return referral
    }),

  // Cached recommendation
  cachedRecommendation: protectedProcedure.query(async ({ ctx }) => {
    const pref = await prisma.playerPreference.findUnique({ where: { userId: ctx.session.user.id } })
    return { recommendation: pref?.taskRecommendation || null, computedAt: pref?.taskComputedAt || null }
  }),

  // Task templates
  listTemplates: protectedProcedure.query(async () => {
    return prisma.taskTemplate.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" } })
  }),

  approveTemplate: adminProcedure
    .input(z.object({ id: z.string(), approved: z.boolean() }))
    .mutation(async ({ input }) => {
      return prisma.taskTemplate.update({ where: { id: input.id }, data: { approved: input.approved } })
    }),

  rejectTemplate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.taskTemplate.update({ where: { id: input.id }, data: { isActive: false, approved: false } })
    }),

  taskPerformance: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input }) => {
      const task = await prisma.task.findUnique({ where: { id: input.taskId } })
      const userTasks = await prisma.userTask.findMany({ where: { taskId: input.taskId } })
      const completed = userTasks.filter((u) => u.completed).length
      return {
        task,
        totalUsers: userTasks.length,
        completed,
        completionRate: userTasks.length > 0 ? completed / userTasks.length : 0,
        averageProgress: userTasks.length > 0 ? userTasks.reduce((s, u) => s + u.progress, 0) / userTasks.length : 0,
      }
    }),
})