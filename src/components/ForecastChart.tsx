"use client";
import { Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BANDS } from "@/lib/risk/engine";

type Pt = { t: string; aqi: number };

/** Line is coloured by AQI band (gradient mapped to the data's min..max); the best window is shaded. */
export function ForecastChart({ data, window }: { data: Pt[]; window?: { from: string; to: string } }) {
  const vals = data.map((d) => d.aqi);
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals);
  const span = Math.max(max - min, 1);
  const yMax = Math.max(Math.ceil(max / 50) * 50, 150);
  // Stops go top (max) to bottom (min): each band edge inside the range becomes a hard colour step.
  const stops: { o: number; c: string }[] = [];
  for (const b of [...BANDS].reverse()) {
    const hi = Math.min(b.max === Infinity ? max : b.max, max);
    const lo = Math.max(b.min, min);
    if (hi < min || lo > max) continue;
    stops.push({ o: (max - hi) / span, c: b.color }, { o: (max - lo) / span, c: b.color });
  }
  const lines = [100, 200, 300].filter((v) => v < yMax);

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[640px]" role="img" aria-label="Hourly AQI forecast for the next 24 hours">
        <ResponsiveContainer width="100%" height={270}>
          <AreaChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="bandLine" x1="0" y1="0" x2="0" y2="1">
                {stops.map((s, i) => <stop key={i} offset={`${(s.o * 100).toFixed(1)}%`} stopColor={s.c} />)}
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e6dfd8" strokeDasharray="3 5" />
            <XAxis dataKey="t" interval={2} tick={{ fontSize: 12, fill: "#6c6a64" }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, yMax]} tick={{ fontSize: 12, fill: "#6c6a64" }} tickLine={false} axisLine={false} />
            {lines.map((v) => <ReferenceLine key={v} y={v} stroke="#c9bfb0" strokeDasharray="4 4" />)}
            {window && <ReferenceArea x1={window.from} x2={window.to} fill="#5db8a6" fillOpacity={0.2} stroke="#2e7f70" strokeDasharray="4 4" />}
            <Tooltip formatter={(v) => [`AQI ${v}`, ""]} separator="" contentStyle={{ borderRadius: 10, border: "1px solid #e6dfd8" }} />
            <Area type="monotone" dataKey="aqi" stroke="url(#bandLine)" strokeWidth={3.5} fill="#8a8579" fillOpacity={0.1} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
