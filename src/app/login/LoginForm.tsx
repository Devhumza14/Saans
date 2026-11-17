"use client";
import { useActionState, useState } from "react";
import { Mail, Zap } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { demoLogin } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [demo, demoAction, demoPending] = useActionState(demoLogin, null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ kind: "idle" | "sending" | "sent" | "error"; msg?: string }>({ kind: "idle" });

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "sending" });
    try {
      const { error } = await supabaseBrowser().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      setStatus(error ? { kind: "error", msg: "We could not send the link. Check the email address and try again." } : { kind: "sent" });
    } catch {
      setStatus({ kind: "error", msg: "Something went wrong. Please try again." });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={demoAction} className="flex flex-col gap-2">
        <button type="submit" disabled={demoPending} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-cta px-5 text-base font-medium text-white hover:bg-cta-hover disabled:opacity-60">
          <Zap size={18} aria-hidden /> {demoPending ? "Signing in…" : "Demo Login"}
        </button>
        <p className="text-[13px] text-muted">One click, no email. Opens the synthetic Khan Family.</p>
        {demo?.error && <p role="alert" className="text-sm text-[#8f2525]">{demo.error}</p>}
      </form>

      <div className="flex items-center gap-3 text-xs uppercase tracking-[1.5px] text-muted"><span className="h-px flex-1 bg-hairline" /> ya <span className="h-px flex-1 bg-hairline" /></div>

      <form onSubmit={sendLink} className="flex flex-col gap-3">
        <label htmlFor="email" className="text-sm font-medium text-body">Email se magic link</label>
        <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="aap@example.com" className="h-12 rounded-lg border border-[#d9d0c3] bg-canvas px-4 text-base" />
        <button type="submit" disabled={status.kind === "sending"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#d9d0c3] bg-canvas px-5 text-base font-medium hover:bg-soft disabled:opacity-60">
          <Mail size={18} aria-hidden /> {status.kind === "sending" ? "Sending…" : "Link bhejein"}
        </button>
        {status.kind === "sent" && <p role="status" className="text-sm text-[#24552f]">Link bhej diya gaya. Apna email check karein.</p>}
        {status.kind === "error" && <p role="alert" className="text-sm text-[#8f2525]">{status.msg}</p>}
      </form>
    </div>
  );
}
