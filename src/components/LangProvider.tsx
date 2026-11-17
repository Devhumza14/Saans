"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Loc } from "@/lib/ai/schemas";

export type Lang = "ur" | "roman" | "en";
type Ctx = { lang: Lang; setLang: (l: Lang) => void; large: boolean; setLarge: (v: boolean) => void };

const LangCtx = createContext<Ctx>({ lang: "roman", setLang: () => {}, large: false, setLarge: () => {} });
export const useLang = () => useContext(LangCtx);

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode: ignore */ } },
};

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("roman");
  const [large, setLargeState] = useState(false);

  useEffect(() => {
    const l = store.get("saans.lang");
    if (l === "ur" || l === "roman" || l === "en") setLangState(l);
    setLargeState(store.get("saans.large") === "1");
  }, []);
  useEffect(() => {
    document.documentElement.dataset.large = String(large);
  }, [large]);

  const setLang = useCallback((l: Lang) => { setLangState(l); store.set("saans.lang", l); }, []);
  const setLarge = useCallback((v: boolean) => { setLargeState(v); store.set("saans.large", v ? "1" : "0"); }, []);
  const value = useMemo(() => ({ lang, setLang, large, setLarge }), [lang, setLang, large, setLarge]);
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

/** Renders a trilingual string in the chosen language (Urdu gets RTL + Nastaliq). */
export function T({ text, className = "" }: { text: Loc; className?: string }) {
  const { lang } = useLang();
  return lang === "ur" ? (
    <span lang="ur" dir="rtl" className={`ur ${className}`}>{text.ur}</span>
  ) : (
    <span className={className}>{text[lang]}</span>
  );
}

export function LangToggle() {
  const { lang, setLang, large, setLarge } = useLang();
  const opts: { v: Lang; label: string }[] = [{ v: "ur", label: "اردو" }, { v: "roman", label: "Roman" }, { v: "en", label: "EN" }];
  return (
    <div className="flex items-center gap-2">
      <div role="group" aria-label="Language" className="flex rounded-full bg-card p-1">
        {opts.map((o) => (
          <button key={o.v} type="button" aria-pressed={lang === o.v} onClick={() => setLang(o.v)}
            className={`h-8 rounded-full px-3 text-[13px] font-medium ${o.v === "ur" ? "ur leading-none" : ""} ${lang === o.v ? "bg-canvas text-ink shadow-sm" : "text-body"}`}>
            {o.label}
          </button>
        ))}
      </div>
      <button type="button" aria-pressed={large} onClick={() => setLarge(!large)} className={`hidden h-10 items-center gap-1 rounded-full border px-3.5 text-[13px] font-medium sm:inline-flex ${large ? "border-ink bg-ink text-canvas" : "border-hairline bg-canvas"}`}>
        <span className="text-base">A</span><span className="text-xs">a</span> Bara Text
      </button>
    </div>
  );
}
