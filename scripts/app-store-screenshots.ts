/**
 * Captures PNGs at App Store Connect sizes (portrait).
 * Docs: https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/
 *
 * 6.5" iPhone: 1284 × 2778 (also accepts 1242 × 2688)
 * 13" iPad:   2064 × 2752 (also accepts 2048 × 2732)
 *
 * Run: npm run screenshots:appstore
 *
 * These are WebView-accurate (same HTML/CSS as in Capacitor). For marketing frames
 * with a real iOS status bar, use Xcode Simulator + simctl screenshot instead.
 */

import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PREVIEW_PORT = 4173;
const BASE = `http://localhost:${PREVIEW_PORT}`;

const SIZES = [
  { dir: 'iphone-6.5', width: 1284, height: 2778 },
  { dir: 'ipad-13', width: 2064, height: 2752 },
] as const;

function waitForServer(url: string, timeoutMs = 90_000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = (): void => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timeout waiting for ${url}`));
        return;
      }
      void fetch(url)
        .then((r) => {
          if (r.ok) resolve();
          else setTimeout(tick, 400);
        })
        .catch(() => setTimeout(tick, 400));
    };
    tick();
  });
}

async function captureSet(
  page: import('playwright').Page,
  outDir: string,
): Promise<void> {
  await page.goto(BASE, { waitUntil: 'load' });
  // Enter animations use opacity: 0 → 1 on a parent; wait for DOM then settle.
  await page.locator('h1').filter({ hasText: 'The Library' }).waitFor({ state: 'attached' });
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: `${outDir}/01-library.png`,
    type: 'png',
  });

  const card = page.locator('main .group.cursor-pointer').first();
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await page.getByRole('button', { name: 'Start' }).waitFor({ state: 'attached' });
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: `${outDir}/02-recipe-detail.png`,
    type: 'png',
  });

  await page.getByRole('button', { name: 'Start' }).click();
  await page.waitForTimeout(600);
  await page.screenshot({
    path: `${outDir}/03-cooking-mode.png`,
    type: 'png',
  });
}

async function main(): Promise<void> {
  for (const { dir } of SIZES) {
    await mkdir(`app-store-screenshots/${dir}`, { recursive: true });
  }

  const preview = spawn('npx', ['vite', 'preview', `--port=${PREVIEW_PORT}`, '--strictPort'], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });

  try {
    await waitForServer(BASE);
    const browser = await chromium.launch({ headless: true });

    for (const { dir, width, height } of SIZES) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      const outDir = `app-store-screenshots/${dir}`;
      try {
        await captureSet(page, outDir);
      } finally {
        await context.close();
      }
    }

    await browser.close();
    // eslint-disable-next-line no-console
    console.log('\nDone. Upload PNGs from ./app-store-screenshots/<device>/ to App Store Connect.\n');
  } finally {
    preview.kill('SIGTERM');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
