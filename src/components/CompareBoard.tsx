"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { T } from "@/components/LangProvider";
import type { PlanResponse } from "@/lib/ai/schemas";
import type { RiskLevel } from "@/lib/risk/engine";
import { RISK_STYLE } from "@/lib/risk/style";

export type CompareMember = {
  id?: string;
  name: string;
  summary: string;
  avatar: { bg: string; fg: string };
  level: RiskLevel;
  score: number;
  reasons: string[];
};

type Col = { status: "loading" } | { status: "error"; msg: string } | { status: "ok"; data: PlanResponse };

async function fetchPlan(memberId: string, force: boolean): Promise<Col> {
  try {
    const res = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId, force }) });
    const json = await res.json().catch(() => null);
    return res.ok ? { status: "ok", data: json as PlanResponse } : { status: "error", msg: json?.error ?? "Something went wrong." };
  } catch {
    return { status: "error", msg: "Could not reach the server." };
  }
}

export function CompareBoard({ members }: { members: CompareMember[] }) {
  const [cols, setCols] = useState<Col[]>(() => members.map((m) => (m.id ? { status: "loading" } : { status: "error", msg: "Sign in to generate AI plans." })));
  const [elapsed, setElapsed] = useState<number | null>(null);
  const started = useRef(0);

  const run = useCallback((i: number, force = false) => {
    const id = members[i].id;
    if (!id) return;
    setCols((c) => c.map((x, k) => (k === i ? { status: "loading" } : x)));
    void fetchPlan(id, force).then((r) => setCols((c) => c.map((x, k) => (k === i ? r : x))));
  }, [members]);

  useEffect(() => {
    started.current = performance.now();
    members.forEach((_, i) => run(i)); // all columns start together: parallel generation
  }, [members, run]);

  useEffect(() => {
    if (cols.every((c) => c.status !== "loading") && cols.some((c) => c.status === "ok") && elapsed === null) {
      setElapsed((performance.now() - started.current) / 1000);
    }
  }, [cols, elapsed]);

  return (
    <>
      <div className="grid items-stretch gap-4 [grid-template-columns:repeat(auto-fit,minmax(270px,1fr))]">
        {members.map((m, i) => {
          const s = RISK_STYLE[m.level];
          const col = cols[i];
          return (
            <article key={m.id ?? m.name} className="flex flex-col overflow-hidden rounded-2xl border border-hairline bg-canvas">
              <div className="h-1.5" style={{ background: s.bar }} />
              <div className="flex flex-col gap-3.5 border-b border-[#ebe6df] p-[22px]">
                <div className="flex items-center gap-3">
                  <span className="grid size-[52px] shrink-0 place-items-center rounded-full text-xl font-semibold" style={{ background: m.avatar.bg, color: m.avatar.fg }} aria-hidden>{m.name[0]?.toUpperCase()}</span>
                  <div className="min-w-0">
                    <h2 className="font-serif text-[26px] leading-[1.1] tracking-[-0.3px]">{m.name}</h2>
                    <span className="text-[13px] text-muted">{m.summary}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide" style={{ background: s.bg, color: s.fg }}>
                    <span className="size-2 rounded-full" style={{ background: s.fg }} />{s.label}
                  </span>
                  <span className="font-mono text-xs text-muted">sensitivity {m.score}×</span>
                </div>
              </div>

              {col.status === "loading" && (
                <div aria-busy="true" role="status" className="flex flex-1 flex-col gap-3.5 p-[22px]">
                  <span className="sr-only">Writing {m.name}’s plan</span>
                  <div className="skeleton h-[22px] w-[92%]" /><div className="skeleton h-[22px] w-[70%]" />
                  <div className="grid grid-cols-2 gap-2.5"><div className="skeleton h-14" /><div className="skeleton h-14" /></div>
                  <div className="skeleton h-4 w-[88%]" /><div className="skeleton h-4 w-[80%]" /><div className="skeleton h-4 w-[64%]" />
                  <span className="mt-auto font-mono text-xs text-muted">risk engine ✓ · writing plan…</span>
                </div>
              )}

              {col.status === "error" && (
                <div role="alert" className="flex flex-1 flex-col items-start gap-3 p-[22px]">
                  <AlertTriangle size={18} className="text-[#8a4510]" aria-hidden />
                  <p className="text-sm text-body">{col.msg}</p>
                  {m.id && <button type="button" onClick={() => run(i, true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-hairline px-4 text-sm font-medium hover:bg-soft"><RefreshCw size={14} aria-hidden /> Dobara koshish</button>}
                </div>
              )}

              {col.status === "ok" && (() => {
                const p = col.data.plan;
                const actions = [...p.home, ...p.activity].slice(0, 3);
                return (
                  <div className="flex flex-1 flex-col gap-[18px] p-[22px]">
                    <p className="text-xl font-medium leading-snug"><T text={p.headline} /></p>
                    <dl className="grid grid-cols-2 gap-2.5">
                      <div className="flex flex-col gap-0.5 rounded-[10px] bg-soft px-3 py-2.5"><dt className="text-[11px] font-medium uppercase tracking-[1px] text-muted">Mask</dt><dd className="font-mono text-sm font-medium">{p.mask.type}</dd></div>
                      <div className="flex flex-col gap-0.5 rounded-[10px] bg-soft px-3 py-2.5"><dt className="text-[11px] font-medium uppercase tracking-[1px] text-muted">Better time</dt><dd className="font-mono text-sm font-medium">{p.outdoor.best_windows[0] ?? "—"}</dd></div>
                    </dl>
                    <ol className="flex flex-col gap-2.5">
                      {actions.map((a, k) => (
                        <li key={k} className="flex items-start gap-2.5">
                          <span className="mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-full bg-card text-xs font-semibold text-cta">{k + 1}</span>
                          <span className="text-[15px] leading-relaxed text-[#252523]"><T text={a} /></span>
                        </li>
                      ))}
                    </ol>
                    <div className="mt-auto flex flex-col gap-2 border-t border-dashed border-[#d9d0c3] pt-3.5">
                      <span className="text-[11px] font-medium uppercase tracking-[1px] text-muted">Why different? · risk engine</span>
                      <div className="flex flex-wrap gap-1.5">{m.reasons.map((r) => <span key={r} className="rounded-md bg-dark px-2 py-1 font-mono text-xs text-canvas">{r}</span>)}</div>
                    </div>
                    <Link href={`/member/${m.id}`} className="inline-flex min-h-11 items-center self-start text-sm font-medium text-cta hover:text-cta-hover">Full plan →</Link>
                  </div>
                );
              })()}
            </article>
          );
        })}
      </div>
      {elapsed !== null && <p className="font-mono text-xs text-muted">{cols.filter((c) => c.status === "ok").length} plans · generated in parallel · {elapsed.toFixed(1)}s</p>}
    </>
  );
}
