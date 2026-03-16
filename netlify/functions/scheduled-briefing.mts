import type { Config, Context } from "@netlify/functions";

// Scheduled function: auto-generates BOTH briefing + report at key market times
//
// WEEKDAYS (Mon-Fri):
//   Pre-Market:  6:00 AM CT (11:00 UTC)
//   Intraday:   11:30 AM CT (16:30 UTC)
//   End of Day:  3:30 PM CT (20:30 UTC)
//
// SATURDAY:
//   End of Week Review: 9:00 AM CT (14:00 UTC)
//
// SUNDAY:
//   Week Ahead Preview: 9:00 AM CT (14:00 UTC)
//
// Cron: runs every 30 min from 11:00-21:00 UTC, every day of the week.
// The function checks if current time matches a scheduled slot before running.

const SCHEDULED_SLOTS_UTC = [
  { hour: 11, minute: 0, days: [1, 2, 3, 4, 5] },  // 6:00 AM CT weekdays (Pre-Market)
  { hour: 16, minute: 30, days: [1, 2, 3, 4, 5] },  // 11:30 AM CT weekdays (Intraday)
  { hour: 20, minute: 30, days: [1, 2, 3, 4, 5] },  // 3:30 PM CT weekdays (EOD)
  { hour: 14, minute: 0, days: [6] },                 // 9:00 AM CT Saturday (End of Week)
  { hour: 14, minute: 0, days: [0] },                 // 9:00 AM CT Sunday (Week Ahead)
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

  console.log(`Scheduled generation triggered at ${now.toISOString()} (day=${day}, ${hour}:${minute} UTC)`);

  const siteUrl = process.env.URL || "https://ikigaitradeos.netlify.app";
  const results: string[] = [];

  // 1. Trigger briefing (dashboard JSON)
  try {
    const res = await fetch(`${siteUrl}/.netlify/functions/trigger-briefing-background`, {
      method: "POST",
    });
    results.push(`Briefing: ${res.status}`);
    console.log(`Briefing trigger response: ${res.status}`);
  } catch (err) {
    results.push(`Briefing: FAILED`);
    console.error("Failed to trigger briefing:", err);
  }

  // 2. Trigger report (.docx generation + archive)
  try {
    const res = await fetch(`${siteUrl}/.netlify/functions/generate-report-background`, {
      method: "POST",
    });
    results.push(`Report: ${res.status}`);
    console.log(`Report trigger response: ${res.status}`);
  } catch (err) {
    results.push(`Report: FAILED`);
    console.error("Failed to trigger report:", err);
  }

  return new Response(`Scheduled: ${results.join(", ")}`, { status: 200 });
}

// Run every 30 minutes, all 7 days of the week
export const config: Config = {
  schedule: "0,30 11-21 * * *",
};
