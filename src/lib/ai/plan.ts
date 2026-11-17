import { ZodError } from "zod";
import { AiError, chatCompletion, planModel, type ChatMessage } from "./openrouter";
import { planMessages, type PlanInput } from "./prompts";
import { PlanSchema, type Plan } from "./schemas";

const strip = (s: string) => s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

const describe = (e: ZodError) =>
  e.issues.slice(0, 6).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");

/** Calls the LLM, validates with zod, retries once with the error appended. Never fabricates a plan. */
export async function generatePlan(input: PlanInput): Promise<Plan> {
  const messages: ChatMessage[] = planMessages(input);
  let problem = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const { content } = await chatCompletion({ model: planModel(), messages, json: true });
    const text = content ?? "";
    try {
      const parsed = PlanSchema.safeParse(JSON.parse(strip(text)));
      if (parsed.success) return enforce(parsed.data, input);
      problem = describe(parsed.error);
    } catch {
      problem = "the reply was not valid JSON";
    }
    messages.push(
      { role: "assistant", content: text },
      { role: "user", content: `Your JSON was invalid (${problem}). Return the corrected JSON object only.` },
    );
  }
  throw new AiError("invalid", "The AI could not produce a valid plan. Please try again.");
}

/** The engine owns the facts: overwrite anything the model changed and log it. */
function enforce(plan: Plan, i: PlanInput): Plan {
  const diffs: string[] = [];
  if (plan.risk_level !== i.risk.level) diffs.push(`risk_level ${plan.risk_level}->${i.risk.level}`);
  if (plan.mask.type !== i.mask) diffs.push(`mask ${plan.mask.type}->${i.mask}`);
  if (diffs.length) console.warn("[plan] model disagreed with engine, overriding:", diffs.join(", "));
  return {
    ...plan,
    risk_level: i.risk.level,
    mask: { ...plan.mask, type: i.mask },
    outdoor: { ...plan.outdoor, best_windows: i.bestWindows, avoid_windows: i.avoidWindows },
  };
}
