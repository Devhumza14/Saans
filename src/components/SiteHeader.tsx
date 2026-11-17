import Link from "next/link";

const NAV = [{ href: "/dashboard", label: "Dashboard" }];

export function SiteHeader({ cta }: { cta?: { href: string; label: string } }) {
  return (
    <header className="border-b border-hairline/70">
      <div className="mx-auto flex h-[68px] max-w-[1200px] items-center gap-6 px-4 sm:px-8">
        <Link href="/" aria-label="Saans home" className="flex items-center gap-2.5 text-ink no-underline">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden>
            <path d="M4 11c4-4 8 4 12 0s8-4 12 0" stroke="#cc785c" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M4 17c4-4 8 4 12 0s8-4 12 0" stroke="#141413" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M4 23c4-4 8 4 12 0" stroke="#141413" strokeWidth="2.4" strokeLinecap="round" opacity=".45" />
          </svg>
          <span className="font-serif text-[26px] tracking-[-0.5px]">Saans</span>
          <span className="ur text-lg leading-none text-muted" lang="ur">سانس</span>
        </Link>
        <nav aria-label="Primary" className="hidden gap-1 sm:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3.5 py-2.5 text-sm font-medium text-body hover:bg-card hover:text-ink">{n.label}</Link>
          ))}
        </nav>
        {cta && (
          <Link href={cta.href} className="ml-auto inline-flex min-h-11 items-center rounded-lg bg-cta px-5 text-[15px] font-medium text-white hover:bg-cta-hover">{cta.label}</Link>
        )}
      </div>
    </header>
  );
}
