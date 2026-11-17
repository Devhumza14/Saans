import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PlanView } from "@/components/PlanView";
import { SiteHeader } from "@/components/SiteHeader";
import { describeMember, type MemberRow } from "@/lib/data";
import { avatarFor } from "@/lib/demo";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Member({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!supabaseConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const sb = await supabaseServer();
  const { data: m } = await sb.from("members").select("*").eq("id", id).maybeSingle<MemberRow>(); // RLS: own family only
  if (!m) notFound();
  const av = avatarFor(m.avatar);

  return (
    <>
      <SiteHeader signedIn />
      <main className="mx-auto flex max-w-[720px] flex-col gap-8 px-4 pb-16 pt-6 sm:px-0">
        <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-medium text-body hover:text-ink"><ArrowLeft size={18} aria-hidden /> Dashboard</Link>
        <div className="flex items-center gap-4">
          <span className="grid size-16 place-items-center rounded-full text-2xl font-semibold" style={{ background: av.bg, color: av.fg }} aria-hidden>{m.name[0]?.toUpperCase()}</span>
          <div className="flex flex-col gap-1">
            <h1 className="font-serif text-[36px] leading-none tracking-[-0.6px]">{m.name}</h1>
            <span className="text-sm text-body">{describeMember(m)}</span>
          </div>
        </div>
        <PlanView memberId={m.id} />
      </main>
    </>
  );
}
