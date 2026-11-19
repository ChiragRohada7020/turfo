import prisma from "@/lib/prisma"
import { TaskType } from "@prisma/client"

export async function trackTaskProgress(userId: string, type: TaskType, increment = 1) {
  const tasks = await prisma.task.findMany({
    where: { isActive: true, type, OR: [{ userId: null }, { userId }] },
  })

  for (const task of tasks) {
    const existing = await prisma.userTask.findUnique({
      where: { userId_taskId: { userId, taskId: task.id } },
    })

    const currentProgress = existing?.progress || 0
    const newProgress = Math.min(task.target, currentProgress + increment)
    const justCompleted = !existing?.completed && newProgress >= task.target

    await prisma.userTask.upsert({
      where: { userId_taskId: { userId, taskId: task.id } },
      create: { userId, taskId: task.id, progress: newProgress, completed: newProgress >= task.target, completedAt: newProgress >= task.target ? new Date() : null },
      update: { progress: newProgress, completed: newProgress >= task.target || existing?.completed, completedAt: newProgress >= task.target && !existing?.completed ? new Date() : existing?.completedAt },
    })

    if (justCompleted && task.rewardPoints > 0) {
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { rewardPoints: { increment: task.rewardPoints } } }),
        prisma.rewardTransaction.create({
          data: { userId, points: task.rewardPoints, type: "EARNED", description: `Task completed: ${task.title}`, referenceId: task.id },
        }),
      ])
    }
  }
}
