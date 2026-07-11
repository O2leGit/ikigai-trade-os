import type { Context } from "@netlify/functions";
import { anthropicMessagesViaOpenRouter } from "./_llm.mts";
import { getStore } from "@netlify/blobs";
import { quoteLine, stock, type SymbolSpec } from "../../shared/marketProviders";

const SYSTEM_PROMPT = `You are the chief market strategist at a top-tier options-focused hedge fund writing the morning intelligence brief. You are brutally direct, numerically precise, and never hedge or equivocate. You interpret everything through the lens of an options trader who sells premium for a living.

ANALYSIS RULES:
- Every claim must cite a specific number from the data
- VIX > 25 = elevated, sell premium aggressively with defined risk. VIX < 15 = vol is cheap, buy it
- IV Rank > 50 = premium is rich, favor selling. IV Rank < 30 = premium is cheap, favor buying
- Name exact strike prices, spreads, and expiration dates in trade ideas
- No generic filler -- say WHY and WHAT TO DO about it
- Support/resistance must come from actual price levels in the data, not round numbers
- Sector rotation signals matter: defensive leadership (XLU/XLP up, XLY/XLK down) = risk-off

Output ONLY valid JSON (no markdown fences). Include these top-level keys: generatedAt, briefingDate, briefingEdition, aiSummary (with generatedAt + paragraphs array of 3 strings -- P1: overnight recap with catalysts and levels, P2: vol regime synthesis with VIX/IV rank/sector rotation, P3: exact playbook with named trades/strikes/DTE), keyLevels (array of 4 objects with symbol/name/price/change/direction/support/resistance/trend), fearGauge (vix/vixChange/vixTrend/putCallRatio/putCallSignal/ivRank/fearLevel), overnightDevelopments (array), crisisStatus (object), marketRegime (object with classification/description/bestStrategies), executiveView (string paragraph), tradingIdeas (object with dayTrades/swingTrades/hedges arrays -- each trade must have exact strikes and DTE like "Sell SPY 560/555 put spread, 14 DTE, $1.20 credit"), scenarioMatrix (array), decisionSummary (object with bestOpportunityToday/bestSwingIdeaThisWeek/biggestRiskToWatch strings), sectorRotation (array), macroConditions (array).`;

export default async function handler(req: Request, _context: Context) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  // Step 1: Check API key
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY not set" }), { status: 500, headers });
  }

  try {
    // Step 2: Fetch market data (multi-provider chain; Yahoo last resort)
    const symbols: (SymbolSpec & { label: string })[] = [
      { yahoo: "^GSPC", label: "S&P 500" },
      { yahoo: "^VIX", label: "VIX" },
      { ...stock("SPY"), label: "SPY" },
      { ...stock("QQQ"), label: "QQQ" },
      { ...stock("IWM"), label: "IWM" },
      { ...stock("DIA"), label: "DIA" },
      { ...stock("XLE"), label: "XLE" },
      { ...stock("XLK"), label: "XLK" },
      { ...stock("GLD"), label: "GLD" },
    ];

    const marketResults = await Promise.all(symbols.map((s) => quoteLine(s)));
    const marketData = marketResults.join("\n");

    // Step 3: Call Claude
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      timeZone: "America/Chicago",
    });

    const response = await anthropicMessagesViaOpenRouter({
        max_tokens: 6000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `Generate today's briefing for ${dateStr}.\n\nMarket data:\n${marketData}\n\nOutput ONLY valid JSON.`,
        }],
      });

    if (!response.ok) {
      const errText = response.errText ?? "";
      return new Response(JSON.stringify({ error: "Claude API error", status: response.status, detail: errText }), { status: 502, headers });
    }

    const result = response;
    const content = result.content?.[0]?.text;
    if (!content) {
      return new Response(JSON.stringify({ error: "No content from Claude" }), { status: 502, headers });
    }

    // Step 4: Parse JSON
    let briefing;
    try {
      const cleaned = content.replace(/^```json?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
      briefing = JSON.parse(cleaned);
    } catch (parseErr) {
      return new Response(JSON.stringify({
        error: "JSON parse failed",
        raw: content.substring(0, 500),
      }), { status: 502, headers });
    }

    // Step 5: Store in Blobs
    briefing._meta = {
      generatedAt: now.toISOString(),
      model: response.model,
    };

    const store = getStore("briefings");
    const todayKey = now.toISOString().split("T")[0];
    await store.setJSON("latest", briefing);
    await store.setJSON(`daily/${todayKey}`, briefing);

    return new Response(JSON.stringify({
      success: true,
      date: todayKey,
      sections: Object.keys(briefing),
      marketData,
    }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({
      error: "Runtime error",
      message: String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }), { status: 500, headers });
  }
}
