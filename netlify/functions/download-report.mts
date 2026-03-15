import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageNumber, PageBreak,
} from "docx";

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

async function fetchYahooSymbol(yahooSym: string, name: string): Promise<{ name: string; price: number | null; change: number | null }> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSym}?range=5d&interval=1d`,
      { headers: YAHOO_HEADERS }
    );
    if (!res.ok) return { name, price: null, change: null };
    const data = await res.json();
    const quotes = data.chart?.result?.[0]?.indicators?.quote?.[0];
    const meta = data.chart?.result?.[0]?.meta;
    if (!quotes || !meta) return { name, price: null, change: null };
    const closes = (quotes.close || []).filter((c: number | null) => c !== null);
    const lastClose = closes[closes.length - 1];
    const prevClose = closes.length > 1 ? closes[closes.length - 2] : meta.chartPreviousClose;
    const change = prevClose ? ((lastClose - prevClose) / prevClose * 100) : null;
    return { name, price: lastClose, change };
  } catch {
    return { name, price: null, change: null };
  }
}

// ─── DOCX BUILDER ───
const FONT = "Arial";
const NAVY = "1F3864";
const BLUE = "2E75B6";
const GRAY = "595959";
const WHITE = "FFFFFF";
const LIGHT_GRAY_BG = "F2F2F2";
const cellBorder = { style: BorderStyle.SINGLE as const, size: 1, color: "CCCCCC" };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function sectionHeading(text: string): Paragraph {
  return new Paragraph({ spacing: { before: 300, after: 100 }, children: [new TextRun({ text, font: FONT, bold: true, color: NAVY, size: 22 })] });
}
function bodyPara(text: string): Paragraph {
  return new Paragraph({ spacing: { before: 60, after: 100 }, children: [new TextRun({ text, font: FONT, size: 20, color: "333333" })] });
}
function subHeading(text: string): Paragraph {
  return new Paragraph({ spacing: { before: 160, after: 60 }, children: [new TextRun({ text, font: FONT, bold: true, size: 20, color: NAVY })] });
}
function changeColor(c: number | null): string {
  if (c === null) return "666666"; if (c <= -2) return "C00000"; if (c < 0) return "7B0000";
  if (c >= 2) return "006100"; if (c > 0) return "375623"; return "843C0C";
}
function gradeColor(g: string): string {
  if (g === "RIGHT") return "006100"; if (g === "WRONG") return "C00000"; if (g === "PARTIAL") return "843C0C"; return "666666";
}
function signalColor(s: string): string {
  if (s === "BULL" || s === "LONG") return "006100"; if (s === "BEAR" || s === "SHORT") return "C00000"; if (s === "AVOID") return "7B0000"; return "843C0C";
}
function hCell(text: string, w: number): TableCell {
  return new TableCell({ borders, width: { size: w, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: cellMargins, verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 }, children: [new TextRun({ text, font: FONT, bold: true, color: WHITE, size: 16 })] })] });
}
function dCell(text: string, w: number, o?: { bold?: boolean; color?: string; bg?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; size?: number }): TableCell {
  return new TableCell({ borders, width: { size: w, type: WidthType.DXA }, shading: o?.bg ? { fill: o.bg, type: ShadingType.CLEAR } : undefined, margins: cellMargins, verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment: o?.align || AlignmentType.LEFT, spacing: { before: 0, after: 0 }, children: [new TextRun({ text, font: FONT, bold: o?.bold, color: o?.color || "333333", size: o?.size || 18 })] })] });
}

function buildSnapshotTable(syms: Array<{ name: string; price: number | null; change: number | null }>): Table {
  const rows: TableRow[] = [];
  for (let i = 0; i < syms.length; i += 4) {
    const chunk = syms.slice(i, i + 4);
    while (chunk.length < 4) chunk.push({ name: "", price: null, change: null });
    rows.push(new TableRow({
      children: chunk.map(s => new TableCell({
        borders, width: { size: 2340, type: WidthType.DXA },
        shading: { fill: s.price === null ? "666666" : changeColor(s.change), type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 120, right: 120 }, verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 }, children: [new TextRun({ text: s.name, font: FONT, bold: true, color: WHITE, size: 17 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 20 }, children: [new TextRun({ text: s.price !== null ? (s.price > 100 ? `${s.price.toFixed(0)}` : `$${s.price.toFixed(2)}`) : "--", font: FONT, bold: true, color: WHITE, size: 24 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 }, children: [new TextRun({ text: s.change !== null ? `${s.change >= 0 ? "+" : ""}${s.change.toFixed(2)}%` : "--", font: FONT, color: WHITE, size: 16 })] }),
        ],
      })),
    }));
  }
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [2340, 2340, 2340, 2340], rows });
}

function buildReport(r: any, mkt: Array<{ name: string; price: number | null; change: number | null }>): Document {
  const c: (Paragraph | Table)[] = [];

  // Title block
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 20 }, children: [new TextRun({ text: r.title || "DAILY PRE-MARKET REPORT", font: FONT, bold: true, color: NAVY, size: 40 })] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 20 }, children: [new TextRun({ text: r.dateSubtitle || "", font: FONT, color: BLUE, size: 24 })] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 200 }, children: [new TextRun({ text: r.tagline || "", font: FONT, bold: true, italics: true, color: GRAY, size: 22 })] }));

  // Snapshot
  c.push(new Paragraph({ spacing: { before: 0, after: 60 }, children: [new TextRun({ text: r.snapshotTime || "MORNING SNAPSHOT", font: FONT, bold: true, color: NAVY, size: 22 })] }));
  c.push(buildSnapshotTable(mkt));

  // Critical alert
  if (r.criticalAlert) {
    c.push(new Paragraph({ spacing: { before: 200, after: 0 }, children: [] }));
    c.push(new Paragraph({ spacing: { before: 0, after: 0 },
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: "C00000", space: 1 }, bottom: { style: BorderStyle.SINGLE, size: 6, color: "C00000", space: 1 } },
      shading: { fill: "FFF2F2", type: ShadingType.CLEAR },
      children: [new TextRun({ text: "CRITICAL ALERT: ", font: FONT, bold: true, color: "C00000", size: 20 }), new TextRun({ text: r.criticalAlert, font: FONT, color: "C00000", size: 20 })],
    }));
  }

  // Overnight
  if (r.overnightRecap) {
    c.push(sectionHeading(`1. ${r.overnightRecap.title}`));
    for (const s of r.overnightRecap.subsections || []) { c.push(subHeading(s.heading)); c.push(bodyPara(s.content)); }
  }

  // Scorecard
  if (r.tradeScorecard?.trades?.length) {
    c.push(sectionHeading(`2. ${r.tradeScorecard.title}`));
    const w = [1200, 2600, 800, 1200, 1200, 2360];
    c.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: w, rows: [
      new TableRow({ children: [hCell("Ticker", w[0]), hCell("Call", w[1]), hCell("Grade", w[2]), hCell("Entry", w[3]), hCell("Actual", w[4]), hCell("Lesson", w[5])] }),
      ...r.tradeScorecard.trades.map((t: any) => new TableRow({ children: [
        dCell(t.ticker, w[0], { bold: true }), dCell(t.call, w[1], { size: 16 }),
        dCell(t.grade, w[2], { bold: true, color: gradeColor(t.grade), align: AlignmentType.CENTER }),
        dCell(t.entryEst, w[3], { size: 16 }), dCell(t.actual, w[4], { size: 16 }), dCell(t.lesson, w[5], { size: 14 }),
      ] })),
    ] }));
    if (r.tradeScorecard.summary) c.push(bodyPara(r.tradeScorecard.summary));
  }

  // Weekly thesis
  if (r.weeklyThesis?.theses?.length) {
    c.push(sectionHeading(`3. ${r.weeklyThesis.title}`));
    const w = [2200, 800, 2800, 3560];
    c.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: w, rows: [
      new TableRow({ children: [hCell("Thesis", w[0]), hCell("Grade", w[1]), hCell("Status", w[2]), hCell("Preview", w[3])] }),
      ...r.weeklyThesis.theses.map((t: any) => new TableRow({ children: [
        dCell(t.thesis, w[0], { bold: true, size: 16 }), dCell(t.grade, w[1], { bold: true, color: gradeColor(t.grade), align: AlignmentType.CENTER }),
        dCell(t.weekStatus, w[2], { size: 16 }), dCell(t.fridayPreview, w[3], { size: 16 }),
      ] })),
    ] }));
    if (r.weeklyThesis.summary) c.push(bodyPara(r.weeklyThesis.summary));
  }

  // Binary event
  let secNum = 4;
  if (r.binaryEvent?.scenarios) {
    c.push(sectionHeading(`4. ${r.binaryEvent.title}`));
    if (r.binaryEvent.setup) c.push(bodyPara(r.binaryEvent.setup));
    const s = r.binaryEvent.scenarios;
    const w = [3120, 3120, 3120];
    c.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: w, rows: [
      new TableRow({ children: [
        dCell("BULL SCENARIO", w[0], { bold: true, color: "006100", bg: "E2EFDA", align: AlignmentType.CENTER }),
        dCell("BASE SCENARIO", w[1], { bold: true, color: "843C0C", bg: "FFF2CC", align: AlignmentType.CENTER }),
        dCell("BEAR SCENARIO", w[2], { bold: true, color: "C00000", bg: "FFF2F2", align: AlignmentType.CENTER }),
      ] }),
      new TableRow({ children: [dCell(s.bull?.content || "", w[0], { size: 16 }), dCell(s.base?.content || "", w[1], { size: 16 }), dCell(s.bear?.content || "", w[2], { size: 16 })] }),
    ] }));
    if (r.binaryEvent.recommendation) c.push(bodyPara(r.binaryEvent.recommendation));
    secNum = 5;
  }

  // Trade ideas
  if (r.tradeIdeas?.ideas?.length) {
    c.push(sectionHeading(`${secNum}. ${r.tradeIdeas.title}`));
    if (r.tradeIdeas.preamble) c.push(bodyPara(r.tradeIdeas.preamble));
    const w = [900, 700, 1000, 900, 1000, 600, 2200, 2060];
    c.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: w, rows: [
      new TableRow({ children: [hCell("Ticker", w[0]), hCell("Dir", w[1]), hCell("Entry", w[2]), hCell("Stop", w[3]), hCell("Target", w[4]), hCell("R/R", w[5]), hCell("Thesis", w[6]), hCell("Risk", w[7])] }),
      ...r.tradeIdeas.ideas.map((t: any) => new TableRow({ children: [
        dCell(t.ticker, w[0], { bold: true }), dCell(t.direction, w[1], { bold: true, color: signalColor(t.direction), align: AlignmentType.CENTER }),
        dCell(t.entry, w[2], { size: 16 }), dCell(t.stop, w[3], { size: 16, color: "C00000" }),
        dCell(t.target, w[4], { size: 16, color: "006100" }), dCell(t.rr, w[5], { size: 16, align: AlignmentType.CENTER }),
        dCell(t.thesis, w[6], { size: 14 }), dCell(t.riskFlags, w[7], { size: 14, color: "843C0C" }),
      ] })),
    ] }));
    secNum++;
  }

  // Sector overview
  if (r.sectorOverview?.sectors?.length) {
    c.push(sectionHeading(`${secNum}. ${r.sectorOverview.title}`));
    const w = [2000, 1400, 1400, 1000, 3560];
    c.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: w, rows: [
      new TableRow({ children: [hCell("Sector", w[0]), hCell("Week", w[1]), hCell("Today", w[2]), hCell("Signal", w[3]), hCell("Notes", w[4])] }),
      ...r.sectorOverview.sectors.map((s: any) => new TableRow({ children: [
        dCell(s.sector, w[0], { bold: true }), dCell(s.weekChange, w[1], { align: AlignmentType.CENTER }),
        dCell(s.todayChange, w[2], { align: AlignmentType.CENTER }),
        dCell(s.signal, w[3], { bold: true, color: signalColor(s.signal), align: AlignmentType.CENTER }),
        dCell(s.notes, w[4], { size: 16 }),
      ] })),
    ] }));
    secNum++;
  }

  // Key levels
  if (r.keyLevels?.levels?.length) {
    c.push(sectionHeading(`${secNum}. ${r.keyLevels.title}`));
    const w = [2200, 1800, 5360];
    c.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: w, rows: [
      new TableRow({ children: [hCell("Metric", w[0]), hCell("Current", w[1]), hCell("Significance", w[2])] }),
      ...r.keyLevels.levels.map((l: any, i: number) => new TableRow({ children: [
        dCell(l.metric, w[0], { bold: true, bg: i % 2 === 0 ? LIGHT_GRAY_BG : undefined }),
        dCell(l.current, w[1], { align: AlignmentType.CENTER, bg: i % 2 === 0 ? LIGHT_GRAY_BG : undefined }),
        dCell(l.significance, w[2], { size: 16, bg: i % 2 === 0 ? LIGHT_GRAY_BG : undefined }),
      ] })),
    ] }));
    secNum++;
  }

  // Tomorrow preview
  if (r.tomorrowPreview) {
    c.push(sectionHeading(`${secNum}. ${r.tomorrowPreview.title}`));
    for (const s of r.tomorrowPreview.subsections || []) { c.push(subHeading(s.heading)); c.push(bodyPara(s.content)); }
    secNum++;
  }

  // Bottom line
  if (r.bottomLine) {
    c.push(sectionHeading(`${secNum}. ${r.bottomLine.title}`));
    for (const p of r.bottomLine.paragraphs || []) c.push(bodyPara(p));
  }

  // Disclaimer
  c.push(new Paragraph({ children: [new PageBreak()] }));
  c.push(new Paragraph({ spacing: { before: 200, after: 0 }, children: [new TextRun({ text: r.disclaimer || "This report is for informational and educational purposes only.", font: FONT, italics: true, color: "999999", size: 16 })] }));

  return new Document({
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1440, bottom: 1080, left: 1440 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } }, children: [new TextRun({ text: "IkigaiTradeOS ", font: FONT, bold: true, color: NAVY, size: 16 }), new TextRun({ text: "Market Intelligence", font: FONT, color: BLUE, size: 16 })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 1 } }, children: [new TextRun({ text: "IkigaiTradeOS | Confidential | Page ", font: FONT, color: "999999", size: 14 }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, color: "999999", size: 14 })] })] }) },
      children: c,
    }],
  });
}

export default async function handler(req: Request, _context: Context) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });

  const store = getStore("reports");
  const now = new Date();
  const todayKey = now.toISOString().split("T")[0];
  const url = new URL(req.url);

  // Status check mode
  if (url.searchParams.get("status") === "check") {
    const status = await store.get(`status/${todayKey}`, { type: "json" }) as any;
    return new Response(JSON.stringify(status || { status: "none" }), {
      status: 200, headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  // Download mode
  try {
    const reportData = await store.get(`daily/${todayKey}`, { type: "json" });
    if (!reportData) {
      return new Response(JSON.stringify({ error: "No report available. Generate one first." }), {
        status: 404, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // Fetch live snapshot data
    const snapSymbols = [
      { yahoo: "%5EGSPC", name: "S&P 500" }, { yahoo: "%5EVIX", name: "VIX" },
      { yahoo: "%5EDJI", name: "Dow" }, { yahoo: "%5EIXIC", name: "Nasdaq" },
      { yahoo: "CL%3DF", name: "WTI Crude" }, { yahoo: "%5ETNX", name: "10Y Yield" },
      { yahoo: "GLD", name: "Gold" }, { yahoo: "BTC-USD", name: "Bitcoin" },
      { yahoo: "SPY", name: "SPY" }, { yahoo: "QQQ", name: "QQQ" },
      { yahoo: "IWM", name: "Russell 2000" }, { yahoo: "DIA", name: "DIA" },
    ];
    const marketResults = await Promise.all(snapSymbols.map(s => fetchYahooSymbol(s.yahoo, s.name)));

    const doc = buildReport(reportData as any, marketResults);
    const buffer = await Packer.toBuffer(doc);
    const dayName = now.toLocaleDateString("en-US", { weekday: "long", timeZone: "America/Chicago" });

    return new Response(buffer as any, {
      status: 200,
      headers: {
        ...headers,
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${dayName}_Premarket_${todayKey}.docx"`,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Download failed", message: String(err) }), {
      status: 500, headers: { ...headers, "Content-Type": "application/json" },
    });
  }
}
