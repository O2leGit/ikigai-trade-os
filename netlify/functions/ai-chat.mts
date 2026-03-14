import type { Context } from "@netlify/functions";

const SYSTEM_PROMPT = `You are an expert options trading AI assistant for IkigaiTradeOS, a market intelligence platform. You have deep knowledge of:
- Options strategies (spreads, iron condors, strangles, covered calls, protective puts)
- Market regime analysis (risk-on, risk-off, crisis, neutral)
- Technical analysis (support/resistance, trend, momentum)
- Greeks (delta, gamma, theta, vega) and their portfolio implications
- Position sizing and risk management
- Sector rotation and macro analysis

When analyzing a portfolio, you should:
1. Identify concentrated risks (single-name, sector, directional)
2. Suggest specific adjustments with entry/exit levels
3. Recommend hedges based on current market regime
4. Flag positions that conflict with the current macro environment
5. Suggest new trade ideas that complement existing positions

Always be specific with ticker symbols, strike prices, expiration dates, and position sizes.
Use a direct, professional tone. No disclaimers — this is for an experienced trader.
Format responses with clear sections using markdown headers and bullet points.`;

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export default async function handler(req: Request, _context: Context) {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers }
    );
  }

  try {
    const body = await req.json();
    const { messages, portfolioContext } = body as {
      messages: ChatMessage[];
      portfolioContext?: string;
    };

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array required" }),
        { status: 400, headers }
      );
    }

    // Build system message with portfolio context
    let systemContent = SYSTEM_PROMPT;
    if (portfolioContext) {
      systemContent += `\n\n## Current Portfolio State\n${portfolioContext}`;
    }

    // Build messages for Claude API
    const claudeMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemContent,
        messages: claudeMessages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Claude API error:", response.status, errText);
      return new Response(
        JSON.stringify({
          error: `Claude API error: ${response.status}`,
          detail: errText,
        }),
        { status: 502, headers }
      );
    }

    const result = await response.json();
    const assistantContent =
      result.content?.[0]?.text || "No response generated.";

    return new Response(
      JSON.stringify({
        role: "assistant",
        content: assistantContent,
        usage: result.usage,
      }),
      { status: 200, headers }
    );
  } catch (err) {
    console.error("AI chat error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal error",
        detail: String(err),
      }),
      { status: 500, headers }
    );
  }
}
