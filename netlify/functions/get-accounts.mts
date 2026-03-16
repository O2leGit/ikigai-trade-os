import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// Returns all stored account positions with their metadata.
// Used by the frontend to load previously uploaded accounts on page mount.

export default async function handler(_req: Request, _context: Context) {
  try {
    const store = getStore("portfolio");

    // Load index
    const index = await store.get("accounts-index", { type: "json" }) as Record<string, any> | null;
    if (!index || Object.keys(index).length === 0) {
      return new Response(JSON.stringify({ accounts: [], index: {} }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    // Load full position data for each account
    const accounts: any[] = [];
    for (const accountId of Object.keys(index)) {
      try {
        const acct = await store.get(`account/${accountId}`, { type: "json" });
        if (acct) accounts.push(acct);
      } catch { /* skip missing */ }
    }

    return new Response(JSON.stringify({ accounts, index }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), accounts: [], index: {} }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
