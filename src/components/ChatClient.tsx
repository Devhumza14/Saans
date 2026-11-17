"use client";
import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Wrench } from "lucide-react";

type Msg = { role: "user" | "assistant"; text: string; tools: string[]; error?: string };
const CHIPS = ["Aaj bahar jaana theek hai?", "Ammi ke liye sab se behtar waqt kab hai?", "Gulberg aur DHA mein farq?", "Kal ka forecast kaisa hai?"];
const TOOL_LABEL: Record<string, string> = {
  get_air_quality: "hawa ka data", get_forecast: "forecast", find_best_window: "behtar waqt", get_household_members: "ghar ke log", compare_areas: "areas ka muqabla",
};

export function ChatClient({ initial }: { initial: { role: "user" | "assistant"; text: string }[] }) {
  const [msgs, setMsgs] = useState<Msg[]>(() => initial.map((m) => ({ ...m, tools: [] })));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs]);

  async function ask(q: string) {
    if (!q.trim() || busy) return;
    setInput("");
    setBusy(true);
    const patchLast = (f: (m: Msg) => Msg) => setMsgs((ms) => ms.map((m, i) => (i === ms.length - 1 ? f(m) : m)));
    setMsgs((ms) => [...ms, { role: "user", text: q, tools: [] }, { role: "assistant", text: "", tools: [] }]);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: q }) });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        return patchLast((m) => ({ ...m, error: j?.error ?? "Something went wrong. Please try again." }));
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) {
          if (!l.trim()) continue;
          const ev = JSON.parse(l) as { text?: string; tool?: string; error?: string };
          if (ev.text) patchLast((m) => ({ ...m, text: m.text + ev.text }));
          if (ev.tool) patchLast((m) => ({ ...m, tools: [...m.tools, ev.tool!] }));
          if (ev.error) patchLast((m) => ({ ...m, error: ev.error }));
        }
      }
    } catch {
      patchLast((m) => ({ ...m, error: "Could not reach the server. Please try again." }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div aria-live="polite" className="flex min-h-[320px] flex-col gap-4">
        {msgs.length === 0 && (
          <div className="flex flex-col gap-3 rounded-2xl bg-soft p-5">
            <p className="text-body">Salam! Mujh se hawa, forecast ya apne ghar walon ke baare mein poochein.</p>
            <div className="flex flex-wrap gap-2">{CHIPS.map((c) => <button key={c} type="button" onClick={() => ask(c)} className="min-h-10 rounded-full border border-[#d9d0c3] bg-canvas px-3.5 text-[13px] font-medium hover:bg-card">{c}</button>)}</div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`flex flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}>
            {m.tools.length > 0 && (
              <div className="flex flex-wrap gap-1.5">{m.tools.map((t, k) => <span key={k} className="inline-flex items-center gap-1 rounded-md bg-dark px-2 py-1 font-mono text-xs text-canvas"><Wrench size={11} aria-hidden />{TOOL_LABEL[t] ?? t}</span>)}</div>
            )}
            {(m.text || (busy && i === msgs.length - 1 && !m.error)) && (
              <p className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${m.role === "user" ? "bg-cta text-white" : "bg-card text-ink"}`}>{m.text || <Loader2 size={16} className="animate-spin" aria-label="Thinking" />}</p>
            )}
            {m.error && <p role="alert" className="text-sm text-[#8f2525]">{m.error}</p>}
          </div>
        ))}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void ask(input); }} className="sticky bottom-3 flex gap-2 rounded-2xl border border-hairline bg-canvas p-2 shadow-sm">
        <label htmlFor="q" className="sr-only">Your question</label>
        <input id="q" value={input} maxLength={600} onChange={(e) => setInput(e.target.value)} placeholder="Yahan likhein…" className="h-12 flex-1 bg-transparent px-3 text-base outline-none" />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="grid size-12 place-items-center rounded-xl bg-cta text-white hover:bg-cta-hover disabled:opacity-50"><Send size={18} aria-hidden /></button>
      </form>
    </div>
  );
}
