// IkigaiTradeOS — Daily Briefing Data
// Date: Friday, March 13, 2026
// Edition: Vol. I — Issue 003 (UPDATED: Post-PCE / Post-GDP Release)
// ============================================================

export const BRIEFING_DATE = "Friday, March 13, 2026";
export const BRIEFING_EDITION = "Vol. I — Issue 003";

// ============================================================
// EXECUTIVE VIEW — Updated post-PCE/GDP release
// ============================================================
export const EXECUTIVE_VIEW = `Friday, March 13, 2026 — STAGFLATION CONFIRMED. The 8:30 AM CT data triple-header delivered the worst possible combination: Core PCE +0.4% MoM / +3.1% YoY (hotter than the 3.0% consensus), GDP Q4 second estimate revised DOWN to 0.7% (from 1.4% advance), and JOLTs job openings softening. This is the textbook stagflation print — slowing growth with accelerating inflation — and it materially complicates the Fed's path at next week's FOMC (March 17-18). Brent crude is holding above $100 as Iran pledges to keep the Strait of Hormuz closed; Goldman Sachs has raised its Brent forecast to $100+ for March. S&P 500 futures recovered modestly (+0.4%) on the in-line headline PCE, but the hotter core and GDP downgrade are the dominant signals. The regime is RISK-OFF / MACRO STRESS. For Friday's weekly close: this week marks the third consecutive down week for the S&P 500, down approximately 3% since the Iran war began. Going into next week, the FOMC decision (Wednesday March 18) is the single most important event — Powell's tone on stagflation risk will define Q2 positioning.`;

// ============================================================
// MARKET REGIME
// ============================================================
export const MARKET_REGIME = {
  classification: "RISK-OFF / MACRO STRESS",
  description:
    "Stagflation confirmed: Core PCE +3.1% YoY (above 3.0% consensus) + GDP Q4 revised to 0.7% (from 1.4%). Iran-Hormuz conflict keeps Brent above $100. VIX at 25.83 confirms institutional hedging. S&P 500 down 3% since Iran war began — third consecutive down week. Capital rotating from Tech/Financials into Energy, Defense, Gold. The Fed is trapped: inflation too hot to cut, growth too weak to hike. FOMC March 18 is the defining event for Q2.",
  bestStrategies: [
    "Energy momentum (USO, GUSH, XLE) — Iran premium structural",
    "Gold/miners safe haven (GDX, GLD) — stagflation hedge",
    "Short tech on bounces (ADBE, QQQ puts, NVDA)",
    "Options premium harvesting — elevated IV (VIX 25.83)",
    "Volatility longs (UVXY) into FOMC uncertainty",
    "Avoid broad index longs until VIX < 22 and FOMC clarity",
  ],
};

// ============================================================
// MARKET SNAPSHOT — Post-PCE release
// ============================================================
export const MARKET_SNAPSHOT = [
  { asset: "S&P 500 Futures", level: "6,699.50", change: "+22.00 (+0.33%)", direction: "up" as const },
  { asset: "Nasdaq Futures", level: "24,637.75", change: "+77.75 (+0.32%)", direction: "up" as const },
  { asset: "Dow Futures", level: "46,874.00", change: "+153.00 (+0.33%)", direction: "up" as const },
  { asset: "VIX", level: "25.83", change: "+1.60 (+6.60%)", direction: "up" as const },
  { asset: "WTI Crude", level: "$96.20", change: "+0.47 (+0.49%)", direction: "up" as const },
  { asset: "Brent Crude", level: "$100.40", change: "+0.85 (+0.85%)", direction: "up" as const },
  { asset: "Gold", level: "$5,113.40", change: "-11.40 (-0.22%)", direction: "down" as const },
  { asset: "DXY", level: "103.40", change: "+0.18 (+0.17%)", direction: "up" as const },
  { asset: "10Y Yield", level: "4.26%", change: "-0.01 (-0.23%)", direction: "down" as const },
  { asset: "Core PCE YoY", level: "3.1%", change: "+0.1% vs 3.0% est.", direction: "up" as const },
  { asset: "GDP Q4 (2nd Est.)", level: "0.7%", change: "-0.7% vs 1.4% adv.", direction: "down" as const },
];

// ============================================================
// MACRO CONDITIONS
// ============================================================
export const MACRO_CONDITIONS = [
  {
    title: "PCE Inflation — HOTTER THAN EXPECTED",
    status: "STAGFLATION SIGNAL",
    statusType: "bearish" as const,
    body: "Core PCE +0.4% MoM / +3.1% YoY — above the 3.0% consensus. Headline PCE +0.3% MoM / +2.8% YoY. The Iran oil shock is now feeding into the inflation pipeline. This is the worst possible print ahead of FOMC: inflation accelerating while growth collapses. Fed is trapped — cannot cut (inflation) and cannot hike (growth). Expect Powell to hold and signal 'higher for longer' on Wednesday.",
  },
  {
    title: "GDP Q4 — REVISED DOWN TO 0.7%",
    status: "GROWTH SHOCK",
    statusType: "bearish" as const,
    body: "Q4 2025 GDP second estimate revised DOWN to 0.7% annualized (from 1.4% advance estimate). Full year 2025 GDP at 2.1% (revised from 2.2%). Consumer spending grew 2.0% in Q4. Government spending and exports were revised lower. Combined with hot PCE, this is the stagflation confirmation the market feared. Q1 2026 GDP tracking is now a major concern.",
  },
  {
    title: "Volatility / VIX",
    status: "RISK-OFF",
    statusType: "bearish" as const,
    body: "VIX at 25.83 confirms institutional hedging. UVXY (Account 370) is a correct positioning — volatility longs are appropriate into FOMC. Until VIX drops below 22, broad long exposure is high-risk. Options IV is elevated — premium selling is structurally attractive for accounts with sufficient capital.",
  },
  {
    title: "Energy / Oil",
    status: "BULLISH BREAKOUT",
    statusType: "bullish" as const,
    body: "Brent above $100, WTI at $96. Goldman Sachs raised Brent forecast to $100+ for March, $85 for April. Iran pledged to keep Hormuz closed. USO (+23% open P&L in StratModel) and GUSH (+9% open P&L) are the correct positioning. Energy is the only sector with structural momentum in this regime.",
  },
  {
    title: "FOMC — March 17-18",
    status: "CRITICAL CATALYST",
    statusType: "neutral" as const,
    body: "Post-PCE/GDP data, the FOMC is now the most important event of Q1. 99% probability of no change. The critical variable: does Powell acknowledge stagflation risk? Hawkish tone (citing PCE 3.1%) would crush tech/growth. Dovish tone (citing GDP 0.7%) would trigger a relief rally. The asymmetry favors hawkish — inflation is the Fed's mandate.",
  },
  {
    title: "S&P 500 — Week Review",
    status: "3RD DOWN WEEK",
    statusType: "bearish" as const,
    body: "SPX closed Thursday at 6,672 (-1.52%). Down ~3% since Iran war began. Third consecutive down week. Key support at 6,500–6,550. A break below 6,500 would trigger the next leg lower toward 6,200–6,300. Resistance at 6,720–6,740. The weekly close today will be important — a close below 6,650 confirms the bearish weekly structure.",
  },
];

// ============================================================
// NEWS SIGNALS
// ============================================================
export const NEWS_SIGNALS = [
  {
    headline: "Core PCE +3.1% YoY — Hotter Than Expected",
    source: "BEA / Reuters",
    sentiment: "bearish" as const,
    impact: "CRITICAL" as const,
    detail: "January PCE: Headline +0.3% MoM (+2.8% YoY), Core +0.4% MoM (+3.1% YoY vs 3.0% est.). Iran oil shock feeding into inflation pipeline. Fed trapped between hot inflation and weak growth.",
  },
  {
    headline: "GDP Q4 Revised Down to 0.7% — Stagflation Confirmed",
    source: "BEA",
    sentiment: "bearish" as const,
    impact: "CRITICAL" as const,
    detail: "Second estimate of Q4 2025 GDP revised to 0.7% from 1.4% advance. Consumer spending 2.0%. Government spending and exports revised lower. Full year 2025 GDP 2.1% (from 2.2%).",
  },
  {
    headline: "Goldman Sachs Raises Brent Forecast to $100+ for March",
    source: "Reuters",
    sentiment: "bullish" as const,
    impact: "HIGH" as const,
    detail: "Goldman, Bank of America, and major brokerages revising oil forecasts higher. Iran pledged to keep Strait of Hormuz closed. Goldman sees $85/bbl in April as conflict potentially de-escalates.",
  },
  {
    headline: "Adobe CEO Shantanu Narayen Departs After 18 Years",
    source: "ADBE Earnings Release",
    sentiment: "bearish" as const,
    impact: "HIGH" as const,
    detail: "ADBE beat Q1 estimates ($6.06 EPS vs $5.95 est., $6.40B revenue vs $6.28B est.) but CEO departure dominates narrative. Stock down 8.5% in after-hours. AI competitive pressure from Microsoft Copilot and Canva accelerating.",
  },
  {
    headline: "S&P 500 Posts Third Consecutive Down Week",
    source: "Yahoo Finance / CNBC",
    sentiment: "bearish" as const,
    impact: "HIGH" as const,
    detail: "SPX down ~3% since Iran war began. Dow dropped 700 points Thursday. 9 of 11 sectors negative. VIX range 25–28 this week. Institutional hedging activity elevated.",
  },
  {
    headline: "PLTR +637% Open P&L — Momentum Intact",
    source: "Account 195 Statement",
    sentiment: "bullish" as const,
    impact: "MEDIUM" as const,
    detail: "Palantir (PLTR) position in Account 195 showing +637% open P&L (+$5,335). Government AI contracts and defense spending narrative intact. Hold with trailing stop.",
  },
];

export const SENTIMENT_SUMMARY = {
  overall: "BEARISH",
  wsb: "Panic selling in tech, NVDA puts popular, energy bulls dominating",
  twitter: "Stagflation trending, FOMC fear elevated, Goldman oil call viral",
  stocktwits: "USO/GUSH bulls active, ADBE bears piling in, NVDA divided",
  keyTheme: "Stagflation confirmation (PCE 3.1% + GDP 0.7%) is the dominant narrative. Market pricing in 'higher for longer' Fed with slowing growth — the worst combination for equity multiples.",
};

// ============================================================
// EVENT CALENDAR
// ============================================================
export const EVENT_CALENDAR = [
  {
    date: "Fri Mar 13",
    event: "Core PCE (Jan) — RELEASED",
    time: "8:30 AM CT",
    impact: "CRITICAL" as const,
    notes: "ACTUAL: Core PCE +0.4% MoM / +3.1% YoY (vs 3.0% est.). Headline +0.3% MoM / +2.8% YoY. Hotter than expected. Stagflation signal confirmed.",
  },
  {
    date: "Fri Mar 13",
    event: "GDP Q4 Second Estimate — RELEASED",
    time: "8:30 AM CT",
    impact: "CRITICAL" as const,
    notes: "ACTUAL: 0.7% (revised DOWN from 1.4% advance). Full year 2025: 2.1%. Consumer spending 2.0%. Stagflation confirmed.",
  },
  {
    date: "Fri Mar 13",
    event: "UMich Consumer Sentiment",
    time: "10:00 AM CT",
    impact: "MEDIUM" as const,
    notes: "Consumer confidence under pressure from oil prices and geopolitical uncertainty. A weak reading extends the stagflation narrative.",
  },
  {
    date: "Mon Mar 16",
    event: "Empire State Manufacturing",
    time: "8:30 AM CT",
    impact: "LOW" as const,
    notes: "Regional manufacturing survey. Low market-moving potential but adds to macro mosaic ahead of FOMC.",
  },
  {
    date: "Tue Mar 17",
    event: "FOMC Meeting Begins (Day 1)",
    time: "All Day",
    impact: "CRITICAL" as const,
    notes: "Two-day FOMC meeting begins. Post-stagflation data, Powell's framing is critical. Markets will be on edge. Expect volatility compression ahead of Wednesday decision.",
  },
  {
    date: "Wed Mar 18",
    event: "FOMC Rate Decision + Powell Press Conference",
    time: "1:00 PM CT / 1:30 PM CT",
    impact: "CRITICAL" as const,
    notes: "99% probability of no change. KEY QUESTION: Does Powell acknowledge stagflation? Hawkish tone (citing PCE 3.1%) crushes tech/growth. Dovish tone (citing GDP 0.7%) triggers relief rally. Also: Options expiration week begins — gamma risk elevated.",
  },
  {
    date: "Thu Mar 19",
    event: "Weekly Jobless Claims",
    time: "7:30 AM CT",
    impact: "MEDIUM" as const,
    notes: "Post-FOMC labor data. Elevated claims would reinforce cut expectations and could trigger a relief rally.",
  },
  {
    date: "Fri Mar 20",
    event: "March OpEx (Quad Witching)",
    time: "All Day",
    impact: "HIGH" as const,
    notes: "Quarterly options expiration — largest of the year. ADBE 3/13 puts expire TODAY. SPY 3/20 puts/calls expire next Friday. Gamma-driven volatility expected. Account 370 UVXY calls and SPY spreads expire 3/20.",
  },
];

// ============================================================
// SECTOR ROTATION
// ============================================================
export const SECTOR_ROTATION = [
  { sector: "Energy (XLE)", ytd: "+26.5%", status: "LEADING" as const, note: "Iran conflict + oil above $95. USO +23% in StratModel. GUSH +9%. Structural momentum intact. Goldman $100+ Brent forecast." },
  { sector: "Aerospace & Defense (ITA)", ytd: "+15.4%", status: "LEADING" as const, note: "Geopolitical escalation driving defense spending. SHLD up 72% YTD. Strong institutional inflows." },
  { sector: "Industrials (XLI)", ytd: "+12.0%", status: "LEADING" as const, note: "Best first 27 trading days since 2019. Infrastructure and reshoring intact." },
  { sector: "Materials (XLB)", ytd: "+8.2%", status: "LEADING" as const, note: "Commodity cycle + gold miners (GDX). Stagflation hedge demand building." },
  { sector: "Consumer Staples (XLP)", ytd: "+4.1%", status: "NEUTRAL" as const, note: "Defensive rotation beneficiary. Outperforming tech but limited upside." },
  { sector: "Healthcare (XLV)", ytd: "+2.8%", status: "NEUTRAL" as const, note: "Defensive characteristics provide support. Sector rotation momentum fading." },
  { sector: "Utilities (XLU)", ytd: "+1.5%", status: "NEUTRAL" as const, note: "Rate sensitivity limits upside with 10Y at 4.26%. Modest defensive bid." },
  { sector: "Real Estate (XLRE)", ytd: "-2.1%", status: "LAGGING" as const, note: "Rate-sensitive. Stagflation risk weighs on rate cut expectations." },
  { sector: "Communication Services (XLC)", ytd: "-3.4%", status: "LAGGING" as const, note: "Ad spending concerns. Meta -$168 open P&L in StratModel." },
  { sector: "Financials (XLF)", ytd: "-5.1%", status: "LAGGING" as const, note: "Yield curve concerns + credit risk from oil shock + FOMC uncertainty." },
  { sector: "Technology (XLK)", ytd: "-6.3%", status: "LAGGING" as const, note: "ADBE CEO departure, NVDA -$6,250 open P&L in Acct 927, AI competition. QQQ underperforming." },
];

// ============================================================
// SEASONAL CONTEXT
// ============================================================
export const SEASONAL_CONTEXT = {
  period: "Mid-March — Week 2 (Friday Weekly Close)",
  summary:
    "Mid-March historically carries mixed seasonal bias. This is the Friday close of OpEx week (March 20 quad witching next Friday). The 'March Effect' typically sees institutional rebalancing. However, the Iran conflict and stagflation confirmation are overriding all normal seasonal patterns. Energy stocks in March historically perform well when oil is in a confirmed uptrend — which aligns with current conditions. The FOMC meeting (March 17-18) adds the dominant uncertainty layer.",
  anomalies:
    "The stagflation print (PCE 3.1% + GDP 0.7%) is historically rare and creates a regime not seen since 2022. The Iran-driven oil surge is a significant anomaly vs. March seasonal patterns. Normally March sees a 'spring thaw' in risk appetite — instead VIX is elevated at 25.83 and the S&P 500 is posting its third consecutive down week. This is more consistent with October/November seasonal patterns than March.",
  weeklyAnalysis: {
    weekReview: "Week of March 9-13, 2026: S&P 500 down approximately 3% for the week — the worst week since Q4 2025. Dow dropped 700 points Thursday alone. Energy (+2.1% weekly) and Gold (+0.8%) were the only sectors with positive weekly performance. Tech (-4.2%), Financials (-3.1%), and Consumer Discretionary (-2.8%) led the declines. The Iran conflict escalated mid-week with Iran pledging to keep Hormuz closed indefinitely. ADBE CEO departure added idiosyncratic selling pressure to tech.",
    nextWeekOutlook: "Week of March 16-20, 2026: FOMC dominates everything. Monday-Tuesday will be positioning ahead of Wednesday's decision. The stagflation data (PCE 3.1% + GDP 0.7%) creates a hawkish bias — expect Powell to hold rates and signal 'higher for longer.' A hawkish surprise could push VIX above 30 and SPX toward 6,400–6,500 support. A dovish surprise (citing GDP weakness) could trigger a 2-3% relief rally. Friday March 20 is quad witching — the largest options expiration of the year — which will amplify volatility in either direction. Key positions to watch: UVXY calls (Acct 370) expire 4/17, SPY puts expire 3/20, ADBE puts expire TODAY.",
    keyLevelsNextWeek: "SPX: Support 6,500–6,550 (critical), 6,200–6,300 (major). Resistance 6,720–6,740, 6,800. VIX: Watch 28–30 for crisis signal, 22 for regime improvement. WTI: $90 support, $100 target. Gold: $5,000 support, $5,200 target.",
  },
};

// ============================================================
// TRADING IDEAS — Updated with exact position sizing
// ============================================================
export const TRADING_IDEAS = {
  today: [
    {
      ticker: "USO",
      direction: "LONG" as const,
      horizon: "INTRADAY" as const,
      thesis: "Iran conflict is structural — Brent above $100, Goldman raised forecast to $100+ for March. USO already +23% open P&L in StratModel (250 shares @ $93.72). For new entries: PCE data is in-line on headline, which removes the downside catalyst. Energy momentum is the cleanest trade in this regime.",
      entry: "$114.00–$115.50",
      target: "$119.00–$122.00",
      stop: "$112.00",
      conviction: "HIGH" as const,
      sizing: "Acct 927: 50 shares (~$5,750, ~4% NLV). Acct 195: 20 shares (~$2,300, ~8% NLV). Risk per share: $2.00. Max loss: $100–$400.",
    },
    {
      ticker: "ADBE",
      direction: "SHORT" as const,
      horizon: "INTRADAY" as const,
      thesis: "CEO departure gap-down momentum. ADBE 3/13 puts expire TODAY — StratModel holds ADBE260313P270 (+1) and ADBE260313P255 (-1). The spread is in-the-money. Watch for bounce to $265–$268 resistance for short entry. High relative volume confirms institutional distribution.",
      entry: "$265.00–$268.00 (short on bounce)",
      target: "$255.00–$258.00",
      stop: "$272.50",
      conviction: "HIGH" as const,
      sizing: "StratModel: Manage existing ADBE put spread (expires today). New short: 10 shares ($2,650 notional). Max risk: $450 (stop at $272.50). NOTE: ADBE 3/13 options expire at market close today.",
    },
    {
      ticker: "GUSH",
      direction: "LONG" as const,
      horizon: "INTRADAY" as const,
      thesis: "2x leveraged energy ETF. StratModel holds 250 shares @ $34.14 (mark $37.22, +$770 open P&L). With Brent above $100 and Goldman raising forecast, GUSH has momentum for continuation. Trail stop to $35.50 to protect gains.",
      entry: "$37.00–$37.50 (add to existing)",
      target: "$40.00–$42.00",
      stop: "$35.50 (trail from $34.14 cost)",
      conviction: "HIGH" as const,
      sizing: "StratModel: Trail stop on existing 250 shares. Add 50 shares ($1,860) on pullback to $37.00. Acct 927: 100 shares ($3,720, ~2.7% NLV).",
    },
  ],
  thisWeek: [
    {
      ticker: "UVXY",
      direction: "LONG" as const,
      horizon: "SWING" as const,
      thesis: "Acct 370 holds UVXY 4/17 $45/$50 call spread (+3/-3). With FOMC March 17-18 and stagflation confirmed, VIX is likely to remain elevated or spike. UVXY is the cleanest expression of volatility into FOMC. The call spread is already +$88.50 open P&L (+23%). Hold into FOMC — do not close before Wednesday.",
      entry: "Hold existing UVXY 4/17 $45C/$50C spread (Acct 370)",
      target: "UVXY $55–$60 if VIX spikes to 30+ on FOMC",
      stop: "Close if VIX drops below 22 before FOMC",
      conviction: "HIGH" as const,
      sizing: "Acct 370: Existing +3/-3 call spread. Cost basis: $1.28/spread ($384 total). Current value: ~$472.50. Max profit at expiration: $1,500 if UVXY > $50.",
    },
    {
      ticker: "GDX",
      direction: "LONG" as const,
      horizon: "SWING" as const,
      thesis: "Gold miners as stagflation hedge. Acct 927 holds 100 shares @ $100.05 (-$143 open P&L), Acct 195 holds 50 shares @ $100.265 (-$82 open P&L), Acct 370 holds 150 shares @ $100.339 (-$1,065 open P&L). All three are underwater but the thesis is intact — stagflation (PCE 3.1% + GDP 0.7%) is the best environment for gold. Hold. Acct 370 also has GDX 4/17 $103 calls (+3).",
      entry: "Hold existing positions. Add on pullback to $97.00",
      target: "$104.00–$107.00 (Acct 370 $103 calls become ITM)",
      stop: "$95.50 (close all GDX if breaks below)",
      conviction: "MEDIUM-HIGH" as const,
      sizing: "Existing: 927 (100 sh), 195 (50 sh), 370 (150 sh). Add: 927 add 50 sh at $97 ($4,850). Total GDX exposure: 300+ shares across accounts.",
    },
    {
      ticker: "NVDA",
      direction: "HOLD/MANAGE" as const,
      horizon: "SWING" as const,
      thesis: "NVDA is the most complex position across accounts. Acct 927: 400 shares @ $200.70 (-$6,250 open P&L, -7.79%). Acct 195: 25 shares @ $130.98 (+$1,269 open P&L). Acct 676: 20 shares @ $0 (cost unknown, +$3,554 open P&L). Multiple put spreads across accounts provide downside protection. GTC 2026 catalyst is the key upcoming event. Do NOT add in risk-off regime.",
      entry: "No new entries. Manage existing positions.",
      target: "$195.00–$200.00 (Acct 927 break-even)",
      stop: "$175.00 (close Acct 927 position if breaks below)",
      conviction: "MEDIUM" as const,
      sizing: "Acct 927: Consider trimming 100 shares at $190 to reduce exposure. Acct 195/676: Hold — cost basis much lower, P&L positive. Put spreads provide protection.",
    },
    {
      ticker: "SPY",
      direction: "SHORT HEDGE" as const,
      horizon: "SWING" as const,
      thesis: "StratModel holds SPY -50 shares @ $673 (+$341 open P&L) and multiple put spreads. Acct 370 holds SPY 3/20 $654P (+1) and 4/17 $650P/$670P spread. With stagflation confirmed and FOMC risk elevated, the short hedge is correct. SPX key support at 6,500–6,550. A break below 6,500 accelerates toward 6,200–6,300.",
      entry: "Hold existing hedges. StratModel SPY short and put spreads.",
      target: "SPX 6,400–6,500 (put spreads become profitable)",
      stop: "Cover SPY short if SPX breaks above 6,800 on FOMC relief",
      conviction: "HIGH" as const,
      sizing: "StratModel: Existing -50 SPY short + SPY 3/20 put spreads. Acct 370: SPY 3/20 $654P + 4/17 $650P/$670P spread. Total hedge value: ~$4,500–$5,000.",
    },
  ],
  thisMonth: [
    {
      ticker: "PLTR",
      direction: "LONG" as const,
      horizon: "POSITION" as const,
      thesis: "Palantir (Account 195) is the standout performer — 40 shares @ $20.92 avg cost, current mark $154.30, open P&L +$5,335 (+637%). Government AI contracts and defense spending narrative is the strongest secular theme in this regime. The Iran conflict and increased defense spending are direct tailwinds. Hold with trailing stop.",
      entry: "Hold existing 40 shares (Acct 195). Do not add at current levels.",
      target: "$165.00–$175.00",
      stop: "$140.00 (trail — protect 80% of open gains)",
      conviction: "HIGH" as const,
      sizing: "Acct 195: 40 shares, $6,172 mark value. Trailing stop at $140 protects ~$4,770 of the $5,335 open gain. Consider selling 10 shares at $160+ to lock in partial profits.",
    },
    {
      ticker: "XLE",
      direction: "LONG" as const,
      horizon: "POSITION" as const,
      thesis: "Iran-Hormuz conflict is a multi-week geopolitical event — not resolving in days. XLE up 26.5% YTD. Goldman Sachs raised Brent to $100+ for March. Energy is the only sector with structural momentum in this regime. Hold through FOMC (March 18) — energy is not rate-sensitive in the same way as tech.",
      entry: "$99.50–$101.00 (new entry or add)",
      target: "$105.00–$108.00",
      stop: "$96.50",
      conviction: "HIGH" as const,
      sizing: "Acct 927: 200 shares ($20,000, ~14% NLV). StratModel: 300 shares ($30,000, ~23% NLV). Risk per share: $3.00. Max loss per account: $600–$900.",
    },
    {
      ticker: "SLV",
      direction: "HOLD" as const,
      horizon: "POSITION" as const,
      thesis: "Silver as stagflation/industrial metals hedge. Acct 195: 75 shares @ $20.61 (+$4,161 open P&L +269%). Acct 676: 5 shares @ $20.61 (+$277). Acct 927: 50 shares @ $100.135 (-$1,202 open P&L — different cost basis). Stagflation environment supports silver. Hold with trailing stop.",
      entry: "Hold existing positions. Acct 195 and 676 are highly profitable.",
      target: "$80.00–$85.00 (Acct 195/676)",
      stop: "$70.00 (trail for Acct 195/676 — protect 80% of gains)",
      conviction: "MEDIUM-HIGH" as const,
      sizing: "Acct 195: 75 sh ($5,707 mark). Acct 676: 5 sh ($380 mark). Acct 927: 50 sh ($3,805 mark, underwater). Consider closing Acct 927 SLV position if breaks below $72.",
    },
  ],
};

// ============================================================
// PRIOR SESSION GRADES
// ============================================================
export const PRIOR_SESSION_GRADES = {
  date: "Thursday, March 12, 2026",
  overallGrade: "B+",
  summary:
    "The energy long thesis (USO/GUSH) performed exceptionally — USO is now +23% open P&L in StratModel. The ADBE short setup was identified correctly. The SPY short hedge worked as SPX fell -1.52%. NVDA long in Acct 927 is the primary drag (-$6,250 open P&L). The PLTR hold in Acct 195 continues to be the best performing position (+637%).",
  grades: [
    {
      idea: "USO LONG (Energy momentum — StratModel 250 shares)",
      grade: "A",
      result: "USO at $115.33 mark vs $93.72 cost = +$5,402 open P&L (+23%). Iran conflict + Goldman $100+ Brent forecast. Best performing position.",
      pnl: "+$5,402 open P&L (StratModel)",
      lesson: "Geopolitical supply shocks create sustained momentum. Size was appropriate. Trail stop to $110 to protect gains.",
    },
    {
      idea: "GUSH LONG (2x Energy ETF — StratModel 250 shares)",
      grade: "A-",
      result: "GUSH at $37.22 mark vs $34.14 cost = +$770 open P&L (+9%). Energy momentum confirmed.",
      pnl: "+$770 open P&L (StratModel)",
      lesson: "Leveraged energy ETF working well. Trail stop to $35.50 to protect gains.",
    },
    {
      idea: "SPY SHORT HEDGE (StratModel -50 shares + put spreads)",
      grade: "B+",
      result: "SPX fell -1.52% Thursday. SPY short +$341 open P&L. Put spreads gaining value.",
      pnl: "+$341 open P&L + put spread gains (StratModel)",
      lesson: "VIX above 25 is a reliable regime signal. Maintain hedges until FOMC clarity.",
    },
    {
      idea: "NVDA LONG (Acct 927 — 400 shares @ $200.70)",
      grade: "D",
      result: "NVDA at $184.50 mark vs $200.70 cost = -$6,250 open P&L (-7.79%). Tech selloff accelerating.",
      pnl: "-$6,250 open P&L (Acct 927)",
      lesson: "Never hold large tech longs in RISK-OFF regime with VIX above 25. Consider trimming 100 shares at next bounce to $190.",
    },
    {
      idea: "PLTR HOLD (Acct 195 — 40 shares @ $20.92)",
      grade: "A+",
      result: "PLTR at $154.30 mark vs $20.92 cost = +$5,335 open P&L (+637%). Defense AI narrative intact.",
      pnl: "+$5,335 open P&L (Acct 195)",
      lesson: "Long-term conviction positions in structural themes (defense AI) should be held through volatility. Trail stop to $140.",
    },
    {
      idea: "UVXY CALL SPREAD (Acct 370 — 4/17 $45C/$50C)",
      grade: "B+",
      result: "UVXY spread +$88.50 open P&L (+23%). VIX elevated into FOMC.",
      pnl: "+$88.50 open P&L (Acct 370)",
      lesson: "Volatility longs ahead of FOMC with stagflation data are correct. Hold into Wednesday decision.",
    },
  ],
};

// ============================================================
// EARNINGS PLAYS
// ============================================================
export const EARNINGS_PLAYS = [
  {
    ticker: "ADBE",
    company: "Adobe Inc.",
    reportDate: "Reported Thu Mar 12 AC",
    setup: "SHORT BIAS",
    conviction: "HIGH",
    consensus: { eps: "$5.95", revenue: "$6.28B", impliedMove: "±7.2%", whisper: "$6.10" },
    thesis: "Beat on EPS ($6.06) and revenue ($6.40B) but CEO Shantanu Narayen departure dominates. 18-year tenure ending creates leadership vacuum. AI competitive pressure from Microsoft Copilot and Canva. StratModel holds ADBE 3/13 put spread (expires TODAY) and 4/17 put spread.",
    bullCase: "Beat was strong. New CEO could accelerate AI integration. Stock oversold on emotional reaction.",
    bearCase: "CEO departure removes 18 years of institutional knowledge. AI competition is existential. Multiple compression justified.",
    tradeStructure: "StratModel: Manage 3/13 put spread at expiration today. 4/17 $260P/$270P spread remains open. New short: 10 shares on bounce to $265–$268.",
    impliedMove: "±7.2%",
    keyLevels: "Support: $250–$255. Resistance: $265–$270. Stop: $273. NOTE: 3/13 options expire today.",
  },
  {
    ticker: "ULTA",
    company: "Ulta Beauty",
    reportDate: "Reported Thu Mar 12 AC",
    setup: "WATCH — STABILIZATION",
    conviction: "MEDIUM",
    consensus: { eps: "$7.93", revenue: "$3.82B", impliedMove: "±8.5%", whisper: "$8.05" },
    thesis: "Beat on EPS ($8.01) and revenue ($3.9B) but margin compression (38.1% vs 38.2%) and cautious 2026 guidance creating selling pressure. Classic 'beat and lower' reaction. Stock down ~4%.",
    bullCase: "Revenue growth +11.8% exceptional. Beauty spending resilient.",
    bearCase: "Margin compression trend. Cautious 2026 guidance. Risk-off limits multiple expansion.",
    tradeStructure: "Wait for stabilization at $620 support. If holds, small long for bounce to $640–$650. Stop at $610.",
    impliedMove: "±8.5%",
    keyLevels: "Support: $615–$620. Resistance: $640–$650.",
  },
  {
    ticker: "DELL",
    company: "Dell Technologies",
    reportDate: "Next Week (est. Mar 18)",
    setup: "LONG BIAS",
    conviction: "MEDIUM",
    consensus: { eps: "$2.45", revenue: "$24.8B", impliedMove: "±6.8%", whisper: "$2.55" },
    thesis: "AI server demand from NVDA GPU buildouts driving strong infrastructure spending. Dell's server/storage business is a direct beneficiary of AI capex cycle. Watch for guidance on AI server backlog.",
    bullCase: "AI infrastructure demand accelerating. NVDA partnership creates durable revenue stream.",
    bearCase: "PC market weak. Margin pressure. Risk-off environment.",
    tradeStructure: "Buy April $120 calls for defined risk if market stabilizes post-FOMC.",
    impliedMove: "±6.8%",
    keyLevels: "Support: $115–$118. Resistance: $128–$132.",
  },
];

// ============================================================
// ACCOUNTS — Real positions from March 13, 2026 statements
// ============================================================
export const ACCOUNTS = [
  {
    id: "927",
    name: "Account 927",
    type: "LIVE / PRIMARY",
    nlv: "$340,770.06",
    openPnl: "-$10,290 (est.)",
    ytdPnl: "N/A",
    summary:
      "Largest account. Heavy NVDA exposure (400 shares @ $200.70) is the primary drag at -$6,250 open P&L (-7.79%). SPY (281 shares @ $690) is -$4,685 (-2.41%). SLV (50 shares) is -$1,202. Offsetting: SMH +$845, AMAT +$5,172. Complex options spreads on SPY, NVDA, FDX, MU, LULU provide partial hedging. The NVDA position is the critical action item.",
    criticalActions: [
      "NVDA: Consider trimming 100 shares at next bounce to $190 — reduce -$6,250 drag",
      "SPY: Maintain existing put spreads (3/18 $650P/$670P) as FOMC hedge",
      "SLV: Consider closing 50 shares if breaks below $72 (currently -$1,202)",
      "LULU 3/20 put spread expires next Friday — monitor into OpEx",
      "FDX 3/20 call spread expires next Friday — monitor",
    ],
    positions: [
      { symbol: "SPY", qty: "+281", avgCost: "$690.00", mark: "$668.96", markValue: "$187,977", openPnl: "-$4,685", action: "HOLD — hedge with puts" },
      { symbol: "NVDA", qty: "+400", avgCost: "$200.70", mark: "$184.50", markValue: "$73,800", openPnl: "-$6,250", action: "TRIM 100 on bounce" },
      { symbol: "SLV", qty: "+50", avgCost: "$100.14", mark: "$76.09", markValue: "$3,805", openPnl: "-$1,202", action: "HOLD / WATCH $72" },
      { symbol: "GDX", qty: "+100", avgCost: "$100.05", mark: "$98.62", markValue: "$9,862", openPnl: "-$143", action: "HOLD — stagflation hedge" },
      { symbol: "SMH", qty: "+20", avgCost: "$348.98", mark: "$391.22", markValue: "$7,824", openPnl: "+$845", action: "HOLD" },
      { symbol: "AMAT", qty: "closed", avgCost: "—", mark: "—", markValue: "—", openPnl: "+$5,172 YTD", action: "CLOSED" },
    ],
    options: [
      { code: "SPY 3/18 $650P/+3 / $670P/-3", exp: "18 MAR 26", value: "+$3,110 / -$1,088", net: "+$2,022", action: "HOLD — FOMC hedge" },
      { code: "NVDA 4/17 $165P/+3 / $200C/-3", exp: "17 APR 26", value: "+$1,110 / -$945", net: "+$165", action: "HOLD — collar" },
      { code: "MU 3/20 $430C/+1 / $460C/-1", exp: "20 MAR 26", value: "+$1,373 / -$623", net: "+$750", action: "HOLD — expires next Fri" },
      { code: "LULU 3/20 $157.5P/-3 / $160P/+3", exp: "20 MAR 26", value: "-$2,655 / +$3,053", net: "+$398", action: "HOLD — expires next Fri" },
      { code: "FDX 3/20 $370C/+1 / $380C/-1", exp: "20 MAR 26", value: "+$783 / -$490", net: "+$293", action: "HOLD — expires next Fri" },
      { code: "SPY 3/18 $700C/-2", exp: "18 MAR 26", value: "-$7", net: "-$7", action: "HOLD — near worthless" },
    ],
    keyRisk: "NVDA -$6,250 is the largest single-position drag. Tech selloff accelerating in RISK-OFF regime. SPY 281 shares is a large long equity exposure with partial put hedge. FOMC March 18 is the primary catalyst for this account.",
  },
  {
    id: "StratModel",
    name: "Strategy Model Account",
    type: "PAPER / STRATEGY MODEL",
    nlv: "$129,726.11",
    openPnl: "+$5,709 (est.)",
    ytdPnl: "+$6,500 (est.)",
    summary:
      "Strategy model with the best-performing positions: USO +250 shares (+$5,402 open P&L +23%), GUSH +250 shares (+$770 +9%), ORCL +50 shares (+$537 +7.2%), SPY short -50 shares (+$341). NVDA +200 shares is the drag (-$2,102 -5.4%). ADBE put spreads expire today. Multiple options spreads provide hedging.",
    criticalActions: [
      "ADBE 3/13 put spread (P270/P255) expires TODAY at market close — manage",
      "USO: Trail stop to $110 to protect $5,402 gain",
      "GUSH: Trail stop to $35.50 to protect $770 gain",
      "NVDA: Consider trimming 50 shares at $190 to reduce -$2,102 drag",
      "SPY 3/20 put spreads expire next Friday — monitor into OpEx",
    ],
    positions: [
      { symbol: "USO", qty: "+250", avgCost: "$93.72", mark: "$115.33", markValue: "$28,833", openPnl: "+$5,403", action: "HOLD — trail stop $110" },
      { symbol: "GUSH", qty: "+250", avgCost: "$34.14", mark: "$37.22", markValue: "$9,305", openPnl: "+$770", action: "HOLD — trail stop $35.50" },
      { symbol: "SGOV", qty: "+200", avgCost: "$100.58", mark: "$100.51", markValue: "$20,102", openPnl: "-$14", action: "HOLD — cash equivalent" },
      { symbol: "ORCL", qty: "+50", avgCost: "$149.46", mark: "$160.20", markValue: "$8,010", openPnl: "+$537", action: "HOLD / TRIM at $165–$168" },
      { symbol: "NVDA", qty: "+200", avgCost: "$195.00", mark: "$184.49", markValue: "$36,898", openPnl: "-$2,102", action: "HOLD — put hedge in place" },
      { symbol: "SPY", qty: "-50", avgCost: "$673.00", mark: "$668.83", markValue: "-$33,442", openPnl: "+$341", action: "HOLD — short hedge" },
      { symbol: "META", qty: "+7", avgCost: "$655.39", mark: "$631.40", markValue: "$4,420", openPnl: "-$168", action: "HOLD — stop at $620" },
      { symbol: "AMZN", qty: "+10", avgCost: "$206.16", mark: "$210.40", markValue: "$2,104", openPnl: "+$42", action: "HOLD" },
      { symbol: "HIMS", qty: "+20", avgCost: "$24.245", mark: "$24.31", markValue: "$486", openPnl: "+$1", action: "HOLD — stop at $22" },
      { symbol: "HOOD", qty: "+40", avgCost: "$76.57", mark: "$76.90", markValue: "$3,076", openPnl: "+$13", action: "HOLD" },
      { symbol: "NFLX", qty: "-100", avgCost: "$95.28", mark: "$94.33", markValue: "-$9,433", openPnl: "+$95", action: "HOLD — short" },
    ],
    options: [
      { code: "ADBE 3/13 P270/+1 / P255/-1", exp: "13 MAR 26 (TODAY)", value: "+$935 / -$328", net: "+$608", action: "EXPIRES TODAY — manage at close" },
      { code: "ADBE 4/17 P260/+1 / P270/-1", exp: "17 APR 26", value: "+$1,230 / -$1,653", net: "-$423", action: "HOLD — bearish spread" },
      { code: "SPY 3/20 P700/+1 / P710/+1 / C658/+1 / C668/-1", exp: "20 MAR 26", value: "Complex", net: "+$1,626", action: "HOLD — FOMC hedge" },
      { code: "QQQ 3/20 P585/+1 / P595/-1", exp: "20 MAR 26", value: "+$623 / -$946", net: "-$324", action: "HOLD" },
    ],
    keyRisk: "ADBE 3/13 options expire TODAY — must manage before close. NVDA -$2,102 is the primary drag. SPY 3/20 options expire next Friday. USO/GUSH gains need trailing stops to protect profits.",
  },
  {
    id: "195",
    name: "Account 195",
    type: "LIVE / MARGIN",
    nlv: "$28,957.37",
    openPnl: "+$11,247 (est.)",
    ytdPnl: "+$1,220 (est.)",
    summary:
      "Best performing live account by open P&L percentage. PLTR +637% (+$5,335) is the standout. SLV +269% (+$4,161). NVDA +58% (+$1,270). TSLA +55% (+$564). GDX is the only drag (-$82). NVDA put spread provides downside protection.",
    criticalActions: [
      "PLTR: Trail stop to $140 — protect 80% of $5,335 gain",
      "SLV: Trail stop to $70 — protect 80% of $4,161 gain",
      "NVDA put spread (4/2 $195P/$200P): Monitor — provides protection below $195",
      "Consider taking partial profits on PLTR (sell 10 shares at $160+)",
    ],
    positions: [
      { symbol: "PLTR", qty: "+40", avgCost: "$20.92", mark: "$154.30", markValue: "$6,172", openPnl: "+$5,335", action: "HOLD — trail stop $140" },
      { symbol: "SLV", qty: "+75", avgCost: "$20.61", mark: "$76.09", markValue: "$5,707", openPnl: "+$4,161", action: "HOLD — trail stop $70" },
      { symbol: "NVDA", qty: "+25", avgCost: "$130.98", mark: "$184.46", markValue: "$4,612", openPnl: "+$1,270", action: "HOLD — put hedge in place" },
      { symbol: "TSLA", qty: "+4", avgCost: "$257.57", mark: "$398.60", markValue: "$1,594", openPnl: "+$564", action: "HOLD — stop at $370" },
      { symbol: "GDX", qty: "+50", avgCost: "$100.27", mark: "$98.62", markValue: "$4,931", openPnl: "-$82", action: "HOLD — stagflation hedge" },
    ],
    options: [
      { code: "NVDA 4/2 P195/+3 / P200/-3", exp: "2 APR 26", value: "+$4,268 / -$5,430", net: "-$1,163", action: "HOLD — downside protection" },
    ],
    keyRisk: "PLTR and SLV are highly concentrated gains — need trailing stops. NVDA put spread is net negative but provides protection. Account is well-positioned in this regime (energy/metals/defense).",
  },
  {
    id: "370",
    name: "Account 370",
    type: "LIVE / MARGIN",
    nlv: "$28,079.53",
    openPnl: "-$774 (est.)",
    ytdPnl: "-$974 (est.)",
    summary:
      "Account focused on GDX (150 shares, -$1,065 open P&L) and volatility positioning. UVXY 4/17 call spread (+$89 open P&L) is correctly positioned for FOMC volatility. SPY put spreads provide downside protection. SGOV provides cash yield. The GDX position is underwater but the stagflation thesis supports holding.",
    criticalActions: [
      "GDX: Hold 150 shares — stagflation thesis intact. GDX 4/17 $103 calls need GDX to rally to $103+",
      "UVXY 4/17 call spread: Hold into FOMC — do not close before Wednesday",
      "SPY 3/20 $654P expires next Friday — monitor",
      "SPY 4/17 $650P/$670P spread: Hold as FOMC hedge",
    ],
    positions: [
      { symbol: "GDX", qty: "+150", avgCost: "$100.34", mark: "$98.62", markValue: "$14,793", openPnl: "-$1,065", action: "HOLD — stagflation hedge" },
      { symbol: "SGOV", qty: "+50", avgCost: "$100.47", mark: "$100.51", markValue: "$5,026", openPnl: "+$2", action: "HOLD — cash equivalent" },
    ],
    options: [
      { code: "UVXY 4/17 C45/+3 / C50/-3", exp: "17 APR 26", value: "+$3,248 / -$2,775", net: "+$473", action: "HOLD — FOMC volatility play" },
      { code: "GDX 4/17 C103/+3", exp: "17 APR 26", value: "+$1,500", net: "+$1,500", action: "HOLD — needs GDX > $103" },
      { code: "SPY 3/20 P654/+1", exp: "20 MAR 26", value: "+$657", net: "+$657", action: "HOLD — expires next Fri" },
      { code: "SPY 4/17 P650/-1 / P670/+1", exp: "17 APR 26", value: "-$1,300 / +$1,968", net: "+$668", action: "HOLD — FOMC hedge" },
    ],
    keyRisk: "GDX -$1,065 is the primary drag. If GDX breaks below $95, consider closing. UVXY calls are the key speculative position — hold into FOMC. Multiple options expirations next week (3/20 OpEx).",
  },
  {
    id: "676",
    name: "Account 676",
    type: "LIVE / MARGIN",
    nlv: "$14,316.56",
    openPnl: "+$5,205 (est.)",
    ytdPnl: "-$332 (est.)",
    summary:
      "Smallest account but strong open P&L. NVDA +175% (+$3,554) is the standout. SPY +19% (+$542). TSLA +55% (+$706). SLV +269% (+$277). QQQ +27% (+$127). GDX is the only drag (-$27). NVDA put spread provides downside protection. Account is well-positioned with diversified longs.",
    criticalActions: [
      "NVDA: Put spread (4/2 P190/P200) provides protection below $190 — hold",
      "SPY: +5 shares with strong gain — hold with stop at $650",
      "TSLA: +5 shares with strong gain — hold with stop at $370",
      "Account is small — limit to existing positions, no new entries today",
    ],
    positions: [
      { symbol: "NVDA", qty: "+20", avgCost: "$0 (inherited)", mark: "$184.46", markValue: "$3,689", openPnl: "+$3,554", action: "HOLD — put hedge in place" },
      { symbol: "SPY", qty: "+5", avgCost: "$560.42", mark: "$668.83", markValue: "$3,344", openPnl: "+$542", action: "HOLD — stop at $650" },
      { symbol: "TSLA", qty: "+5", avgCost: "$257.54", mark: "$398.68", markValue: "$1,993", openPnl: "+$706", action: "HOLD — stop at $370" },
      { symbol: "GDX", qty: "+20", avgCost: "$99.94", mark: "$98.62", markValue: "$1,972", openPnl: "-$27", action: "HOLD — stagflation hedge" },
      { symbol: "SLV", qty: "+5", avgCost: "$20.61", mark: "$76.09", markValue: "$380", openPnl: "+$277", action: "HOLD — trail stop $70" },
      { symbol: "QQQ", qty: "+1", avgCost: "$473.25", mark: "$599.76", markValue: "$600", openPnl: "+$127", action: "HOLD" },
    ],
    options: [
      { code: "NVDA 4/2 P190/+3 / P200/-3", exp: "2 APR 26", value: "+$3,270 / -$5,430", net: "-$2,160", action: "HOLD — downside protection" },
    ],
    keyRisk: "Account size limits new entries. NVDA put spread is net negative but provides critical protection. All equity positions are profitable except GDX. Maintain stops on all positions.",
  },
];

// ============================================================
// CROSS-ACCOUNT RISKS
// ============================================================
export const CROSS_ACCOUNT_RISKS = [
  {
    risk: "NVDA Concentration Risk",
    exposure: "Acct 927: 400 sh (-$6,250), StratModel: 200 sh (-$2,102), Acct 195: 25 sh (+$1,270), Acct 676: 20 sh (+$3,554). Total: 645 shares.",
    accounts: "927, StratModel, 195, 676",
    mitigation: "Acct 927 and StratModel are underwater — consider trimming 100 sh each at next bounce to $190. Accts 195 and 676 have low cost basis and put protection — hold.",
  },
  {
    risk: "GDX Concentration Risk",
    exposure: "Acct 927: 100 sh (-$143), Acct 195: 50 sh (-$82), Acct 370: 150 sh (-$1,065), Acct 676: 20 sh (-$27). Total: 320 shares, -$1,317 combined.",
    accounts: "927, 195, 370, 676",
    mitigation: "Stagflation thesis supports holding. Trail stop at $95.50 across all accounts. Acct 370 has GDX 4/17 $103 calls — needs GDX to rally to $103+ to be profitable.",
  },
  {
    risk: "ADBE 3/13 Options Expiring TODAY",
    exposure: "StratModel holds ADBE 3/13 P270/+1 and P255/-1 — both expire at market close today.",
    accounts: "StratModel",
    mitigation: "Monitor ADBE price at close. P270 is ITM (ADBE ~$265). P255 is also ITM. Spread should be profitable — manage at close to capture max value.",
  },
  {
    risk: "SPY/QQQ Options Expiring 3/20 (Next Friday)",
    exposure: "Acct 927: LULU 3/20, FDX 3/20, SPY 3/18 spreads. Acct 370: SPY 3/20 $654P. StratModel: SPY/QQQ 3/20 spreads.",
    accounts: "927, 370, StratModel",
    mitigation: "Monitor all 3/20 expirations into OpEx week. FOMC on Wednesday will determine direction. Quad witching Friday will amplify volatility.",
  },
  {
    risk: "Stagflation Regime — Tech Longs Exposed",
    exposure: "NVDA (all accounts), TSLA (195, 676), QQQ (676), META (StratModel), AMZN (StratModel)",
    accounts: "All accounts",
    mitigation: "Maintain put protection on NVDA. Consider trimming TSLA in Acct 195 above $400. META stop at $620. Tech longs are the primary risk in RISK-OFF / MACRO STRESS regime.",
  },
];

// ============================================================
// ACCOUNT HISTORY
// ============================================================
export const ACCOUNT_HISTORY = [
  {
    date: "Mar 11",
    accounts: [
      { id: "927", nlv: 345000, openPnl: 0, change: 0, changePct: 0 },
      { id: "StratModel", nlv: 131500, openPnl: 0, change: 0, changePct: 0 },
      { id: "195", nlv: 29400, openPnl: 0, change: 0, changePct: 0 },
      { id: "370", nlv: 28600, openPnl: 0, change: 0, changePct: 0 },
      { id: "676", nlv: 14650, openPnl: 0, change: 0, changePct: 0 },
    ],
  },
  {
    date: "Mar 12",
    accounts: [
      { id: "927", nlv: 342500, openPnl: 0, change: -2500, changePct: -0.72 },
      { id: "StratModel", nlv: 130800, openPnl: 0, change: -700, changePct: -0.53 },
      { id: "195", nlv: 29150, openPnl: 0, change: -250, changePct: -0.85 },
      { id: "370", nlv: 28350, openPnl: 0, change: -250, changePct: -0.87 },
      { id: "676", nlv: 14480, openPnl: 0, change: -170, changePct: -1.16 },
    ],
  },
  {
    date: "Mar 13",
    accounts: [
      { id: "927", nlv: 340770, openPnl: -10290, change: -1730, changePct: -0.51 },
      { id: "StratModel", nlv: 129726, openPnl: 5709, change: -1074, changePct: -0.82 },
      { id: "195", nlv: 28957, openPnl: 11247, change: -193, changePct: -0.66 },
      { id: "370", nlv: 28080, openPnl: -774, change: -270, changePct: -0.95 },
      { id: "676", nlv: 14317, openPnl: 5205, change: -163, changePct: -1.13 },
    ],
  },
];

// ============================================================
// DECISION SUMMARY — Updated post-PCE/GDP
// ============================================================
export const DECISION_SUMMARY = {
  bestOpportunityToday:
    "ADBE 3/13 PUT SPREAD MANAGEMENT (StratModel) — expires today. P270 is ITM with ADBE ~$265. Manage at close to capture maximum value. Secondary: USO trail stop management — protect $5,402 gain with stop at $110.",
  bestSwingIdeaThisWeek:
    "UVXY 4/17 CALL SPREAD (Account 370) — hold into FOMC March 18. Stagflation confirmed (PCE 3.1% + GDP 0.7%) creates hawkish Fed risk. VIX likely to remain elevated or spike. Current value +$473. Max profit $1,500 if UVXY > $50 at expiration.",
  biggestRiskToWatch:
    "FOMC March 17-18 + Quad Witching March 20. Powell's response to stagflation data (PCE 3.1% + GDP 0.7%) will define Q2. Hawkish tone could push VIX above 30 and SPX toward 6,400–6,500. Multiple options expirations next week (SPY 3/18, SPY/QQQ 3/20, LULU/FDX/MU 3/20). NVDA -$6,250 in Acct 927 is the largest single position risk.",
};
