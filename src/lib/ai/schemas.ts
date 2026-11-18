import { z } from "zod";

// The UI is English-only; the model writes just "en". ur/roman are mirrored so stored plans and alert columns keep their shape.
export const Loc = z.object({ en: z.string().min(1) }).transform(({ en }) => ({ ur: en, roman: en, en }));
export type Loc = z.infer<typeof Loc>;

export const PlanSchema = z.object({
  headline: Loc,
  risk_level: z.enum(["low", "moderate", "high", "severe"]),
  outdoor: z.object({ advice: Loc, best_windows: z.array(z.string()), avoid_windows: z.array(z.string()) }),
  mask: z.object({ type: z.enum(["none", "surgical", "N95/KN95"]), why: Loc }),
  home: z.array(Loc).min(1),
  activity: z.array(Loc).min(1),
  health_watch: z.array(Loc).min(1),
  food_hydration: z.array(Loc),
  emergency: Loc.nullable(),
  explain_why: Loc,
});
export type Plan = z.infer<typeof PlanSchema>;

/** Short alert text written by the LLM (max ~25 words each). */
export const AlertText = Loc;

/** What POST /api/plan returns. */
export type PlanResponse = {
  plan: Plan;
  engine: { level: "low" | "moderate" | "high" | "severe"; score: number; effectiveAqi: number; reasons: string[] };
  aqi: number;
  band: string;
  area: string;
  generatedAt: string;
  fromCache: boolean;
  airCached: boolean;
};
