import { afterEach, describe, expect, it, vi } from "vitest";

const hours = Array.from({ length: 48 }, (_, i) => `2026-11-18T${String(i % 24).padStart(2, "0")}:00`);
const model = (url: string) =>
  url.includes("air-quality-api")
    ? { current: { time: hours[0], us_aqi: 100, pm2_5: 40, pm10: 60, nitrogen_dioxide: 1, ozone: 1, carbon_monoxide: 1 }, hourly: { time: hours, us_aqi: hours.map(() => 100), pm2_5: hours.map(() => 40), pm10: hours.map(() => 60) } }
    : { current: { wind_speed_10m: 5, temperature_2m: 20, relative_humidity_2m: 50 }, hourly: { time: hours, wind_speed_10m: hours.map(() => 5) } };
const station = (aqi: string, lat: number, iso: string) => ({ status: "ok", data: [{ lat, lon: 74.34, aqi, station: { name: "US Consulate", time: iso } }] });
const now = () => new Date().toISOString();

/** Fresh module each time: getAirData and the station list are cached per module instance. */
async function air(waqi: unknown, token: string | undefined, area: string) {
  vi.resetModules();
  vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify(url.includes("waqi.info") ? waqi : model(url)))));
  if (token) process.env.WAQI_TOKEN = token; else delete process.env.WAQI_TOKEN;
  return (await import("./openmeteo")).getAirData(area);
}

afterEach(() => { vi.unstubAllGlobals(); delete process.env.WAQI_TOKEN; });

describe("ground station AQI", () => {
  it("uses a nearby fresh station and shifts the forecast by the same offset", async () => {
    const { data } = await air(station("160", 31.5, now()), "t", "Gulberg");
    expect(data.current.aqi).toBe(160);
    expect(data.station).toBe("US Consulate");
    expect(data.hourly[0].aqi).toBe(160);
  });
  it("falls back to the model when the station is far, stale, empty or no token is set", async () => {
    for (const [s, token] of [[station("160", 32.5, now()), "t"], [station("160", 31.5, "2020-01-01T00:00:00Z"), "t"], [station("-", 31.5, now()), "t"], [station("160", 31.5, now()), undefined]] as const) {
      const { data } = await air(s, token, "DHA");
      expect(data.current.aqi).toBe(100);
      expect(data.station).toBeUndefined();
    }
  });
});
