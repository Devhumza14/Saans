import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { getAirData, hhmm, type AirResult } from "@/lib/air/openmeteo";
import { DEMO_FAMILY } from "@/lib/demo";
import { aqiBand, personalRisk, whoMultiple } from "@/lib/risk/engine";
import { RISK_STYLE } from "@/lib/risk/style";

export const dynamic = "force-dynamic";

async function live(): Promise<AirResult | null> {
  try {
    return await getAirData("Gulberg");
  } catch {
    return null;
  }
}

const STEPS = [
  { t: "Set up your home", d: "Pick your area of Lahore and add the people at home: age, conditions like asthma or pregnancy, and how they get around." },
  { t: "Live air, every hour", d: "Saans pulls live AQI, PM2.5 and wind for your area plus a 48-hour forecast, then scores each person’s risk with clear rules." },
  { t: "A plan for each person", d: "AI turns those numbers into a short daily plan , and alerts you before the air turns for someone at risk." },
];

export default async function Landing() {
  const air = await live();
  const aqi = air?.data.current.aqi;
  const band = aqi != null ? aqiBand(aqi) : null;

  return (
    <>
      <SiteHeader cta={{ href: "/dashboard", label: "View dashboard" }} />

      <section className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-14 px-4 pb-24 pt-12 sm:px-8">
        <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#e3efe2] px-3 py-2 text-xs font-medium uppercase tracking-[1.2px] text-[#24552f]">
              <Heart size={14} aria-hidden /> SDG 3 · Good Health &amp; Well-Being
            </span>
            <span className="inline-flex items-center rounded-full bg-card px-3 py-2 text-xs font-medium uppercase tracking-[1.2px] text-body">Smog season · Oct–Jan</span>
          </div>
          <h1 className="font-serif text-[44px] leading-[1.04] tracking-[-1.8px] sm:text-[68px]">Lahore’s air,<br />for your home.</h1>
          <p className="max-w-[520px] text-lg leading-relaxed text-body">
            An AQI number tells everyone the same thing. Saans reads the live air in your part of Lahore and writes a separate plan for each person at home: Ammi with asthma, a rider on a 9-hour shift, a child walking to school.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-cta px-5 text-[15px] font-medium text-white hover:bg-cta-hover">
              See live air <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
          <p className="text-[13px] text-muted">Free for families · English · No sign-up to check today’s air</p>
        </div>

        <div className="relative min-w-0 flex-[1_1_520px]">
          <Image src="/images/badshahi-mosque.jpg" alt="Badshahi Mosque in Lahore under a hazy, washed-out sky" width={1600} height={1060} priority className="h-[560px] w-full rounded-2xl object-cover" />
          <div className="absolute inset-x-5 bottom-5 flex flex-wrap items-center gap-5 rounded-xl bg-dark px-6 py-5 text-canvas">
            {air && band && aqi != null ? (
              <>
                <div className="flex size-[84px] shrink-0 items-center justify-center rounded-full border-[8px] font-serif text-[28px]" style={{ borderColor: band.color }}>{aqi}</div>
                <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[1.2px] text-[#a09d96]">
                    <span className="size-2 rounded-full bg-[#5db872]" /> {air.cached ? "Cached" : "Live"} · Gulberg, Lahore
                  </div>
                  <div className="text-xl font-medium">{band.label}</div>
                  {!air.data.station && (
                    <div className="text-sm text-[#a09d96]">
                      PM2.5 {Math.round(air.data.current.pm25)} µg/m³ · <strong className="font-medium text-canvas">{whoMultiple(air.data.current.pm25)}× the WHO 24-hour limit</strong>
                    </div>
                  )}
                </div>
                <div className="font-mono text-xs text-[#a09d96]">{air.cached ? `cached ${hhmm(air.fetchedAt)}` : `updated ${hhmm(air.fetchedAt)}`}</div>
              </>
            ) : (
              <p className="text-sm text-[#cfcbc2]">Live air data is temporarily unavailable. Please try again in a minute.</p>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="problem-h" className="bg-dark text-canvas">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-stretch gap-14 px-4 py-24 sm:px-8">
          <Image src="/images/smog-city.jpg" alt="A city skyline disappearing into thick grey smog" width={1600} height={2843} className="max-h-[620px] min-w-0 flex-[1_1_360px] rounded-xl object-cover" />
          <div className="flex min-w-0 flex-[1_1_560px] flex-col justify-center gap-6">
            <p className="text-xs font-medium uppercase tracking-[1.5px] text-[#e8a55a]">The problem</p>
            <h2 id="problem-h" className="font-serif text-[40px] leading-[1.1] tracking-[-1px] sm:text-5xl">One number. Four lives.</h2>
            <p className="text-lg leading-relaxed text-[#cfcbc2]">
              Every winter Lahore’s air ranks among the worst in the world. Air apps show one number for everyone, but risk depends on who is breathing it.
              {aqi != null ? ` Here is the same air, AQI ${aqi}, for four people in one house, scored right now by our risk engine:` : " Here is how the same air lands on four people in one house:"}
            </p>
            {aqi != null && (
              <ul className="flex flex-col gap-0.5">
                {DEMO_FAMILY.map((m, i) => {
                  const r = personalRisk(aqi, m.profile);
                  const s = RISK_STYLE[r.level];
                  return (
                    <li key={m.key} className={`flex items-center gap-4 bg-dark-elev px-5 py-4 ${i === 0 ? "rounded-t-xl" : ""} ${i === DEMO_FAMILY.length - 1 ? "rounded-b-xl" : ""} rounded-sm`}>
                      <span className="grid size-10 shrink-0 place-items-center rounded-full font-semibold" style={{ background: m.avatar.bg, color: m.avatar.fg }} aria-hidden>{m.name[0]}</span>
                      <span className="min-w-0 flex-1"><strong className="font-medium">{m.name}, {m.age}</strong><span className="text-[#a09d96]"> · {m.summary}</span></span>
                      <span className="rounded-full px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide" style={{ background: s.bg, color: s.fg }}>{s.label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="how-h" className="mx-auto flex max-w-[1200px] flex-col gap-12 px-4 py-24 sm:px-8">
        <div className="flex max-w-[720px] flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-[1.5px] text-cta">Three steps</p>
          <h2 id="how-h" className="font-serif text-[40px] leading-[1.1] tracking-[-1px] sm:text-5xl">From one city reading to a plan for each person at home.</h2>
        </div>
        <ol className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          {STEPS.map((s, i) => (
            <li key={s.t} className="flex flex-col gap-4 rounded-xl bg-card p-8">
              <span className="font-serif text-[44px] leading-none text-cta">{i + 1}</span>
              <h3 className="text-xl font-medium">{s.t}</h3>
              <p className="leading-relaxed text-body">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 pb-24 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-8 rounded-2xl bg-coral px-8 py-14 sm:px-12">
          <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-2">
            <h2 className="font-serif text-[34px] leading-[1.1] tracking-[-0.8px] sm:text-[40px]">Today’s air plan, for everyone at home.</h2>
          </div>
          <Link href="/dashboard" className="inline-flex min-h-[52px] items-center rounded-lg bg-ink px-7 text-base font-medium text-canvas hover:bg-dark-elev">Get started</Link>
        </div>
      </section>
    </>
  );
}
