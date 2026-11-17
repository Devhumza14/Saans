"use server";
import { redirect } from "next/navigation";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";

export type FormState = { error: string } | null;

/** One-click demo sign-in. Credentials stay on the server. */
export async function demoLogin(): Promise<FormState> {
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;
  if (!supabaseConfigured() || !email || !password) return { error: "Demo login is not set up yet." };
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: "Demo login did not work. Please try the email link instead." };
  redirect("/dashboard");
}

export async function signOut() {
  if (supabaseConfigured()) await (await supabaseServer()).auth.signOut();
  redirect("/");
}
