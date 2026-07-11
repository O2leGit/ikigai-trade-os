// UFP PalletOneShare fetcher.
// Guest accounts cannot use the OneDrive sync client or Graph API against another
// tenant, so this agent reuses your signed-in *browser* session (the one access
// path Microsoft supports for guests) via a persistent Chromium profile.
//
// Modes:
//   node fetch-ufp-share.mjs --login   Opens a visible browser once. Sign in as
//                                      chris@cotoole.com (incl. MFA), wait for the
//                                      folder to load, then the script exits and the
//                                      session is saved in browser-profile/.
//   node fetch-ufp-share.mjs           Headless scheduled run. Downloads the whole
//                                      share as a zip to latest-download.zip.
//
// Exit codes: 0 = ok, 2 = session expired (re-run --login), 3 = download failed.

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const SHARE_URL =
  'https://universalforestproducts-my.sharepoint.com/personal/kchamp_ufpi_com/_layouts/15/onedrive.aspx' +
  '?id=%2Fpersonal%2Fkchamp%5Fufpi%5Fcom%2FDocuments%2FKonsProjectShares%2FPalletOneShare' +
  '&viewid=1dca2301%2D2014%2D4434%2D9ab5%2D48bd60666547&at=9' +
  '&FolderCTID=0x012000D2FFA828C9A82C48963FC7F0147CB25A&view=0';

const BASE = path.join(os.homedir(), 'Documents', 'palletone-engagement', 'ufp-share-agent');
const PROFILE = path.join(BASE, 'browser-profile');
const OUT_ZIP = path.join(BASE, 'latest-download.zip');
const LOG = path.join(BASE, 'agent.log');

const loginMode = process.argv.includes('--login');
fs.mkdirSync(BASE, { recursive: true });
const log = (m) => fs.appendFileSync(LOG, `[${new Date().toISOString()}] ${m}\n`);

// Microsoft's login page frequently refuses to complete sign-in inside bare
// automation Chromium (endless login loop / password-reset bounce). Launch the
// real installed Edge instead and strip the automation markers.
const launchOpts = {
  headless: !loginMode,
  acceptDownloads: true,
  viewport: { width: 1400, height: 900 },
  ignoreDefaultArgs: ['--enable-automation'],
  args: ['--disable-blink-features=AutomationControlled'],
};
let ctx;
try {
  ctx = await chromium.launchPersistentContext(PROFILE, { ...launchOpts, channel: 'msedge' });
} catch {
  ctx = await chromium.launchPersistentContext(PROFILE, launchOpts); // fallback: bundled Chromium
}
const page = ctx.pages()[0] ?? (await ctx.newPage());

// OneDrive renders the toolbar "Download" control as a menuitem in some UI
// versions and a button in others — accept either.
const downloadCtl = () =>
  page
    .getByRole('menuitem', { name: /download/i })
    .or(page.getByRole('button', { name: /download/i }))
    .first();

try {
  await page.goto(SHARE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  if (loginMode) {
    console.log('Sign in as chris@cotoole.com in the browser window (including MFA).');
    console.log('Waiting up to 10 minutes for the PalletOneShare folder to load...');
    await page.waitForURL(/universalforestproducts-my\.sharepoint\.com/, { timeout: 600_000 });
    await downloadCtl().waitFor({ timeout: 600_000 });
    log('LOGIN OK - session saved to browser profile');
    console.log('Login captured. Scheduled runs are now authenticated.');
    await ctx.close();
    process.exit(0);
  }

  // Scheduled run: detect a bounce to the login page = expired session.
  await page.waitForTimeout(8_000);
  if (/login\.microsoftonline\.com|\/signin/i.test(page.url())) {
    log('AUTH_NEEDED - session expired; run: node fetch-ufp-share.mjs --login');
    await ctx.close();
    process.exit(2);
  }

  await downloadCtl().waitFor({ timeout: 60_000 });

  // Server-side zipping of the folder can take a while on the first click.
  let download;
  try {
    [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      downloadCtl().click(),
    ]);
  } catch {
    // Toolbar Download sometimes needs an explicit selection: select all, retry.
    await page.keyboard.press('Control+a');
    [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 240_000 }),
      downloadCtl().click(),
    ]);
  }

  if (fs.existsSync(OUT_ZIP)) fs.rmSync(OUT_ZIP);
  await download.saveAs(OUT_ZIP);
  log(`DOWNLOAD OK - ${OUT_ZIP} (${fs.statSync(OUT_ZIP).size} bytes)`);
  await ctx.close();
  process.exit(0);
} catch (e) {
  log(`ERROR - ${e.message}`);
  await ctx.close();
  process.exit(3);
}
