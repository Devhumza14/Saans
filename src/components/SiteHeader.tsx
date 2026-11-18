import Link from "next/link";
import { LogOut } from "lucide-react";
import { AlertBell } from "@/components/AlertBell";
import { LangToggle } from "@/components/LangProvider";
import { signOut } from "@/app/login/actions";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/compare", label: "Compare" },
  { href: "/map", label: "Map" },
  { href: "/chat", label: "Ask Saans" },
];

export function SiteHeader({ cta, signedIn }: { cta?: { href: string; label: string }; signedIn?: boolean }) {
  return (
    <header className="border-b border-hairline/70">
      <div className="mx-auto flex min-h-[68px] max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 sm:px-8">
        <Link href="/" aria-label="Saans home" className="flex items-center gap-2.5 text-ink no-underline">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden>
            <path d="M4 11c4-4 8 4 12 0s8-4 12 0" stroke="#cc785c" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M4 17c4-4 8 4 12 0s8-4 12 0" stroke="#141413" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M4 23c4-4 8 4 12 0" stroke="#141413" strokeWidth="2.4" strokeLinecap="round" opacity=".45" />
          </svg>
          <span className="font-serif text-[26px] tracking-[-0.5px]">Saans</span>
        </Link>
        <nav aria-label="Primary" className="hidden gap-1 sm:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3.5 py-2.5 text-sm font-medium text-body hover:bg-card hover:text-ink">{n.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <LangToggle />
          {cta && (
            <Link href={cta.href} className="inline-flex min-h-11 items-center rounded-lg bg-cta px-5 text-[15px] font-medium text-white hover:bg-cta-hover">{cta.label}</Link>
          )}
          {signedIn && <AlertBell />}
          {signedIn && (
            <form action={signOut}>
              <button type="submit" aria-label="Sign out" className="grid size-11 place-items-center rounded-full border border-hairline bg-canvas text-ink hover:bg-soft"><LogOut size={18} aria-hidden /></button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
