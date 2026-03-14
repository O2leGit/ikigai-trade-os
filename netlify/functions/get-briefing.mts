import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async function handler(req: Request, _context: Context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=300", // 5 min cache
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const store = getStore("briefings");
    const url = new URL(req.url);
    const date = url.searchParams.get("date"); // optional: fetch specific date

    const key = date ? `daily/${date}` : "latest";
    const briefing = await store.get(key, { type: "json" });

    if (!briefing) {
      return new Response(
        JSON.stringify({ error: "No briefing available", fallback: true }),
        { status: 404, headers }
      );
    }

    return new Response(JSON.stringify(briefing), { status: 200, headers });
  } catch (err) {
    console.error("Get briefing error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to retrieve briefing", fallback: true }),
      { status: 500, headers }
    );
  }
}
