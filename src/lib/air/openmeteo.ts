import { z } from "zod";
import { DEFAULT_AREA, findArea } from "@/lib/areas";
import { supabaseAdmin } from "@/lib/supabase/admin";

const AQ_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const WX_URL = "https://api.open-meteo.com/v1/forecast";
const TTL_MS = 15 * 60_000;

// ---- Raw Open-Meteo shapes (checked against a live response; values can be null) ----
const num = z.number().nullable();
const AirSchema = z.object({
  current: z.object({ time: z.string(), us_aqi: num, pm2_5: num, pm10: num, nitrogen_dioxide: num, ozone: num, carbon_monoxide: num }),
  hourly: z.object({ time: z.array(z.string()), us_aqi: z.array(num), pm2_5: z.array(num), pm10: z.array(num) }),
});
const WxSchema = z.object({
  current: z.object({ wind_speed_10m: num, temperature_2m: num, relative_humidity_2m: num }),
  hourly: z.object({ time: z.array(z.string()), wind_speed_10m: z.array(num) }),
});

// ---- Optional ground-station AQI (WAQI). Set WAQI_TOKEN to enable; any failure falls back to the model. ----
const WaqiSchema = z.object({
  status: z.literal("ok"),
  data: z.array(z.object({ lat: z.number(), lon: z.number(), aqi: z.string(), station: z.object({ name: z.string(), time: z.string() }) })),
});
const MAX_STATION_KM = 15;
const MAX_STATION_AGE_MS = 3 * 3600_000;
const km = (aLat: number, aLng: number, bLat: number, bLng: number) =>
  Math.hypot((aLat - bLat) * 111, (aLng - bLng) * 111 * Math.cos((aLat * Math.PI) / 180));

type Station = { lat: number; lng: number; aqi: number; name: string };
let stations: { at: number; list: Promise<Station[]> } | undefined;

/** All Lahore stations in one call, shared by every area for 5 minutes. */
function lahoreStations(): Promise<Station[]> {
  const token = process.env.WAQI_TOKEN?.split(/[\s#]/)[0].replace(/["']/g, "");
  if (!token) return Promise.resolve([]);
  if (stations && Date.now() - stations.at < 5 * 60_000) return stations.list;
  const list = getJson(`https://api.waqi.info/v2/map/bounds?latlng=31.30,74.10,31.70,74.50&networks=all&token=${encodeURIComponent(token)}`)
    .then((j) => WaqiSchema.parse(j).data.flatMap((s): Station[] => {
      const aqi = Number(s.aqi); // "-" when the station has no reading
      return Number.isFinite(aqi) && Date.now() - Date.parse(s.station.time) < MAX_STATION_AGE_MS ? [{ lat: s.lat, lng: s.lon, aqi, name: s.station.name }] : [];
    }))
    .catch(() => []);
  stations = { at: Date.now(), list };
  return list;
}

async function nearestStation(lat: number, lng: number): Promise<{ aqi: number; name: string } | null> {
  let best: { d: number; s: Station } | null = null;
  for (const s of await lahoreStations()) {
    const d = km(lat, lng, s.lat, s.lng);
    if (d <= MAX_STATION_KM && (!best || d < best.d)) best = { d, s };
  }
  return best ? { aqi: best.s.aqi, name: best.s.name } : null;
}

// ---- Normalised shape used everywhere else ----
export type Hour = { time: string; aqi: number; pm25: number; pm10: number; wind: number | null };
export type AirData = {
  area: string;
  current: {
    aqi: number; pm25: number; pm10: number; no2: number; o3: number; co: number;
    wind: number | null; temp: number | null; humidity: number | null; time: string;
  };
  hourly: Hour[]; // from the current hour onward (up to 48h)
  station?: string; // set when current AQI comes from a real ground station (WAQI) instead of the model
};
export type AirResult = { data: AirData; cached: boolean; fetchedAt: string };

async function getJson(url: string): Promise<unknown> {
  const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`Open-Meteo ${r.status}`);
  return r.json();
}

async function fetchLive(areaName: string, lat: number, lng: number): Promise<AirData> {
  const q = `latitude=${lat}&longitude=${lng}&timezone=Asia/Karachi&forecast_days=2`;
  const [air, wx, station] = await Promise.all([
    getJson(`${AQ_URL}?${q}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide&hourly=us_aqi,pm2_5,pm10`).then((j) => AirSchema.parse(j)),
    // Weather is a nice-to-have: if it fails we still serve air quality.
    getJson(`${WX_URL}?${q}&current=wind_speed_10m,temperature_2m,relative_humidity_2m&hourly=wind_speed_10m`).then((j) => WxSchema.parse(j)).catch(() => null),
    nearestStation(lat, lng),
  ]);
  if (air.current.us_aqi == null) throw new Error("Open-Meteo returned no AQI");

  const windAt = new Map(wx ? wx.hourly.time.map((t, i) => [t, wx.hourly.wind_speed_10m[i]] as const) : []);
  const start = Math.max(0, air.hourly.time.findIndex((t) => t >= air.current.time));
  const hourly = air.hourly.time.slice(start).flatMap((time, k): Hour[] => {
    const i = start + k;
    const aqi = air.hourly.us_aqi[i];
    return aqi == null ? [] : [{ time, aqi, pm25: air.hourly.pm2_5[i] ?? 0, pm10: air.hourly.pm10[i] ?? 0, wind: windAt.get(time) ?? null }];
  });

  const c = air.current;
  // Ground station wins for "now"; shift the model forecast by the same offset so the chart stays continuous.
  const delta = station ? station.aqi - (c.us_aqi ?? station.aqi) : 0;
  if (delta) for (const h of hourly) h.aqi = Math.max(0, Math.round(h.aqi + delta));
  return {
    area: areaName,
    station: station?.name,
    current: {
      aqi: station?.aqi ?? c.us_aqi ?? 0, pm25: c.pm2_5 ?? 0, pm10: c.pm10 ?? 0, no2: c.nitrogen_dioxide ?? 0, o3: c.ozone ?? 0, co: c.carbon_monoxide ?? 0,
      wind: wx?.current.wind_speed_10m ?? null, temp: wx?.current.temperature_2m ?? null, humidity: wx?.current.relative_humidity_2m ?? null,
      time: c.time,
    },
    hourly,
  };
}

// ---- Cache: memory (per instance) + Supabase aq_snapshots (shared). Live failure => serve last snapshot. ----
const mem = new Map<string, { data: AirData; at: number }>();
const fresh = (at: number) => Date.now() - at < TTL_MS;

export async function getAirData(areaName: string): Promise<AirResult> {
  const area = findArea(areaName) ?? DEFAULT_AREA;
  const hit = (s: { data: AirData; at: number }, cached: boolean): AirResult => ({ data: s.data, cached, fetchedAt: new Date(s.at).toISOString() });

  const m = mem.get(area.name);
  if (m && fresh(m.at)) return hit(m, false);

  const db = supabaseAdmin();
  let snap: { data: AirData; at: number } | undefined;
  if (db) {
    const { data: row } = await db.from("aq_snapshots").select("data, fetched_at").eq("area", area.name).order("fetched_at", { ascending: false }).limit(1).maybeSingle();
    if (row) snap = { data: row.data as AirData, at: Date.parse(row.fetched_at) };
    if (snap && fresh(snap.at)) return hit(snap, false);
  }

  try {
    const data = await fetchLive(area.name, area.lat, area.lng);
    const saved = { data, at: Date.now() };
    mem.set(area.name, saved);
    if (db) void db.from("aq_snapshots").insert({ area: area.name, data }).then(() => undefined, () => undefined);
    return hit(saved, false);
  } catch (err) {
    console.error("[air] live fetch failed:", err instanceof Error ? err.message : "unknown");
    const stale = m ?? snap;
    if (stale) return hit(stale, true);
    throw new Error("Air data is temporarily unavailable");
  }
}

/** "HH:MM" in Lahore time. */
export const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" });
