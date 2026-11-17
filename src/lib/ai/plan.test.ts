import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./openrouter", async (orig) => ({ ...(await orig<typeof import("./openrouter")>()), chatCompletion: vi.fn() }));

import { chatCompletion } from "./openrouter";
import { generatePlan } from "./plan";
import { personalRisk, type MemberProfile } from "@/lib/risk/engine";
import type { PlanInput } from "./prompts";

const mocked = vi.mocked(chatCompletion);
const L = (s: string) => ({ ur: `${s} ur`, roman: `${s} roman`, en: `${s} en` });
const goodPlan = {
  headline: L("h"), risk_level: "low",
  outdoor: { advice: L("o"), best_windows: ["01:00-02:00"], avoid_windows: [] },
  mask: { type: "none", why: L("m") },
  home: [L("home")], activity: [L("act")], health_watch: [L("watch")], food_hydration: [], emergency: null, explain_why: L("why"),
};

const profile: MemberProfile = { ageGroup: "senior", conditions: ["asthma"], isPregnant: false, exposure: "indoor", commute: "none" };
const input: PlanInput = {
  name: "Ammi", profile: {}, area: "Gulberg",
  air: { area: "Gulberg", current: { aqi: 287, pm25: 236, pm10: 300, no2: 1, o3: 1, co: 1, wind: 3, temp: 17, humidity: 70, time: "2026-11-17T11:00" }, hourly: [] },
  risk: personalRisk(287, profile), mask: "N95/KN95", bestWindows: ["14:00-16:00"], avoidWindows: ["18:00-23:00"],
};

const reply = (v: unknown) => ({ content: typeof v === "string" ? v : JSON.stringify(v), toolCalls: [] });

describe("generatePlan", () => {
  beforeEach(() => mocked.mockReset());

  it("overrides risk level, mask and windows with the engine's values", async () => {
    mocked.mockResolvedValueOnce(reply(goodPlan));
    const plan = await generatePlan(input);
    expect(plan.risk_level).toBe("severe");
    expect(plan.mask.type).toBe("N95/KN95");
    expect(plan.outdoor.best_windows).toEqual(["14:00-16:00"]);
    expect(plan.outdoor.avoid_windows).toEqual(["18:00-23:00"]);
  });

  it("retries once with the validation error, then succeeds", async () => {
    mocked.mockResolvedValueOnce(reply({ headline: "nope" })).mockResolvedValueOnce(reply("```json\n" + JSON.stringify(goodPlan) + "\n```"));
    await expect(generatePlan(input)).resolves.toBeTruthy();
    expect(mocked).toHaveBeenCalledTimes(2);
    const retryMsgs = mocked.mock.calls[1][0].messages;
    expect(retryMsgs[retryMsgs.length - 1].content).toMatch(/invalid/i);
  });

  it("gives up after two bad answers instead of inventing a plan", async () => {
    mocked.mockResolvedValue(reply("not json at all"));
    await expect(generatePlan(input)).rejects.toMatchObject({ code: "invalid" });
    expect(mocked).toHaveBeenCalledTimes(2);
  });
});
