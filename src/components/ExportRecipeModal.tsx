import React, { useCallback, useEffect, useState } from 'react';
import { X, FileDown, Copy, Loader2 } from 'lucide-react';
import type { Recipe } from '../types';
import type { ExportOptions } from '../export/types';
import {
  buildCookbookMarkdown,
  buildRecipeMarkdown,
  cookbookExportBasename,
  copyTextToClipboard,
  deliverPdfExport,
  deliverMarkdownExport,
  loadExportOptions,
  sanitizeExportFilename,
  saveExportOptions,
} from '../export';

interface ExportRecipeModalProps {
  recipes: Recipe[];
  open: boolean;
  onClose: () => void;
  /** Brief User-visible success message */
  onFeedback: (message: string) => void;
}

function ToggleRow({
  id,
  label,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex items-center justify-between gap-4 py-3 border-b border-outline-variant/20 cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <span className="text-sm text-on-surface">{label}</span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-primary rounded border-outline-variant"
      />
    </label>
  );
}

export const ExportRecipeModal: React.FC<ExportRecipeModalProps> = ({
  recipes,
  open,
  onClose,
  onFeedback,
}) => {
  const [options, setOptions] = useState<ExportOptions>(() => loadExportOptions());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (open) setOptions(loadExportOptions());
  }, [open]);

  const isMulti = recipes.length > 1;

  const patch = useCallback((partial: Partial<ExportOptions>) => {
    setOptions((prev) => {
      const next = { ...prev, ...partial };
      saveExportOptions(next);
      return next;
    });
  }, []);

  const handleExportPdf = async () => {
    if (recipes.length === 0) return;
    setBusy('pdf');
    try {
      const { buildSingleRecipePdfBlob, buildCookbookPdfBlob } = await import('../export/buildPdf');
      const exportedAt = new Date();
      let blob: Blob;
      try {
        blob =
          recipes.length === 1
            ? await buildSingleRecipePdfBlob(recipes[0], options, exportedAt)
            : await buildCookbookPdfBlob(recipes, options, exportedAt);
      } catch (genErr) {
        console.warn('[Cookie export] PDF generation failed', genErr);
        onFeedback(
          'Could not build the PDF. Try turning off photos in the options below, or use Markdown.'
        );
        return;
      }

      const filename =
        recipes.length === 1
          ? sanitizeExportFilename(recipes[0].title, 'pdf')
          : `${cookbookExportBasename(recipes.length)}.pdf`;
      const title = recipes.length === 1 ? recipes[0].title : `Cookie — ${recipes.length} recipes`;

      await deliverPdfExport(blob, filename, title);
      onFeedback('PDF saved to My books');
      onClose();
    } catch (e) {
      console.warn('[Cookie export] Unexpected export error', e);
      onFeedback('Something went wrong finishing the export. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const mdContent = () =>
    isMulti
      ? buildCookbookMarkdown(recipes, options, {
          exportedAt: new Date(),
          recipeCount: recipes.length,
        })
      : buildRecipeMarkdown(recipes[0], options);

  const handleCopyMarkdown = async () => {
    if (recipes.length === 0) return;
    setBusy('md-copy');
    try {
      await copyTextToClipboard(mdContent());
      onFeedback('Markdown copied');
    } catch (e) {
      console.warn('[Cookie export] Copy to clipboard failed', e);
      onFeedback('Copy failed');
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadMarkdown = async () => {
    if (recipes.length === 0) return;
    const name =
      recipes.length === 1
        ? sanitizeExportFilename(recipes[0].title, 'md')
        : `${cookbookExportBasename(recipes.length)}.md`;
    const blob = new Blob([mdContent()], { type: 'text/markdown;charset=utf-8' });
    await deliverMarkdownExport(blob, name);
    onFeedback('Markdown saved to My books');
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-surface border-t sm:border border-outline-variant sm:rounded-2xl shadow-2xl rounded-t-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-outline-variant/30 bg-surface z-10">
          <h2 id="export-modal-title" className="text-lg font-headline italic">
            Export {recipes.length === 1 ? 'recipe' : `${recipes.length} recipes`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full border border-outline-variant hover:bg-surface-container"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-2">
          <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant">
            Include in document
          </p>
          <ToggleRow
            id="ex-hero"
            label="Hero image"
            checked={options.includeHeroImage}
            onChange={(v) => patch({ includeHeroImage: v })}
          />
          <ToggleRow
            id="ex-step"
            label="Step photos"
            checked={options.includeStepPhotos}
            onChange={(v) => patch({ includeStepPhotos: v })}
          />
          <ToggleRow
            id="ex-ing-img"
            label="Ingredient images"
            checked={options.includeIngredientImages}
            onChange={(v) => patch({ includeIngredientImages: v })}
          />
          <ToggleRow
            id="ex-chef"
            label="Chef's note"
            checked={options.includeChefNote}
            onChange={(v) => patch({ includeChefNote: v })}
          />
          <ToggleRow
            id="ex-tags"
            label="Tags"
            checked={options.includeTags}
            onChange={(v) => patch({ includeTags: v })}
          />
          <ToggleRow
            id="ex-shop"
            label="Combined shopping list (multi-recipe)"
            checked={options.appendShoppingList}
            onChange={(v) => patch({ appendShoppingList: v })}
            disabled={!isMulti}
          />
        </div>

        <div className="px-6 pb-6 space-y-3">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void handleExportPdf()}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-full bg-primary text-on-primary font-label uppercase tracking-widest text-xs font-bold disabled:opacity-60"
          >
            {busy === 'pdf' ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
            Export PDF
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void handleCopyMarkdown()}
              className="flex items-center justify-center gap-2 py-3 rounded-full border border-outline-variant font-label uppercase tracking-widest text-[10px] font-bold hover:bg-surface-container disabled:opacity-60"
            >
              {busy === 'md-copy' ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
              Copy Markdown
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void handleDownloadMarkdown()}
              className="flex items-center justify-center gap-2 py-3 rounded-full border border-outline-variant font-label uppercase tracking-widest text-[10px] font-bold hover:bg-surface-container disabled:opacity-60"
            >
              <FileDown size={16} />
              Save .md
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
