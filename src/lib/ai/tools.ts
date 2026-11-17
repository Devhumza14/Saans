import { getAirData } from "@/lib/air/openmeteo";
import { findArea } from "@/lib/areas";
import { describeMember, toProfile, type HouseholdRow, type MemberRow } from "@/lib/data";
import { aqiBand, bestWindows, formatWindow, personalRisk, whoMultiple } from "@/lib/risk/engine";
import type { ToolDef } from "./openrouter";

const area = { type: "string", description: "Lahore area name, e.g. Gulberg, DHA, Johar Town. Omit for the household's own area." };
const fn = (name: string, description: string, properties: Record<string, unknown>): ToolDef => ({
  type: "function",
  function: { name, description, parameters: { type: "object", properties, additionalProperties: false } },
});

export const TOOLS: ToolDef[] = [
  fn("get_air_quality", "Live AQI, PM2.5 and weather for a Lahore area.", { area }),
  fn("get_forecast", "Hourly AQI forecast for the next hours in a Lahore area.", { area, hours: { type: "number", description: "1-24, default 12" } }),
  fn("find_best_window", "Cleanest 2-hour windows in the next 24h, optionally for one household member.", { area, member: { type: "string", description: "Member name" } }),
  fn("get_household_members", "List household members with their current personal risk level.", {}),
  fn("compare_areas", "Compare live AQI across several Lahore areas.", { areas: { type: "array", items: { type: "string" } } }),
];

type Ctx = { household: HouseholdRow; members: MemberRow[] };
const resolve = (c: Ctx, name?: unknown) => findArea(typeof name === "string" ? name : "") ?? findArea(c.household.area)!;

/** Runs one tool. Every number comes from live data or the engine; errors come back as text for the model. */
export async function runTool(name: string, raw: string, c: Ctx): Promise<unknown> {
  let a: Record<string, unknown> = {};
  try { a = raw ? JSON.parse(raw) : {}; } catch { return { error: "invalid arguments" }; }
  try {
    switch (name) {
      case "get_air_quality": {
        const ar = resolve(c, a.area);
        const { data, cached } = await getAirData(ar.name);
        const x = data.current;
        return { area: ar.name, aqi: Math.round(x.aqi), band: aqiBand(x.aqi).label, pm25: Math.round(x.pm25), pm25_times_who_limit: whoMultiple(x.pm25), wind_kmh: x.wind, temp_c: x.temp, local_time: x.time.slice(11, 16), cached };
      }
      case "get_forecast": {
        const ar = resolve(c, a.area);
        const n = Math.min(24, Math.max(1, Number(a.hours) || 12));
        const { data } = await getAirData(ar.name);
        return { area: ar.name, hourly: data.hourly.slice(0, n).map((h) => ({ time: h.time.slice(11, 16), aqi: h.aqi })) };
      }
      case "find_best_window": {
        const ar = resolve(c, a.area);
        const { data } = await getAirData(ar.name);
        const w = bestWindows(data.hourly.slice(0, 24), 2, 2).map((x) => ({ window: formatWindow(x), avg_aqi: x.avgAqi }));
        const who = typeof a.member === "string" ? c.members.find((m) => m.name.toLowerCase() === a.member!.toString().toLowerCase()) : undefined;
        return { area: ar.name, best_windows: w, member: who?.name ?? null };
      }
      case "get_household_members": {
        const { data } = await getAirData(c.household.area);
        const aqi = Math.round(data.current.aqi);
        return c.members.map((m) => { const r = personalRisk(aqi, toProfile(m)); return { name: m.name, profile: describeMember(m), risk: r.level, sensitivity: r.score, reasons: r.reasons }; });
      }
      case "compare_areas": {
        const list = (Array.isArray(a.areas) ? a.areas : []).slice(0, 5).map((x) => findArea(String(x))).filter((x) => x != null);
        const rows = await Promise.all(list.map(async (ar) => { const { data } = await getAirData(ar.name); return { area: ar.name, aqi: Math.round(data.current.aqi), pm25: Math.round(data.current.pm25) }; }));
        return rows.length ? rows : { error: "no known areas given" };
      }
      default: return { error: "unknown tool" };
    }
  } catch {
    return { error: "data unavailable right now" };
  }
}
