export type Area = { name: string; lat: number; lng: number };

export const AREAS: Area[] = [
  { name: "Gulberg", lat: 31.5204, lng: 74.3487 },
  { name: "DHA", lat: 31.4697, lng: 74.4086 },
  { name: "Johar Town", lat: 31.4697, lng: 74.2728 },
  { name: "Model Town", lat: 31.4835, lng: 74.326 },
  { name: "Walled City / Androon", lat: 31.582, lng: 74.317 },
  { name: "Shahdara", lat: 31.62, lng: 74.28 },
  { name: "Cantt", lat: 31.51, lng: 74.38 },
  { name: "Township", lat: 31.45, lng: 74.31 },
  { name: "Bahria Town", lat: 31.37, lng: 74.18 },
  { name: "Raiwind Road", lat: 31.4, lng: 74.24 },
  { name: "Allama Iqbal Town", lat: 31.51, lng: 74.29 },
  { name: "Wapda Town", lat: 31.43, lng: 74.27 },
];

export const DEFAULT_AREA = AREAS[0];

export function findArea(name: string): Area | undefined {
  return AREAS.find((a) => a.name.toLowerCase() === name.toLowerCase());
}

/** Nearest Lahore area to a coordinate (haversine, km). */
export function nearestArea(lat: number, lng: number): { area: Area; km: number } {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dist = (a: Area) => {
    const dLat = rad(a.lat - lat);
    const dLng = rad(a.lng - lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(a.lat)) * Math.sin(dLng / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  };
  return AREAS.map((area) => ({ area, km: dist(area) })).sort((x, y) => x.km - y.km)[0];
}
