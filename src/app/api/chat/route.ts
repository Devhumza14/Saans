import { z } from "zod";
import { AiError, chatModel, chatStream, type ChatMessage, type ToolCall } from "@/lib/ai/openrouter";
import { CHAT_SYSTEM } from "@/lib/ai/prompts";
import { TOOLS, runTool } from "@/lib/ai/tools";
import { DAILY_AI_LIMIT, aiCallsToday, getHousehold } from "@/lib/data";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";

export const maxDuration = 90;
const Body = z.object({ message: z.string().trim().min(1).max(600) });
const MAX_ROUNDS = 4;

const json = (status: number, error: string) => Response.json({ error }, { status });

/** NDJSON stream: {tool}, {text}, {error}, {done}. */
export async function POST(req: Request) {
  if (!supabaseConfigured()) return json(503, "The app is not connected to its database yet.");
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return json(400, "Please type a question (up to 600 characters).");

  const sb = await supabaseServer();
  if (!(await sb.auth.getUser()).data.user) return json(401, "Please sign in again.");
  const h = await getHousehold(sb);
  if (!h) return json(404, "Please set up your household first.");
  if ((await aiCallsToday(sb, h.household, h.members.map((m) => m.id))) >= DAILY_AI_LIMIT) {
    return json(429, `You have used today's ${DAILY_AI_LIMIT} AI answers. Try again tomorrow.`);
  }

  const { data: past } = await sb.from("messages").select("role, content").eq("household_id", h.household.id).order("created_at", { ascending: false }).limit(8);
  await sb.from("messages").insert({ household_id: h.household.id, role: "user", content: body.data.message });
  const messages: ChatMessage[] = [
    { role: "system", content: CHAT_SYSTEM(h.household.area) },
    ...(past ?? []).reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content as string })),
    { role: "user", content: body.data.message },
  ];

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctl) {
      const send = (o: object) => ctl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      let answer = "";
      try {
        for (let round = 0; round <= MAX_ROUNDS; round++) {
          let calls: ToolCall[] = [];
          let text = "";
          // After the last tool round, withhold tools so the model must answer.
          for await (const ev of chatStream({ model: chatModel(), messages, tools: round < MAX_ROUNDS ? TOOLS : undefined })) {
            if (ev.text) { text += ev.text; answer += ev.text; send({ text: ev.text }); }
            if (ev.toolCalls) calls = ev.toolCalls;
          }
          if (!calls.length) break;
          messages.push({ role: "assistant", content: text || null, tool_calls: calls });
          for (const c of calls) {
            send({ tool: c.function.name, args: c.function.arguments });
            const out = await runTool(c.function.name, c.function.arguments, h);
            messages.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify(out) });
          }
        }
        if (!answer.trim()) send({ error: "The AI did not produce an answer. Please try again." });
        else await sb.from("messages").insert({ household_id: h.household.id, role: "assistant", content: answer });
      } catch (e) {
        send({ error: e instanceof AiError ? e.message : "Something went wrong. Please try again." });
      }
      send({ done: true });
      ctl.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
