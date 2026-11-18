"use client";
import Link from "next/link";
import { T } from "@/components/LangProvider";
import type { Loc } from "@/lib/ai/schemas";
import type { RiskLevel } from "@/lib/risk/engine";
import { RISK_STYLE } from "@/lib/risk/style";

export type FamilyCardProps = {
  id?: string;
  name: string;
  summary: string;
  avatar: { bg: string; fg: string };
  level: RiskLevel;
  score: number;
  effectiveAqi: number;
  reasons: string[];
  headline?: Loc | null;
};

export function FamilyCard(p: FamilyCardProps) {
  const s = RISK_STYLE[p.level];
  return (
    <article className="flex flex-col gap-3.5 rounded-2xl border border-hairline bg-canvas p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-full text-lg font-semibold" style={{ background: p.avatar.bg, color: p.avatar.fg }} aria-hidden>{p.name[0]?.toUpperCase()}</span>
        <div className="min-w-0">
          <h3 className="text-lg font-medium">{p.name}</h3>
          <span className="text-[13px] text-muted">{p.summary}</span>
        </div>
      </div>
      <span className="inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide" style={{ background: s.bg, color: s.fg }}>
        <span className="size-[7px] rounded-full" style={{ background: s.fg }} />{s.label} risk
      </span>
      {p.headline ? (
        <p className="flex-1 text-[15px] leading-relaxed text-[#252523]"><T text={p.headline} /></p>
      ) : (
        <p className="font-mono text-xs text-muted">sensitivity {p.score}× → effective AQI {p.effectiveAqi}</p>
      )}
      <ul className="flex flex-wrap gap-1.5">
        {p.reasons.length ? p.reasons.map((x) => <li key={x} className="rounded-md bg-dark px-2 py-1 font-mono text-xs text-canvas">{x}</li>) : <li className="text-sm text-muted">No extra risk factors</li>}
      </ul>
      {p.id && (
        <Link href={`/member/${p.id}`} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cta px-4 text-sm font-medium text-white hover:bg-cta-hover">View plan</Link>
      )}
    </article>
  );
}
