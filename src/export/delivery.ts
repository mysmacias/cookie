function downloadBlobInBrowser(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function isUserCanceledShare(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes('cancel') || m.includes('abort');
}

async function rememberExport(blob: Blob, filename: string, mime: string): Promise<void> {
  const { rememberWebExport } = await import('../services/webExportStore');
  await rememberWebExport(blob, filename, mime);
}

/**
 * Share a file via the Web Share API when the browser supports sharing files
 * (notably iOS/Android Safari & Chrome), otherwise fall back to a download.
 * Returns true if the share sheet handled it, false to signal the caller it fell back.
 */
async function shareFileViaWebShare(blob: Blob, filename: string, title: string): Promise<boolean> {
  const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
  if (typeof nav.share !== 'function') return false;

  const file = new File([blob], filename, { type: blob.type });
  const data: ShareData = { title, files: [file] };

  if (typeof nav.canShare === 'function' && !nav.canShare(data)) return false;

  try {
    await nav.share(data);
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isUserCanceledShare(msg)) return true; // user dismissed the sheet — nothing more to do
    return false; // share failed for another reason — let the caller download instead
  }
}

/**
 * Save PDF to My books (IndexedDB), then offer the native share sheet (Web Share API)
 * with a download fallback.
 */
export async function deliverPdfExport(blob: Blob, filename: string, title: string): Promise<void> {
  await rememberExport(blob, filename, 'application/pdf');
  const shared = await shareFileViaWebShare(blob, filename, title);
  if (!shared) downloadBlobInBrowser(blob, filename);
}

/**
 * Save Markdown to My books (IndexedDB), then offer the native share sheet with a download fallback.
 */
export async function deliverMarkdownExport(blob: Blob, filename: string, title?: string): Promise<void> {
  const safeName = filename.replace(/[/\\]/g, '_');
  await rememberExport(blob, safeName, 'text/markdown');
  const shared = await shareFileViaWebShare(blob, safeName, title ?? safeName);
  if (!shared) downloadBlobInBrowser(blob, safeName);
}

export async function shareTextNative(text: string, title: string): Promise<void> {
  const nav = navigator as Navigator;
  if (typeof nav.share === 'function') {
    try {
      await nav.share({ title, text });
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (isUserCanceledShare(msg)) return;
      // fall through to clipboard
    }
  }
  await copyTextToClipboard(text);
}

export function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
  return Promise.resolve();
}
