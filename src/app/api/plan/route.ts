import { NextResponse } from "next/server";
import { z } from "zod";
import { getAirData } from "@/lib/air/openmeteo";
import { AiError } from "@/lib/ai/openrouter";
import { generatePlan } from "@/lib/ai/plan";
import type { Plan, PlanResponse } from "@/lib/ai/schemas";
import { DAILY_AI_LIMIT, aiCallsToday, promptProfile, toProfile, type HouseholdRow, type MemberRow } from "@/lib/data";
import { aqiBand, bestWindows, formatWindow, maskFor, personalRisk, riskyWindows } from "@/lib/risk/engine";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";

export const maxDuration = 60;

const Body = z.object({ memberId: z.string().uuid(), force: z.boolean().optional() });
const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

const CACHE_MINUTES = 60;
const CACHE_AQI_DELTA = 20;

export async function POST(req: Request) {
  if (!supabaseConfigured()) return fail(503, "The app is not connected to its database yet.");
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(400, "Please choose a family member.");

  try {
    const sb = await supabaseServer();
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) return fail(401, "Please sign in again.");

    // RLS guarantees these rows belong to the signed-in user.
    const { data: member } = await sb.from("members").select("*").eq("id", body.data.memberId).maybeSingle<MemberRow>();
    if (!member) return fail(404, "We could not find that family member.");
    const { data: household } = await sb.from("households").select("*").eq("id", member.household_id).maybeSingle<HouseholdRow>();
    if (!household) return fail(404, "We could not find that household.");

    let air;
    try {
      air = await getAirData(household.area);
    } catch {
      return fail(503, "Live air data is unavailable right now. Please try again in a minute.");
    }

    const aqi = Math.round(air.data.current.aqi);
    const profile = toProfile(member);
    const risk = personalRisk(aqi, profile);
    const engine = { level: risk.level, score: risk.score, effectiveAqi: risk.effectiveAqi, reasons: risk.reasons };
    const respond = (plan: Plan, generatedAt: string, fromCache: boolean): PlanResponse => ({
      plan, engine, aqi, band: aqiBand(aqi).label, area: household.area, generatedAt, fromCache, airCached: air.cached,
    });

    // Cache: same member + area, AQI within ±20, younger than 60 minutes.
    if (!body.data.force) {
      const since = new Date(Date.now() - CACHE_MINUTES * 60_000).toISOString();
      const { data: hit } = await sb
        .from("plans").select("plan, aqi, created_at, risk_level")
        .eq("member_id", member.id).eq("area", household.area).gte("created_at", since)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (hit && Math.abs(hit.aqi - aqi) <= CACHE_AQI_DELTA && hit.risk_level === risk.level) {
        return NextResponse.json(respond(hit.plan as Plan, hit.created_at, true));
      }
    }

    const { data: siblings } = await sb.from("members").select("id").eq("household_id", household.id);
    const used = await aiCallsToday(sb, household, (siblings ?? []).map((s) => s.id as string));
    if (used >= DAILY_AI_LIMIT) {
      return fail(429, `You have used today's ${DAILY_AI_LIMIT} AI answers. Plans refresh again tomorrow.`);
    }

    const next24 = air.data.hourly.slice(0, 24);
    const plan = await generatePlan({
      name: member.name,
      profile: promptProfile(member),
      area: household.area,
      air: air.data,
      risk,
      mask: maskFor(risk.level, aqi),
      bestWindows: bestWindows(next24, 2, 2).map(formatWindow),
      avoidWindows: riskyWindows(next24, profile),
    });

    const generatedAt = new Date().toISOString();
    const { error } = await sb.from("plans").insert({ member_id: member.id, area: household.area, aqi, risk_level: risk.level, plan });
    if (error) console.error("[plan] could not save plan:", error.code);
    return NextResponse.json(respond(plan, generatedAt, false));
  } catch (e) {
    if (e instanceof AiError) return fail(e.code === "config" ? 503 : 502, e.message);
    console.error("[plan] unexpected:", e instanceof Error ? e.message : "unknown");
    return fail(500, "Something went wrong while writing the plan. Please try again.");
  }
}
