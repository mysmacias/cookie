import type { ExportOptions } from './types';
import { DEFAULT_EXPORT_OPTIONS } from './types';

const STORAGE_KEY = 'cookie_export_options_v1';

function cloneDefaults(): ExportOptions {
  return { ...DEFAULT_EXPORT_OPTIONS };
}

export function loadExportOptions(): ExportOptions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaults();
    const parsed = JSON.parse(raw) as Partial<ExportOptions>;
    return {
      ...DEFAULT_EXPORT_OPTIONS,
      ...parsed,
    };
  } catch {
    return cloneDefaults();
  }
}

export function saveExportOptions(options: ExportOptions): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
  } catch {
    /* ignore */
  }
}
