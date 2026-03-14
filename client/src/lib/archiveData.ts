// ============================================================
// IkigaiTradeOS — Archive Data
// Append-only. Never modify existing entries.
// ============================================================

export type RegimeType = "RISK-ON" | "RISK-OFF" | "NEUTRAL" | "CAUTION" | "CRISIS";

export interface ArchiveEntry {
  issue: number;
  date: string;
  displayDate: string;
  edition: string;
  regime: RegimeType;
  regimeScore: number; // -2 to +2
  vix: number;
  spx: number;
  oil: number;
  gold: number;
  dxy: number;
  executiveSummary: string;
  topIdea: string;
  isReal: boolean;
}

export const ARCHIVE_ENTRIES: ArchiveEntry[] = [
  {
    issue: 1,
    date: "2026-03-11",
    displayDate: "Wednesday, March 11, 2026",
    edition: "Vol. I — Issue 001",
    regime: "CAUTION",
    regimeScore: -1,
    vix: 22.4,
    spx: 6775,
    oil: 87.25,
    gold: 5180,
    dxy: 102.8,
    executiveSummary:
      "Iran conflict begins escalating; oil at $87 and rising. VIX at 22.4 signals caution. CPI data released — core inflation at 2.8% confirms Fed hold. Energy sector leading with XLE +22% YTD.",
    topIdea: "XLE LONG — energy breakout on Iran escalation",
    isReal: true,
  },
  {
    issue: 2,
    date: "2026-03-12",
    displayDate: "Thursday, March 12, 2026",
    edition: "Vol. I — Issue 002",
    regime: "RISK-OFF",
    regimeScore: -2,
    vix: 27.29,
    spx: 6672,
    oil: 95.73,
    gold: 5124,
    dxy: 103.2,
    executiveSummary:
      "SPX -1.52% as Iran attacks oil tankers; VIX spikes to 27.29. Adobe CEO Narayen steps down post-earnings beat. Brent approaches $100. Risk-off regime confirmed with capital rotating to energy and gold.",
    topIdea: "USO LONG + ADBE SHORT — dual catalyst momentum plays",
    isReal: true,
  },
  {
    issue: 3,
    date: "2026-03-13",
    displayDate: "Friday, March 13, 2026",
    edition: "Vol. I — Issue 003",
    regime: "RISK-OFF",
    regimeScore: -2,
    vix: 25.83,
    spx: 6699,
    oil: 96.2,
    gold: 5113,
    dxy: 103.4,
    executiveSummary:
      "Triple data release day: Core PCE + GDP + JOLTs at 8:30 AM CT. VIX at 25.83, Brent above $100, FOMC March 17-18 imminent. ADBE gaps down on CEO departure. Energy momentum intact — XLE +26.5% YTD.",
    topIdea: "USO LONG on PCE reaction — energy momentum continuation",
    isReal: true,
  },
];
