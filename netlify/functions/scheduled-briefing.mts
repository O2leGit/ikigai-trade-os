import type { Config, Context } from "@netlify/functions";

// Scheduled function: runs at 4 key market times daily
// Pre-market: 6:00 AM CT (11:00 UTC) weekdays
// Intraday:   11:30 AM CT (16:30 UTC) weekdays
// End of day:  3:30 PM CT (20:30 UTC) weekdays
// Weekend:    9:00 AM CT Saturday (14:00 UTC)
//
// Cron: runs every 30 min from 11:00-20:30 UTC on weekdays, plus Sat 14:00 UTC
// The function checks if it's a scheduled slot before running.

const SCHEDULED_SLOTS_UTC = [
  { hour: 11, minute: 0, days: [1, 2, 3, 4, 5] },  // 6:00 AM CT weekdays
  { hour: 16, minute: 30, days: [1, 2, 3, 4, 5] },  // 11:30 AM CT weekdays
  { hour: 20, minute: 30, days: [1, 2, 3, 4, 5] },  // 3:30 PM CT weekdays
  { hour: 14, minute: 0, days: [6] },                 // 9:00 AM CT Saturday
];

export default async function handler(_req: Request, _context: Context) {
  const now = new Date();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const day = now.getUTCDay();

  // Check if this is a scheduled slot (within 5 min window)
  const isScheduled = SCHEDULED_SLOTS_UTC.some(slot =>
    slot.days.includes(day) &&
    slot.hour === hour &&
    Math.abs(slot.minute - minute) <= 5
  );

  if (!isScheduled) {
    console.log(`Not a scheduled slot: ${day} ${hour}:${minute} UTC -- skipping`);
    return new Response("Not a scheduled slot", { status: 200 });
  }

  console.log(`Scheduled briefing triggered at ${now.toISOString()}`);

  // Trigger the background function
  const siteUrl = process.env.URL || "https://ikigaitradeos.netlify.app";
  try {
    const res = await fetch(`${siteUrl}/.netlify/functions/trigger-briefing-background`, {
      method: "POST",
    });
    console.log(`Trigger response: ${res.status}`);
    return new Response(`Briefing triggered: ${res.status}`, { status: 200 });
  } catch (err) {
    console.error("Failed to trigger briefing:", err);
    return new Response("Trigger failed", { status: 500 });
  }
}

// Run every 30 minutes to check if it's a scheduled slot
export const config: Config = {
  schedule: "0,30 11-21 * * 1-6",
};
