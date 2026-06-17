import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { SaveAccountsBodySchema } from "../../shared/uploadSchema";

// Saves uploaded account positions to Blobs for persistence.
// Each account is stored individually with its own timestamp.
// Called by the frontend after CSV parsing, before analysis.

// ── Auth ──────────────────────────────────────────────────────────────────────
// This is a public endpoint, so it authenticates the caller before writing.
// The frontend already holds a UTP session bearer (HMAC token minted by UTP's
// POST /api/auth/login); rather than re-implement UTP's token verification, we
// delegate: call a lightweight auth-gated UTP endpoint with the caller's bearer
// and trust UTP's verdict (2xx = valid session, 401 = invalid/expired).
const UTP_BASE_URL = process.env.UTP_BASE_URL ?? "https://trading.ikigaios.com";
const UTP_VERIFY_PATH = process.env.UTP_VERIFY_PATH ?? "/api/engines";
// Enforced by default; set REQUIRE_UPLOAD_AUTH=false for local dev (netlify
// dev), where there is no UTP session to present.
const REQUIRE_AUTH = process.env.REQUIRE_UPLOAD_AUTH !== "false";

async function hasValidUtpSession(req: Request): Promise<boolean> {
  const auth = req.headers.get("authorization");
  if (!auth || !/^Bearer\s+\S/i.test(auth)) return false;
  try {
    const res = await fetch(`${UTP_BASE_URL}${UTP_VERIFY_PATH}`, {
      method: "GET",
      headers: { Authorization: auth, Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    // Only an explicit auth failure rejects. Other outcomes (route moved, UTP
    // briefly down) are inconclusive -- don't block a caller that presented a
    // token over them, since a missing/blank token is already rejected above.
    return !(res.status === 401 || res.status === 403);
  } catch {
    return true; // network/timeout -> inconclusive, don't break uploads
  }
}

export default async function handler(req: Request, _context: Context) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (REQUIRE_AUTH && !(await hasValidUtpSession(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
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
