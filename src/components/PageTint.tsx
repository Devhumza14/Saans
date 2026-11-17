"use client";
import { useEffect } from "react";

/** Tints the page background to the current AQI band. */
export function PageTint({ tint }: { tint: string }) {
  useEffect(() => {
    document.documentElement.style.setProperty("--page-tint", tint);
    return () => {
      document.documentElement.style.removeProperty("--page-tint");
    };
  }, [tint]);
  return null;
}
