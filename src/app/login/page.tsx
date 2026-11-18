import { SiteHeader } from "@/components/SiteHeader";
import { LoginForm } from "./LoginForm";

const safeNext = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard");

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-[440px] flex-col gap-8 px-4 py-16 sm:px-0">
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-[40px] leading-[1.1] tracking-[-0.8px]">Welcome back</h1>
          <p className="text-body">Sign in to see today’s plan for everyone at home.</p>
        </div>
        <LoginForm next={safeNext(next)} demoEnabled={Boolean(process.env.DEMO_EMAIL && process.env.DEMO_PASSWORD)} />
      </main>
    </>
  );
}
