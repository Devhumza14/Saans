"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";

type Alert = { id: string; level: string; message_ur: string; message_roman: string; message_en: string; aqi: number; read: boolean; created_at: string };
const EVERY = 10 * 60_000;

export function AlertBell() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<Alert | null>(null);
  const seen = useRef(new Set<string>());
  const text = (a: Alert) => a.message_en;

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts/check", { method: "POST" });
      if (!res.ok) return;
      const j = (await res.json()) as { alerts: Alert[]; fresh?: Alert[] };
      setAlerts(j.alerts);
      const fresh = (j.fresh ?? []).filter((a) => !seen.current.has(a.id));
      fresh.forEach((a) => seen.current.add(a.id));
      if (fresh[0]) {
        setToast(fresh[0]);
        try { if ("Notification" in window && Notification.permission === "granted") new Notification("Saans", { body: fresh[0].message_en }); } catch { /* unsupported */ }
      }
    } catch { /* offline: try again next tick */ }
  }, []);

  useEffect(() => {
    void check();
    const t = setInterval(check, EVERY);
    return () => clearInterval(t);
  }, [check]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 9000); return () => clearTimeout(t); } }, [toast]);

  const unread = alerts.filter((a) => !a.read).length;
  async function toggle() {
    const next = !open;
    setOpen(next);
    try { if (next && "Notification" in window && Notification.permission === "default") await Notification.requestPermission(); } catch { /* ignore */ }
    if (next && unread) { await fetch("/api/alerts/check", { method: "PATCH" }).catch(() => {}); setAlerts((a) => a.map((x) => ({ ...x, read: true }))); }
  }

  return (
    <div className="relative">
      <button type="button" onClick={toggle} aria-label={`Alerts${unread ? `, ${unread} new` : ""}`} aria-expanded={open} className="relative grid size-11 place-items-center rounded-full border border-hairline bg-canvas hover:bg-soft">
        <Bell size={18} aria-hidden />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-[#d64545] text-[11px] font-semibold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 flex max-h-[70vh] w-[min(360px,calc(100vw-32px))] flex-col gap-2 overflow-auto rounded-2xl border border-hairline bg-canvas p-3 shadow-lg">
          {alerts.length === 0 && <p className="p-3 text-sm text-body">No alerts yet.</p>}
          {alerts.map((a) => (
            <div key={a.id} className="flex flex-col gap-1 rounded-xl bg-soft p-3">
              <p className="text-sm leading-relaxed">{text(a)}</p>
              <span className="font-mono text-[11px] text-muted">AQI {a.aqi} · {new Date(a.created_at).toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          ))}
          <p className="px-1 text-[11px] text-muted">Alert decided by risk engine, message written by AI.</p>
        </div>
      )}
      {toast && (
        <div role="status" className="fixed bottom-4 right-4 z-40 flex w-[min(380px,calc(100vw-32px))] items-start gap-3 rounded-2xl bg-dark p-4 text-canvas shadow-lg">
          <Bell size={18} className="mt-0.5 shrink-0 text-[#e8a55a]" aria-hidden />
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-sm leading-relaxed">{text(toast)}</p>
            <span className="text-[11px] text-[#a09d96]">Alert decided by risk engine, message written by AI.</span>
          </div>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss" className="grid size-8 place-items-center rounded-full hover:bg-dark-elev"><X size={16} aria-hidden /></button>
        </div>
      )}
    </div>
  );
}
