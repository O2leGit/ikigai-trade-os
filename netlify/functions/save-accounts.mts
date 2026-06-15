import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { SaveAccountsBodySchema } from "../../shared/uploadSchema";

// Saves uploaded account positions to Blobs for persistence.
// Each account is stored individually with its own timestamp.
// Called by the frontend after CSV parsing, before analysis.

export default async function handler(req: Request, _context: Context) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate and bound the payload before any of it reaches Blobs storage.
    const parsed = SaveAccountsBodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { accounts } = parsed.data;

    const store = getStore("portfolio");
    const now = new Date().toISOString();

    // Load existing index
    let index: Record<string, any> = {};
    try {
      const existing = await store.get("accounts-index", { type: "json" }) as any;
      if (existing) index = existing;
    } catch { /* first time */ }

    // Save each account individually
    for (const acct of accounts) {
      const key = `account/${acct.accountId}`;
      await store.setJSON(key, {
        accountId: acct.accountId,
        fileName: acct.fileName,
        statementDate: acct.statementDate,
        nlv: acct.nlv,
        openPnl: acct.openPnl,
        positions: acct.positions,
        uploadedAt: now,
      });

      // Update index entry
      index[acct.accountId] = {
        accountId: acct.accountId,
        fileName: acct.fileName,
        statementDate: acct.statementDate,
        nlv: acct.nlv,
        openPnl: acct.openPnl,
        positionCount: acct.positions.length,
        uploadedAt: now,
      };
    }

    // Save updated index
    await store.setJSON("accounts-index", index);

    return new Response(JSON.stringify({
      saved: accounts.length,
      totalAccounts: Object.keys(index).length,
      accounts: Object.values(index),
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
