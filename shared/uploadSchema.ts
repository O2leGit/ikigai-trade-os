import { z } from "zod";

/**
 * Validation for the `save-accounts` Netlify function request body.
 *
 * Intentionally lenient about the *contents* of each position row (the CSV
 * parser owns that shape) but strict about the envelope: it rejects missing or
 * empty account lists, requires an account id, and bounds array sizes so a
 * malformed or oversized payload can't reach Blobs storage.
 */
export const SaveAccountSchema = z.object({
  accountId: z.string().min(1).max(128),
  fileName: z.string().max(512).optional(),
  statementDate: z.string().max(128).optional(),
  nlv: z.number().optional(),
  openPnl: z.number().optional(),
  positions: z.array(z.unknown()).max(20000).default([]),
});

export const SaveAccountsBodySchema = z.object({
  accounts: z.array(SaveAccountSchema).min(1).max(50),
});

export type SaveAccountsBody = z.infer<typeof SaveAccountsBodySchema>;
