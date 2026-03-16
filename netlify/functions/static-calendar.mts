import type { Context } from "@netlify/functions";

// ── Static US Economic Calendar 2026 ──
// No API key needed. Returns events from today through 14 days forward.

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface StaticEvent {
  dateStr: string; // YYYY-MM-DD
  event: string;
  time: string;
  impact: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  notes: string;
}

function formatDateString(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return `${DAY_NAMES[d.getDay()]} ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

// ── All 2026 Events ──

const ALL_EVENTS: StaticEvent[] = [
  // ════════════════════════════════════════
  // FOMC MEETINGS (2-day: decision Day 2 @ 1:00 PM CT, presser @ 1:30 PM CT)
  // ════════════════════════════════════════
  { dateStr: "2026-01-27", event: "FOMC Meeting Day 1", time: "All Day", impact: "CRITICAL", notes: "Fed deliberation begins. IV inflates into decision day -- hold off selling until Day 2." },
  { dateStr: "2026-01-28", event: "FOMC Rate Decision + Press Conference", time: "1:00 PM CT", impact: "CRITICAL", notes: "Sell straddles before, buy back after IV crush. Presser at 1:30 PM CT drives the real move." },
  { dateStr: "2026-03-17", event: "FOMC Meeting Day 1", time: "All Day", impact: "CRITICAL", notes: "Fed deliberation begins. IV inflates into decision day -- hold off selling until Day 2." },
  { dateStr: "2026-03-18", event: "FOMC Rate Decision + Press Conference", time: "1:00 PM CT", impact: "CRITICAL", notes: "Sell straddles before, buy back after IV crush. Presser at 1:30 PM CT drives the real move. SEP + dot plot release = extra volatility." },
  { dateStr: "2026-04-28", event: "FOMC Meeting Day 1", time: "All Day", impact: "CRITICAL", notes: "Fed deliberation begins. IV inflates into decision day -- hold off selling until Day 2." },
  { dateStr: "2026-04-29", event: "FOMC Rate Decision + Press Conference", time: "1:00 PM CT", impact: "CRITICAL", notes: "Sell straddles before, buy back after IV crush. Presser at 1:30 PM CT drives the real move." },
  { dateStr: "2026-06-16", event: "FOMC Meeting Day 1", time: "All Day", impact: "CRITICAL", notes: "Fed deliberation begins. IV inflates into decision day -- hold off selling until Day 2." },
  { dateStr: "2026-06-17", event: "FOMC Rate Decision + Press Conference", time: "1:00 PM CT", impact: "CRITICAL", notes: "Sell straddles before, buy back after IV crush. Presser at 1:30 PM CT drives the real move. SEP + dot plot release = extra volatility." },
  { dateStr: "2026-07-28", event: "FOMC Meeting Day 1", time: "All Day", impact: "CRITICAL", notes: "Fed deliberation begins. IV inflates into decision day -- hold off selling until Day 2." },
  { dateStr: "2026-07-29", event: "FOMC Rate Decision + Press Conference", time: "1:00 PM CT", impact: "CRITICAL", notes: "Sell straddles before, buy back after IV crush. Presser at 1:30 PM CT drives the real move." },
  { dateStr: "2026-09-15", event: "FOMC Meeting Day 1", time: "All Day", impact: "CRITICAL", notes: "Fed deliberation begins. IV inflates into decision day -- hold off selling until Day 2." },
  { dateStr: "2026-09-16", event: "FOMC Rate Decision + Press Conference", time: "1:00 PM CT", impact: "CRITICAL", notes: "Sell straddles before, buy back after IV crush. Presser at 1:30 PM CT drives the real move. SEP + dot plot release = extra volatility." },
  { dateStr: "2026-10-27", event: "FOMC Meeting Day 1", time: "All Day", impact: "CRITICAL", notes: "Fed deliberation begins. IV inflates into decision day -- hold off selling until Day 2." },
  { dateStr: "2026-10-28", event: "FOMC Rate Decision + Press Conference", time: "1:00 PM CT", impact: "CRITICAL", notes: "Sell straddles before, buy back after IV crush. Presser at 1:30 PM CT drives the real move." },
  { dateStr: "2026-12-08", event: "FOMC Meeting Day 1", time: "All Day", impact: "CRITICAL", notes: "Fed deliberation begins. IV inflates into decision day -- hold off selling until Day 2." },
  { dateStr: "2026-12-09", event: "FOMC Rate Decision + Press Conference", time: "1:00 PM CT", impact: "CRITICAL", notes: "Sell straddles before, buy back after IV crush. Presser at 1:30 PM CT drives the real move. SEP + dot plot release = extra volatility." },

  // ════════════════════════════════════════
  // CPI (CRITICAL) -- 7:30 AM CT
  // ════════════════════════════════════════
  { dateStr: "2026-01-13", event: "CPI (Consumer Price Index)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Biggest single-day IV event. Sell iron condors 1-2 DTE before release, close at open for IV crush. Watch core CPI vs headline." },
  { dateStr: "2026-02-11", event: "CPI (Consumer Price Index)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Biggest single-day IV event. Sell iron condors 1-2 DTE before release, close at open for IV crush. Watch core CPI vs headline." },
  { dateStr: "2026-03-11", event: "CPI (Consumer Price Index)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Biggest single-day IV event. Sell iron condors 1-2 DTE before release, close at open for IV crush. Watch core CPI vs headline." },
  { dateStr: "2026-04-10", event: "CPI (Consumer Price Index)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Biggest single-day IV event. Sell iron condors 1-2 DTE before release, close at open for IV crush. Watch core CPI vs headline." },
  { dateStr: "2026-05-12", event: "CPI (Consumer Price Index)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Biggest single-day IV event. Sell iron condors 1-2 DTE before release, close at open for IV crush. Watch core CPI vs headline." },
  { dateStr: "2026-06-10", event: "CPI (Consumer Price Index)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Biggest single-day IV event. Sell iron condors 1-2 DTE before release, close at open for IV crush. Watch core CPI vs headline." },
  { dateStr: "2026-07-14", event: "CPI (Consumer Price Index)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Biggest single-day IV event. Sell iron condors 1-2 DTE before release, close at open for IV crush. Watch core CPI vs headline." },
  { dateStr: "2026-08-12", event: "CPI (Consumer Price Index)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Biggest single-day IV event. Sell iron condors 1-2 DTE before release, close at open for IV crush. Watch core CPI vs headline." },
  { dateStr: "2026-09-11", event: "CPI (Consumer Price Index)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Biggest single-day IV event. Sell iron condors 1-2 DTE before release, close at open for IV crush. Watch core CPI vs headline." },
  { dateStr: "2026-10-14", event: "CPI (Consumer Price Index)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Biggest single-day IV event. Sell iron condors 1-2 DTE before release, close at open for IV crush. Watch core CPI vs headline." },
  { dateStr: "2026-11-10", event: "CPI (Consumer Price Index)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Biggest single-day IV event. Sell iron condors 1-2 DTE before release, close at open for IV crush. Watch core CPI vs headline." },
  { dateStr: "2026-12-10", event: "CPI (Consumer Price Index)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Biggest single-day IV event. Sell iron condors 1-2 DTE before release, close at open for IV crush. Watch core CPI vs headline." },

  // ════════════════════════════════════════
  // PCE (CRITICAL) -- 7:30 AM CT
  // ════════════════════════════════════════
  { dateStr: "2026-01-22", event: "PCE Price Index (Core)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Fed's preferred inflation gauge. Less volatile than CPI but still moves markets. Sell premium into release if IV rank > 40." },
  { dateStr: "2026-02-20", event: "PCE Price Index (Core)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Fed's preferred inflation gauge. Less volatile than CPI but still moves markets. Sell premium into release if IV rank > 40." },
  { dateStr: "2026-03-13", event: "PCE Price Index (Core)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Fed's preferred inflation gauge. Less volatile than CPI but still moves markets. Sell premium into release if IV rank > 40." },
  { dateStr: "2026-04-09", event: "PCE Price Index (Core)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Fed's preferred inflation gauge. Less volatile than CPI but still moves markets. Sell premium into release if IV rank > 40." },
  { dateStr: "2026-04-30", event: "PCE Price Index (Core)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Fed's preferred inflation gauge. Less volatile than CPI but still moves markets. Sell premium into release if IV rank > 40." },
  { dateStr: "2026-05-28", event: "PCE Price Index (Core)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Fed's preferred inflation gauge. Less volatile than CPI but still moves markets. Sell premium into release if IV rank > 40." },
  { dateStr: "2026-06-25", event: "PCE Price Index (Core)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Fed's preferred inflation gauge. Less volatile than CPI but still moves markets. Sell premium into release if IV rank > 40." },
  { dateStr: "2026-07-30", event: "PCE Price Index (Core)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Fed's preferred inflation gauge. Less volatile than CPI but still moves markets. Sell premium into release if IV rank > 40." },
  { dateStr: "2026-08-26", event: "PCE Price Index (Core)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Fed's preferred inflation gauge. Less volatile than CPI but still moves markets. Sell premium into release if IV rank > 40." },
  { dateStr: "2026-09-30", event: "PCE Price Index (Core)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Fed's preferred inflation gauge. Less volatile than CPI but still moves markets. Sell premium into release if IV rank > 40." },
  { dateStr: "2026-10-29", event: "PCE Price Index (Core)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Fed's preferred inflation gauge. Less volatile than CPI but still moves markets. Sell premium into release if IV rank > 40." },
  { dateStr: "2026-11-25", event: "PCE Price Index (Core)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Fed's preferred inflation gauge. Less volatile than CPI but still moves markets. Sell premium into release if IV rank > 40." },
  { dateStr: "2026-12-23", event: "PCE Price Index (Core)", time: "7:30 AM CT", impact: "CRITICAL", notes: "Fed's preferred inflation gauge. Less volatile than CPI but still moves markets. Sell premium into release if IV rank > 40." },

  // ════════════════════════════════════════
  // NON-FARM PAYROLLS (CRITICAL) -- 7:30 AM CT
  // ════════════════════════════════════════
  { dateStr: "2026-01-09", event: "Non-Farm Payrolls", time: "7:30 AM CT", impact: "CRITICAL", notes: "Jobs Friday. Massive IV crush after release. Sell 0DTE strangles at open if number is in-line. Watch unemployment rate for surprise." },
  { dateStr: "2026-02-06", event: "Non-Farm Payrolls", time: "7:30 AM CT", impact: "CRITICAL", notes: "Jobs Friday. Massive IV crush after release. Sell 0DTE strangles at open if number is in-line. Watch unemployment rate for surprise." },
  { dateStr: "2026-03-06", event: "Non-Farm Payrolls", time: "7:30 AM CT", impact: "CRITICAL", notes: "Jobs Friday. Massive IV crush after release. Sell 0DTE strangles at open if number is in-line. Watch unemployment rate for surprise." },
  { dateStr: "2026-04-03", event: "Non-Farm Payrolls", time: "7:30 AM CT", impact: "CRITICAL", notes: "Jobs Friday. Massive IV crush after release. Sell 0DTE strangles at open if number is in-line. Watch unemployment rate for surprise." },
  { dateStr: "2026-05-08", event: "Non-Farm Payrolls", time: "7:30 AM CT", impact: "CRITICAL", notes: "Jobs Friday. Massive IV crush after release. Sell 0DTE strangles at open if number is in-line. Watch unemployment rate for surprise." },
  { dateStr: "2026-06-05", event: "Non-Farm Payrolls", time: "7:30 AM CT", impact: "CRITICAL", notes: "Jobs Friday. Massive IV crush after release. Sell 0DTE strangles at open if number is in-line. Watch unemployment rate for surprise." },
  { dateStr: "2026-07-02", event: "Non-Farm Payrolls", time: "7:30 AM CT", impact: "CRITICAL", notes: "Jobs Friday. Massive IV crush after release. Sell 0DTE strangles at open if number is in-line. Watch unemployment rate for surprise." },
  { dateStr: "2026-08-07", event: "Non-Farm Payrolls", time: "7:30 AM CT", impact: "CRITICAL", notes: "Jobs Friday. Massive IV crush after release. Sell 0DTE strangles at open if number is in-line. Watch unemployment rate for surprise." },
  { dateStr: "2026-09-04", event: "Non-Farm Payrolls", time: "7:30 AM CT", impact: "CRITICAL", notes: "Jobs Friday. Massive IV crush after release. Sell 0DTE strangles at open if number is in-line. Watch unemployment rate for surprise." },
  { dateStr: "2026-10-02", event: "Non-Farm Payrolls", time: "7:30 AM CT", impact: "CRITICAL", notes: "Jobs Friday. Massive IV crush after release. Sell 0DTE strangles at open if number is in-line. Watch unemployment rate for surprise." },
  { dateStr: "2026-11-06", event: "Non-Farm Payrolls", time: "7:30 AM CT", impact: "CRITICAL", notes: "Jobs Friday. Massive IV crush after release. Sell 0DTE strangles at open if number is in-line. Watch unemployment rate for surprise." },
  { dateStr: "2026-12-04", event: "Non-Farm Payrolls", time: "7:30 AM CT", impact: "CRITICAL", notes: "Jobs Friday. Massive IV crush after release. Sell 0DTE strangles at open if number is in-line. Watch unemployment rate for surprise." },

  // ════════════════════════════════════════
  // GDP (Advance=CRITICAL, Second=HIGH, Third=MEDIUM) -- 7:30 AM CT
  // ════════════════════════════════════════
  // Q4 2025
  { dateStr: "2026-02-20", event: "GDP Q4 2025 (Advance Estimate)", time: "7:30 AM CT", impact: "CRITICAL", notes: "First GDP read moves markets most. Big miss = recession fear spike, sell put spreads on panic. Big beat = sell call spreads on euphoria fade." },
  { dateStr: "2026-03-13", event: "GDP Q4 2025 (Second Estimate)", time: "7:30 AM CT", impact: "HIGH", notes: "GDP revision. Usually less impactful unless large revision. Trade only on 0.5%+ surprise vs advance." },
  { dateStr: "2026-04-09", event: "GDP Q4 2025 (Third Estimate)", time: "7:30 AM CT", impact: "MEDIUM", notes: "Final GDP revision. Rarely moves markets unless massive revision. Low priority for options plays." },
  // Q1 2026
  { dateStr: "2026-04-30", event: "GDP Q1 2026 (Advance Estimate)", time: "7:30 AM CT", impact: "CRITICAL", notes: "First GDP read moves markets most. Big miss = recession fear spike, sell put spreads on panic. Big beat = sell call spreads on euphoria fade." },
  { dateStr: "2026-05-28", event: "GDP Q1 2026 (Second Estimate)", time: "7:30 AM CT", impact: "HIGH", notes: "GDP revision. Usually less impactful unless large revision. Trade only on 0.5%+ surprise vs advance." },
  { dateStr: "2026-06-25", event: "GDP Q1 2026 (Third Estimate)", time: "7:30 AM CT", impact: "MEDIUM", notes: "Final GDP revision. Rarely moves markets unless massive revision. Low priority for options plays." },
  // Q2 2026
  { dateStr: "2026-07-30", event: "GDP Q2 2026 (Advance Estimate)", time: "7:30 AM CT", impact: "CRITICAL", notes: "First GDP read moves markets most. Big miss = recession fear spike, sell put spreads on panic. Big beat = sell call spreads on euphoria fade." },
  { dateStr: "2026-08-26", event: "GDP Q2 2026 (Second Estimate)", time: "7:30 AM CT", impact: "HIGH", notes: "GDP revision. Usually less impactful unless large revision. Trade only on 0.5%+ surprise vs advance." },
  { dateStr: "2026-09-30", event: "GDP Q2 2026 (Third Estimate)", time: "7:30 AM CT", impact: "MEDIUM", notes: "Final GDP revision. Rarely moves markets unless massive revision. Low priority for options plays." },
  // Q3 2026
  { dateStr: "2026-10-29", event: "GDP Q3 2026 (Advance Estimate)", time: "7:30 AM CT", impact: "CRITICAL", notes: "First GDP read moves markets most. Big miss = recession fear spike, sell put spreads on panic. Big beat = sell call spreads on euphoria fade." },
  { dateStr: "2026-11-25", event: "GDP Q3 2026 (Second Estimate)", time: "7:30 AM CT", impact: "HIGH", notes: "GDP revision. Usually less impactful unless large revision. Trade only on 0.5%+ surprise vs advance." },
  { dateStr: "2026-12-23", event: "GDP Q3 2026 (Third Estimate)", time: "7:30 AM CT", impact: "MEDIUM", notes: "Final GDP revision. Rarely moves markets unless massive revision. Low priority for options plays." },

  // ════════════════════════════════════════
  // PPI (HIGH) -- 7:30 AM CT
  // ════════════════════════════════════════
  { dateStr: "2026-01-14", event: "PPI (Producer Price Index)", time: "7:30 AM CT", impact: "HIGH", notes: "Wholesale inflation, leads CPI. Hot PPI = sell call spreads anticipating CPI reaction. Usually less IV impact than CPI." },
  { dateStr: "2026-02-27", event: "PPI (Producer Price Index)", time: "7:30 AM CT", impact: "HIGH", notes: "Wholesale inflation, leads CPI. Hot PPI = sell call spreads anticipating CPI reaction. Usually less IV impact than CPI." },
  { dateStr: "2026-03-18", event: "PPI (Producer Price Index)", time: "7:30 AM CT", impact: "HIGH", notes: "Wholesale inflation, leads CPI. Hot PPI = sell call spreads anticipating CPI reaction. FOMC decision same day -- double event risk." },
  { dateStr: "2026-04-14", event: "PPI (Producer Price Index)", time: "7:30 AM CT", impact: "HIGH", notes: "Wholesale inflation, leads CPI. Hot PPI = sell call spreads anticipating CPI reaction. Usually less IV impact than CPI." },
  { dateStr: "2026-05-13", event: "PPI (Producer Price Index)", time: "7:30 AM CT", impact: "HIGH", notes: "Wholesale inflation, leads CPI. Hot PPI = sell call spreads anticipating CPI reaction. Usually less IV impact than CPI." },
  { dateStr: "2026-06-11", event: "PPI (Producer Price Index)", time: "7:30 AM CT", impact: "HIGH", notes: "Wholesale inflation, leads CPI. Hot PPI = sell call spreads anticipating CPI reaction. Usually less IV impact than CPI." },
  { dateStr: "2026-07-15", event: "PPI (Producer Price Index)", time: "7:30 AM CT", impact: "HIGH", notes: "Wholesale inflation, leads CPI. Hot PPI = sell call spreads anticipating CPI reaction. Usually less IV impact than CPI." },
  { dateStr: "2026-08-13", event: "PPI (Producer Price Index)", time: "7:30 AM CT", impact: "HIGH", notes: "Wholesale inflation, leads CPI. Hot PPI = sell call spreads anticipating CPI reaction. Usually less IV impact than CPI." },
  { dateStr: "2026-09-10", event: "PPI (Producer Price Index)", time: "7:30 AM CT", impact: "HIGH", notes: "Wholesale inflation, leads CPI. Hot PPI = sell call spreads anticipating CPI reaction. Usually less IV impact than CPI." },
  { dateStr: "2026-10-15", event: "PPI (Producer Price Index)", time: "7:30 AM CT", impact: "HIGH", notes: "Wholesale inflation, leads CPI. Hot PPI = sell call spreads anticipating CPI reaction. Usually less IV impact than CPI." },
  { dateStr: "2026-11-13", event: "PPI (Producer Price Index)", time: "7:30 AM CT", impact: "HIGH", notes: "Wholesale inflation, leads CPI. Hot PPI = sell call spreads anticipating CPI reaction. Usually less IV impact than CPI." },
  { dateStr: "2026-12-15", event: "PPI (Producer Price Index)", time: "7:30 AM CT", impact: "HIGH", notes: "Wholesale inflation, leads CPI. Hot PPI = sell call spreads anticipating CPI reaction. Usually less IV impact than CPI." },

  // ════════════════════════════════════════
  // MONTHLY OPEX (HIGH, * = Quad Witching = CRITICAL) -- 3:00 PM CT
  // ════════════════════════════════════════
  { dateStr: "2026-01-16", event: "Monthly Options Expiration (OpEx)", time: "3:00 PM CT", impact: "HIGH", notes: "Pin risk near max pain. Gamma exposure flips -- expect mean reversion. Close or roll expiring positions by noon." },
  { dateStr: "2026-02-20", event: "Monthly Options Expiration (OpEx)", time: "3:00 PM CT", impact: "HIGH", notes: "Pin risk near max pain. Gamma exposure flips -- expect mean reversion. Close or roll expiring positions by noon." },
  { dateStr: "2026-03-20", event: "Quad Witching (OpEx)", time: "3:00 PM CT", impact: "CRITICAL", notes: "QUAD WITCHING: Index futures, index options, stock options, single-stock futures all expire. Massive volume spike, wild last hour. Do NOT hold short gamma into close." },
  { dateStr: "2026-04-17", event: "Monthly Options Expiration (OpEx)", time: "3:00 PM CT", impact: "HIGH", notes: "Pin risk near max pain. Gamma exposure flips -- expect mean reversion. Close or roll expiring positions by noon." },
  { dateStr: "2026-05-15", event: "Monthly Options Expiration (OpEx)", time: "3:00 PM CT", impact: "HIGH", notes: "Pin risk near max pain. Gamma exposure flips -- expect mean reversion. Close or roll expiring positions by noon." },
  { dateStr: "2026-06-18", event: "Quad Witching (OpEx)", time: "3:00 PM CT", impact: "CRITICAL", notes: "QUAD WITCHING: Index futures, index options, stock options, single-stock futures all expire. Massive volume spike, wild last hour. Do NOT hold short gamma into close." },
  { dateStr: "2026-07-17", event: "Monthly Options Expiration (OpEx)", time: "3:00 PM CT", impact: "HIGH", notes: "Pin risk near max pain. Gamma exposure flips -- expect mean reversion. Close or roll expiring positions by noon." },
  { dateStr: "2026-08-21", event: "Monthly Options Expiration (OpEx)", time: "3:00 PM CT", impact: "HIGH", notes: "Pin risk near max pain. Gamma exposure flips -- expect mean reversion. Close or roll expiring positions by noon." },
  { dateStr: "2026-09-18", event: "Quad Witching (OpEx)", time: "3:00 PM CT", impact: "CRITICAL", notes: "QUAD WITCHING: Index futures, index options, stock options, single-stock futures all expire. Massive volume spike, wild last hour. Do NOT hold short gamma into close." },
  { dateStr: "2026-10-16", event: "Monthly Options Expiration (OpEx)", time: "3:00 PM CT", impact: "HIGH", notes: "Pin risk near max pain. Gamma exposure flips -- expect mean reversion. Close or roll expiring positions by noon." },
  { dateStr: "2026-11-20", event: "Monthly Options Expiration (OpEx)", time: "3:00 PM CT", impact: "HIGH", notes: "Pin risk near max pain. Gamma exposure flips -- expect mean reversion. Close or roll expiring positions by noon." },
  { dateStr: "2026-12-18", event: "Quad Witching (OpEx)", time: "3:00 PM CT", impact: "CRITICAL", notes: "QUAD WITCHING: Index futures, index options, stock options, single-stock futures all expire. Massive volume spike, wild last hour. Do NOT hold short gamma into close." },
];

export default async function handler(_req: Request, _context: Context) {
  // Today in YYYY-MM-DD (Central Time approximation using UTC)
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // 14 days from now
  const future = new Date(now);
  future.setDate(now.getDate() + 14);
  const futureStr = future.toISOString().split("T")[0];

  const filtered = ALL_EVENTS
    .filter((e) => e.dateStr >= todayStr && e.dateStr <= futureStr)
    .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
    .map((e) => ({
      date: formatDateString(e.dateStr),
      event: e.event,
      time: e.time,
      impact: e.impact,
      notes: e.notes,
    }));

  return new Response(JSON.stringify(filtered), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
