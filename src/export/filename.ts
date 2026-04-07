export function sanitizeExportFilename(title: string, extension: string): string {
  const base = title
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'recipe';
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  return `${base}${ext}`;
}

export function cookbookExportBasename(recipeCount: number): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return sanitizeExportFilename(`Cookie_export_${recipeCount}_recipes_${y}-${m}-${day}`, 'pdf')
    .replace(/\.pdf$/i, '');
}
