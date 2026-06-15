import type { Context } from "@netlify/functions";

// Receives Content-Security-Policy violation reports so the Report-Only policy
// in netlify.toml can be tuned with real data before any of it is promoted to
// an enforced policy. Browsers POST here via `report-uri` (legacy,
// application/csp-report) and the Reporting API (`report-to`,
// application/reports+json) -- we accept either and log a bounded snippet to
// the function log. There is nothing to return to the browser's reporter.
export default async function handler(req: Request, _context: Context) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.text();
    if (body) {
      // Reports can be bursty and large; cap what we log per report.
      console.log("[csp-report]", body.slice(0, 4000));
    }
  } catch {
    // Ignore malformed/oversized report bodies -- reporting must never error.
  }

  return new Response(null, { status: 204 });
}
