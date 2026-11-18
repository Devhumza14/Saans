"use client";
import { useState, useTransition } from "react";
import { Crosshair, Plus, Trash2 } from "lucide-react";
import { AREAS, nearestArea } from "@/lib/areas";
import { loadDemoFamily, saveHousehold, type HouseholdInput } from "./actions";

type M = HouseholdInput["members"][number];
const blank = (): M => ({ name: "", age_group: "adult", conditions: [], is_pregnant: false, occupation_exposure: "mixed", commute: "none", school_going: false });

const AGES: [M["age_group"], string][] = [["child", "Child"], ["teen", "Teen"], ["adult", "Adult"], ["senior", "60+"]];
const CONDS: [M["conditions"][number], string][] = [["asthma", "Asthma"], ["copd", "COPD"], ["heart", "Heart condition"], ["diabetes", "Diabetes"], ["allergies", "Allergies"]];
const EXPO: [M["occupation_exposure"], string][] = [["indoor", "Indoor"], ["mixed", "Mixed"], ["outdoor", "Outdoor"], ["rider", "Rider"]];
const COMMUTE: [M["commute"], string][] = [["none", "None"], ["car", "Car"], ["bike", "Bike"], ["rickshaw", "Rickshaw"], ["public", "Bus / wagon"], ["walk", "Walk"]];

const chip = (on: boolean) => `min-h-10 rounded-full border px-3.5 text-[13px] font-medium ${on ? "border-dark bg-dark text-canvas" : "border-[#d9d0c3] bg-canvas text-ink"}`;
const seg = (on: boolean) => `min-h-11 flex-1 rounded-lg text-[13px] font-medium ${on ? "bg-canvas text-ink shadow-sm" : "text-body"}`;

export function OnboardingForm({ initialName, initialArea, hasHousehold }: { initialName: string; initialArea: string; hasHousehold: boolean }) {
  const [name, setName] = useState(initialName);
  const [area, setArea] = useState(initialArea);
  const [members, setMembers] = useState<M[]>([blank()]);
  const [error, setError] = useState("");
  const [geoMsg, setGeoMsg] = useState("");
  const [pending, start] = useTransition();

  const patch = (i: number, p: Partial<M>) => setMembers((ms) => ms.map((m, k) => (k === i ? { ...m, ...p } : m)));
  const toggleCond = (i: number, c: M["conditions"][number]) =>
    patch(i, { conditions: members[i].conditions.includes(c) ? members[i].conditions.filter((x) => x !== c) : [...members[i].conditions, c] });

  function locate() {
    if (!navigator.geolocation) return setGeoMsg("Location is not available on this device.");
    navigator.geolocation.getCurrentPosition(
      (p) => { const { area: a } = nearestArea(p.coords.latitude, p.coords.longitude); setArea(a.name); setGeoMsg(`Nearest area: ${a.name}`); },
      () => setGeoMsg("Could not get your location. Please pick an area."),
      { timeout: 8000 },
    );
  }

  const run = (fn: () => Promise<{ error: string } | undefined>) => start(async () => { setError(""); const r = await fn(); if (r?.error) setError(r.error); });

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="hh" className="text-sm font-medium text-body">Household name</label>
          <input id="hh" value={name} onChange={(e) => setName(e.target.value)} placeholder="Khan Family" className="h-12 rounded-lg border border-[#d9d0c3] bg-canvas px-4 text-base" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ar" className="text-sm font-medium text-body">Area</label>
          <div className="flex gap-2">
            <select id="ar" value={area} onChange={(e) => setArea(e.target.value)} className="h-12 flex-1 rounded-lg border border-[#d9d0c3] bg-canvas px-4 text-base">
              {AREAS.map((a) => <option key={a.name}>{a.name}</option>)}
            </select>
            <button type="button" onClick={locate} aria-label="Use my location" className="grid size-12 place-items-center rounded-lg border border-[#d9d0c3] bg-canvas hover:bg-soft"><Crosshair size={18} aria-hidden /></button>
          </div>
          {geoMsg && <p role="status" className="text-[13px] text-body">{geoMsg}</p>}
        </div>
      </section>

      <section aria-label="Family members" className="flex flex-col gap-4">
        {members.map((m, i) => (
          <fieldset key={i} className="flex flex-col gap-5 rounded-2xl bg-soft p-5">
            <legend className="sr-only">Person {i + 1}</legend>
            <div className="flex items-end gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <label htmlFor={`n${i}`} className="text-sm font-medium text-body">Name</label>
                <input id={`n${i}`} value={m.name} onChange={(e) => patch(i, { name: e.target.value })} className="h-12 rounded-lg border border-[#d9d0c3] bg-canvas px-4 text-base" />
              </div>
              {members.length > 1 && (
                <button type="button" aria-label={`Remove person ${i + 1}`} onClick={() => setMembers((ms) => ms.filter((_, k) => k !== i))} className="grid size-12 place-items-center rounded-lg border border-[#d9d0c3] bg-canvas hover:bg-card"><Trash2 size={18} aria-hidden /></button>
              )}
            </div>
            <div className="flex flex-col gap-2"><span className="text-sm font-medium text-body">Age</span>
              <div className="flex gap-1 rounded-xl bg-[#e8e0d2] p-1">{AGES.map(([v, l]) => <button key={v} type="button" aria-pressed={m.age_group === v} onClick={() => patch(i, { age_group: v })} className={seg(m.age_group === v)}>{l}</button>)}</div>
            </div>
            <div className="flex flex-col gap-2"><span className="text-sm font-medium text-body">Health conditions <span className="font-normal text-muted">· select all that apply</span></span>
              <div className="flex flex-wrap gap-2">
                {CONDS.map(([v, l]) => <button key={v} type="button" aria-pressed={m.conditions.includes(v)} onClick={() => toggleCond(i, v)} className={chip(m.conditions.includes(v))}>{l}</button>)}
                <button type="button" aria-pressed={m.is_pregnant} onClick={() => patch(i, { is_pregnant: !m.is_pregnant })} className={chip(m.is_pregnant)}>Pregnant</button>
              </div>
            </div>
            <div className="flex flex-col gap-2"><span className="text-sm font-medium text-body">Most of the day</span>
              <div className="flex gap-1 rounded-xl bg-[#e8e0d2] p-1">{EXPO.map(([v, l]) => <button key={v} type="button" aria-pressed={m.occupation_exposure === v} onClick={() => patch(i, { occupation_exposure: v })} className={seg(m.occupation_exposure === v)}>{l}</button>)}</div>
            </div>
            <div className="flex flex-col gap-2"><span className="text-sm font-medium text-body">Commute</span>
              <div className="flex flex-wrap gap-2">{COMMUTE.map(([v, l]) => <button key={v} type="button" aria-pressed={m.commute === v} onClick={() => patch(i, { commute: v })} className={chip(m.commute === v)}>{l}</button>)}</div>
            </div>
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-[15px]">
              Goes to school
              <input type="checkbox" checked={m.school_going} onChange={(e) => patch(i, { school_going: e.target.checked })} className="size-6 accent-[#1f5f53]" />
            </label>
          </fieldset>
        ))}
        {members.length < 8 && (
          <button type="button" onClick={() => setMembers((ms) => [...ms, blank()])} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-[#c9bfb0] text-sm font-medium text-body hover:bg-soft"><Plus size={16} aria-hidden /> Add another person</button>
        )}
      </section>

      {error && <p role="alert" className="text-sm text-[#8f2525]">{error}</p>}
      {hasHousehold && <p className="text-[13px] text-muted">Your current household will be replaced by the new one.</p>}
      <div className="flex flex-col gap-3">
        <button type="button" disabled={pending} onClick={() => run(() => saveHousehold({ name, area, members }))} className="min-h-[52px] rounded-lg bg-cta text-base font-medium text-white hover:bg-cta-hover disabled:opacity-60">{pending ? "Saving…" : "Continue"}</button>
        <button type="button" disabled={pending} onClick={() => run(loadDemoFamily)} className="min-h-12 rounded-lg border border-[#d9d0c3] bg-canvas text-sm font-medium hover:bg-soft disabled:opacity-60">Load demo family</button>
      </div>
    </div>
  );
}
