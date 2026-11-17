"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DEFAULT_AREA, findArea } from "@/lib/areas";
import { DEMO_FAMILY, DEMO_HOUSEHOLD } from "@/lib/demo";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";

const MemberIn = z.object({
  name: z.string().trim().min(1).max(40),
  age_group: z.enum(["child", "teen", "adult", "senior"]),
  conditions: z.array(z.enum(["asthma", "copd", "heart", "diabetes", "allergies"])),
  is_pregnant: z.boolean(),
  occupation_exposure: z.enum(["indoor", "mixed", "outdoor", "rider"]),
  commute: z.enum(["none", "car", "bike", "rickshaw", "public", "walk"]),
  school_going: z.boolean(),
});
const Input = z.object({ name: z.string().trim().min(1).max(60), area: z.string(), members: z.array(MemberIn).min(1).max(8) });
export type HouseholdInput = z.infer<typeof Input>;
export type SaveState = { error: string } | undefined;

/** Setting up again replaces the user's current household (members, plans and alerts cascade). */
async function replaceHousehold(input: HouseholdInput): Promise<SaveState> {
  if (!supabaseConfigured()) return { error: "The app is not connected to its database yet." };
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) redirect("/login?next=/onboarding");

  const area = findArea(input.area) ?? DEFAULT_AREA;
  await sb.from("households").delete().eq("owner_id", auth.user.id);
  const { data: household, error } = await sb
    .from("households")
    .insert({ owner_id: auth.user.id, name: input.name, area: area.name, lat: area.lat, lng: area.lng })
    .select("id").single();
  if (error || !household) return { error: "We could not save your household. Please try again." };

  const { error: mErr } = await sb.from("members").insert(input.members.map((m, i) => ({ ...m, household_id: household.id, avatar: String(i) })));
  if (mErr) return { error: "We could not save the family members. Please try again." };
  return undefined;
}

export async function saveHousehold(raw: unknown): Promise<SaveState> {
  const parsed = Input.safeParse(raw);
  if (!parsed.success) return { error: "Please give the household a name and add at least one person with a name." };
  const res = await replaceHousehold(parsed.data);
  if (res) return res;
  redirect("/dashboard");
}

export async function loadDemoFamily(): Promise<SaveState> {
  const res = await replaceHousehold({
    name: `${DEMO_HOUSEHOLD.name}, ${DEMO_HOUSEHOLD.area}`,
    area: DEMO_HOUSEHOLD.area,
    members: DEMO_FAMILY.map((m) => ({
      name: m.name,
      age_group: m.profile.ageGroup,
      conditions: m.profile.conditions as HouseholdInput["members"][number]["conditions"],
      is_pregnant: m.profile.isPregnant,
      occupation_exposure: m.profile.exposure,
      commute: m.profile.commute,
      school_going: m.schoolGoing,
    })),
  });
  if (res) return res;
  redirect("/dashboard");
}
