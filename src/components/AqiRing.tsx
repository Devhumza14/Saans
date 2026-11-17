"use client";
import { useEffect, useState } from "react";

const R = 110;
const C = 2 * Math.PI * R;

export function AqiRing({ aqi, color, label, size = 260 }: { aqi: number; color: string; label: string; size?: number }) {
  const [f, setF] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setF(Math.min(aqi / 500, 1)));
    return () => cancelAnimationFrame(id);
  }, [aqi]);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 260 260" width={size} height={size} role="img" aria-label={`AQI ${aqi} of 500, ${label}`}>
        <circle cx="130" cy="130" r={R} fill="none" stroke="#efe9de" strokeWidth="18" />
        <circle
          cx="130" cy="130" r={R} fill="none" stroke={color} strokeWidth="18" strokeLinecap="round"
          strokeDasharray={`${C * f} ${C}`} transform="rotate(-90 130 130)"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.2,.8,.2,1), stroke .6s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-medium uppercase tracking-[1.5px] text-muted">US AQI</span>
        <span className="font-serif text-[76px] leading-none tracking-[-2px]">{aqi}</span>
        <span className="text-[13px] text-muted">of 500</span>
      </div>
    </div>
  );
}
