import { NextResponse } from "next/server";
import { getAirData } from "@/lib/air/openmeteo";
import { ALERT_SYSTEM } from "@/lib/ai/prompts";
import { chatCompletion, planModel } from "@/lib/ai/openrouter";
import { AlertText } from "@/lib/ai/schemas";
import { getHousehold, toProfile } from "@/lib/data";
import { shouldAlert } from "@/lib/risk/engine";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";

export const maxDuration = 60;
const DEDUPE_MS = 3 * 3_600_000;
const strip = (s: string) => s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

/** Engine decides IF to alert; the LLM only words it. Deduped per member for 3h. */
export async function POST() {
  if (!supabaseConfigured()) return NextResponse.json({ alerts: [], unread: 0 });
  try {
    const sb = await supabaseServer();
    if (!(await sb.auth.getUser()).data.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    const h = await getHousehold(sb);
    if (!h) return NextResponse.json({ alerts: [], unread: 0 });

    const since = new Date(Date.now() - DEDUPE_MS).toISOString();
    const { data: recent } = await sb.from("alerts").select("member_id").eq("household_id", h.household.id).gte("created_at", since);
    const done = new Set((recent ?? []).map((a) => a.member_id as string));

    const air = await getAirData(h.household.area).catch(() => null);
    const fresh: unknown[] = [];
    if (air) {
      const aqi = Math.round(air.data.current.aqi);
      for (const m of h.members) {
        const d = shouldAlert(toProfile(m), aqi, air.data.hourly);
        if (!d.alert || done.has(m.id)) continue;
        try {
          const { content } = await chatCompletion({
            model: planModel(), json: true,
            messages: [
              { role: "system", content: ALERT_SYSTEM },
              { role: "user", content: JSON.stringify({ person: m.name, area: h.household.area, aqi, risk: d.level, why: d.reason }) },
            ],
          });
          const text = AlertText.parse(JSON.parse(strip(content ?? "")));
          const { data: row } = await sb.from("alerts").insert({ household_id: h.household.id, member_id: m.id, level: d.level, message_ur: text.ur, message_roman: text.roman, message_en: text.en, aqi }).select().single();
          if (row) fresh.push(row);
        } catch (e) {
          console.warn("[alerts] skipped one alert:", e instanceof Error ? e.message : "unknown"); // never fabricate: no text, no alert
        }
      }
    }
    const { data: list } = await sb.from("alerts").select("*").eq("household_id", h.household.id).order("created_at", { ascending: false }).limit(10);
    return NextResponse.json({ alerts: list ?? [], fresh, unread: (list ?? []).filter((a) => !a.read).length });
  } catch {
    return NextResponse.json({ error: "Could not check alerts." }, { status: 500 });
  }
}

/** Mark all alerts read. */
export async function PATCH() {
  if (!supabaseConfigured()) return NextResponse.json({ ok: true });
  const sb = await supabaseServer();
  await sb.from("alerts").update({ read: true }).eq("read", false);
  return NextResponse.json({ ok: true });
}
