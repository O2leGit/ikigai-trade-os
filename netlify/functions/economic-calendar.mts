import type { Context } from "@netlify/functions";

const IMPACT_MAP: Record<number, "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"> = {
  3: "CRITICAL",
  2: "HIGH",
  1: "MEDIUM",
  0: "LOW",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDateString(dateStr: string): string {
  // dateStr is YYYY-MM-DD
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return `${DAY_NAMES[d.getDay()]} ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface FinnhubEconomicEvent {
  date: string;
  event: string;
  time: string;
  impact: number;
  prev: number | null;
  estimate: number | null;
  actual: number | null;
  country: string;
}

function buildNotes(event: FinnhubEconomicEvent): string {
  const parts: string[] = [];
  if (event.prev != null) parts.push(`Previous: ${event.prev}`);
  if (event.estimate != null) parts.push(`Estimate: ${event.estimate}`);
  if (event.actual != null) parts.push(`Actual: ${event.actual}`);
  return parts.join(", ") || "No data yet";
}

export default async function handler(req: Request, _context: Context) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");

  if (!key) {
    return new Response(
      JSON.stringify({ error: "Finnhub API key required. Configure in Connections page." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const fromDate = toYMD(today);
    const toDate = toYMD(nextWeek);

    const endpoint = `https://finnhub.io/api/v1/calendar/economic?from=${fromDate}&to=${toDate}&token=${key}`;
    const res = await fetch(endpoint);

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Finnhub API error: ${res.status} ${res.statusText}` }),
        { status: res.status, headers: { "Content-Type": "application/json" } },
      );
    }

    const data = await res.json();
    const events: FinnhubEconomicEvent[] = data.economicCalendar || [];

    const usEvents = events
      .filter((e) => e.country === "US")
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({
        date: formatDateString(e.date),
        event: e.event,
        time: e.time || "TBD",
        impact: IMPACT_MAP[e.impact] || "LOW",
        notes: buildNotes(e),
        country: e.country,
      }));

    return new Response(JSON.stringify(usEvents), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: `Failed to fetch economic calendar: ${message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
