import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// Returns report archive index or a specific archived report

export default async function handler(req: Request, _context: Context) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const edition = url.searchParams.get("edition");

  const store = getStore("reports");

  try {
    // If date+edition specified, return that specific report
    if (date && edition) {
      const report = await store.get(`archive/${date}/${edition}`);
      if (!report) {
        // Try daily fallback
        const daily = await store.get(`daily/${date}`);
        if (!daily) {
          return new Response(JSON.stringify({ error: "Report not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(daily, {
          status: 200,
          headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
        });
      }
      return new Response(report, {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
      });
    }

    // Return archive index
    const indexRaw = await store.get("archive-index");
    const index = indexRaw ? JSON.parse(indexRaw) : [];

    return new Response(JSON.stringify({ entries: index }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Archive error: ${err instanceof Error ? err.message : "unknown"}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
