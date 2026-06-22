export type ExportDocKind = 'pdf' | 'md';

export interface ExportDocItem {
  id: string;
  displayName: string;
  kind: ExportDocKind;
  modifiedAt: number;
}

async function store() {
  return import('./webExportStore');
}

export async function listExportDocuments(): Promise<ExportDocItem[]> {
  const { listWebExports } = await store();
  const records = await listWebExports();
  return records.map((r) => ({
    id: r.id,
    displayName: r.filename,
    kind: r.kind,
    modifiedAt: r.savedAt,
  }));
}

export async function openPdfForViewing(item: ExportDocItem): Promise<string> {
  const { getWebExportBlob } = await store();
  const blob = await getWebExportBlob(item.id);
  if (!blob) throw new Error('Export not found');
  return URL.createObjectURL(blob);
}

export async function readMarkdownExport(item: ExportDocItem): Promise<string> {
  const { getWebExportBlob } = await store();
  const blob = await getWebExportBlob(item.id);
  if (!blob) throw new Error('Export not found');
  return blob.text();
}

export async function deleteExportDocument(item: ExportDocItem): Promise<void> {
  const { deleteWebExport } = await store();
  await deleteWebExport(item.id);
}
