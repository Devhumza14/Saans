/**
 * Saans risk engine: PURE, deterministic, no I/O.
 * It decides WHO is at risk and WHEN. The LLM never sets these numbers; it only words them.
 */

export type AgeGroup = "child" | "teen" | "adult" | "senior";
export type Exposure = "indoor" | "mixed" | "outdoor" | "rider";
export type Commute = "none" | "car" | "bike" | "rickshaw" | "public" | "walk";
export type RiskLevel = "low" | "moderate" | "high" | "severe";

export type MemberProfile = {
  ageGroup: AgeGroup;
  conditions: string[]; // asthma, copd, heart, diabetes, allergies
  isPregnant: boolean;
  exposure: Exposure;
  commute: Commute;
};

export type HourPoint = { time: string; aqi: number }; // time: local ISO "YYYY-MM-DDTHH:mm"

// ---------- AQI bands (US EPA) ----------
export type AqiBand = {
  key: "good" | "moderate" | "sensitive" | "unhealthy" | "very" | "hazardous";
  label: string;
  ur: string;
  roman: string;
  color: string; // fill
  text: string; // AA text colour on `tint`
  tint: string; // page background tint
  min: number;
  max: number;
};

export const BANDS: AqiBand[] = [
  { key: "good", label: "Good", ur: "اچھی", roman: "Achhi", color: "#3f9a52", text: "#24552f", tint: "#eef4ea", min: 0, max: 50 },
  { key: "moderate", label: "Moderate", ur: "درمیانی", roman: "Darmiyani", color: "#c9a227", text: "#6b5408", tint: "#f7f1de", min: 51, max: 100 },
  { key: "sensitive", label: "Unhealthy for sensitive groups", ur: "حساس افراد کے لیے مضر", roman: "Hassas logon ke liye muzir", color: "#e07b2c", text: "#8a4510", tint: "#f9ede1", min: 101, max: 150 },
  { key: "unhealthy", label: "Unhealthy", ur: "مضرِ صحت", roman: "Muzir-e-sehat", color: "#d64545", text: "#8f2525", tint: "#f9e9e5", min: 151, max: 200 },
  { key: "very", label: "Very unhealthy", ur: "بہت مضر", roman: "Bohat muzir", color: "#8b4fb3", text: "#5e2d80", tint: "#f1e9f3", min: 201, max: 300 },
  { key: "hazardous", label: "Hazardous", ur: "خطرناک", roman: "Khatarnak", color: "#8a2433", text: "#6e1825", tint: "#f2e3e3", min: 301, max: Infinity },
];

export function aqiBand(aqi: number): AqiBand {
  const v = Math.max(0, Math.round(aqi));
  return BANDS.find((b) => v >= b.min && v <= b.max) ?? BANDS[BANDS.length - 1];
}

// ---------- Sensitivity ----------
const AGE: Partial<Record<AgeGroup, [number, string]>> = {
  child: [1.4, "child under 12"],
  senior: [1.4, "age 60+"],
};
const CONDITION: Record<string, [number, string]> = {
  asthma: [1.5, "asthma"],
  copd: [1.6, "COPD"],
  heart: [1.3, "heart condition"],
  diabetes: [1.15, "diabetes"],
  allergies: [1.2, "allergies"],
};
const EXPOSURE: Partial<Record<Exposure, [number, string]>> = {
  rider: [1.6, "works outdoors as a rider"],
  outdoor: [1.4, "works outdoors"],
  mixed: [1.1, "mixed indoor/outdoor day"],
};
const COMMUTE: Partial<Record<Commute, [number, string]>> = {
  bike: [1.2, "commutes by bike"],
  rickshaw: [1.2, "commutes by rickshaw"],
  walk: [1.2, "walks to get around"],
  public: [1.1, "uses public transport"],
};

export type Sensitivity = { score: number; reasons: string[] };

/** Multiplier 1.0 to 3.0 plus the reasons behind it. */
export function sensitivity(m: MemberProfile): Sensitivity {
  const factors: Array<[number, string]> = [];
  const age = AGE[m.ageGroup];
  if (age) factors.push(age);
  for (const c of m.conditions) {
    const f = CONDITION[c.toLowerCase()];
    if (f) factors.push(f);
  }
  if (m.isPregnant) factors.push([1.5, "pregnancy"]);
  const ex = EXPOSURE[m.exposure];
  if (ex) factors.push(ex);
  const co = COMMUTE[m.commute];
  if (co) factors.push(co);

  const raw = factors.reduce((p, [x]) => p * x, 1);
  return {
    score: Math.round(Math.min(3, Math.max(1, raw)) * 100) / 100,
    reasons: factors.map(([x, why]) => `${why} ×${x}`),
  };
}

// ---------- Personal risk ----------
/** Effective AQI = AQI × sensitivity. Cut points below are our calibration, tune here. */
export const RISK_CUTS = { moderate: 75, high: 250, severe: 600 } as const;

export const RISK_RANK: Record<RiskLevel, number> = { low: 0, moderate: 1, high: 2, severe: 3 };

export type PersonalRisk = { level: RiskLevel; score: number; effectiveAqi: number; reasons: string[] };

export function levelForEffective(effective: number): RiskLevel {
  if (effective >= RISK_CUTS.severe) return "severe";
  if (effective >= RISK_CUTS.high) return "high";
  if (effective >= RISK_CUTS.moderate) return "moderate";
  return "low";
}

export function personalRisk(aqi: number, m: MemberProfile): PersonalRisk {
  const s = sensitivity(m);
  const effectiveAqi = Math.round(aqi * s.score);
  return { level: levelForEffective(effectiveAqi), score: s.score, effectiveAqi, reasons: s.reasons };
}

// ---------- Best windows ----------
export type Window = { start: string; end: string; avgAqi: number };

const hh = (t: string) => t.slice(11, 16);
const addHours = (t: string, n: number) => `${String((Number(t.slice(11, 13)) + n) % 24).padStart(2, "0")}:00`;

/**
 * Lowest-average contiguous windows of `hours` hourly slots, best first, never overlapping.
 * `hourly` is whatever horizon the caller wants searched (normally the next 24h).
 */
export function bestWindows(hourly: HourPoint[], hours = 2, count = 1): Window[] {
  if (hourly.length < hours) return [];
  const all: Array<{ i: number; avg: number }> = [];
  for (let i = 0; i + hours <= hourly.length; i++) {
    const avg = hourly.slice(i, i + hours).reduce((s, p) => s + p.aqi, 0) / hours;
    all.push({ i, avg });
  }
  all.sort((a, b) => a.avg - b.avg || a.i - b.i);
  const picked: Array<{ i: number; avg: number }> = [];
  for (const w of all) {
    if (picked.every((p) => Math.abs(p.i - w.i) >= hours)) picked.push(w);
    if (picked.length === count) break;
  }
  return picked.map((w) => ({ start: hh(hourly[w.i].time), end: addHours(hourly[w.i].time, hours), avgAqi: Math.round(w.avg) }));
}

// ---------- Alerts ----------
export type AlertDecision = { alert: boolean; level: RiskLevel; aqi: number; reason?: string };

/** Alert if risk is high/severe now, or the forecast crosses into high within the next 6 hours. */
export function shouldAlert(m: MemberProfile, currentAqi: number, hourly: HourPoint[]): AlertDecision {
  const now = personalRisk(currentAqi, m);
  if (RISK_RANK[now.level] >= RISK_RANK.high) {
    return { alert: true, level: now.level, aqi: currentAqi, reason: `${now.level} risk right now at AQI ${currentAqi}` };
  }
  for (const p of hourly.slice(0, 6)) {
    const r = personalRisk(p.aqi, m);
    if (RISK_RANK[r.level] >= RISK_RANK.high) {
      return { alert: true, level: r.level, aqi: p.aqi, reason: `forecast reaches ${r.level} risk at ${hh(p.time)} (AQI ${p.aqi})` };
    }
  }
  return { alert: false, level: now.level, aqi: currentAqi };
}

// ---------- WHO guideline ----------
export const WHO_PM25_24H = 15; // µg/m³, WHO 2021 24-hour guideline
export const whoMultiple = (pm25: number) => Math.round((pm25 / WHO_PM25_24H) * 10) / 10;

// ---------- Plan helpers (deterministic facts the LLM must copy, not invent) ----------
export type MaskType = "none" | "N95/KN95";

/** Mask advice from the engine: none in clean air, N95/KN95 once AQI passes 100 or risk is high. */
export function maskFor(level: RiskLevel, aqi: number): MaskType {
  return level === "low" || (level === "moderate" && aqi < 101) ? "none" : "N95/KN95";
}

/** Contiguous "HH:00-HH:00" ranges where this person's risk is high or worse. */
export function riskyWindows(hourly: HourPoint[], m: MemberProfile): string[] {
  const out: string[] = [];
  let start = -1;
  hourly.forEach((p, i) => {
    const bad = RISK_RANK[personalRisk(p.aqi, m).level] >= RISK_RANK.high;
    if (bad && start < 0) start = i;
    if ((!bad || i === hourly.length - 1) && start >= 0) {
      const end = bad ? i : i - 1;
      const whole = start === 0 && end === hourly.length - 1 && hourly.length >= 24; // 12:00-12:00 would read as empty
      out.push(whole ? "All day" : `${hh(hourly[start].time)}-${addHours(hourly[end].time, 1)}`);
      start = -1;
    }
  });
  return out;
}

export const formatWindow = (w: Window) => `${w.start}-${w.end}`;
