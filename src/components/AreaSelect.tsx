"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Crosshair, MapPin } from "lucide-react";
import { AREAS, nearestArea } from "@/lib/areas";

export function AreaSelect({ area }: { area: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");

  function locate() {
    if (!navigator.geolocation) return setMsg("Location is not available on this device.");
    setMsg("Finding you…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const { area: a, km } = nearestArea(p.coords.latitude, p.coords.longitude);
        setMsg(km > 25 ? `Closest Lahore area: ${a.name} (${Math.round(km)} km away)` : "");
        router.push(`/dashboard?area=${encodeURIComponent(a.name)}`);
      },
      () => setMsg("Could not get your location. Pick an area instead."),
      { timeout: 8000 },
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <label htmlFor="area" className="sr-only">Area of Lahore</label>
      <div className="relative">
        <MapPin size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-muted" aria-hidden />
        <select
          id="area" value={area}
          onChange={(e) => router.push(`/dashboard?area=${encodeURIComponent(e.target.value)}`)}
          className="h-11 appearance-none rounded-lg border border-[#d9d0c3] bg-canvas pl-9 pr-10 text-[15px] font-medium"
        >
          {AREAS.map((a) => <option key={a.name}>{a.name}</option>)}
        </select>
      </div>
      <button type="button" onClick={locate} className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#d9d0c3] bg-canvas px-4 text-sm font-medium hover:bg-soft">
        <Crosshair size={16} aria-hidden /> Meri location
      </button>
      {msg && <span role="status" className="text-sm text-body">{msg}</span>}
    </div>
  );
}
