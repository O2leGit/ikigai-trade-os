import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageNumber, PageBreak, LevelFormat,
} from "docx";

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

async function fetchYahooSymbol(yahooSym: string, name: string): Promise<{ name: string; price: number | null; change: number | null; raw: string }> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSym}?range=5d&interval=1d`,
      { headers: YAHOO_HEADERS }
    );
    if (!res.ok) return { name, price: null, change: null, raw: `${name}: HTTP ${res.status}` };
    const data = await res.json();
    const quotes = data.chart?.result?.[0]?.indicators?.quote?.[0];
    const meta = data.chart?.result?.[0]?.meta;
    if (!quotes || !meta) return { name, price: null, change: null, raw: `${name}: No data` };
    const closes = (quotes.close || []).filter((c: number | null) => c !== null);
    const lastClose = closes[closes.length - 1];
    const prevClose = closes.length > 1 ? closes[closes.length - 2] : meta.chartPreviousClose;
    const change = prevClose ? ((lastClose - prevClose) / prevClose * 100) : null;
    return {
      name,
      price: lastClose,
      change,
      raw: `${name}: $${lastClose?.toFixed(2)} (${change?.toFixed(2) ?? "N/A"}%)`,
    };
  } catch {
    return { name, price: null, change: null, raw: `${name}: unavailable` };
  }
}

const REPORT_SYSTEM_PROMPT = `You are the chief market strategist at a top-tier options-focused hedge fund writing the daily pre-market intelligence report for institutional clients. You are brutally direct, numerically precise, and never hedge or equivocate. You write like a Goldman Sachs morning note -- dense, opinionated, actionable.

OUTPUT FORMAT: Output ONLY valid JSON (no markdown fences, no commentary). The JSON must match this exact schema:

{
  "title": "string -- e.g. 'MONDAY MORNING PRE-MARKET REPORT'",
  "dateSubtitle": "string -- e.g. 'March 15, 2026 | Week of March 9-13'",
  "tagline": "string -- bold italic one-liner summarizing the session, e.g. 'Oil Surging + Tech Under Pressure + PCE Friday'",
  "snapshotTime": "string -- e.g. 'MONDAY MORNING SNAPSHOT -- 7:00 AM CT'",
  "criticalAlert": "string or null -- only if there is a genuinely critical market event (e.g. oil nearing recession trigger, VIX spike, circuit breaker risk). null if nothing warrants it.",
  "overnightRecap": {
    "title": "string -- section title like 'What Happened Friday + Overnight'",
    "subsections": [
      { "heading": "string -- subsection name", "content": "string -- 3-6 dense sentences with specific numbers, levels, catalysts" }
    ]
  },
  "tradeScorecard": {
    "title": "string -- 'Prior-Day Calls Scorecard'",
    "trades": [
      { "ticker": "SYM", "call": "string -- what the call was", "grade": "RIGHT|WRONG|PARTIAL|TBD", "entryEst": "string", "actual": "string", "pnlEst": "string", "lesson": "string -- what you learned" }
    ],
    "summary": "string -- 2-3 sentence summary of the day's performance"
  },
  "weeklyThesis": {
    "title": "string -- 'Weekly Thesis Scorecard'",
    "theses": [
      { "thesis": "string -- the thesis statement", "grade": "RIGHT|WRONG|PARTIAL", "weekStatus": "string -- current status", "fridayPreview": "string -- what to watch" }
    ],
    "summary": "string -- 1-2 sentences on the week's thesis evolution"
  },
  "binaryEvent": {
    "title": "string -- or null if no binary event today",
    "setup": "string -- context paragraph",
    "whatToListen": "string -- what matters on the call/report",
    "scenarios": {
      "bull": { "title": "BULL SCENARIO", "content": "string -- specific numbers and impact" },
      "base": { "title": "BASE SCENARIO", "content": "string" },
      "bear": { "title": "BEAR SCENARIO", "content": "string" }
    },
    "recommendation": "string -- recommended approach"
  } | null,
  "tradeIdeas": {
    "title": "string -- 'Today's Trade Ideas'",
    "preamble": "string -- 1-2 sentences on the setup",
    "ideas": [
      { "ticker": "SYM", "direction": "LONG|SHORT|HEDGE", "entry": "string", "stop": "string", "target": "string", "rr": "string -- risk/reward ratio", "thesis": "string -- 2-3 sentences", "riskFlags": "string -- key risk" }
    ]
  },
  "sectorOverview": {
    "title": "string -- 'Sector Overview'",
    "sectors": [
      { "sector": "string", "weekChange": "string", "todayChange": "string", "signal": "BULL|BEAR|NEUTRAL|AVOID", "notes": "string" }
    ]
  },
  "keyLevels": {
    "title": "string -- 'Key Levels and Economic Calendar'",
    "levels": [
      { "metric": "string", "current": "string", "significance": "string -- why it matters" }
    ]
  },
  "tomorrowPreview": {
    "title": "string -- e.g. 'Tuesday Preview'",
    "subsections": [
      { "heading": "string", "content": "string -- 2-4 sentences" }
    ]
  },
  "bottomLine": {
    "title": "Bottom Line",
    "paragraphs": ["string -- each paragraph is 3-5 dense sentences. Include 2-3 paragraphs total covering the macro thesis, the micro opportunity, and the action plan."]
  },
  "disclaimer": "This report is for informational and educational purposes only. It does not constitute financial advice, a recommendation to buy or sell any security, or an offer to transact. Always do your own research and consult a licensed financial advisor before making investment decisions. Past performance is not indicative of future results."
}

ANALYSIS RULES:
- Every claim must cite a specific number from the data provided
- Name exact ticker symbols, price levels, percentage changes
- Trade ideas must include specific entry, stop, and target levels with risk/reward ratios
- Support/resistance must come from actual price levels in the data, not round numbers
- VIX > 25 = elevated regime, sell premium with defined risk. VIX < 15 = vol is cheap
- Sector rotation signals matter: defensive leadership (XLU/XLP up, XLY/XLK down) = risk-off
- Be opinionated. Take a stance. No weasel words.
- The scorecard should reflect realistic assessment -- grade yourself honestly
- Trade ideas should be 5-7 specific, actionable ideas with exact levels
- Key levels table should have 10-15 rows covering indices, commodities, yields, and catalysts
- Sector overview should cover 8-10 sectors minimum`;

// ─── DOCX BUILDER HELPERS ───

const FONT = "Arial";
const NAVY = "1F3864";
const BLUE = "2E75B6";
const GRAY = "595959";
const WHITE = "FFFFFF";
const LIGHT_BLUE_BG = "D5E8F0";
const LIGHT_GRAY_BG = "F2F2F2";

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 300, after: 100 },
    children: [new TextRun({ text, font: FONT, bold: true, color: NAVY, size: 22 })],
  });
}

function bodyPara(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 60, after: 100 },
    children: [new TextRun({ text, font: FONT, size: 20, color: "333333" })],
  });
}

function subHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 160, after: 60 },
    children: [new TextRun({ text, font: FONT, bold: true, size: 20, color: NAVY })],
  });
}

function changeColor(change: number | null): string {
  if (change === null) return "666666";
  if (change <= -2) return "C00000";  // deep red
  if (change < 0) return "7B0000";     // dark red
  if (change >= 2) return "006100";    // deep green
  if (change > 0) return "375623";     // dark green
  return "843C0C";                     // orange/neutral
}

function gradeColor(grade: string): string {
  if (grade === "RIGHT") return "006100";
  if (grade === "WRONG") return "C00000";
  if (grade === "PARTIAL") return "843C0C";
  return "666666";
}

function signalColor(signal: string): string {
  if (signal === "BULL" || signal === "LONG") return "006100";
  if (signal === "BEAR" || signal === "SHORT") return "C00000";
  if (signal === "AVOID") return "7B0000";
  return "843C0C";
}

function headerCell(text: string, width: number): TableCell {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: NAVY, type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text, font: FONT, bold: true, color: WHITE, size: 16 })],
    })],
  });
}

function dataCell(text: string, width: number, opts?: { bold?: boolean; color?: string; bg?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; size?: number }): TableCell {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: opts?.bg ? { fill: opts.bg, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: opts?.align || AlignmentType.LEFT,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text, font: FONT, bold: opts?.bold, color: opts?.color || "333333", size: opts?.size || 18 })],
    })],
  });
}

// Build snapshot cards (color-coded market data cells)
function buildSnapshotTable(symbols: Array<{ name: string; price: number | null; change: number | null }>): Table {
  const rows: TableRow[] = [];
  // Process in groups of 4
  for (let i = 0; i < symbols.length; i += 4) {
    const chunk = symbols.slice(i, i + 4);
    while (chunk.length < 4) chunk.push({ name: "", price: null, change: null });
    rows.push(new TableRow({
      children: chunk.map(s => {
        const bg = s.price === null ? "666666" : changeColor(s.change);
        return new TableCell({
          borders,
          width: { size: 2340, type: WidthType.DXA },
          shading: { fill: bg, type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 120, right: 120 },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0 },
              children: [new TextRun({ text: s.name, font: FONT, bold: true, color: WHITE, size: 17 })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 20 },
              children: [new TextRun({
                text: s.price !== null ? `$${s.price.toFixed(2)}` : "--",
                font: FONT, bold: true, color: WHITE, size: 24,
              })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0 },
              children: [new TextRun({
                text: s.change !== null ? `${s.change >= 0 ? "+" : ""}${s.change.toFixed(2)}%` : "--",
                font: FONT, color: WHITE, size: 16,
              })],
            }),
          ],
        });
      }),
    }));
  }
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2340, 2340, 2340, 2340],
    rows,
  });
}

function buildReport(report: any, marketSymbols: Array<{ name: string; price: number | null; change: number | null }>): Document {
  const children: (Paragraph | Table)[] = [];

  // ─── TITLE ───
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 20 },
    children: [new TextRun({ text: report.title || "DAILY PRE-MARKET REPORT", font: FONT, bold: true, color: NAVY, size: 40 })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 20 },
    children: [new TextRun({ text: report.dateSubtitle || "", font: FONT, color: BLUE, size: 24 })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 200 },
    children: [new TextRun({ text: report.tagline || "", font: FONT, bold: true, italics: true, color: GRAY, size: 22 })],
  }));

  // ─── SNAPSHOT TABLE ───
  children.push(new Paragraph({
    spacing: { before: 0, after: 60 },
    children: [new TextRun({ text: report.snapshotTime || "MORNING SNAPSHOT", font: FONT, bold: true, color: NAVY, size: 22 })],
  }));
  children.push(buildSnapshotTable(marketSymbols));

  // ─── CRITICAL ALERT ───
  if (report.criticalAlert) {
    children.push(new Paragraph({ spacing: { before: 200, after: 0 }, children: [] }));
    children.push(new Paragraph({
      spacing: { before: 0, after: 0 },
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: "C00000", space: 1 }, bottom: { style: BorderStyle.SINGLE, size: 6, color: "C00000", space: 1 } },
      shading: { fill: "FFF2F2", type: ShadingType.CLEAR },
      children: [
        new TextRun({ text: "CRITICAL ALERT: ", font: FONT, bold: true, color: "C00000", size: 20 }),
        new TextRun({ text: report.criticalAlert, font: FONT, color: "C00000", size: 20 }),
      ],
    }));
  }

  // ─── OVERNIGHT RECAP ───
  if (report.overnightRecap) {
    children.push(sectionHeading(`1. ${report.overnightRecap.title}`));
    for (const sub of report.overnightRecap.subsections || []) {
      children.push(subHeading(sub.heading));
      children.push(bodyPara(sub.content));
    }
  }

  // ─── TRADE SCORECARD ───
  if (report.tradeScorecard) {
    children.push(sectionHeading(`2. ${report.tradeScorecard.title}`));
    const cols = [1200, 2600, 800, 1200, 1200, 2360];
    children.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: cols,
      rows: [
        new TableRow({ children: [
          headerCell("Ticker", cols[0]),
          headerCell("Call", cols[1]),
          headerCell("Grade", cols[2]),
          headerCell("Entry Est.", cols[3]),
          headerCell("Actual", cols[4]),
          headerCell("Lesson", cols[5]),
        ]}),
        ...(report.tradeScorecard.trades || []).map((t: any) => new TableRow({
          children: [
            dataCell(t.ticker, cols[0], { bold: true }),
            dataCell(t.call, cols[1]),
            dataCell(t.grade, cols[2], { bold: true, color: gradeColor(t.grade), align: AlignmentType.CENTER }),
            dataCell(t.entryEst, cols[3]),
            dataCell(t.actual, cols[4]),
            dataCell(t.lesson, cols[5], { size: 16 }),
          ],
        })),
      ],
    }));
    if (report.tradeScorecard.summary) {
      children.push(bodyPara(report.tradeScorecard.summary));
    }
  }

  // ─── WEEKLY THESIS ───
  if (report.weeklyThesis) {
    children.push(sectionHeading(`3. ${report.weeklyThesis.title}`));
    const cols = [2200, 800, 2800, 3560];
    children.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: cols,
      rows: [
        new TableRow({ children: [
          headerCell("Thesis", cols[0]),
          headerCell("Grade", cols[1]),
          headerCell("Week Status", cols[2]),
          headerCell("Preview", cols[3]),
        ]}),
        ...(report.weeklyThesis.theses || []).map((t: any) => new TableRow({
          children: [
            dataCell(t.thesis, cols[0], { bold: true, size: 16 }),
            dataCell(t.grade, cols[1], { bold: true, color: gradeColor(t.grade), align: AlignmentType.CENTER }),
            dataCell(t.weekStatus, cols[2], { size: 16 }),
            dataCell(t.fridayPreview, cols[3], { size: 16 }),
          ],
        })),
      ],
    }));
    if (report.weeklyThesis.summary) {
      children.push(bodyPara(report.weeklyThesis.summary));
    }
  }

  // ─── BINARY EVENT ───
  if (report.binaryEvent) {
    children.push(sectionHeading(`4. ${report.binaryEvent.title}`));
    if (report.binaryEvent.setup) children.push(bodyPara(report.binaryEvent.setup));
    if (report.binaryEvent.whatToListen) {
      children.push(subHeading("What to listen for:"));
      children.push(bodyPara(report.binaryEvent.whatToListen));
    }
    if (report.binaryEvent.scenarios) {
      const s = report.binaryEvent.scenarios;
      const cols = [3120, 3120, 3120];
      children.push(new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: cols,
        rows: [
          new TableRow({ children: [
            dataCell(s.bull?.title || "BULL", cols[0], { bold: true, color: "006100", bg: "E2EFDA", align: AlignmentType.CENTER }),
            dataCell(s.base?.title || "BASE", cols[1], { bold: true, color: "843C0C", bg: "FFF2CC", align: AlignmentType.CENTER }),
            dataCell(s.bear?.title || "BEAR", cols[2], { bold: true, color: "C00000", bg: "FFF2F2", align: AlignmentType.CENTER }),
          ]}),
          new TableRow({ children: [
            dataCell(s.bull?.content || "", cols[0], { size: 16 }),
            dataCell(s.base?.content || "", cols[1], { size: 16 }),
            dataCell(s.bear?.content || "", cols[2], { size: 16 }),
          ]}),
        ],
      }));
    }
    if (report.binaryEvent.recommendation) {
      children.push(bodyPara(report.binaryEvent.recommendation));
    }
  }

  // ─── TRADE IDEAS ───
  if (report.tradeIdeas) {
    children.push(sectionHeading(`5. ${report.tradeIdeas.title}`));
    if (report.tradeIdeas.preamble) children.push(bodyPara(report.tradeIdeas.preamble));
    const cols = [800, 700, 900, 800, 900, 600, 2600, 2060];
    children.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: cols,
      rows: [
        new TableRow({ children: [
          headerCell("Ticker", cols[0]),
          headerCell("Dir", cols[1]),
          headerCell("Entry", cols[2]),
          headerCell("Stop", cols[3]),
          headerCell("Target", cols[4]),
          headerCell("R/R", cols[5]),
          headerCell("Thesis", cols[6]),
          headerCell("Risk Flags", cols[7]),
        ]}),
        ...(report.tradeIdeas.ideas || []).map((t: any) => new TableRow({
          children: [
            dataCell(t.ticker, cols[0], { bold: true }),
            dataCell(t.direction, cols[1], { bold: true, color: signalColor(t.direction), align: AlignmentType.CENTER }),
            dataCell(t.entry, cols[2], { size: 16 }),
            dataCell(t.stop, cols[3], { size: 16, color: "C00000" }),
            dataCell(t.target, cols[4], { size: 16, color: "006100" }),
            dataCell(t.rr, cols[5], { size: 16, align: AlignmentType.CENTER }),
            dataCell(t.thesis, cols[6], { size: 14 }),
            dataCell(t.riskFlags, cols[7], { size: 14, color: "843C0C" }),
          ],
        })),
      ],
    }));
  }

  // ─── SECTOR OVERVIEW ───
  if (report.sectorOverview) {
    children.push(sectionHeading(`6. ${report.sectorOverview.title}`));
    const cols = [2000, 1400, 1400, 1000, 3560];
    children.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: cols,
      rows: [
        new TableRow({ children: [
          headerCell("Sector", cols[0]),
          headerCell("Week Chg", cols[1]),
          headerCell("Today Chg", cols[2]),
          headerCell("Signal", cols[3]),
          headerCell("Notes", cols[4]),
        ]}),
        ...(report.sectorOverview.sectors || []).map((s: any) => new TableRow({
          children: [
            dataCell(s.sector, cols[0], { bold: true }),
            dataCell(s.weekChange, cols[1], { align: AlignmentType.CENTER }),
            dataCell(s.todayChange, cols[2], { align: AlignmentType.CENTER }),
            dataCell(s.signal, cols[3], { bold: true, color: signalColor(s.signal), align: AlignmentType.CENTER }),
            dataCell(s.notes, cols[4], { size: 16 }),
          ],
        })),
      ],
    }));
  }

  // ─── KEY LEVELS ───
  if (report.keyLevels) {
    children.push(sectionHeading(`7. ${report.keyLevels.title}`));
    const cols = [2200, 1800, 5360];
    children.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: cols,
      rows: [
        new TableRow({ children: [
          headerCell("Metric / Level", cols[0]),
          headerCell("Current", cols[1]),
          headerCell("Significance", cols[2]),
        ]}),
        ...(report.keyLevels.levels || []).map((l: any, i: number) => new TableRow({
          children: [
            dataCell(l.metric, cols[0], { bold: true, bg: i % 2 === 0 ? LIGHT_GRAY_BG : undefined }),
            dataCell(l.current, cols[1], { align: AlignmentType.CENTER, bg: i % 2 === 0 ? LIGHT_GRAY_BG : undefined }),
            dataCell(l.significance, cols[2], { size: 16, bg: i % 2 === 0 ? LIGHT_GRAY_BG : undefined }),
          ],
        })),
      ],
    }));
  }

  // ─── TOMORROW PREVIEW ───
  if (report.tomorrowPreview) {
    children.push(sectionHeading(`8. ${report.tomorrowPreview.title}`));
    for (const sub of report.tomorrowPreview.subsections || []) {
      children.push(subHeading(sub.heading));
      children.push(bodyPara(sub.content));
    }
  }

  // ─── BOTTOM LINE ───
  if (report.bottomLine) {
    children.push(sectionHeading(`9. ${report.bottomLine.title}`));
    for (const p of report.bottomLine.paragraphs || []) {
      children.push(bodyPara(p));
    }
  }

  // ─── DISCLAIMER ───
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(new Paragraph({
    spacing: { before: 200, after: 0 },
    children: [new TextRun({
      text: report.disclaimer || "This report is for informational and educational purposes only.",
      font: FONT, italics: true, color: "999999", size: 16,
    })],
  }));

  return new Document({
    styles: {
      default: { document: { run: { font: FONT, size: 20 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1080, right: 1440, bottom: 1080, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } },
            children: [
              new TextRun({ text: "IkigaiTradeOS ", font: FONT, bold: true, color: NAVY, size: 16 }),
              new TextRun({ text: "Market Intelligence", font: FONT, color: BLUE, size: 16 }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 1 } },
            children: [
              new TextRun({ text: "IkigaiTradeOS | Confidential | Page ", font: FONT, color: "999999", size: 14 }),
              new TextRun({ children: [PageNumber.CURRENT], font: FONT, color: "999999", size: 14 }),
            ],
          })],
        }),
      },
      children,
    }],
  });
}

export default async function handler(req: Request, _context: Context) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), {
      status: 500, headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  try {
    // Fetch expanded market data
    const symbolList = [
      { yahoo: "%5EGSPC", name: "S&P 500" },
      { yahoo: "%5EVIX", name: "VIX" },
      { yahoo: "%5EDJI", name: "Dow Jones" },
      { yahoo: "%5EIXIC", name: "Nasdaq" },
      { yahoo: "SPY", name: "SPY" },
      { yahoo: "QQQ", name: "QQQ" },
      { yahoo: "IWM", name: "Russell 2000" },
      { yahoo: "DIA", name: "DIA" },
      { yahoo: "CL%3DF", name: "WTI Crude" },
      { yahoo: "%5ETNX", name: "10Y Treasury" },
      { yahoo: "GLD", name: "Gold" },
      { yahoo: "GC%3DF", name: "Gold Futures" },
      { yahoo: "BTC-USD", name: "Bitcoin" },
      { yahoo: "XLE", name: "Energy (XLE)" },
      { yahoo: "XLK", name: "Tech (XLK)" },
      { yahoo: "XLF", name: "Financials (XLF)" },
      { yahoo: "XLV", name: "Healthcare (XLV)" },
      { yahoo: "XLU", name: "Utilities (XLU)" },
      { yahoo: "XLY", name: "Cons Disc (XLY)" },
      { yahoo: "XLP", name: "Cons Staples (XLP)" },
    ];

    const marketResults = await Promise.all(
      symbolList.map(s => fetchYahooSymbol(s.yahoo, s.name))
    );
    const marketDataText = marketResults.map(r => r.raw).join("\n");

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      timeZone: "America/Chicago",
    });

    // Call Claude for report content
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 12000,
        system: REPORT_SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `Generate today's full pre-market report for ${dateStr}.\n\nLive market data (just fetched):\n${marketDataText}\n\nCurrent time: ${now.toISOString()}\n\nGenerate the complete report JSON. Be specific with numbers from the data above. Include 5-7 trade ideas, 8-10 sectors, 10-15 key levels. If there is no obvious binary event today, set binaryEvent to null. Output ONLY valid JSON.`,
        }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: "Claude API error", status: response.status, detail: errText }), {
        status: 502, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const content = result.content?.[0]?.text;
    if (!content) {
      return new Response(JSON.stringify({ error: "No content from Claude" }), {
        status: 502, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    let report: any;
    try {
      const cleaned = content.replace(/^```json?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
      report = JSON.parse(cleaned);
    } catch {
      return new Response(JSON.stringify({ error: "JSON parse failed", raw: content.substring(0, 500) }), {
        status: 502, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // Build snapshot data for the color-coded table (use top 8 symbols)
    const snapshotSymbols = marketResults.slice(0, 12);

    // Generate DOCX
    const doc = buildReport(report, snapshotSymbols);
    const buffer = await Packer.toBuffer(doc);

    // Store report JSON in blobs for reference
    const store = getStore("reports");
    const todayKey = now.toISOString().split("T")[0];
    await store.setJSON(`daily/${todayKey}`, report);

    const dayName = now.toLocaleDateString("en-US", { weekday: "long", timeZone: "America/Chicago" });
    const filename = `${dayName}_Premarket_${todayKey}.docx`;

    return new Response(buffer as any, {
      status: 200,
      headers: {
        ...headers,
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: "Runtime error",
      message: String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
  }
}
