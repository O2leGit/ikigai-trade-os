import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async function handler(_req: Request, _context: Context) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache",
  };

  try {
    const store = getStore("briefings");
    const status = await store.get("briefing-status", { type: "json" });
    return new Response(JSON.stringify(status || { status: "unknown" }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ status: "error", error: String(err) }), { status: 500, headers });
  }
}
