import { desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import {
  accountUploads,
  criticalActions,
  equityPositions,
  InsertAccountUpload,
  InsertCriticalAction,
  InsertEquityPosition,
  InsertOptionsPosition,
  optionsPositions,
} from "../drizzle/schema";

// ─── ACCOUNT MAPPING ────────────────────────────────────────────────────────
export const ACCOUNT_META: Record<string, { name: string; type: string }> = {
  "927": { name: "Account 927", type: "Joint Tenant" },
  "195": { name: "Account 195", type: "Roth IRA" },
  "370": { name: "Account 370", type: "Individual" },
  "676": { name: "Account 676", type: "Rollover IRA" },
  StratModel: { name: "Paper Account", type: "PaperMoney" },
};

// ─── UPSERT UPLOAD SESSION ───────────────────────────────────────────────────
export async function upsertAccountUpload(data: InsertAccountUpload) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete existing positions for this account + date before re-inserting
  const existing = await db
    .select({ id: accountUploads.id })
    .from(accountUploads)
    .where(eq(accountUploads.accountId, data.accountId))
    .orderBy(desc(accountUploads.uploadedAt))
    .limit(1);

  if (existing.length > 0) {
    const oldId = existing[0].id;
    await db.delete(equityPositions).where(eq(equityPositions.uploadId, oldId));
    await db.delete(optionsPositions).where(eq(optionsPositions.uploadId, oldId));
    await db.delete(criticalActions).where(eq(criticalActions.uploadId, oldId));
    await db.delete(accountUploads).where(eq(accountUploads.id, oldId));
  }

  const [result] = await db.insert(accountUploads).values(data).$returningId();
  return result.id;
}

// ─── INSERT POSITIONS ────────────────────────────────────────────────────────
export async function insertEquityPositions(rows: InsertEquityPosition[]) {
  const db = await getDb();
  if (!db || rows.length === 0) return;
  await db.insert(equityPositions).values(rows);
}

export async function insertOptionsPositions(rows: InsertOptionsPosition[]) {
  const db = await getDb();
  if (!db || rows.length === 0) return;
  await db.insert(optionsPositions).values(rows);
}

export async function insertCriticalActions(rows: InsertCriticalAction[]) {
  const db = await getDb();
  if (!db || rows.length === 0) return;
  await db.insert(criticalActions).values(rows);
}

// ─── FETCH LATEST UPLOAD FOR EACH ACCOUNT ────────────────────────────────────
export async function getLatestUploads() {
  const db = await getDb();
  if (!db) return [];

  const accountIds = Object.keys(ACCOUNT_META);
  const results = [];

  for (const accountId of accountIds) {
    const uploads = await db
      .select()
      .from(accountUploads)
      .where(eq(accountUploads.accountId, accountId))
      .orderBy(desc(accountUploads.uploadedAt))
      .limit(1);

    if (uploads.length > 0) {
      const upload = uploads[0];
      const equity = await db
        .select()
        .from(equityPositions)
        .where(eq(equityPositions.uploadId, upload.id));
      const options = await db
        .select()
        .from(optionsPositions)
        .where(eq(optionsPositions.uploadId, upload.id));
      const actions = await db
        .select()
        .from(criticalActions)
        .where(eq(criticalActions.uploadId, upload.id))
        .orderBy(criticalActions.priority);

      results.push({ upload, equity, options, actions });
    }
  }

  return results;
}

// ─── GET UPLOAD STATUS (for the upload panel) ────────────────────────────────
export async function getUploadStatus() {
  const db = await getDb();
  if (!db) return [];

  const accountIds = Object.keys(ACCOUNT_META);
  const status = [];

  for (const accountId of accountIds) {
    const uploads = await db
      .select({
        id: accountUploads.id,
        statementDate: accountUploads.statementDate,
        nlv: accountUploads.nlv,
        openPnl: accountUploads.openPnl,
        uploadedAt: accountUploads.uploadedAt,
      })
      .from(accountUploads)
      .where(eq(accountUploads.accountId, accountId))
      .orderBy(desc(accountUploads.uploadedAt))
      .limit(1);

    status.push({
      accountId,
      ...ACCOUNT_META[accountId],
      lastUpload: uploads[0] ?? null,
    });
  }

  return status;
}
