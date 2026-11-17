import { createClient } from "@supabase/supabase-js";

/** Service-role client for trusted server code only. Returns null when Supabase is not configured. */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}
