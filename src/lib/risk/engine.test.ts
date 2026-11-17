import { describe, expect, it } from "vitest";
import { aqiBand, bestWindows, maskFor, personalRisk, riskyWindows, sensitivity, shouldAlert, type MemberProfile } from "./engine";

const healthy: MemberProfile = { ageGroup: "adult", conditions: [], isPregnant: false, exposure: "indoor", commute: "car" };
const ammi: MemberProfile = { ageGroup: "senior", conditions: ["asthma", "heart"], isPregnant: false, exposure: "indoor", commute: "none" };
const ali: MemberProfile = { ageGroup: "adult", conditions: [], isPregnant: false, exposure: "rider", commute: "bike" };

const day = (aqis: number[], startHour = 8) =>
  aqis.map((aqi, i) => ({ time: `2026-11-17T${String((startHour + i) % 24).padStart(2, "0")}:00`, aqi }));

describe("aqiBand", () => {
  it("maps EPA edges", () => {
    expect(aqiBand(50).key).toBe("good");
    expect(aqiBand(51).key).toBe("moderate");
    expect(aqiBand(150).key).toBe("sensitive");
    expect(aqiBand(287).key).toBe("very");
    expect(aqiBand(301).key).toBe("hazardous");
  });
});

describe("sensitivity", () => {
  it("is 1.0 for a healthy indoor adult", () => expect(sensitivity(healthy).score).toBe(1));
  it("compounds age + conditions and explains why", () => {
    const s = sensitivity(ammi);
    expect(s.score).toBeCloseTo(2.73, 2);
    expect(s.reasons.join(" ")).toMatch(/asthma/);
  });
  it("caps at 3.0", () => {
    const worst: MemberProfile = { ...ammi, conditions: ["asthma", "copd", "heart"], exposure: "rider", commute: "bike" };
    expect(sensitivity(worst).score).toBe(3);
  });
});

describe("personalRisk", () => {
  it("gives different levels for the same AQI", () => {
    expect(personalRisk(287, ammi).level).toBe("severe");
    expect(personalRisk(287, ali).level).toBe("high");
    expect(personalRisk(287, healthy).level).toBe("high");
  });
  it("separates the family at a moderate AQI (live Gulberg ~106)", () => {
    expect(personalRisk(106, ammi).level).toBe("high");
    expect(personalRisk(106, ali).level).toBe("moderate");
    expect(personalRisk(106, healthy).level).toBe("moderate");
  });
  it("is low in clean air", () => expect(personalRisk(30, healthy).level).toBe("low"));
});

describe("bestWindows", () => {
  it("finds the cleanest 2h window", () => {
    const h = day([300, 280, 200, 160, 165, 240, 310]);
    expect(bestWindows(h, 2)[0]).toEqual({ start: "11:00", end: "13:00", avgAqi: 163 });
  });
  it("returns non-overlapping windows", () => {
    const w = bestWindows(day([100, 100, 300, 300, 120, 120]), 2, 2);
    expect(w.map((x) => x.start)).toEqual(["08:00", "12:00"]);
  });
  it("is empty when there is not enough data", () => expect(bestWindows(day([100]), 2)).toEqual([]));
});

describe("shouldAlert", () => {
  it("alerts now when risk is already high", () => expect(shouldAlert(ali, 287, []).alert).toBe(true));
  it("alerts when the forecast crosses into high", () => {
    const d = shouldAlert(healthy, 150, day([160, 200, 420]));
    expect(d.alert).toBe(true);
    expect(d.reason).toMatch(/forecast/);
  });
  it("stays quiet in clean air", () => expect(shouldAlert(healthy, 40, day([40, 45, 50])).alert).toBe(false));
});

describe("plan helpers", () => {
  it("picks masks from level and AQI", () => {
    expect(maskFor("low", 40)).toBe("none");
    expect(maskFor("moderate", 90)).toBe("none");
    expect(maskFor("moderate", 106)).toBe("N95/KN95");
    expect(maskFor("severe", 300)).toBe("N95/KN95");
  });
  it("lists the hours that are risky for this person", () => {
    expect(riskyWindows(day([100, 300, 300, 100]), ali)).toEqual(["09:00-11:00"]);
    expect(riskyWindows(day([100, 100]), ali)).toEqual([]);
    expect(riskyWindows(day(Array(24).fill(300), 12), ali)).toEqual(["All day"]);
  });
});
