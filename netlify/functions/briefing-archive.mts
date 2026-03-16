import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// Returns archive index or a specific archived briefing

export default async function handler(req: Request, _context: Context) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const edition = url.searchParams.get("edition");

  const store = getStore("briefings");

  try {
    // If date+edition specified, return that specific briefing
    if (date && edition) {
      const briefing = await store.get(`archive/${date}/${edition}`);
      if (!briefing) {
        return new Response(JSON.stringify({ error: "Briefing not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(briefing, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // Otherwise return the archive index
    const indexRaw = await store.get("archive-index");
    const index = indexRaw ? JSON.parse(indexRaw) : [];

    return new Response(JSON.stringify({ entries: index }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Archive error: ${err instanceof Error ? err.message : "unknown"}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
