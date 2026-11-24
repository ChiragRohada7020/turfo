import prisma from "@/lib/prisma"
import { analyzePlayer } from "./analysis"
import { getTaskSettings } from "./settings"
import { TaskCategory, TaskType } from "@prisma/client"

export interface TaskSpec {
  title: string
  description: string
  type: any
  category: any
  target: number
  rewardPoints: number
  criteria: any
  expiryDays: number
  targetSport?: string
  targetTurfId?: string
}

const SPORTS = ["FOOTBALL", "CRICKET", "BADMINTON", "TENNIS", "BASKETBALL", "VOLLEYBALL", "PICKLEBALL", "TABLE_TENNIS", "PS_GAMES"]

async function resolveOwnerId(userId: string): Promise<string | null> {
  const booking = await prisma.booking.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { facility: { select: { ownerId: true } } },
  })
  return booking?.facility?.ownerId || null
}

function clampRewards(specs: TaskSpec[], settings: any): TaskSpec[] {
  const max = settings?.maxRewardPointsPerTask || 0
  return specs.map((s) => ({
    ...s,
    rewardPoints: max > 0 ? Math.min(s.rewardPoints, max) : s.rewardPoints,
  }))
}

function fallbackSpecs(situation: any, settings: any): TaskSpec[] {
  const specs: TaskSpec[] = []
  const expiry = settings.defaultExpiryDays || 7

  if (situation.isNewPlayer) {
    specs.push({
      title: "Complete your first booking",
      description: "Make your first successful turf booking to earn welcome points.",
      type: "BOOK_TURFS",
      category: "BOOKING",
      target: 1,
      rewardPoints: 50,
      criteria: normalizeCriteria({ criteria: { type: "completed_bookings", count: 1 }, target: 1 }, settings),
      expiryDays: expiry + 7,
    })
  }

  if (situation.isInactive) {
    specs.push({
      title: "Come back and complete a booking",
      description: "Return to the platform and complete a booking within 3 days.",
      type: "BOOK_TURFS",
      category: "COMEBACK",
      target: 1,
      rewardPoints: 50,
      criteria: { type: "booking_within_days", days: 3 },
      expiryDays: 3,
    })
  }

  if (situation.isRegular) {
    const target = 3
    specs.push({
      title: `Complete ${target} bookings this week`,
      description: "Keep your momentum going with 3 successful bookings this week.",
      type: "BOOK_TURFS",
      category: "REPEAT_BOOKING",
      target,
      rewardPoints: 100,
      criteria: { type: "distinct_bookings", count: target, windowDays: 7 },
      expiryDays: 7,
    })
  }

  if (situation.isWeekendPlayer) {
    specs.push({
      title: "Complete a weekend booking",
      description: "Book and complete a session on Saturday or Sunday.",
      type: "BOOK_TURFS",
      category: "WEEKEND",
      target: 1,
      rewardPoints: 40,
      criteria: { type: "weekend_booking", count: 1 },
      expiryDays: expiry,
    })
  }

  if (situation.isGroupPlayer) {
    specs.push({
      title: "Complete a group booking with friends",
      description: "Bring your friends along for a group booking.",
      type: "BOOK_TURFS",
      category: "GROUP_BOOKING",
      target: 1,
      rewardPoints: 75,
      criteria: { type: "group_booking", minParticipants: 2 },
      expiryDays: expiry,
    })
  }

  if (situation.isLoyal) {
    const milestone = Math.max(10, Math.ceil((situation.completedBookings + 1) / 10) * 10)
    specs.push({
      title: `Complete your ${milestone}th successful booking`,
      description: `Reach ${milestone} completed bookings for a loyalty bonus.`,
      type: "BOOK_TURFS",
      category: "LOYALTY",
      target: 1,
      rewardPoints: 150,
      criteria: { type: "total_completed_bookings", count: milestone },
      expiryDays: expiry + 14,
    })
  }

  if (situation.sportsToExplore.length > 0) {
    const sport = situation.sportsToExplore[0]
    specs.push({
      title: `Try ${sport.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}`,
      description: `Book a ${sport.toLowerCase().replace(/_/g, " ")} session to explore a new sport.`,
      type: "BOOK_TURFS",
      category: "SPORT_EXPLORATION",
      target: 1,
      rewardPoints: 60,
      criteria: { type: "sport_booking", sport },
      expiryDays: expiry + 7,
      targetSport: sport,
    })
  }

  // Engagement task
  specs.push({
    title: "Join 2 open games",
    description: "Join open games to meet new players.",
    type: "JOIN_OPEN_GAMES",
    category: "ENGAGEMENT",
    target: 2,
    rewardPoints: 100,
    criteria: { type: "join_open_games", count: 2 },
    expiryDays: expiry,
  })

  return clampRewards(specs, settings)
}

const SUPPORTED_CRITERIA = new Set(["completed_bookings", "total_completed_bookings", "distinct_bookings", "sport_booking", "weekend_booking", "group_booking", "booking_within_days", "join_open_games"])

export function normalizeCriteria(spec: any, settings: any): any {
  const c = spec.criteria || {}
  if (SUPPORTED_CRITERIA.has(c.type)) {
    if (c.type === "sport_booking" && !c.sport && spec.targetSport) c.sport = spec.targetSport
    if (c.type === "distinct_bookings") {
      c.count = c.count || spec.target || 1
      c.windowDays = c.windowDays || 7
    }
    if (c.type === "booking_within_days") c.days = c.days || 3
    if (c.type === "group_booking") c.minParticipants = c.minParticipants || 2
    return c
  }
  if (spec.type === "JOIN_OPEN_GAMES") return { type: "join_open_games", count: spec.target || 2 }
  if (spec.category === "SPORT_EXPLORATION") return { type: "sport_booking", sport: spec.targetSport || "FOOTBALL" }
  if (spec.category === "WEEKEND") return { type: "weekend_booking" }
  if (spec.category === "GROUP_BOOKING") return { type: "group_booking", minParticipants: 2 }
  if (spec.category === "COMEBACK") return { type: "booking_within_days", days: 3 }
  if (spec.category === "LOYALTY") return { type: "total_completed_bookings", count: spec.target || 10 }
  if (spec.category === "REPEAT_BOOKING") return { type: "distinct_bookings", count: spec.target || 3, windowDays: 7 }
  return { type: "completed_bookings", count: spec.target || 1 }
}

async function aiSpecs(situation: any, settings: any): Promise<TaskSpec[] | null> {
  const apiKey = process.env.KILO_API_KEY
  const apiUrl = process.env.KILO_API_URL || "https://ai-gateway.kilo.ai/api/v1/chat/completions"
  if (!apiKey) return null
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.KILO_MODEL || "kilo-auto/small",
        messages: [
          {
            role: "system",
            content: "You are a task personalization engine for a sports turf booking platform. Return strict JSON array only. Each item: {title,description,type,category,target,rewardPoints,criteria,expiryDays,targetSport?}. type in [PLAY_GAMES,BOOK_TURFS,JOIN_OPEN_GAMES,CREATE_TEAM,REFER_FRIEND,COMPLETE_PROFILE,PLAY_TOURNAMENT]. category in [BOOKING,REPEAT_BOOKING,GROUP_BOOKING,LOYALTY,SPORT_EXPLORATION,WEEKEND,COMEBACK,ENGAGEMENT,PROFILE]. criteria MUST be one of: {\"type\":\"completed_bookings\",\"count\":N}, {\"type\":\"total_completed_bookings\",\"count\":N}, {\"type\":\"distinct_bookings\",\"count\":N,\"windowDays\":N}, {\"type\":\"sport_booking\",\"sport\":\"SPORT\"}, {\"type\":\"weekend_booking\"}, {\"type\":\"group_booking\",\"minParticipants\":N}, {\"type\":\"booking_within_days\",\"days\":N}, {\"type\":\"join_open_games\",\"count\":N}.",
          },
          {
            role: "user",
            content: `Player situation: ${JSON.stringify(situation)}. Available sports on the platform: ${JSON.stringify(await (async () => { const rows = await prisma.facility.findMany({ select: { sportTypes: true } }); return Array.from(new Set(rows.flatMap((r: any) => r.sportTypes || []))) })())}. Only create tasks for sports in this list. Max reward per task: ${settings.maxRewardPointsPerTask}. Max active tasks: ${settings.maxActiveTasks}. Generate up to ${settings.maxActiveTasks} relevant, non-duplicate personalized tasks. Financially reasonable rewards. Return JSON array only.`,
          },
        ],
        temperature: 0.3,
      }),
      signal: controller.signal,
    })
    const json = await res.json()
    const content = json?.choices?.[0]?.message?.content
    if (!content) return null
    const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim()
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return null
    const specs = parsed.map((p: any) => ({
      title: String(p.title),
      description: String(p.description || ""),
      type: ["PLAY_GAMES", "BOOK_TURFS", "JOIN_OPEN_GAMES", "CREATE_TEAM", "REFER_FRIEND", "COMPLETE_PROFILE", "PLAY_TOURNAMENT"].includes(p.type) ? p.type : "BOOK_TURFS",
      category: ["BOOKING", "REPEAT_BOOKING", "GROUP_BOOKING", "LOYALTY", "SPORT_EXPLORATION", "WEEKEND", "COMEBACK", "ENGAGEMENT", "PROFILE"].includes(p.category) ? p.category : "ENGAGEMENT",
      target: Number(p.target) || 1,
      rewardPoints: Number(p.rewardPoints) || 25,
      criteria: normalizeCriteria(p, settings),
      expiryDays: Number(p.expiryDays) || settings.defaultExpiryDays || 7,
      targetSport: typeof p.targetSport === "string" ? p.targetSport.toUpperCase() : p.targetSport,
    }))
    return clampRewards(specs, settings)
  } catch (e) {
    console.error("AI task gen failed", e)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function generateTaskSpecs(userId: string, ownerId?: string | null) {
  const situation = await analyzePlayer(userId)
  const resolvedOwner = ownerId === undefined ? await resolveOwnerId(userId) : ownerId
  const settings = await getTaskSettings(resolvedOwner)
  if (!settings.aiEnabled) {
    return { situation, specs: fallbackSpecs(situation, settings), settings, usedAI: false }
  }
  const ai = await aiSpecs(situation, settings)
  if (ai && ai.length > 0) {
    const capped = ai.map((s) => ({
      ...s,
      rewardPoints: Math.min(s.rewardPoints, settings.maxRewardPointsPerTask),
    }))
    return { situation, specs: clampRewards(capped, settings), settings, usedAI: true }
  }
  return { situation, specs: fallbackSpecs(situation, settings), settings, usedAI: false }
}

export async function generateTasksForPlayer(userId: string, ownerId?: string | null) {
  const { specs: rawSpecs, settings, usedAI } = await generateTaskSpecs(userId, ownerId)
  const specs = rawSpecs.map((s: any) => ({ ...s, criteria: normalizeCriteria(s, settings) }))

  // active count
  const activeCount = await prisma.userTask.count({
    where: {
      userId,
      status: { in: ["AVAILABLE", "IN_PROGRESS"] },
      task: { isActive: true, expiresAt: { gte: new Date() } },
    },
  })

  const availableSlots = Math.max(0, settings.maxActiveTasks - activeCount)
  if (availableSlots === 0) {
    return { created: 0, total: specs.length, reason: "active_limit_reached" }
  }

  const existingTasks = await prisma.task.findMany({
    where: { userId, isActive: true, expiresAt: { gte: new Date() } },
  })
  const normalize = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "")
  const existingTitles = new Set(existingTasks.map((t) => normalize(t.title)))
  const existingKeys = new Set(existingTasks.map((t) => `${t.type}:${t.targetSport || ""}:${t.targetTurfId || ""}`))

  // budget check
  let created = 0
  for (const spec of specs) {
    if (created >= availableSlots) break
    const key = `${spec.type}:${spec.targetSport || ""}:${spec.targetTurfId || ""}`
    if (existingTitles.has(normalize(spec.title))) continue
    if (existingKeys.has(key) && spec.title !== "") continue

    // budget
    if (settings.monthlyRewardBudget > 0) {
      const remaining = settings.monthlyRewardBudget - settings.spentRewardBudget
      if (remaining < spec.rewardPoints) continue
    }

    const expiresAt = new Date(Date.now() + (spec.expiryDays || settings.defaultExpiryDays) * 24 * 60 * 60 * 1000)
    const task = await prisma.task.create({
      data: {
        title: spec.title,
        description: spec.description,
        type: spec.type,
        category: spec.category,
        target: spec.target,
        rewardPoints: spec.rewardPoints,
        isAiGenerated: !!usedAI,
        userId,
        targetSport: ["FOOTBALL", "CRICKET", "TENNIS", "BADMINTON", "BASKETBALL", "VOLLEYBALL", "SWIMMING", "GYM", "MULTI_SPORT", "PICKLEBALL", "PS_GAMES", "TABLE_TENNIS", "OTHER"].includes(spec.targetSport) ? spec.targetSport : null,
        targetTurfId: spec.targetTurfId,
        completionCriteria: spec.criteria,
        startDate: new Date(),
        expiresAt,
        status: "AVAILABLE",
      },
    })
    await prisma.userTask.create({
      data: { userId, taskId: task.id, progress: 0, status: "AVAILABLE" },
    })
    created++
    existingTitles.add(normalize(spec.title))

    // update spent budget
    if (settings.monthlyRewardBudget > 0) {
      await prisma.taskSettings.update({
        where: { id: settings.id },
        data: { spentRewardBudget: { increment: spec.rewardPoints } },
      }).catch(() => {})
    }
  }

  // cache recommendation
  await prisma.playerPreference.upsert({
    where: { userId },
    create: { userId, taskRecommendation: specs as any, taskComputedAt: new Date() },
    update: { taskRecommendation: specs as any, taskComputedAt: new Date() },
  }).catch(() => {})

  return { created, total: specs.length }
}
export const generatePersonalizedTasks = generateTasksForPlayer
export const generateTasks = generateTasksForPlayer
