import { describe, it, expect } from "vitest";
import { SaveAccountsBodySchema } from "@shared/uploadSchema";

// The shape the Upload page actually POSTs to /api/save-accounts.
const validAccount = {
  accountId: "195",
  fileName: "195-AccountStatement.csv",
  statementDate: "2026-03-13",
  nlv: 100000,
  openPnl: 1234.5,
  positions: [{ symbol: "NVDA", qty: 10 }],
};

describe("SaveAccountsBodySchema", () => {
  it("accepts the payload shape the Upload page sends", () => {
    const r = SaveAccountsBodySchema.safeParse({ accounts: [validAccount] });
    expect(r.success).toBe(true);
  });

  it("defaults positions to an empty array when omitted", () => {
    const { positions: _omit, ...noPositions } = validAccount;
    const r = SaveAccountsBodySchema.safeParse({ accounts: [noPositions] });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.accounts[0].positions).toEqual([]);
  });

  it("rejects a missing accounts field", () => {
    expect(SaveAccountsBodySchema.safeParse({}).success).toBe(false);
  });

  it("rejects an empty accounts array", () => {
    expect(SaveAccountsBodySchema.safeParse({ accounts: [] }).success).toBe(false);
  });

  it("rejects an account without an accountId", () => {
    const { accountId: _omit, ...noId } = validAccount;
    expect(SaveAccountsBodySchema.safeParse({ accounts: [noId] }).success).toBe(false);
  });

  it("rejects more than 50 accounts (size bound)", () => {
    const many = Array.from({ length: 51 }, (_, i) => ({
      ...validAccount,
      accountId: String(i),
    }));
    expect(SaveAccountsBodySchema.safeParse({ accounts: many }).success).toBe(false);
  });

  it("rejects an over-long positions array (size bound)", () => {
    const huge = { ...validAccount, positions: new Array(20001).fill({}) };
    expect(SaveAccountsBodySchema.safeParse({ accounts: [huge] }).success).toBe(false);
  });
});
