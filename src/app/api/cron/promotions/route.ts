import { NextRequest, NextResponse } from "next/server"
import { refreshDemandForecasts } from "@/lib/promotions/demandForecast"
import { refreshPlayerPreferences } from "@/lib/promotions/playerPreference"
import { generateLowDemandCampaigns } from "@/lib/promotions/campaignEngine"

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret")
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const forecasts = await refreshDemandForecasts()
  const prefs = await refreshPlayerPreferences()
  const campaigns = await generateLowDemandCampaigns()

  return NextResponse.json({ forecasts, prefs, campaigns })
}
