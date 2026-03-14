/**
 * LAYOUT LOCK-IN TESTS
 * These tests enforce the structural contracts of the IkigaiTradeOS dashboard.
 * They ensure that all 11 briefing sections, the portfolio tab switcher,
 * the combined summary row, and the sector heatmap data remain intact
 * across daily briefing updates.
 *
 * If a test fails after a data update, it means a required field or section
 * was accidentally removed or renamed. Fix the data, not the test.
 */

import { describe, it, expect } from "vitest";
import {
  BRIEFING_DATE,
  BRIEFING_EDITION,
  EXECUTIVE_VIEW,
  MARKET_REGIME,
  MARKET_SNAPSHOT,
  MACRO_CONDITIONS,
  NEWS_SIGNALS,
  SENTIMENT_SUMMARY,
  EVENT_CALENDAR,
  SECTOR_ROTATION,
  SEASONAL_CONTEXT,
  TRADING_IDEAS,
  PRIOR_SESSION_GRADES,
  EARNINGS_PLAYS,
  ACCOUNTS,
  CROSS_ACCOUNT_RISKS,
  DECISION_SUMMARY,
} from "../client/src/lib/briefingData";

// ─── SECTION 1: EXECUTIVE VIEW ──────────────────────────────
describe("Section 01 — Executive View", () => {
  it("has a non-empty executive view string", () => {
    expect(typeof EXECUTIVE_VIEW).toBe("string");
    expect(EXECUTIVE_VIEW.length).toBeGreaterThan(50);
  });
});

// ─── SECTION 2: MARKET ENVIRONMENT ──────────────────────────
describe("Section 02 — Market Environment", () => {
  it("MARKET_REGIME has required fields", () => {
    expect(MARKET_REGIME).toHaveProperty("classification");
    expect(MARKET_REGIME).toHaveProperty("description");
    expect(MARKET_REGIME).toHaveProperty("bestStrategies");
    expect(Array.isArray(MARKET_REGIME.bestStrategies)).toBe(true);
    expect(MARKET_REGIME.bestStrategies.length).toBeGreaterThan(0);
  });

  it("MARKET_SNAPSHOT has at least 6 entries with required fields", () => {
    expect(Array.isArray(MARKET_SNAPSHOT)).toBe(true);
    expect(MARKET_SNAPSHOT.length).toBeGreaterThanOrEqual(6);
    MARKET_SNAPSHOT.forEach((item) => {
      expect(item).toHaveProperty("asset");
      expect(item).toHaveProperty("level");
      expect(item).toHaveProperty("change");
    });
  });

  it("MACRO_CONDITIONS has at least 3 entries", () => {
    expect(Array.isArray(MACRO_CONDITIONS)).toBe(true);
    expect(MACRO_CONDITIONS.length).toBeGreaterThanOrEqual(3);
    MACRO_CONDITIONS.forEach((item) => {
      expect(item).toHaveProperty("title");
      expect(item).toHaveProperty("status");
      expect(item).toHaveProperty("body");
    });
  });
});

// ─── SECTION 3: NEWS & SENTIMENT ────────────────────────────
describe("Section 03 — News & Sentiment", () => {
  it("NEWS_SIGNALS has at least 3 entries with required fields", () => {
    expect(Array.isArray(NEWS_SIGNALS)).toBe(true);
    expect(NEWS_SIGNALS.length).toBeGreaterThanOrEqual(3);
    NEWS_SIGNALS.forEach((sig) => {
      expect(sig).toHaveProperty("headline");
      expect(sig).toHaveProperty("impact");
      expect(sig).toHaveProperty("detail");
    });
  });

  it("SENTIMENT_SUMMARY has all required platform fields", () => {
    expect(SENTIMENT_SUMMARY).toHaveProperty("overall");
    expect(SENTIMENT_SUMMARY).toHaveProperty("twitter");
    expect(SENTIMENT_SUMMARY).toHaveProperty("stocktwits");
    expect(SENTIMENT_SUMMARY).toHaveProperty("wsb");
    expect(SENTIMENT_SUMMARY).toHaveProperty("keyTheme");
  });
});

// ─── SECTION 4: EVENT RISK CALENDAR ─────────────────────────
describe("Section 04 — Event Risk Calendar", () => {
  it("EVENT_CALENDAR has at least 3 events with required fields", () => {
    expect(Array.isArray(EVENT_CALENDAR)).toBe(true);
    expect(EVENT_CALENDAR.length).toBeGreaterThanOrEqual(3);
    EVENT_CALENDAR.forEach((evt) => {
      expect(evt).toHaveProperty("date");
      expect(evt).toHaveProperty("event");
      expect(evt).toHaveProperty("impact");
      expect(evt).toHaveProperty("notes");
    });
  });
});

// ─── SECTION 5: SECTOR ROTATION HEATMAP ─────────────────────
describe("Section 05 — Sector Rotation Heatmap", () => {
  it("SECTOR_ROTATION has exactly 11 GICS sectors", () => {
    expect(Array.isArray(SECTOR_ROTATION)).toBe(true);
    expect(SECTOR_ROTATION.length).toBe(11);
  });

  it("every sector has required fields with valid status", () => {
    SECTOR_ROTATION.forEach((sec) => {
      expect(sec).toHaveProperty("sector");
      expect(sec).toHaveProperty("ytd");
      expect(sec).toHaveProperty("status");
      expect(sec).toHaveProperty("note");
      expect(["LEADING", "NEUTRAL", "LAGGING"]).toContain(sec.status);
    });
  });

  it("has at least one LEADING and one LAGGING sector", () => {
    const leading = SECTOR_ROTATION.filter((s) => s.status === "LEADING");
    const lagging = SECTOR_ROTATION.filter((s) => s.status === "LAGGING");
    expect(leading.length).toBeGreaterThanOrEqual(1);
    expect(lagging.length).toBeGreaterThanOrEqual(1);
  });

  it("ytd values are parseable as numbers", () => {
    SECTOR_ROTATION.forEach((sec) => {
      const val = parseFloat(sec.ytd.replace("%", ""));
      expect(isNaN(val)).toBe(false);
    });
  });
});

// ─── SECTION 6: SEASONAL CONTEXT ────────────────────────────
describe("Section 06 — Seasonal Context", () => {
  it("SEASONAL_CONTEXT has required fields", () => {
    expect(SEASONAL_CONTEXT).toHaveProperty("period");
    expect(SEASONAL_CONTEXT).toHaveProperty("summary");
    expect(SEASONAL_CONTEXT).toHaveProperty("anomalies");
  });
});// ─── SECTION 7: PRIOR SESSION GRADES ────────────────────────────
describe("Section 07 — Prior Session Grades", () => {
  it("PRIOR_SESSION_GRADES has required top-level fields", () => {
    expect(PRIOR_SESSION_GRADES).toHaveProperty("date");
    expect(PRIOR_SESSION_GRADES).toHaveProperty("overallGrade");
    expect(PRIOR_SESSION_GRADES).toHaveProperty("summary");
    expect(PRIOR_SESSION_GRADES).toHaveProperty("grades");
    expect(Array.isArray(PRIOR_SESSION_GRADES.grades)).toBe(true);
    expect(PRIOR_SESSION_GRADES.grades.length).toBeGreaterThanOrEqual(1);
  });

  it("each grade entry has required fields", () => {
    PRIOR_SESSION_GRADES.grades.forEach((g) => {
      expect(g).toHaveProperty("idea");
      expect(g).toHaveProperty("grade");
      expect(g).toHaveProperty("result");
      expect(g).toHaveProperty("lesson");
    });
  });
});// ─── SECTION 8: EARNINGS PLAYS ───────────────────────────────
describe("Section 08 — Earnings Plays", () => {
  it("EARNINGS_PLAYS has at least 1 entry with required fields", () => {
    expect(Array.isArray(EARNINGS_PLAYS)).toBe(true);
    expect(EARNINGS_PLAYS.length).toBeGreaterThanOrEqual(1);
    EARNINGS_PLAYS.forEach((ep) => {
      expect(ep).toHaveProperty("ticker");
      expect(ep).toHaveProperty("reportDate");
      expect(ep).toHaveProperty("impliedMove");
      expect(ep).toHaveProperty("tradeStructure");
    });
  });
});
// ─── SECTION 9: TRADING IDEAS ──────────────────────────────────
describe("Section 09 — Trading Ideas", () => {
  it("TRADING_IDEAS has today, thisWeek, thisMonth arrays", () => {
    expect(TRADING_IDEAS).toHaveProperty("today");
    expect(TRADING_IDEAS).toHaveProperty("thisWeek");
    expect(TRADING_IDEAS).toHaveProperty("thisMonth");
    expect(Array.isArray(TRADING_IDEAS.today)).toBe(true);
    expect(Array.isArray(TRADING_IDEAS.thisWeek)).toBe(true);
    expect(Array.isArray(TRADING_IDEAS.thisMonth)).toBe(true);
  });

  it("each horizon has at least 1 idea", () => {
    expect(TRADING_IDEAS.today.length).toBeGreaterThanOrEqual(1);
    expect(TRADING_IDEAS.thisWeek.length).toBeGreaterThanOrEqual(1);
    expect(TRADING_IDEAS.thisMonth.length).toBeGreaterThanOrEqual(1);
  });

  it("every idea has required fields", () => {
    const allIdeas = [...TRADING_IDEAS.today, ...TRADING_IDEAS.thisWeek, ...TRADING_IDEAS.thisMonth];
    allIdeas.forEach((idea) => {
      expect(idea).toHaveProperty("ticker");
      expect(idea).toHaveProperty("direction");
      expect(idea).toHaveProperty("thesis");
      expect(idea).toHaveProperty("entry");
      expect(idea).toHaveProperty("target");
      expect(idea).toHaveProperty("stop");
      expect(idea).toHaveProperty("conviction");
      expect(idea).toHaveProperty("sizing");
    });
  });

  it("every idea has a valid conviction rating", () => {
    const allIdeas = [...TRADING_IDEAS.today, ...TRADING_IDEAS.thisWeek, ...TRADING_IDEAS.thisMonth];
    allIdeas.forEach((idea) => {
      expect(["HIGH", "MEDIUM-HIGH", "MEDIUM", "LOW"]).toContain(idea.conviction);
    });
  });
});
// ─── SECTION 10: PORTFOLIO REVIEW ───────────────────────────
describe("Section 10 — Portfolio Review", () => {
  it("ACCOUNTS has exactly 5 accounts", () => {
    expect(Array.isArray(ACCOUNTS)).toBe(true);
    expect(ACCOUNTS.length).toBe(5);
  });

  it("every account has required fields for tab switcher", () => {
    ACCOUNTS.forEach((acct) => {
      expect(acct).toHaveProperty("id");
      expect(acct).toHaveProperty("name");
      expect(acct).toHaveProperty("type");
      expect(acct).toHaveProperty("nlv");
      expect(acct).toHaveProperty("openPnl");
      expect(acct).toHaveProperty("ytdPnl");
      expect(acct).toHaveProperty("summary");
      expect(acct).toHaveProperty("criticalActions");
      expect(acct).toHaveProperty("keyRisk");
      expect(Array.isArray(acct.positions)).toBe(true);
      expect(Array.isArray(acct.options)).toBe(true);
      expect(Array.isArray(acct.criticalActions)).toBe(true);
    });
  });

  it("account IDs match expected set (927, StratModel, 195, 370, 676)", () => {
    const ids = ACCOUNTS.map((a) => a.id);
    expect(ids).toContain("927");
    expect(ids).toContain("StratModel");
    expect(ids).toContain("195");
    expect(ids).toContain("370");
    expect(ids).toContain("676");
  });

  it("every position has required table columns", () => {
    ACCOUNTS.forEach((acct) => {
      acct.positions.forEach((pos) => {
        expect(pos).toHaveProperty("symbol");
        expect(pos).toHaveProperty("qty");
        expect(pos).toHaveProperty("avgCost");
        expect(pos).toHaveProperty("mark");
        expect(pos).toHaveProperty("openPnl");
        expect(pos).toHaveProperty("action");
      });
    });
  });

  it("NLV strings are parseable as dollar amounts", () => {
    ACCOUNTS.forEach((acct) => {
      const val = parseFloat(acct.nlv.replace(/[$,]/g, ""));
      expect(isNaN(val)).toBe(false);
      expect(val).toBeGreaterThan(0);
    });
  });

  it("CROSS_ACCOUNT_RISKS has at least 1 entry", () => {
    expect(Array.isArray(CROSS_ACCOUNT_RISKS)).toBe(true);
    expect(CROSS_ACCOUNT_RISKS.length).toBeGreaterThanOrEqual(1);
    CROSS_ACCOUNT_RISKS.forEach((r) => {
      expect(r).toHaveProperty("risk");
      expect(r).toHaveProperty("accounts");
      expect(r).toHaveProperty("exposure");
      expect(r).toHaveProperty("mitigation");
    });
  });
});

// ─── SECTION 11: DECISION SUMMARY ───────────────────────────
describe("Section 11 — Decision Summary", () => {
  it("DECISION_SUMMARY has all three required fields", () => {
    expect(DECISION_SUMMARY).toHaveProperty("bestOpportunityToday");
    expect(DECISION_SUMMARY).toHaveProperty("bestSwingIdeaThisWeek");
    expect(DECISION_SUMMARY).toHaveProperty("biggestRiskToWatch");
    expect(DECISION_SUMMARY.bestOpportunityToday.length).toBeGreaterThan(10);
    expect(DECISION_SUMMARY.bestSwingIdeaThisWeek.length).toBeGreaterThan(10);
    expect(DECISION_SUMMARY.biggestRiskToWatch.length).toBeGreaterThan(10);
  });
});

// ─── BRIEFING METADATA ───────────────────────────────────────
describe("Briefing Metadata", () => {
  it("BRIEFING_DATE is a non-empty string", () => {
    expect(typeof BRIEFING_DATE).toBe("string");
    expect(BRIEFING_DATE.length).toBeGreaterThan(5);
  });

  it("BRIEFING_EDITION is a non-empty string", () => {
    expect(typeof BRIEFING_EDITION).toBe("string");
    expect(BRIEFING_EDITION.length).toBeGreaterThan(3);
  });
});
