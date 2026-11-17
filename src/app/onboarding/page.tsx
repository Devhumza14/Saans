import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { getHousehold } from "@/lib/data";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";
import { OnboardingForm } from "./OnboardingForm";

export const dynamic = "force-dynamic";

export default async function Onboarding() {
  let existing = null;
  if (supabaseConfigured()) {
    const sb = await supabaseServer();
    if (!(await sb.auth.getUser()).data.user) redirect("/login?next=/onboarding");
    existing = await getHousehold(sb);
  }
  return (
    <>
      <SiteHeader signedIn />
      <main className="mx-auto flex max-w-[560px] flex-col gap-8 px-4 py-12 sm:px-0">
        <div className="flex flex-col gap-3">
          <h1 className="font-serif text-[36px] leading-[1.1] tracking-[-0.6px]">Ghar mein kaun kaun hai?</h1>
          <p className="leading-relaxed text-body">Har shakhs ka plan alag banta hai. Sirf utna batayein jitna zaroori ho. Ye maloomat sirf aap ke ghar ke plan ke liye hai.</p>
        </div>
        <OnboardingForm initialName={existing?.household.name ?? ""} initialArea={existing?.household.area ?? "Gulberg"} hasHousehold={Boolean(existing)} />
      </main>
    </>
  );
}
