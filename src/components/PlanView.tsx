"use client";
import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, Clock, Droplets, Home, HeartPulse, MessageCircle, Phone, RefreshCw, ShieldCheck, Square, Sun, Volume2 } from "lucide-react";
import { T, useLang, type Lang } from "@/components/LangProvider";
import { planToText } from "@/lib/ai/planText";
import type { Loc, PlanResponse } from "@/lib/ai/schemas";
import { RISK_STYLE } from "@/lib/risk/style";

const UI = {
  outdoor: { ur: "باہر جانا", roman: "Bahar jaana", en: "Going outside" },
  mask: { ur: "ماسک", roman: "Mask", en: "Mask" },
  home: { ur: "گھر", roman: "Ghar", en: "At home" },
  activity: { ur: "سرگرمی", roman: "Activity", en: "Activity" },
  watch: { ur: "صحت پر نظر", roman: "Sehat par nazar", en: "Health watch" },
  food: { ur: "پانی اور خوراک", roman: "Paani aur khana", en: "Water & food" },
  why: { ur: "میرا پلان الگ کیوں ہے؟", roman: "Ye plan alag kyun hai?", en: "Why is this plan different?" },
  best: { ur: "بہتر وقت", roman: "Behtar waqt", en: "Better time" },
  avoid: { ur: "بچیں", roman: "Bachein", en: "Avoid" },
  regen: { ur: "نیا پلان", roman: "Naya plan", en: "Regenerate" },
  call: { ur: "۱۱۲۲ کال کریں", roman: "1122 call karein", en: "Call 1122" },
  listen: { ur: "سنیں", roman: "Sunein", en: "Listen" },
  stop: { ur: "روکیں", roman: "Rokein", en: "Stop" },
  share: { ur: "واٹس ایپ", roman: "WhatsApp par bhejein", en: "Share on WhatsApp" },
  writing: { ur: "پلان لکھا جا رہا ہے…", roman: "Plan likha ja raha hai…", en: "Writing the plan…" },
} satisfies Record<string, Loc>;

const Txt = ({ k }: { k: keyof typeof UI }) => <T text={UI[k]} />;

type State = { status: "loading" } | { status: "error"; msg: string } | { status: "ok"; data: PlanResponse };

function Section({ icon, title, children }: { icon: React.ReactNode; title: keyof typeof UI; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2.5 text-base font-medium"><span className="grid size-[34px] place-items-center rounded-[10px] bg-card text-cta" aria-hidden>{icon}</span><Txt k={title} /></h2>
      {children}
    </section>
  );
}

const Items = ({ items }: { items: Loc[] }) => (
  <ul className="flex flex-col gap-2.5">
    {items.map((it, i) => (
      <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-[#252523]"><span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-coral" aria-hidden /><T text={it} /></li>
    ))}
  </ul>
);

/** Read-aloud via the browser's speech engine. Urdu voice for Urdu/Roman Urdu, English voice for English. Hidden when no voice exists. */
function useSpeech(text: string, lang: Lang) {
  const tag = lang === "en" ? "en-US" : "ur-PK";
  const [available, setAvailable] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      const check = () => setAvailable(synth.getVoices().some((v) => v.lang.toLowerCase().startsWith(tag.slice(0, 2).toLowerCase())));
      check();
      synth.addEventListener?.("voiceschanged", check);
      return () => { synth.removeEventListener?.("voiceschanged", check); synth.cancel(); };
    } catch { setAvailable(false); }
  }, [tag]);
  const toggle = () => {
    try {
      const synth = window.speechSynthesis;
      if (speaking) { synth.cancel(); return setSpeaking(false); }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = tag;
      u.onend = u.onerror = () => setSpeaking(false);
      synth.cancel();
      synth.speak(u);
      setSpeaking(true);
    } catch { setSpeaking(false); }
  };
  return { available, speaking, toggle };
}

function Actions({ data, name }: { data: PlanResponse; name: string }) {
  const { lang } = useLang();
  const spokenLang = lang === "en" ? "en" : "ur";
  const speech = useSpeech(planToText(data.plan, spokenLang, name, { area: data.area, aqi: data.aqi }, { footer: false }), lang);
  const wa = `https://wa.me/?text=${encodeURIComponent(planToText(data.plan, lang, name, { area: data.area, aqi: data.aqi }))}`;
  const btn = "inline-flex min-h-11 items-center gap-2 rounded-lg border border-hairline bg-canvas px-4 text-sm font-medium text-ink hover:bg-soft";
  return (
    <div className="flex flex-wrap gap-2">
      {speech.available && (
        <button type="button" onClick={speech.toggle} aria-pressed={speech.speaking} className={btn}>
          {speech.speaking ? <Square size={16} aria-hidden /> : <Volume2 size={16} aria-hidden />}<Txt k={speech.speaking ? "stop" : "listen"} />
        </button>
      )}
      <a href={wa} target="_blank" rel="noopener noreferrer" className={btn}><MessageCircle size={16} aria-hidden /><Txt k="share" /></a>
    </div>
  );
}

export function PlanSkeleton() {
  const { lang } = useLang();
  return (
    <div aria-busy="true" role="status" className="flex flex-col gap-5">
      <span className="font-mono text-xs text-muted">risk engine ✓ · {UI.writing[lang as Lang]}</span>
      <div className="skeleton h-7 w-[90%]" /><div className="skeleton h-7 w-[65%]" />
      <div className="skeleton h-24 w-full" /><div className="skeleton h-5 w-[85%]" /><div className="skeleton h-5 w-[75%]" /><div className="skeleton h-5 w-[60%]" />
    </div>
  );
}

export function PlanView({ memberId, name }: { memberId: string; name: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async (force = false) => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId, force }) });
      const json = await res.json().catch(() => null);
      if (!res.ok) return setState({ status: "error", msg: json?.error ?? "Something went wrong. Please try again." });
      setState({ status: "ok", data: json as PlanResponse });
    } catch {
      setState({ status: "error", msg: "Could not reach the server. Check your connection and try again." });
    }
  }, [memberId]);

  useEffect(() => { void load(); }, [load]);

  if (state.status === "loading") return <PlanSkeleton />;
  if (state.status === "error") {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border border-hairline bg-canvas p-6">
        <AlertTriangle className="text-[#8a4510]" aria-hidden />
        <p className="text-body">{state.msg}</p>
        <button type="button" onClick={() => load()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-cta px-5 font-medium text-white hover:bg-cta-hover"><RefreshCw size={16} aria-hidden /> Dobara koshish karein</button>
      </div>
    );
  }

  const { plan, engine, aqi, band, area, generatedAt, fromCache, airCached } = state.data;
  const s = RISK_STYLE[engine.level];
  const time = new Date(generatedAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide" style={{ background: s.fg, color: "#faf9f5" }}>{s.label} risk</span>
          <span className="font-mono text-xs text-body">AQI {aqi} · {band} · {area}</span>
        </div>
        <p className="font-serif text-[28px] leading-[1.25] tracking-[-0.3px]"><T text={plan.headline} /></p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><Clock size={12} aria-hidden /> {fromCache ? "saved plan from" : "written at"} {time}{airCached ? " · air data cached" : ""}</span>
          <button type="button" onClick={() => load(true)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-hairline bg-canvas px-3 font-medium text-ink hover:bg-soft"><RefreshCw size={14} aria-hidden /><Txt k="regen" /></button>
        </div>
      </div>

      <Actions data={state.data} name={name} />

      <Section icon={<Sun size={18} />} title="outdoor">
        <p className="text-[15px] leading-relaxed"><T text={plan.outdoor.advice} /></p>
        <div className="flex flex-wrap gap-2">
          {plan.outdoor.best_windows.map((w) => <span key={`b${w}`} className="rounded-lg bg-[#e3efe2] px-2.5 py-1.5 font-mono text-xs text-[#24552f]"><Txt k="best" /> · {w}</span>)}
          {plan.outdoor.avoid_windows.map((w) => <span key={`a${w}`} className="rounded-lg bg-[#f2e3e3] px-2.5 py-1.5 font-mono text-xs text-[#6e1825]"><Txt k="avoid" /> · {w}</span>)}
        </div>
      </Section>

      <section className="flex flex-col gap-2.5 rounded-xl bg-soft p-4">
        <h2 className="flex items-center gap-2.5 text-base font-medium"><span className="grid size-[34px] place-items-center rounded-[10px] bg-canvas" aria-hidden><ShieldCheck size={18} /></span><Txt k="mask" /> · <span className="font-mono text-sm">{plan.mask.type}</span></h2>
        <p className="text-sm leading-relaxed text-body"><T text={plan.mask.why} /></p>
      </section>

      <Section icon={<Home size={18} />} title="home"><Items items={plan.home} /></Section>
      <Section icon={<Activity size={18} />} title="activity"><Items items={plan.activity} /></Section>
      <Section icon={<HeartPulse size={18} />} title="watch"><Items items={plan.health_watch} /></Section>
      {plan.food_hydration.length > 0 && <Section icon={<Droplets size={18} />} title="food"><Items items={plan.food_hydration} /></Section>}

      {plan.emergency && (
        <section aria-label="Emergency" className="flex flex-col gap-3 rounded-xl bg-[#6e1825] p-4 text-canvas">
          <p className="text-[15px] font-medium leading-relaxed"><T text={plan.emergency} /></p>
          <a href="tel:1122" className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-canvas px-5 font-semibold text-[#6e1825]"><Phone size={16} aria-hidden /><Txt k="call" /></a>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-xl bg-dark p-[18px] text-canvas">
        <h2 className="text-[15px] font-medium"><Txt k="why" /></h2>
        <ul className="flex flex-col gap-1.5 font-mono text-[13px] text-[#cfcbc2]">
          {engine.reasons.map((r) => <li key={r}>{r}</li>)}
          <li className="mt-1 border-t border-[#3a3631] pt-2 text-canvas">sensitivity {engine.score}× · effective AQI {engine.effectiveAqi} → {engine.level}</li>
        </ul>
        <p className="text-[13px] leading-relaxed text-[#a09d96]"><T text={plan.explain_why} /></p>
        <p className="font-mono text-[11px] text-[#a09d96]">Risk level, mask and time windows: rules engine. Wording: AI.</p>
      </section>
    </div>
  );
}
