import Link from "next/link";
import { PageTint } from "@/components/PageTint";
import { SiteHeader } from "@/components/SiteHeader";
import { getAirData, hhmm } from "@/lib/air/openmeteo";
import { AREAS, DEFAULT_AREA, findArea } from "@/lib/areas";
import { loadFamily } from "@/lib/family";
import { aqiBand, personalRisk, whoMultiple } from "@/lib/risk/engine";
import { RISK_STYLE } from "@/lib/risk/style";

export const dynamic = "force-dynamic";

// Map box: lng 74.15-74.44, lat 31.35-31.65, as percentages.
const pos = (lat: number, lng: number) => ({ left: `${((lng - 74.15) / 0.29) * 100}%`, top: `${((31.65 - lat) / 0.3) * 100}%` });
const SHORT: Record<string, string> = { "Walled City / Androon": "Walled City", "Allama Iqbal Town": "Iqbal Town", "Raiwind Road": "Raiwind Rd" };
const DARK_TEXT = new Set(["moderate", "sensitive"]); // pins on yellow/orange need dark text for contrast

export default async function MapPage() {
  const fam = await loadFamily();
  const home = findArea(fam.area ?? "") ?? DEFAULT_AREA;
  const results = await Promise.allSettled(AREAS.map((a) => getAirData(a.name)));
  const rows = AREAS.flatMap((a, i) => {
    const r = results[i];
    return r.status === "fulfilled" ? [{ area: a, air: r.value, aqi: Math.round(r.value.data.current.aqi) }] : [];
  });
  const mine = rows.find((r) => r.area.name === home.name);
  const ranked = [...rows].sort((a, b) => b.aqi - a.aqi);
  const stamp = rows[0] ? hhmm(rows[0].air.fetchedAt) : "";
  const anyCached = rows.some((r) => r.air.cached);
  const band = mine ? aqiBand(mine.aqi) : null;
  const flat = rows.length > 1 && Math.max(...rows.map((r) => r.aqi)) - Math.min(...rows.map((r) => r.aqi)) <= 5;

  return (
    <>
      {band && <PageTint tint={band.tint} />}
      <SiteHeader signedIn={fam.signedIn} />
      <main className="mx-auto flex max-w-[1200px] flex-col gap-7 px-4 pb-14 pt-10 sm:px-8">
        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-medium uppercase tracking-[1.5px] text-cta">Lahore · Map</p>
          <h1 className="font-serif text-[36px] leading-[1.08] tracking-[-1px] sm:text-[48px]">Your area’s air, compared with the city.</h1>
          <p className="max-w-[640px] text-[17px] leading-relaxed text-body">Each pin is an area. The colour shows its AQI. Tap a pin to open that area’s dashboard.</p>
        </div>

        {flat && (
          <p role="status" className="rounded-xl border border-hairline bg-canvas px-5 py-3 text-sm text-body">Right now the values for all Lahore areas are almost identical. This is a limit of the model’s resolution (about 11 km), not a real absence of differences between areas.</p>
        )}

        {rows.length === 0 ? (
          <p role="alert" className="rounded-xl border border-hairline bg-canvas p-6 text-body">Air data is unavailable right now. Please try again shortly.</p>
        ) : (
          <div className="flex flex-wrap items-start gap-6">
            <section aria-label="Map of Lahore areas" className="flex min-w-0 flex-[2_1_600px] flex-col gap-3">
              <div className="relative aspect-[1.45] min-h-[380px] w-full overflow-hidden rounded-2xl border border-hairline bg-soft">
                <div aria-hidden className="absolute inset-0 opacity-70 [background-image:linear-gradient(#ebe6df_1px,transparent_1px),linear-gradient(90deg,#ebe6df_1px,transparent_1px)] [background-size:64px_64px]" />
                <div aria-hidden className="absolute left-[6%] top-[8%] h-[84%] w-[88%] rounded-[46%] border-2 border-dashed border-[#d9d0c3]" />
                <span aria-hidden className="absolute left-3.5 top-3 text-[11px] font-medium uppercase tracking-[1px] text-muted">Ring Road</span>
                <span className="absolute bottom-3 right-3.5 font-mono text-xs text-muted">{anyCached ? "cached" : "live"} · {stamp} · Open-Meteo</span>
                {rows.map(({ area, aqi }) => {
                  const b = aqiBand(aqi);
                  const sel = area.name === home.name;
                  return (
                    <div key={area.name} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5" style={pos(area.lat, area.lng)}>
                      <Link href={`/dashboard?area=${encodeURIComponent(area.name)}`} aria-label={`${area.name}, AQI ${aqi}, ${b.label}`}
                        className={`grid h-11 min-w-11 place-items-center rounded-full px-1.5 text-[15px] font-semibold no-underline ${DARK_TEXT.has(b.key) ? "text-ink" : "text-white"} ${sel ? "shadow-[0_0_0_4px_#faf9f5,0_0_0_7px_#141413]" : "shadow-[0_2px_6px_rgba(20,20,19,.25)]"}`}
                        style={{ background: b.key === "unhealthy" ? "#c23b3b" : b.color }}>{aqi}</Link>
                      <span className="whitespace-nowrap rounded-md bg-canvas/90 px-1.5 py-0.5 text-xs font-medium text-body">{SHORT[area.name] ?? area.name}</span>
                    </div>
                  );
                })}
              </div>
              <ul className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Colour legend">
                {[["#3f9a52", "0-50 Good"], ["#c9a227", "51-100 Moderate"], ["#e07b2c", "101-150 Sensitive"], ["#c23b3b", "151-200 Unhealthy"], ["#8b4fb3", "201+ Very unhealthy"]].map(([c, l]) => (
                  <li key={l} className="inline-flex items-center gap-1.5 text-xs text-body"><span className="size-3 rounded-full" style={{ background: c }} />{l}</li>
                ))}
              </ul>
            </section>

            <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
              {mine && band && (
                <div className="flex flex-col gap-3.5 rounded-2xl bg-dark p-[22px] text-canvas">
                  <span className="text-xs font-medium uppercase tracking-[1.5px] text-[#e8a55a]">{fam.signedIn ? "Your area" : "Selected"} · {home.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="grid size-20 shrink-0 place-items-center rounded-full border-8 font-serif text-[28px]" style={{ borderColor: band.color }}>{mine.aqi}</span>
                    <div className="flex flex-col gap-1">
                      <span className="text-[17px] font-medium">{band.label}</span>
                      <span className="text-[13px] text-[#cfcbc2]">PM2.5 {Math.round(mine.air.data.current.pm25)} µg/m³ · {whoMultiple(mine.air.data.current.pm25)}× WHO</span>
                    </div>
                  </div>
                  <ul className="flex flex-wrap gap-1.5" aria-label="Family risk here">
                    {fam.members.map((m) => {
                      const r = personalRisk(mine.aqi, m.profile);
                      const s = RISK_STYLE[r.level];
                      return <li key={m.name} className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: s.bg, color: s.fg }}>{m.name} · {s.label}</li>;
                    })}
                  </ul>
                  <Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cta-hover text-[15px] font-medium text-white no-underline hover:bg-cta">Dashboard kholein</Link>
                </div>
              )}
              <div className="rounded-2xl border border-hairline bg-canvas px-[18px] pb-3 pt-2">
                <h2 className="mb-1 mt-3 font-serif text-[22px]">Worst to best</h2>
                <ol>
                  {ranked.map(({ area, aqi, air }) => {
                    const b = aqiBand(aqi);
                    return (
                      <li key={area.name} className="border-b border-[#ebe6df] last:border-0">
                        <Link href={`/dashboard?area=${encodeURIComponent(area.name)}`} className="flex min-h-11 items-center gap-3 px-1 text-ink no-underline hover:bg-soft">
                          <span className={`grid h-7 w-11 place-items-center rounded-full text-[13px] font-semibold ${DARK_TEXT.has(b.key) ? "text-ink" : "text-white"}`} style={{ background: b.key === "unhealthy" ? "#c23b3b" : b.color }}>{aqi}</span>
                          <span className="flex-1 text-[15px] font-medium">{area.name}</span>
                          <span className="font-mono text-xs text-muted">{Math.round(air.data.current.pm25)} PM2.5</span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </aside>
          </div>
        )}

        <div className="flex flex-col gap-1.5 rounded-xl bg-soft px-5 py-4">
          <span className="text-sm font-semibold">Data source</span>
          <p className="text-sm leading-relaxed text-body">AQI comes from the Open-Meteo Air Quality API (CAMS atmospheric model, at each area’s coordinates). It is a model estimate, not a ground-sensor reading, so it can differ within a neighbourhood. Values refresh every 15 minutes.</p>
        </div>
      </main>
    </>
  );
}
