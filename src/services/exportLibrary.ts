import { deleteWebExport, getWebExportBlob, listWebExports } from './webExportStore';

export type ExportDocKind = 'pdf' | 'md';

export interface ExportDocItem {
  id: string;
  displayName: string;
  kind: ExportDocKind;
  modifiedAt: number;
}

export async function listExportDocuments(): Promise<ExportDocItem[]> {
  const records = await listWebExports();
  return records.map((r) => ({
    id: r.id,
    displayName: r.filename,
    kind: r.mime.includes('pdf') ? ('pdf' as const) : ('md' as const),
    modifiedAt: r.savedAt,
  }));
}

export async function openPdfForViewing(item: ExportDocItem): Promise<string> {
  const blob = await getWebExportBlob(item.id);
  if (!blob) throw new Error('Export not found');
  return URL.createObjectURL(blob);
}

export async function readMarkdownExport(item: ExportDocItem): Promise<string> {
  const blob = await getWebExportBlob(item.id);
  if (!blob) throw new Error('Export not found');
  return blob.text();
}

export async function deleteExportDocument(item: ExportDocItem): Promise<void> {
  await deleteWebExport(item.id);
}
