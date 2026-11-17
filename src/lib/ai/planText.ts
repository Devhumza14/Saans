import type { Loc, Plan } from "./schemas";

type Lang = keyof Loc;

const FOOTER: Loc = {
  ur: "سانس صحت کی آگاہی کے لیے ہے، علاج کے لیے نہیں۔ تکلیف ہو تو ڈاکٹر سے رجوع کریں۔ ایمرجنسی: ۱۱۲۲",
  roman: "Saans sehat ki aagahi ke liye hai, ilaaj ke liye nahi. Takleef ho to doctor se rujoo karein. Emergency: 1122",
  en: "Saans is for health awareness, not treatment. See a doctor if you feel unwell. Emergency: 1122",
};

/** Short plain-text summary, used for WhatsApp sharing and read-aloud. */
export function planToText(plan: Plan, lang: Lang, name: string, ctx: { area: string; aqi: number }, opts: { footer?: boolean } = {}): string {
  const lines = [
    `Saans · ${name} · ${ctx.area} · AQI ${ctx.aqi}`,
    plan.headline[lang],
    plan.outdoor.advice[lang],
    plan.outdoor.best_windows.length ? `${lang === "en" ? "Better time" : lang === "ur" ? "بہتر وقت" : "Behtar waqt"}: ${plan.outdoor.best_windows.join(", ")}` : "",
    `${lang === "ur" ? "ماسک" : "Mask"}: ${plan.mask.type}`,
    ...plan.home.slice(0, 2).map((h) => `• ${h[lang]}`),
    ...plan.health_watch.slice(0, 1).map((h) => `• ${h[lang]}`),
    plan.emergency ? plan.emergency[lang] : "",
  ].filter(Boolean);
  if (opts.footer !== false) lines.push("", FOOTER[lang]);
  return lines.join("\n");
}
