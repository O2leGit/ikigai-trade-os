import { describe, expect, it } from "vitest";
import { parseTosAccountCsv } from "./csvParser";

// ─── SAMPLE CSV FIXTURES ──────────────────────────────────────────────────────

const STRAT_MODEL_CSV = `
Date,03/13/2026

Account Summary
Net Liquidating Value,$130022.00

Stock Positions
Symbol,Qty,Avg Price,Last,P&L Open,P&L %
USO,250,93.72,113.88,5040.00,21.51%
ORCL,50,149.46,163.05,679.50,9.09%
NVDA,200,195.00,185.14,-1972.00,-5.06%
SGOV,200,100.47,100.48,-20.00,-0.02%

Option Positions
Symbol,Qty,Avg Price,Last,P&L Open
ADBE 100 21 MAR 26 400 PUT,-2,5.50,3.20,460.00
SPY 100 21 MAR 26 580 PUT,2,4.10,5.80,-340.00
`;

const ACCOUNT_195_CSV = `
Date,03/13/2026

Account Summary
Net Liquidating Value,$28900.00

Stock Positions
Symbol,Qty,Avg Price,Last,P&L Open,P&L %
PLTR,40,10.50,84.13,2944.80,700.00%
SLV,75,22.10,27.65,416.25,25.11%
NVDA,25,145.00,185.14,1003.50,27.69%

Option Positions
Symbol,Qty,Avg Price,Last,P&L Open
NVDA 100 21 MAR 26 175 PUT,-1,3.20,2.10,110.00
`;

// ─── TESTS ────────────────────────────────────────────────────────────────────

describe("parseTosAccountCsv", () => {
  it("parses account metadata correctly for StratModel", () => {
    const result = parseTosAccountCsv(STRAT_MODEL_CSV, "StratModel");
    expect(result.accountId).toBe("StratModel");
    expect(result.accountName).toBe("Paper Account");
    expect(result.accountType).toBe("PaperMoney");
    expect(result.nlv).toBeCloseTo(130022, 0);
  });

  it("parses account metadata correctly for account 195", () => {
    const result = parseTosAccountCsv(ACCOUNT_195_CSV, "195");
    expect(result.accountId).toBe("195");
    expect(result.accountName).toBe("Account 195");
    expect(result.accountType).toBe("Roth IRA");
  });

  it("parses equity positions from StratModel CSV", () => {
    const result = parseTosAccountCsv(STRAT_MODEL_CSV, "StratModel");
    expect(result.equity.length).toBeGreaterThanOrEqual(3);

    const uso = result.equity.find((p) => p.symbol === "USO");
    expect(uso).toBeDefined();
    expect(uso!.quantity).toBe(250);
    expect(uso!.avgCost).toBeCloseTo(93.72, 1);
    expect(uso!.mark).toBeCloseTo(113.88, 1);
    expect(uso!.openPnl).toBeCloseTo(5040, 0);

    const nvda = result.equity.find((p) => p.symbol === "NVDA");
    expect(nvda).toBeDefined();
    expect(nvda!.quantity).toBe(200);
    expect(nvda!.openPnl).toBeCloseTo(-1972, 0);
  });

  it("parses equity positions from account 195 CSV", () => {
    const result = parseTosAccountCsv(ACCOUNT_195_CSV, "195");
    const pltr = result.equity.find((p) => p.symbol === "PLTR");
    expect(pltr).toBeDefined();
    expect(pltr!.quantity).toBe(40);
  });

  it("parses options positions from StratModel CSV", () => {
    const result = parseTosAccountCsv(STRAT_MODEL_CSV, "StratModel");
    expect(result.options.length).toBeGreaterThanOrEqual(1);

    const adbePut = result.options.find((p) => p.symbol.includes("ADBE"));
    expect(adbePut).toBeDefined();
    if (adbePut) {
      expect(adbePut.optionType).toBe("PUT");
      expect(adbePut.underlying).toBe("ADBE");
      expect(adbePut.strike).toBe(400);
    }
  });

  it("parses options positions from account 195 CSV", () => {
    const result = parseTosAccountCsv(ACCOUNT_195_CSV, "195");
    const nvdaPut = result.options.find((p) => p.symbol.includes("NVDA"));
    expect(nvdaPut).toBeDefined();
    if (nvdaPut) {
      expect(nvdaPut.optionType).toBe("PUT");
      expect(nvdaPut.strike).toBe(175);
    }
  });

  it("returns empty arrays for accounts with no positions", () => {
    const result = parseTosAccountCsv("Date,03/13/2026\nAccount Summary\nNet Liquidating Value,$5000.00\n", "370");
    expect(result.equity).toEqual([]);
    expect(result.options).toEqual([]);
    expect(result.nlv).toBeCloseTo(5000, 0);
  });

  it("does not include option symbols in equity positions", () => {
    const result = parseTosAccountCsv(STRAT_MODEL_CSV, "StratModel");
    // Options have spaces in their symbols — should not appear in equity
    const hasOptionInEquity = result.equity.some((p) => p.symbol.includes(" "));
    expect(hasOptionInEquity).toBe(false);
  });

  it("handles unknown account IDs gracefully", () => {
    const result = parseTosAccountCsv("Date,03/13/2026\nNet Liquidating Value,$1000.00\n", "UNKNOWN");
    expect(result.accountId).toBe("UNKNOWN");
    expect(result.accountName).toBe("Account UNKNOWN");
    expect(result.nlv).toBeCloseTo(1000, 0);
  });

  it("preserves rawCsv in the result", () => {
    const result = parseTosAccountCsv(STRAT_MODEL_CSV, "StratModel");
    expect(result.rawCsv).toBe(STRAT_MODEL_CSV);
  });

  it("returns a valid ISO statementDate", () => {
    const result = parseTosAccountCsv(STRAT_MODEL_CSV, "StratModel");
    expect(result.statementDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
