import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

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
 * Open the native share sheet with a temporary file.
 * The file is written to Cache (not Documents) since in-app storage is handled by IndexedDB.
 */
async function shareViaNativeSheet(blob: Blob, filename: string, title: string): Promise<void> {
  const safeName = filename.replace(/[/\\]/g, '_');
  const path = `_share_tmp_${safeName}`;

  const base64 = await blobToBase64(blob);
  await Filesystem.writeFile({ path, data: base64, directory: Directory.Cache });
  const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path });

  try {
    await Share.share({ title, files: [uri], dialogTitle: title });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isUserCanceledShare(msg)) return;
    try {
      await Share.share({ title, url: uri, dialogTitle: title });
    } catch (e2) {
      const msg2 = e2 instanceof Error ? e2.message : String(e2);
      if (!isUserCanceledShare(msg2)) throw e2;
    }
  }
}

/**
 * Save PDF to My books (IndexedDB), then share on native or download on web.
 */
export async function deliverPdfExport(blob: Blob, filename: string, title: string): Promise<void> {
  await rememberExport(blob, filename, 'application/pdf');

  if (Capacitor.isNativePlatform()) {
    try {
      await shareViaNativeSheet(blob, filename, title);
    } catch (e) {
      console.warn('[Cookie export] Native share failed', e);
    }
  } else {
    downloadBlobInBrowser(blob, filename);
  }
}

/**
 * Save Markdown to My books (IndexedDB). On web also triggers a browser download.
 */
export async function deliverMarkdownExport(blob: Blob, filename: string): Promise<void> {
  const safeName = filename.replace(/[/\\]/g, '_');
  await rememberExport(blob, safeName, 'text/markdown');

  if (!Capacitor.isNativePlatform()) {
    downloadBlobInBrowser(blob, safeName);
  }
}

export async function shareTextNative(text: string, title: string): Promise<void> {
  try {
    await Share.share({ title, text, dialogTitle: title });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!isUserCanceledShare(msg)) throw e;
  }
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
