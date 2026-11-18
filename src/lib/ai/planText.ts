import type { Plan } from "./schemas";

const FOOTER = "Saans is for health awareness, not treatment. See a doctor if you feel unwell. Emergency: 1122";

/** Short plain-text summary, used for WhatsApp sharing and read-aloud. */
export function planToText(plan: Plan, name: string, ctx: { area: string; aqi: number }, opts: { footer?: boolean } = {}): string {
  const lines = [
    `Saans · ${name} · ${ctx.area} · AQI ${ctx.aqi}`,
    plan.headline.en,
    plan.outdoor.advice.en,
    plan.outdoor.best_windows.length ? `Better time: ${plan.outdoor.best_windows.join(", ")}` : "",
    `Mask: ${plan.mask.type}`,
    ...plan.home.slice(0, 2).map((h) => `• ${h.en}`),
    ...plan.health_watch.slice(0, 1).map((h) => `• ${h.en}`),
    plan.emergency ? plan.emergency.en : "",
  ].filter(Boolean);
  if (opts.footer !== false) lines.push("", FOOTER);
  return lines.join("\n");
}
