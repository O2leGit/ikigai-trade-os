import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// Read side of the newsletter pipeline (see ingest-newsletter.mts).
//   GET /api/get-newsletter            -> latest issue (without full raw text)
//   GET /api/get-newsletter?full=1     -> latest issue including raw text
//   GET /api/get-newsletter?index=1    -> archive index
//   GET /api/get-newsletter?key=archive/2026-07-06-trading-the-29b-range

export default async function handler(req: Request, _context: Context) {
  const headers = { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" };
  const url = new URL(req.url);
  const store = getStore("newsletter");

  try {
    if (url.searchParams.get("index")) {
      const raw = await store.get("archive-index");
      return new Response(raw || "[]", { status: 200, headers });
    }

    const key = url.searchParams.get("key") || "latest";
    if (!/^(latest|archive\/[\w-]+)$/.test(key)) {
      return new Response(JSON.stringify({ error: "Invalid key" }), { status: 400, headers });
    }

    const entry = (await store.get(key, { type: "json" })) as Record<string, unknown> | null;
    if (!entry) {
      return new Response(JSON.stringify({ error: "No newsletter ingested yet" }), {
        status: 404,
        headers,
      });
    }

    if (!url.searchParams.get("full")) {
      delete entry.text;
    }
    return new Response(JSON.stringify(entry), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers });
  }
}
