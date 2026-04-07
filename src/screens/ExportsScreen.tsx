import React, { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, FileText, FileType, RefreshCw, Trash2, X, ChevronLeft } from 'lucide-react';
import { SwipeBackWrapper } from '../components/SwipeBackWrapper';
import {
  listExportDocuments,
  openPdfForViewing,
  readMarkdownExport,
  deleteExportDocument,
  type ExportDocItem,
} from '../services/exportLibrary';
import { Screen } from '../hooks/useNavigation';

interface ExportsScreenProps {
  navigateTo: (screen: Screen) => void;
}

export const ExportsScreen: React.FC<ExportsScreenProps> = ({ navigateTo }) => {
  const [docs, setDocs] = useState<ExportDocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<
    | { mode: 'pdf'; url: string; title: string }
    | { mode: 'md'; text: string; title: string }
    | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDocs(await listExportDocuments());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const closeViewer = () => {
    if (viewer?.mode === 'pdf') URL.revokeObjectURL(viewer.url);
    setViewer(null);
  };

  const openItem = async (item: ExportDocItem) => {
    try {
      if (item.kind === 'pdf') {
        const url = await openPdfForViewing(item);
        setViewer({ mode: 'pdf', url, title: item.displayName });
      } else {
        const text = await readMarkdownExport(item);
        setViewer({ mode: 'md', text, title: item.displayName });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const confirmDelete = async (item: ExportDocItem) => {
    if (!window.confirm(`Remove "${item.displayName}" from My books?`)) return;
    try {
      await deleteExportDocument(item);
      await load();
    } catch (e) {
      console.error(e);
    }
  };

  const fmtDate = (ms: number) => {
    if (!ms) return '—';
    try {
      return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return '—';
    }
  };

  return (
    <SwipeBackWrapper onBack={() => navigateTo('library')}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto space-y-10 pb-24"
      >
        <button
          type="button"
          onClick={() => navigateTo('library')}
          className="flex items-center gap-2 text-sm font-label uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Library
        </button>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-3">
            <p className="text-sm font-label uppercase tracking-widest text-secondary font-bold">Exports</p>
            <h1 className="text-5xl md:text-7xl font-headline italic leading-none">My books</h1>
            <p className="text-on-surface-variant max-w-lg">
              PDFs and Markdown files you export are saved here so you can view them anytime.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-outline-variant font-label uppercase tracking-widest text-xs hover:bg-surface-container transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-on-surface-variant font-label uppercase tracking-widest text-xs">Loading…</p>
        ) : docs.length === 0 ? (
          <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low/50 p-12 text-center space-y-4">
            <BookOpen className="mx-auto text-outline-variant" size={40} strokeWidth={1.25} />
            <p className="text-on-surface-variant">
              No saved exports yet. Use the share button on a recipe or export from the library to create a PDF or
              Markdown book.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {docs.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-4 rounded-2xl border border-outline-variant/30 bg-surface-container-low/40 px-5 py-4"
              >
                <button
                  type="button"
                  onClick={() => void openItem(item)}
                  className="flex flex-1 items-center gap-4 text-left min-w-0 hover:opacity-90 transition-opacity"
                >
                  <div className="shrink-0 w-11 h-11 rounded-full border border-primary/30 flex items-center justify-center text-primary">
                    {item.kind === 'pdf' ? <FileType size={20} /> : <FileText size={20} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-headline italic text-lg truncate">{item.displayName}</p>
                    <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mt-1">
                      {item.kind === 'pdf' ? 'PDF' : 'Markdown'} · {fmtDate(item.modifiedAt)}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${item.displayName}`}
                  onClick={() => void confirmDelete(item)}
                  className="shrink-0 p-3 rounded-full border border-outline-variant/50 text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </motion.div>

      <AnimatePresence>
        {viewer ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex flex-col bg-surface"
          >
            <div className="shrink-0 flex items-center justify-between gap-4 px-4 py-4 border-b border-outline-variant/30 safe-area-top">
              <p className="font-headline italic text-lg truncate flex-1 min-w-0">{viewer.title}</p>
              <button
                type="button"
                aria-label="Close"
                onClick={closeViewer}
                className="shrink-0 p-3 rounded-full border border-outline-variant hover:bg-surface-container"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto -webkit-overflow-scrolling-touch">
              {viewer.mode === 'pdf' ? (
                <iframe
                  title={viewer.title}
                  src={viewer.url}
                  className="w-full h-full border-0 bg-surface-container-high"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                />
              ) : (
                <div className="h-full overflow-y-auto px-6 py-8 max-w-3xl mx-auto">
                  <article
                    className="export-markdown text-on-surface text-[15px] leading-relaxed
                      [&_h1]:text-4xl [&_h1]:md:text-5xl [&_h1]:font-headline [&_h1]:italic [&_h1]:font-normal [&_h1]:text-primary [&_h1]:mt-10 [&_h1]:mb-4 [&_h1]:first:mt-0
                      [&_h2]:text-2xl [&_h2]:md:text-3xl [&_h2]:font-headline [&_h2]:italic [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:pt-2 border-t [&_h2]:border-outline-variant/30 [&_h2]:first:border-t-0 [&_h2]:first:pt-0 [&_h2]:first:mt-6
                      [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2
                      [&_p]:mb-4 [&_p]:text-on-surface [&_blockquote_p]:mb-0
                      [&_blockquote]:border-l-4 [&_blockquote]:border-primary/50 [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:my-4 [&_blockquote]:text-on-surface-variant [&_blockquote]:italic
                      [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:space-y-1
                      [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol]:space-y-1
                      [&_li]:pl-1
                      [&_strong]:text-on-surface [&_strong]:font-semibold
                      [&_em]:text-on-surface-variant
                      [&_hr]:my-10 [&_hr]:border-outline-variant/40
                      [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2"
                  >
                    <ReactMarkdown>{viewer.text}</ReactMarkdown>
                  </article>
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </SwipeBackWrapper>
  );
};
