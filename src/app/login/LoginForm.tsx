"use client";
import { useActionState, useState } from "react";
import { Mail, Zap } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { demoLogin } from "./actions";

type Mode = "signin" | "register";
type Status = { kind: "idle" | "busy" | "sent" | "error"; msg?: string };

const input = "h-12 rounded-lg border border-[#d9d0c3] bg-canvas px-4 text-base";
const secondary = "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#d9d0c3] bg-canvas px-5 text-base font-medium hover:bg-soft disabled:opacity-60";

export function LoginForm({ next, demoEnabled }: { next: string; demoEnabled: boolean }) {
  const [demo, demoAction, demoPending] = useActionState(demoLogin, null);
  const [mode, setMode] = useState<Mode>("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const busy = status.kind === "busy";
  const redirectTo = () => `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "busy" });
    try {
      const sb = supabaseBrowser();
      if (mode === "register") {
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } });
        if (error) return setStatus({ kind: "error", msg: /registered|exists/i.test(error.message) ? "This email already has an account. Please sign in." : error.message });
        if (data.user && data.user.identities?.length === 0) return setStatus({ kind: "error", msg: "This email already has an account. Please sign in." });
        if (!data.session) return setStatus({ kind: "sent", msg: "Account created. Check your email and open the link to confirm, then sign in." });
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) return setStatus({ kind: "error", msg: "Email or password is not correct." });
      }
      window.location.assign(next); // full load so the new session cookie is sent
    } catch {
      setStatus({ kind: "error", msg: "Something went wrong. Please try again." });
    }
  }

  async function magicLink() {
    if (!email) return setStatus({ kind: "error", msg: "Type your email first." });
    setStatus({ kind: "busy" });
    try {
      const { error } = await supabaseBrowser().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
      setStatus(error ? { kind: "error", msg: "We could not send the link. Please try again in a few minutes." } : { kind: "sent", msg: "Link sent. Check your email." });
    } catch {
      setStatus({ kind: "error", msg: "Something went wrong. Please try again." });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div role="group" aria-label="Sign in or register" className="flex rounded-xl bg-card p-1">
        {([["register", "Register"], ["signin", "Sign in"]] as const).map(([m, l]) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => { setMode(m); setStatus({ kind: "idle" }); }}
            className={`min-h-11 flex-1 rounded-lg text-sm font-medium ${mode === m ? "bg-canvas text-ink shadow-sm" : "text-body"}`}>{l}</button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label htmlFor="email" className="text-sm font-medium text-body">Email</label>
        <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="aap@example.com" className={input} />
        <label htmlFor="pw" className="text-sm font-medium text-body">Password {mode === "register" && <span className="font-normal text-muted">· at least 8 characters</span>}</label>
        <input id="pw" type="password" required minLength={8} autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
        <button type="submit" disabled={busy} className="mt-1 min-h-12 rounded-lg bg-cta px-5 text-base font-medium text-white hover:bg-cta-hover disabled:opacity-60">
          {busy ? "Please wait…" : mode === "register" ? "Account banayein" : "Sign in"}
        </button>
        {status.kind === "sent" && <p role="status" className="text-sm text-[#24552f]">{status.msg}</p>}
        {status.kind === "error" && <p role="alert" className="text-sm text-[#8f2525]">{status.msg}</p>}
      </form>

      <button type="button" onClick={magicLink} disabled={busy} className={secondary}><Mail size={18} aria-hidden /> Password ke baghair: email link</button>

      {demoEnabled && (
        <form action={demoAction} className="flex flex-col gap-2 border-t border-hairline pt-5">
          <button type="submit" disabled={demoPending} className={secondary}><Zap size={18} aria-hidden /> {demoPending ? "Signing in…" : "Demo Login"}</button>
          {demo?.error && <p role="alert" className="text-sm text-[#8f2525]">{demo.error}</p>}
        </form>
      )}
    </div>
  );
}
