import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CompareBoard, type CompareMember } from "@/components/CompareBoard";
import { PageTint } from "@/components/PageTint";
import { SiteHeader } from "@/components/SiteHeader";
import { getAirData, hhmm, type AirResult } from "@/lib/air/openmeteo";
import { DEFAULT_AREA, findArea } from "@/lib/areas";
import { loadFamily } from "@/lib/family";
import { aqiBand, personalRisk, whoMultiple } from "@/lib/risk/engine";

export const dynamic = "force-dynamic";

export default async function Compare() {
  const fam = await loadFamily();
  const area = findArea(fam.area ?? "") ?? DEFAULT_AREA;
  let air: AirResult | null = null;
  try {
    air = await getAirData(area.name);
  } catch {
    air = null;
  }

  if (!air) {
    return (
      <>
        <SiteHeader signedIn={fam.signedIn} />
        <main className="mx-auto max-w-[640px] px-4 py-24 sm:px-8">
          <h1 className="font-serif text-4xl tracking-[-0.8px]">Air data is unavailable right now</h1>
          <p className="mt-3 text-body">Please try again in a minute.</p>
        </main>
      </>
    );
  }

  const aqi = Math.round(air.data.current.aqi);
  const band = aqiBand(aqi);
  const members: CompareMember[] = fam.members.map((m) => {
    const r = personalRisk(aqi, m.profile);
    return { id: m.id, name: m.name, summary: m.summary, avatar: m.avatar, level: r.level, score: r.score, reasons: r.reasons };
  });

  return (
    <>
      <PageTint tint={band.tint} />
      <SiteHeader signedIn={fam.signedIn} />
      <section aria-labelledby="cmp-h" className="relative overflow-hidden bg-dark text-canvas">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/smog-haze.jpg" alt="" aria-hidden className="absolute inset-0 size-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-dark/90 via-dark/55 to-dark/75" />
        <div className="relative mx-auto flex max-w-[1280px] flex-col gap-7 px-4 pb-10 pt-6 sm:px-8">
          <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-medium text-canvas"><ArrowLeft size={16} aria-hidden /> Dashboard</Link>
          <div className="flex flex-wrap items-end justify-between gap-10">
            <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-3">
              <p className="text-xs font-medium uppercase tracking-[1.5px] text-[#e8a55a]">Same air · {fam.members.length} different plans</p>
              <h1 id="cmp-h" className="font-serif text-[36px] leading-[1.06] tracking-[-1.2px] sm:text-[52px]">One air. A plan for each person.</h1>
              <p className="text-base text-[#cfcbc2]">{fam.householdName} · {area.name}, Lahore</p>
            </div>
            <div className="flex items-center gap-5 rounded-2xl border border-[#3a3631] bg-dark/70 px-6 py-[18px]">
              <div className="flex size-24 items-center justify-center rounded-full border-[9px] font-serif text-[32px]" style={{ borderColor: band.color }}>{aqi}</div>
              <div className="flex flex-col gap-1">
                <span className="text-lg font-medium">{band.label}</span>
                {!air.data.station && <span className="text-sm text-[#cfcbc2]">PM2.5 {Math.round(air.data.current.pm25)} µg/m³ · {whoMultiple(air.data.current.pm25)}× WHO</span>}
                <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[#a09d96]"><span className="size-[7px] rounded-full bg-[#5db872]" />{air.cached ? `cached ${hhmm(air.fetchedAt)}` : `live · ${hhmm(air.fetchedAt)}`}{air.data.current.wind != null ? ` · wind ${Math.round(air.data.current.wind)} km/h` : ""}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pb-14 pt-8 sm:px-8">
        <CompareBoard members={members} />
        <p className="rounded-xl border border-hairline bg-canvas px-5 py-4 text-sm text-body">Risk levels, masks and time windows come from Saans’s rules engine using live Open-Meteo data. The AI writes the words, and its output is checked against the engine before anything is shown.</p>
      </main>
    </>
  );
}
