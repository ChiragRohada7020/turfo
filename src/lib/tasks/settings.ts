import prisma from "@/lib/prisma"

export async function getTaskSettings(ownerId?: string | null) {
  if (ownerId) {
    const ownerSettings = await prisma.taskSettings.findUnique({ where: { ownerId } })
    if (ownerSettings) return ownerSettings
  }
  // global
  let global = await prisma.taskSettings.findFirst({ where: { ownerId: null } })
  if (!global) {
    global = await prisma.taskSettings.create({ data: { ownerId: null } })
  }
  return global
}

export async function updateTaskSettings(ownerId: string | null, input: any) {
  const data: any = {}
  if (input.aiEnabled !== undefined) data.aiEnabled = input.aiEnabled
  if (input.maxActiveTasks !== undefined) data.maxActiveTasks = input.maxActiveTasks
  if (input.maxRewardPointsPerTask !== undefined) data.maxRewardPointsPerTask = input.maxRewardPointsPerTask
  if (input.monthlyRewardBudget !== undefined) data.monthlyRewardBudget = input.monthlyRewardBudget
  if (input.defaultExpiryDays !== undefined) data.defaultExpiryDays = input.defaultExpiryDays
  if (input.minBookingValue !== undefined) data.minBookingValue = input.minBookingValue

  return prisma.taskSettings.upsert({
    where: { ownerId: ownerId as any },
    create: { ownerId, ...data },
    update: data,
  })
}