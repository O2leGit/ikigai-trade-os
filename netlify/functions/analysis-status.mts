import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async function handler(_req: Request, _context: Context) {
  try {
    const store = getStore("analysis");
    const status = await store.get("analysis-status", { type: "json" });
    return new Response(JSON.stringify(status || { status: "idle" }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(JSON.stringify({ status: "idle" }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
}
