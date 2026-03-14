import {
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── ACCOUNT UPLOADS ────────────────────────────────────────────────────────
// One row per CSV upload session. Tracks when each account was last refreshed.
export const accountUploads = mysqlTable("account_uploads", {
  id: int("id").autoincrement().primaryKey(),
  accountId: varchar("accountId", { length: 32 }).notNull(), // e.g. "927", "195", "StratModel"
  accountName: varchar("accountName", { length: 64 }).notNull(),
  accountType: varchar("accountType", { length: 64 }).notNull(),
  statementDate: varchar("statementDate", { length: 32 }).notNull(), // "2026-03-13"
  nlv: decimal("nlv", { precision: 14, scale: 2 }).notNull(),
  openPnl: decimal("openPnl", { precision: 14, scale: 2 }).notNull().default("0"),
  ytdPnl: decimal("ytdPnl", { precision: 14, scale: 2 }).notNull().default("0"),
  summary: text("summary"),
  rawCsv: text("rawCsv"), // store raw CSV for re-parsing
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type AccountUpload = typeof accountUploads.$inferSelect;
export type InsertAccountUpload = typeof accountUploads.$inferInsert;

// ─── EQUITY POSITIONS ────────────────────────────────────────────────────────
export const equityPositions = mysqlTable("equity_positions", {
  id: int("id").autoincrement().primaryKey(),
  uploadId: int("uploadId").notNull(), // FK → accountUploads.id
  accountId: varchar("accountId", { length: 32 }).notNull(),
  symbol: varchar("symbol", { length: 16 }).notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 4 }).notNull(),
  avgCost: decimal("avgCost", { precision: 14, scale: 4 }),
  mark: decimal("mark", { precision: 14, scale: 4 }),
  openPnl: decimal("openPnl", { precision: 14, scale: 2 }),
  openPnlPct: decimal("openPnlPct", { precision: 8, scale: 4 }),
  action: varchar("action", { length: 32 }).default("HOLD"), // HOLD, ADD, TRIM, EXIT
  rationale: text("rationale"),
});

export type EquityPosition = typeof equityPositions.$inferSelect;
export type InsertEquityPosition = typeof equityPositions.$inferInsert;

// ─── OPTIONS POSITIONS ───────────────────────────────────────────────────────
export const optionsPositions = mysqlTable("options_positions", {
  id: int("id").autoincrement().primaryKey(),
  uploadId: int("uploadId").notNull(), // FK → accountUploads.id
  accountId: varchar("accountId", { length: 32 }).notNull(),
  symbol: varchar("symbol", { length: 64 }).notNull(), // full option symbol
  underlying: varchar("underlying", { length: 16 }),
  expiry: varchar("expiry", { length: 16 }),
  strike: decimal("strike", { precision: 10, scale: 2 }),
  optionType: varchar("optionType", { length: 4 }), // CALL or PUT
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  avgCost: decimal("avgCost", { precision: 14, scale: 4 }),
  mark: decimal("mark", { precision: 14, scale: 4 }),
  openPnl: decimal("openPnl", { precision: 14, scale: 2 }),
  action: varchar("action", { length: 32 }).default("HOLD"),
  rationale: text("rationale"),
});

export type OptionsPosition = typeof optionsPositions.$inferSelect;
export type InsertOptionsPosition = typeof optionsPositions.$inferInsert;

// ─── CRITICAL ACTIONS ────────────────────────────────────────────────────────
export const criticalActions = mysqlTable("critical_actions", {
  id: int("id").autoincrement().primaryKey(),
  uploadId: int("uploadId").notNull(),
  accountId: varchar("accountId", { length: 32 }).notNull(),
  priority: int("priority").notNull().default(1), // 1 = highest
  action: text("action").notNull(),
});

export type CriticalAction = typeof criticalActions.$inferSelect;
export type InsertCriticalAction = typeof criticalActions.$inferInsert;
