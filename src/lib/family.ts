import { redirect } from "next/navigation";
import type { Loc } from "@/lib/ai/schemas";
import { describeMember, getHousehold, toProfile } from "@/lib/data";
import { DEMO_FAMILY, DEMO_HOUSEHOLD, avatarFor } from "@/lib/demo";
import type { MemberProfile } from "@/lib/risk/engine";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";

export type Fam = { householdName: string; area: string | null; signedIn: boolean; members: { id?: string; name: string; summary: string; avatar: { bg: string; fg: string }; profile: MemberProfile; headline: Loc | null }[] };

/** Signed-in: the user's own household (RLS). No Supabase configured: the synthetic demo family. */
export async function loadFamily(): Promise<Fam> {
  if (!supabaseConfigured()) {
    return {
      householdName: DEMO_HOUSEHOLD.name, area: null, signedIn: false,
      members: DEMO_FAMILY.map((m) => ({ name: m.name, summary: `${m.age} · ${m.summary}`, avatar: m.avatar, profile: m.profile, headline: null })),
    };
  }
  const sb = await supabaseServer();
  if (!(await sb.auth.getUser()).data.user) redirect("/login?next=/dashboard");
  const h = await getHousehold(sb);
  if (!h) redirect("/onboarding");
  const { data: plans } = await sb.from("plans").select("member_id, plan, created_at").in("member_id", h.members.map((m) => m.id)).order("created_at", { ascending: false });
  const headline = new Map<string, Loc>();
  for (const p of plans ?? []) if (!headline.has(p.member_id)) headline.set(p.member_id, (p.plan as { headline: Loc }).headline);
  return {
    householdName: h.household.name, area: h.household.area, signedIn: true,
    members: h.members.map((m, i) => ({ id: m.id, name: m.name, summary: describeMember(m), avatar: avatarFor(m.avatar ?? i), profile: toProfile(m), headline: headline.get(m.id) ?? null })),
  };
}

