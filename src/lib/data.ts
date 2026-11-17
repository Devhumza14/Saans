import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemberProfile } from "@/lib/risk/engine";

export type HouseholdRow = { id: string; name: string; area: string; lat: number; lng: number; language: "ur" | "roman" | "en" };
export type MemberRow = {
  id: string;
  household_id: string;
  name: string;
  age_group: MemberProfile["ageGroup"];
  conditions: string[];
  is_pregnant: boolean;
  occupation_exposure: MemberProfile["exposure"];
  commute: MemberProfile["commute"];
  school_going: boolean;
  avatar: string | null;
};

export const toProfile = (m: MemberRow): MemberProfile => ({
  ageGroup: m.age_group,
  conditions: m.conditions ?? [],
  isPregnant: m.is_pregnant,
  exposure: m.occupation_exposure,
  commute: m.commute,
});

const AGE_LABEL = { child: "child", teen: "teen", adult: "adult", senior: "60+" } as const;
const EXPOSURE_LABEL = { indoor: "mostly indoors", mixed: "mixed day", outdoor: "works outdoors", rider: "rider" } as const;

/** "60+ · asthma, heart · mostly indoors" */
export function describeMember(m: MemberRow): string {
  const bits: string[] = [AGE_LABEL[m.age_group]];
  if (m.conditions?.length) bits.push(m.conditions.join(", "));
  if (m.is_pregnant) bits.push("pregnant");
  bits.push(EXPOSURE_LABEL[m.occupation_exposure]);
  if (m.commute !== "none") bits.push(m.commute);
  if (m.school_going) bits.push("school");
  return bits.join(" · ");
}

/** Plain-language profile for the LLM prompt. */
export function promptProfile(m: MemberRow): Record<string, unknown> {
  return {
    age_group: m.age_group,
    conditions: m.conditions ?? [],
    pregnant: m.is_pregnant,
    daily_exposure: m.occupation_exposure,
    commute: m.commute,
    goes_to_school: m.school_going,
  };
}

export async function getHousehold(sb: SupabaseClient): Promise<{ household: HouseholdRow; members: MemberRow[] } | null> {
  const { data: household } = await sb.from("households").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!household) return null;
  const { data: members } = await sb.from("members").select("*").eq("household_id", household.id).order("created_at");
  return { household: household as HouseholdRow, members: (members ?? []) as MemberRow[] };
}

/** Start of today in Lahore (UTC+5), as an ISO string. */
export function startOfLahoreDay(): string {
  const DAY = 86_400_000;
  const OFFSET = 5 * 3_600_000;
  return new Date(Math.floor((Date.now() + OFFSET) / DAY) * DAY - OFFSET).toISOString();
}

export const DAILY_AI_LIMIT = 30;

/** Fresh plans + user chat messages today. Cached plans are not AI calls and are not counted. */
export async function aiCallsToday(sb: SupabaseClient, household: HouseholdRow, memberIds: string[]): Promise<number> {
  const since = startOfLahoreDay();
  const [plans, msgs] = await Promise.all([
    memberIds.length
      ? sb.from("plans").select("id", { count: "exact", head: true }).in("member_id", memberIds).gte("created_at", since)
      : Promise.resolve({ count: 0 }),
    sb.from("messages").select("id", { count: "exact", head: true }).eq("household_id", household.id).eq("role", "user").gte("created_at", since),
  ]);
  return (plans.count ?? 0) + (msgs.count ?? 0);
}
