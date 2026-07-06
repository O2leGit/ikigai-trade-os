// Shared LLM helper: routes the trading app's AI calls through OpenRouter
// (low-cost, OAuth-free) instead of the raw Anthropic API.
//
// Sir 2026-07-05 cost fix: every function fetched https://api.anthropic.com/v1/messages
// directly with ANTHROPIC_API_KEY, billing the raw API (part of the invoice run).
// This helper accepts the SAME Anthropic-format payload each function already
// builds, calls OpenRouter's OpenAI-compatible endpoint under the hood, and
// returns an Anthropic-shaped result so call sites keep using result.content[0].text.
//
// Env:
//   OPENROUTER_API_KEY   required (sk-or-...); if missing -> ok:false, callers 500.
//   TRADEOS_LLM_MODEL    optional; default a cheap capable model.

type AnthropicMsg = { role: string; content: unknown };

export interface AnthropicShaped {
  ok: boolean;
  status: number;
  content: { type: string; text: string }[];
  usage?: { input_tokens: number; output_tokens: number };
  errText?: string;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = process.env.TRADEOS_LLM_MODEL || "deepseek/deepseek-chat";

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((b) =>
        typeof b === "string"
          ? b
          : b && typeof b === "object" && "text" in (b as Record<string, unknown>)
            ? String((b as Record<string, unknown>).text ?? "")
            : "",
      )
      .join("\n\n");
  }
  return "";
}

/** Anthropic-format payload in, Anthropic-shaped result out, via OpenRouter. */
export async function anthropicMessagesViaOpenRouter(payload: {
  model?: string;
  max_tokens?: number;
  system?: string;
  messages: AnthropicMsg[];
}): Promise<AnthropicShaped> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return {
      ok: false,
      status: 500,
      content: [{ type: "text", text: "" }],
      errText: "OPENROUTER_API_KEY not configured",
    };
  }
  const orMessages = [
    ...(payload.system ? [{ role: "system", content: payload.system }] : []),
    ...payload.messages.map((m) => ({ role: m.role, content: textOf(m.content) })),
  ];
  try {
    const resp = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "X-Title": "ikigaiTradeOS",
      },
      body: JSON.stringify({
        model: process.env.TRADEOS_LLM_MODEL || DEFAULT_MODEL,
        max_tokens: payload.max_tokens ?? 4096,
        messages: orMessages,
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      return { ok: false, status: resp.status, content: [{ type: "text", text: "" }], errText };
    }
    const data = (await resp.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = data?.choices?.[0]?.message?.content ?? "";
    const usage = data?.usage
      ? {
          input_tokens: data.usage.prompt_tokens ?? 0,
          output_tokens: data.usage.completion_tokens ?? 0,
        }
      : undefined;
    return { ok: true, status: 200, content: [{ type: "text", text }], usage };
  } catch (e) {
    return {
      ok: false,
      status: 502,
      content: [{ type: "text", text: "" }],
      errText: e instanceof Error ? e.message : String(e),
    };
  }
}
