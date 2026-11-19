import prisma from "@/lib/prisma"
import { generateLowDemandCampaigns } from "@/lib/promotions/campaignEngine"

export async function runKiloPromotionDecision(ownerId?: string) {
  const apiKey = process.env.KILO_API_KEY
  const apiUrl = process.env.KILO_API_URL || "https://ai-gateway.kilo.ai/api/v1/chat/completions"

  let aiDecision: any = null
  if (apiKey) {
    try {
      const summary = await buildSummary(ownerId)
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: process.env.KILO_MODEL || "kilo-auto/small",
          messages: [
            { role: "system", content: "You are a promotion decision engine. Return strict JSON only." },
            { role: "user", content: `Decide whether to run low-demand promotions. Data: ${JSON.stringify(summary)}. Return JSON: {"run":boolean,"maxCampaigns":number,"rationale":string}` },
          ],
          temperature: 0.2,
        }),
      })
      const json = await res.json()
      const content = json?.choices?.[0]?.message?.content
      if (content) {
        const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim()
        aiDecision = JSON.parse(cleaned)
      }
    } catch (e) {
      console.error("Kilo AI decision failed", e)
    }
  }

  const maxCampaigns = typeof aiDecision?.maxCampaigns === "number" ? aiDecision.maxCampaigns : 3
  const run = aiDecision?.run !== false

  let result: any = { aiDecision, run: false, campaigns: 0 }
  if (run) {
    const gen = await generateLowDemandCampaigns(ownerId, maxCampaigns)
    result = { aiDecision, run: true, campaigns: gen.campaigns, details: gen.details }
  }

  await prisma.promotionAudit.create({
    data: {
      action: "KILO_DECISION",
      metadata: result as any,
    },
  })

  return result
}

async function buildSummary(ownerId?: string) {
  const facilities = await prisma.facility.findMany({
    where: ownerId ? { ownerId, isActive: true } : { isActive: true },
    select: { id: true, name: true, city: true },
  })
  const lowForecasts = await prisma.demandForecast.count({ where: { demandLevel: "LOW" } })
  const players = await prisma.user.count({ where: { role: "PLAYER" } })
  return { facilities: facilities.length, lowForecasts, players, ownerId }
}
