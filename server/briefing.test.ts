import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// ── Auth logout test (existing) ──
type CookieCall = { name: string; options: Record<string, unknown> };
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });
});

// ── Briefing data integrity tests ──
describe("briefingData integrity", () => {
  it("MARKET_SNAPSHOT has entries with required fields", async () => {
    const { MARKET_SNAPSHOT } = await import("../client/src/lib/briefingData");
    expect(MARKET_SNAPSHOT.length).toBeGreaterThanOrEqual(8);
    MARKET_SNAPSHOT.forEach((item) => {
      expect(item).toHaveProperty("asset");
      expect(item).toHaveProperty("level");
      expect(item).toHaveProperty("change");
      expect(item).toHaveProperty("direction");
      expect(["up", "down", "neutral", "flat"]).toContain(item.direction);
    });
  });

  it("TRADING_IDEAS has ideas for all three horizons", async () => {
    const { TRADING_IDEAS } = await import("../client/src/lib/briefingData");
    expect(TRADING_IDEAS.today.length).toBeGreaterThanOrEqual(1);
    expect(TRADING_IDEAS.thisWeek.length).toBeGreaterThanOrEqual(1);
    expect(TRADING_IDEAS.thisMonth.length).toBeGreaterThanOrEqual(1);
    // Each idea must have required fields
    [...TRADING_IDEAS.today, ...TRADING_IDEAS.thisWeek, ...TRADING_IDEAS.thisMonth].forEach((idea) => {
      expect(idea).toHaveProperty("ticker");
      expect(idea).toHaveProperty("direction");
      expect(idea).toHaveProperty("thesis");
      expect(idea).toHaveProperty("entry");
      expect(idea).toHaveProperty("target");
      expect(idea).toHaveProperty("stop");
      expect(idea).toHaveProperty("conviction");
      expect(idea).toHaveProperty("sizing"); // exact position sizing required
    });
  });

  it("ACCOUNTS has 5 accounts with NLV values and real positions", async () => {
    const { ACCOUNTS } = await import("../client/src/lib/briefingData");
    expect(ACCOUNTS).toHaveLength(5);
    const ids = ACCOUNTS.map((a) => a.id);
    expect(ids).toContain("927");
    expect(ids).toContain("StratModel");
    expect(ids).toContain("195");
    expect(ids).toContain("370");
    expect(ids).toContain("676");
    ACCOUNTS.forEach((acc) => {
      expect(acc).toHaveProperty("positions");
      expect(acc).toHaveProperty("options");
      expect(acc.criticalActions.length).toBeGreaterThanOrEqual(1);
    });
    // Validate real positions from CSV statements
    const stratModel = ACCOUNTS.find((a) => a.id === "StratModel")!;
    const uso = stratModel.positions.find((p) => p.symbol === "USO");
    expect(uso).toBeDefined();
    expect(uso!.qty).toBe("+250");
    const acct195 = ACCOUNTS.find((a) => a.id === "195")!;
    const pltr = acct195.positions.find((p) => p.symbol === "PLTR");
    expect(pltr).toBeDefined();
    expect(pltr!.qty).toBe("+40");
  });

  it("EVENT_CALENDAR has at least 5 events with impact levels", async () => {
    const { EVENT_CALENDAR } = await import("../client/src/lib/briefingData");
    expect(EVENT_CALENDAR.length).toBeGreaterThanOrEqual(5);
    EVENT_CALENDAR.forEach((event) => {
      expect(event).toHaveProperty("date");
      expect(event).toHaveProperty("event");
      expect(event).toHaveProperty("impact");
      expect(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).toContain(event.impact);
    });
  });

  it("SECTOR_ROTATION covers all 11 GICS sectors", async () => {
    const { SECTOR_ROTATION } = await import("../client/src/lib/briefingData");
    expect(SECTOR_ROTATION).toHaveLength(11);
    SECTOR_ROTATION.forEach((sector) => {
      expect(sector).toHaveProperty("sector");
      expect(sector).toHaveProperty("ytd");
      expect(sector).toHaveProperty("status");
      expect(["LEADING", "NEUTRAL", "LAGGING"]).toContain(sector.status);
    });
  });

  it("DECISION_SUMMARY has all three required fields", async () => {
    const { DECISION_SUMMARY } = await import("../client/src/lib/briefingData");
    expect(DECISION_SUMMARY.bestOpportunityToday.length).toBeGreaterThan(10);
    expect(DECISION_SUMMARY.bestSwingIdeaThisWeek.length).toBeGreaterThan(10);
    expect(DECISION_SUMMARY.biggestRiskToWatch.length).toBeGreaterThan(10);
  });

  it("SEASONAL_CONTEXT has Friday weekly analysis fields", async () => {
    const { SEASONAL_CONTEXT } = await import("../client/src/lib/briefingData");
    expect(SEASONAL_CONTEXT).toHaveProperty("weeklyAnalysis");
    expect(SEASONAL_CONTEXT.weeklyAnalysis).toHaveProperty("weekReview");
    expect(SEASONAL_CONTEXT.weeklyAnalysis).toHaveProperty("nextWeekOutlook");
    expect(SEASONAL_CONTEXT.weeklyAnalysis).toHaveProperty("keyLevelsNextWeek");
    expect(SEASONAL_CONTEXT.weeklyAnalysis.weekReview.length).toBeGreaterThan(50);
  });

  it("NEWS_SIGNALS use detail field (not body)", async () => {
    const { NEWS_SIGNALS } = await import("../client/src/lib/briefingData");
    NEWS_SIGNALS.forEach((signal) => {
      expect(signal).toHaveProperty("detail");
      expect((signal as any).body).toBeUndefined();
    });
  });

  it("SENTIMENT_SUMMARY has twitter and stocktwits (not retail/keyNote)", async () => {
    const { SENTIMENT_SUMMARY } = await import("../client/src/lib/briefingData");
    expect(SENTIMENT_SUMMARY).toHaveProperty("twitter");
    expect(SENTIMENT_SUMMARY).toHaveProperty("stocktwits");
    expect(SENTIMENT_SUMMARY).toHaveProperty("keyTheme");
    expect((SENTIMENT_SUMMARY as any).retail).toBeUndefined();
    expect((SENTIMENT_SUMMARY as any).keyNote).toBeUndefined();
  });
});

// ── Archive data integrity tests ──
describe("archiveData integrity", () => {
  it("ARCHIVE_ENTRIES has at least 3 entries in ascending issue order", async () => {
    const { ARCHIVE_ENTRIES } = await import("../client/src/lib/archiveData");
    expect(ARCHIVE_ENTRIES.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < ARCHIVE_ENTRIES.length; i++) {
      expect(ARCHIVE_ENTRIES[i].issue).toBeGreaterThan(ARCHIVE_ENTRIES[i - 1].issue);
    }
  });

  it("Each archive entry has valid regime classification", async () => {
    const { ARCHIVE_ENTRIES } = await import("../client/src/lib/archiveData");
    const validRegimes = ["RISK-ON", "RISK-OFF", "NEUTRAL", "CAUTION", "CRISIS"];
    ARCHIVE_ENTRIES.forEach((entry) => {
      expect(validRegimes).toContain(entry.regime);
      expect(entry.vix).toBeGreaterThan(0);
      expect(entry.spx).toBeGreaterThan(0);
    });
  });
});
