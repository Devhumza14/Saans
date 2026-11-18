import Link from "next/link";
import { AlertTriangle, Clock, Thermometer, Wind } from "lucide-react";
import { AqiRing } from "@/components/AqiRing";
import { AreaSelect } from "@/components/AreaSelect";
import { ForecastChart } from "@/components/ForecastChart";
import { PageTint } from "@/components/PageTint";
import { SiteHeader } from "@/components/SiteHeader";
import { getAirData, hhmm, type AirResult } from "@/lib/air/openmeteo";
import { FamilyCard, type FamilyCardProps } from "@/components/FamilyCard";
import { DEFAULT_AREA, findArea } from "@/lib/areas";
import { loadFamily } from "@/lib/family";
import { aqiBand, bestWindows, personalRisk, whoMultiple, type AqiBand } from "@/lib/risk/engine";

export const dynamic = "force-dynamic";

const LINE: Record<AqiBand["key"], string> = {
  good: "The air is clean. Fine for everyone to go outside.",
  moderate: "Fine for most people, but those with asthma should limit long walks.",
  sensitive: "Children, older adults and people with asthma should limit time outside.",
  unhealthy: "Unhealthy for everyone. Wear an N95 mask if you must go out.",
  very: "Stay indoors. Sensitive people should not go out at all.",
  hazardous: "Go out only if necessary, with an N95. Sensitive people should stay home.",
};

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const { area: q } = await searchParams;
  const fam = await loadFamily();
  const area = findArea(q ?? "") ?? findArea(fam.area ?? "") ?? DEFAULT_AREA;

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
        <main className="mx-auto flex max-w-[640px] flex-col items-start gap-4 px-4 py-24 sm:px-8">
          <AlertTriangle aria-hidden className="text-[#8a4510]" />
          <h1 className="font-serif text-4xl tracking-[-0.8px]">Air data is unavailable right now</h1>
          <p className="text-body">The live air-quality service did not answer and we have no saved reading for {area.name} yet. Please try again in a minute.</p>
          <Link href={`/dashboard?area=${encodeURIComponent(area.name)}`} className="inline-flex min-h-11 items-center rounded-lg bg-cta px-5 font-medium text-white hover:bg-cta-hover">Try again</Link>
        </main>
      </>
    );
  }

  const { data, cached, fetchedAt } = air;
  const c = data.current;
  const band = aqiBand(c.aqi);
  const next24 = data.hourly.slice(0, 24);
  const chart = next24.map((h) => ({ t: h.time.slice(11, 16), aqi: h.aqi }));
  const win = bestWindows(next24, 2)[0];
  const wi = win ? chart.findIndex((p) => p.t === win.start) : -1;
  const winRange = win && wi >= 0 ? { from: win.start, to: chart[Math.min(wi + 1, chart.length - 1)].t } : undefined;
  const pmWidth = `${Math.min(100, Math.max(3, (c.pm25 / 300) * 100))}%`;
  const calm = c.wind != null && c.wind < 6;

  return (
    <>
      <PageTint tint={band.tint} />
      <SiteHeader signedIn={fam.signedIn} />
      <main className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted">Assalam-o-alaikum, {fam.householdName}</p>
            <h1 className="font-serif text-[40px] leading-[1.1] tracking-[-0.8px]">Today’s air</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <AreaSelect area={area.name} />
            {cached ? (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#f6ecd2] px-3 font-mono text-xs text-[#6b5408]"><Clock size={12} aria-hidden /> cached data from {hhmm(fetchedAt)}</span>
            ) : (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#e3efe2] px-3 font-mono text-xs text-[#24552f]"><span className="size-[7px] rounded-full bg-[#2f8a45]" /> live · updated {hhmm(fetchedAt)}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <section aria-label="Current air quality" className="flex min-w-0 flex-[1_1_560px] flex-wrap items-center gap-8 rounded-2xl border border-hairline bg-canvas p-8">
            <div className="mx-auto"><AqiRing aqi={Math.round(c.aqi)} color={band.color} label={band.label} /></div>
            <div className="flex min-w-[240px] flex-1 flex-col gap-3.5">
              <span className="inline-flex items-center gap-2 self-start rounded-full px-3.5 py-2 text-[13px] font-semibold uppercase tracking-wide" style={{ background: band.tint, color: band.text }}>
                <span className="size-[9px] rounded-full" style={{ background: band.color }} />{band.label}
              </span>
              <p className="text-[17px] leading-relaxed text-body">{LINE[band.key]}</p>
              <p className="text-[13px] text-muted">{data.area}, Lahore · {data.station ? `${data.station} station` : "Open-Meteo"}</p>
            </div>
          </section>

          <section aria-label="Pollutants and weather" className="grid min-w-0 flex-[1_1_380px] grid-cols-2 gap-4">
            {!data.station && (
            <div className="col-span-2 flex flex-col gap-3 rounded-2xl border border-hairline bg-canvas p-6">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-body">PM2.5</span>
                <span><span className="font-serif text-[34px] tracking-[-0.5px]">{Math.round(c.pm25)}</span> <span className="text-[13px] text-muted">µg/m³</span></span>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-card" role="img" aria-label={`PM2.5 is ${whoMultiple(c.pm25)} times the WHO guideline`}>
                <div className="h-full rounded-full transition-[width] duration-1000" style={{ width: pmWidth, background: band.color }} />
              </div>
              <div className="flex justify-between text-[13px] text-muted">
                <span>WHO 24h guideline: 15 µg/m³</span>
                <strong className="font-semibold" style={{ color: band.text }}>{whoMultiple(c.pm25)}× the WHO limit</strong>
              </div>
            </div>
            )}
            <div className="flex flex-col gap-2 rounded-2xl border border-hairline bg-canvas p-5">
              <span className="flex items-center gap-2 text-[13px] text-muted"><Wind size={16} aria-hidden /> Wind</span>
              <span><span className="font-serif text-3xl">{c.wind != null ? Math.round(c.wind) : "—"}</span> <span className="text-[13px] text-muted">km/h</span></span>
              <span className="text-[13px] leading-snug text-body">{c.wind == null ? "Wind data unavailable" : calm ? "Wind is calm, smog can build up" : "Wind is blowing, smog may thin out a little"}</span>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl border border-hairline bg-canvas p-5">
              <span className="flex items-center gap-2 text-[13px] text-muted"><Thermometer size={16} aria-hidden /> Temp · Humidity</span>
              <span><span className="font-serif text-3xl">{c.temp != null ? `${Math.round(c.temp)}°` : "—"}</span> <span className="text-[13px] text-muted">· {c.humidity != null ? `${Math.round(c.humidity)}%` : "—"}</span></span>
            </div>
            <dl className="col-span-2 grid grid-cols-4 gap-2 rounded-2xl border border-hairline bg-canvas px-5 py-4">
              {[["PM10", c.pm10], ["NO₂", c.no2], ["O₃", c.o3], ["CO", c.co]].map(([k, v]) => (
                <div key={k as string} className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="font-mono text-[15px]">{Math.round(v as number).toLocaleString("en-US")}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <section aria-labelledby="fc-h" className="flex flex-col gap-4 rounded-2xl border border-hairline bg-canvas px-7 pb-5 pt-7">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="fc-h" className="font-serif text-[28px] tracking-[-0.3px]">Next 24 hours</h2>
            {win && (
              <span className="inline-flex items-center gap-2 text-sm text-body">
                <span className="size-3.5 rounded-[3px] border border-dashed border-[#2e7f70] bg-[#5db8a6]/30" aria-hidden />
                Best window for going out: <strong className="font-semibold">{win.start}–{win.end}</strong> · avg AQI {win.avgAqi}
              </span>
            )}
          </div>
          <ForecastChart data={chart} window={winRange} />
          <p className="text-[13px] text-muted">Colours follow US EPA bands, and every band is also written out. Forecast: Open-Meteo. The best window is computed by the risk engine, not the AI.</p>
        </section>

        <section aria-labelledby="fam-h" className="flex flex-col gap-4">
          <h2 id="fam-h" className="font-serif text-[28px] tracking-[-0.3px]">Your household <span className="font-sans text-base text-muted">· {fam.householdName}{fam.signedIn ? "" : ", demo family"}</span></h2>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))]">
            {fam.members.map((m) => {
              const r = personalRisk(c.aqi, m.profile);
              const props: FamilyCardProps = { id: m.id, name: m.name, summary: m.summary, avatar: m.avatar, level: r.level, score: r.score, effectiveAqi: r.effectiveAqi, reasons: r.reasons, headline: m.headline };
              return <FamilyCard key={m.id ?? m.name} {...props} />;
            })}
          </div>
        </section>
      </main>
    </>
  );
}
