import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

const SEGMENTS = [
  { t: "Schools", d: "Per-class outdoor-play and assembly guidance from live AQI, with parent WhatsApp summaries." },
  { t: "Employers & delivery fleets", d: "Rider shift windows and mask guidance for outdoor staff." },
  { t: "NGOs & clinics", d: "Awareness plans for the households they serve, in Urdu, Roman Urdu and English." },
];
const ROADMAP = ["Neighbourhood sensor and Open-Meteo blend", "WhatsApp bot delivery", "Organisation dashboards with consent-based aggregate risk", "Offline-first Urdu voice plans"];

export default function ForOrganizations() {
  return (
    <>
      <SiteHeader cta={{ href: "/login", label: "Try the demo" }} />
      <main className="mx-auto flex max-w-[960px] flex-col gap-12 px-4 py-14 sm:px-8">
        <div className="flex flex-col gap-4">
          <p className="text-xs font-medium uppercase tracking-[1.5px] text-cta">For organizations · roadmap preview</p>
          <h1 className="font-serif text-[40px] leading-[1.08] tracking-[-1px] sm:text-[56px]">Protect a whole community from the same smog.</h1>
          <p className="max-w-[640px] text-lg leading-relaxed text-body">Saans is free for families. Organisations that look after many people will be able to run it for them. This page is a roadmap teaser: these products are not built yet.</p>
        </div>
        <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]" aria-label="Who it is for">
          {SEGMENTS.map((s) => (
            <article key={s.t} className="flex flex-col gap-2 rounded-2xl border border-hairline bg-canvas p-6"><h2 className="text-lg font-medium">{s.t}</h2><p className="text-[15px] leading-relaxed text-body">{s.d}</p></article>
          ))}
        </section>
        <section className="flex flex-col gap-4 rounded-2xl bg-soft p-6" aria-labelledby="pr">
          <h2 id="pr" className="font-serif text-[28px]">Proposed pricing</h2>
          <p className="text-body">Families: free, always. Organisations: a simple per-site subscription (indicative, to be validated with pilot partners), so that household access stays free.</p>
        </section>
        <section className="flex flex-col gap-3" aria-labelledby="rm">
          <h2 id="rm" className="font-serif text-[28px]">Roadmap</h2>
          <ol className="flex flex-col gap-2">{ROADMAP.map((r, i) => <li key={r} className="flex gap-3 text-[15px]"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-card text-xs font-semibold text-cta">{i + 1}</span>{r}</li>)}</ol>
        </section>
        <Link href="/login" className="inline-flex min-h-12 items-center self-start rounded-lg bg-cta px-6 font-medium text-white hover:bg-cta-hover">See the family demo</Link>
      </main>
    </>
  );
}
