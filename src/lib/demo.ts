import type { MemberProfile } from "@/lib/risk/engine";

export type DemoMember = {
  key: string;
  name: string;
  age: string;
  summary: string;
  avatar: { bg: string; fg: string };
  profile: MemberProfile;
  schoolGoing: boolean;
};

/** Synthetic "Khan Family, Gulberg". Used for the public pages and the "Load demo family" action. */
export const DEMO_HOUSEHOLD = { name: "Khan Family", area: "Gulberg" };

export const DEMO_FAMILY: DemoMember[] = [
  {
    key: "ammi", name: "Ammi", age: "65", summary: "asthma, heart condition · at home", schoolGoing: false,
    avatar: { bg: "#e8d5c9", fg: "#6b3420" },
    profile: { ageGroup: "senior", conditions: ["asthma", "heart"], isPregnant: false, exposure: "indoor", commute: "none" },
  },
  {
    key: "ali", name: "Ali", age: "27", summary: "delivery rider · bike", schoolGoing: false,
    avatar: { bg: "#d3e2ea", fg: "#1e4a5f" },
    profile: { ageGroup: "adult", conditions: [], isPregnant: false, exposure: "rider", commute: "bike" },
  },
  {
    key: "sara", name: "Sara", age: "30", summary: "pregnant · rickshaw", schoolGoing: false,
    avatar: { bg: "#ead6e0", fg: "#6a2a4a" },
    profile: { ageGroup: "adult", conditions: [], isPregnant: true, exposure: "mixed", commute: "rickshaw" },
  },
  {
    key: "zara", name: "Zara", age: "8", summary: "allergies · walks to school", schoolGoing: true,
    avatar: { bg: "#f0dcc0", fg: "#6b4310" },
    profile: { ageGroup: "child", conditions: ["allergies"], isPregnant: false, exposure: "indoor", commute: "walk" },
  },
];
