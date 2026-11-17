/** OpenRouter client. Server-only: the API key never leaves route handlers. */

export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};
export type ToolDef = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export class AiError extends Error {
  constructor(
    public code: "config" | "timeout" | "upstream" | "invalid" | "limit",
    message: string,
  ) {
    super(message);
  }
}

const URL = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = 45_000;

export const planModel = () => process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";
export const chatModel = () => process.env.OPENROUTER_CHAT_MODEL || "google/gemini-2.5-flash";

type Opts = { model: string; messages: ChatMessage[]; json?: boolean; tools?: ToolDef[]; temperature?: number };
type Completion = { content: string | null; toolCalls: ToolCall[] };

/** Builds the request; shared by the plain and streaming calls. */
function request(opts: Opts, stream: boolean): { init: RequestInit } {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new AiError("config", "The AI service is not configured yet.");
  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.4,
    stream,
  };
  if (opts.json) body.response_format = { type: "json_object" };
  if (opts.tools?.length) body.tools = opts.tools;
  return {
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "Saans",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  };
}

async function send(init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(URL, init);
  } catch (e) {
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
      throw new AiError("timeout", "The AI took too long to answer. Please try again.");
    }
    throw new AiError("upstream", "Could not reach the AI service. Please try again.");
  }
  if (!res.ok) {
    console.error("[ai] OpenRouter HTTP", res.status); // status only: never log bodies or keys
    throw new AiError("upstream", "The AI service is busy right now. Please try again in a moment.");
  }
  return res;
}

export async function chatCompletion(opts: Opts): Promise<Completion> {
  const res = await send(request(opts, false).init);
  const data = (await res.json()) as { choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[] };
  const msg = data.choices?.[0]?.message;
  if (!msg) throw new AiError("upstream", "The AI returned an empty answer. Please try again.");
  return { content: msg.content ?? null, toolCalls: msg.tool_calls ?? [] };
}
