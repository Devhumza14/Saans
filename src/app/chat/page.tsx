import { redirect } from "next/navigation";
import { ChatClient } from "@/components/ChatClient";
import { SiteHeader } from "@/components/SiteHeader";
import { getHousehold } from "@/lib/data";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Chat() {
  if (!supabaseConfigured()) redirect("/login");
  const sb = await supabaseServer();
  if (!(await sb.auth.getUser()).data.user) redirect("/login?next=/chat");
  const h = await getHousehold(sb);
  if (!h) redirect("/onboarding");
  const { data } = await sb.from("messages").select("role, content").eq("household_id", h.household.id).order("created_at", { ascending: false }).limit(12);
  const initial = (data ?? []).reverse().map((m) => ({ role: m.role as "user" | "assistant", text: m.content as string }));
  return (
    <>
      <SiteHeader signedIn />
      <main className="mx-auto flex max-w-[720px] flex-col gap-6 px-4 pb-10 pt-8 sm:px-0">
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-[36px] leading-[1.1] tracking-[-0.6px]">Puchho Saans</h1>
          <p className="text-body">Live data se jawab. Har jawab ke upar dikhta hai ke kaun se tools istemal hue.</p>
        </div>
        <ChatClient initial={initial} />
      </main>
    </>
  );
}
