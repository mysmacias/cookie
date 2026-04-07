/**
 * Rasterize the “C” mark (Newsreader bold italic, same as the in-app header)
 * for iOS App Store icon and apple-touch-icon. Requires Playwright Chromium.
 */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const root = fileURLToPath(new URL('..', import.meta.url));
const htmlPath = path.join(root, 'scripts', 'render-app-icon.html');
const markHtml = (size, fontPx) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<style>
@font-face {
  font-family: 'Newsreader';
  font-style: italic;
  font-weight: 200 800;
  font-display: block;
  src: url('file://${path.join(root, 'public/fonts/newsreader-italic-latin.woff2')}') format('woff2');
}
html,body{margin:0;padding:0;width:${size}px;height:${size}px;background:#fbf9f4;overflow:hidden}
#mark{width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;
font-family:'Newsreader',serif;font-style:italic;font-weight:700;font-size:${fontPx}px;
letter-spacing:-0.06em;color:#496251;line-height:1;user-select:none}
</style></head><body><div id="mark">C</div></body></html>`;

const outIos = path.join(
  root,
  'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
);
const outAppleTouch = path.join(root, 'public/apple-touch-icon.png');
const outDistTouch = path.join(root, 'dist/apple-touch-icon.png');

async function captureToFile(pageUrl, viewport, outFile) {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { ...viewport, deviceScaleFactor: 1 },
  });
  await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({
    path: outFile,
    clip: { x: 0, y: 0, width: viewport.width, height: viewport.height },
  });
  await browser.close();
}

async function captureFromHtml(html, viewport, outFile) {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { ...viewport, deviceScaleFactor: 1 },
  });
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({
    path: outFile,
    clip: { x: 0, y: 0, width: viewport.width, height: viewport.height },
  });
  await browser.close();
}

async function main() {
  await captureToFile(`file://${htmlPath}`, { width: 1024, height: 1024 }, outIos);
  console.log('wrote', path.relative(root, outIos));

  const touchPx = 180;
  const touchFont = Math.round((600 * touchPx) / 1024);
  if (process.platform === 'darwin') {
    execFileSync('sips', ['-z', '180', '180', outIos, '--out', outAppleTouch], {
      stdio: 'inherit',
    });
  } else {
    await captureFromHtml(markHtml(touchPx, touchFont), { width: touchPx, height: touchPx }, outAppleTouch);
  }
  console.log('wrote', path.relative(root, outAppleTouch));

  if (fs.existsSync(path.dirname(outDistTouch))) {
    fs.copyFileSync(outAppleTouch, outDistTouch);
    console.log('wrote', path.relative(root, outDistTouch));
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
