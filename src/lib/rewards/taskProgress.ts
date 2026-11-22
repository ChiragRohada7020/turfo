import prisma from "@/lib/prisma"
import { TaskType } from "@prisma/client"
import { verifyAndCreditTask } from "@/lib/tasks/verification"

const ACTION_TYPES = new Set<TaskType>([
  "JOIN_OPEN_GAMES" as any,
  "CREATE_TEAM" as any,
  "REFER_FRIEND" as any,
  "COMPLETE_PROFILE" as any,
  "PLAY_TOURNAMENT" as any,
  "PLAY_GAMES" as any,
])

export async function trackTaskProgress(userId: string, type: TaskType, increment = 1) {
  if (type === ("BOOK_TURFS" as any) || !ACTION_TYPES.has(type)) return

  const tasks = await prisma.task.findMany({
    where: { isActive: true, type, OR: [{ userId: null }, { userId }] },
  })

  for (const task of tasks) {
    if (task.expiresAt && new Date(task.expiresAt) < new Date()) continue

    const existing = await prisma.userTask.findUnique({
      where: { userId_taskId: { userId, taskId: task.id } },
    })

    const currentProgress = existing?.progress || 0
    const newProgress = Math.min(task.target, currentProgress + increment)

    await prisma.userTask.upsert({
      where: { userId_taskId: { userId, taskId: task.id } },
      create: {
        userId,
        taskId: task.id,
        progress: newProgress,
        completed: newProgress >= task.target,
        completedAt: newProgress >= task.target ? new Date() : null,
        status: newProgress >= task.target ? "COMPLETED" : newProgress > 0 ? "IN_PROGRESS" : "AVAILABLE",
        startedAt: newProgress > 0 ? new Date() : null,
      },
      update: {
        progress: newProgress,
        completed: newProgress >= task.target || existing?.completed,
        completedAt: newProgress >= task.target && !existing?.completed ? new Date() : existing?.completedAt,
        status: newProgress >= task.target ? "COMPLETED" : newProgress > 0 ? "IN_PROGRESS" : "AVAILABLE",
      },
    })

    await verifyAndCreditTask(userId, task.id)
  }
}
