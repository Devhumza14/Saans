"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Loc } from "@/lib/ai/schemas";

export type Lang = "en";
type Ctx = { lang: Lang; large: boolean; setLarge: (v: boolean) => void };

const LangCtx = createContext<Ctx>({ lang: "en", large: false, setLarge: () => {} });
export const useLang = () => useContext(LangCtx);

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode: ignore */ } },
};

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [large, setLargeState] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLargeState(store.get("saans.large") === "1"), 0);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.large = String(large);
  }, [large]);

  const setLarge = useCallback((v: boolean) => { setLargeState(v); store.set("saans.large", v ? "1" : "0"); }, []);
  const value = useMemo(() => ({ lang: "en" as const, large, setLarge }), [large, setLarge]);
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

/** Renders the English text of a plan string. */
export function T({ text, className = "" }: { text: Loc; className?: string }) {
  return <span className={className}>{text.en}</span>;
}

/** Large-text accessibility toggle. */
export function LangToggle() {
  const { large, setLarge } = useLang();
  return (
    <button type="button" aria-pressed={large} onClick={() => setLarge(!large)} className={`hidden h-10 items-center gap-1 rounded-full border px-3.5 text-[13px] font-medium sm:inline-flex ${large ? "border-ink bg-ink text-canvas" : "border-hairline bg-canvas"}`}>
      <span className="text-base">A</span><span className="text-xs">a</span> Large text
    </button>
  );
}
