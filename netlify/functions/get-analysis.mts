import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async function handler(_req: Request, _context: Context) {
  try {
    const store = getStore("analysis");
    const analysis = await store.get("latest", { type: "json" });
    if (!analysis) {
      return new Response(JSON.stringify({ error: "No analysis found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(analysis), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to retrieve analysis" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
