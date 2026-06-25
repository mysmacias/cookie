import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

interface FilterMenuProps {
  /** Button label, e.g. "Cuisine" or "Tags". */
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  icon?: React.ReactNode;
  align?: 'left' | 'right';
  /** Force the in-menu search box; defaults to on when there are many options. */
  searchable?: boolean;
}

/**
 * A pill button that opens a checkbox popover for multi-select filtering.
 * Replaces an unbounded scrolling row of filter pills with one compact control.
 */
export const FilterMenu: React.FC<FilterMenuProps> = ({
  label, options, selected, onToggle, onClear, icon, align = 'left', searchable,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const count = selected.length;
  const useSearch = searchable ?? options.length > 12;
  const shown = useSearch && query.trim()
    ? options.filter(o => o.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-label uppercase tracking-widest border transition-colors ${
          count > 0
            ? 'border-primary text-primary bg-primary/10 font-bold'
            : 'border-outline-variant text-on-surface hover:border-outline'
        }`}
      >
        {icon}
        {label}
        {count > 0 ? (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-on-primary">
            {count}
          </span>
        ) : null}
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={`Filter by ${label.toLowerCase()}`}
          className={`absolute z-30 mt-2 w-60 rounded-2xl border border-outline-variant/60 bg-surface p-2 shadow-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {useSearch ? (
            <div className="relative mb-2">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline" aria-hidden />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}`}
                aria-label={`Search ${label.toLowerCase()}`}
                className="w-full rounded-full bg-surface-container py-2 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          ) : null}

          <div className="max-h-64 overflow-y-auto pr-0.5">
            {shown.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-on-surface-variant">No matches</p>
            ) : shown.map(opt => {
              const active = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={active}
                  onClick={() => onToggle(opt)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-container"
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    active ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant'
                  }`}>
                    {active ? <Check size={12} strokeWidth={3} /> : null}
                  </span>
                  <span className="truncate capitalize">{opt}</span>
                </button>
              );
            })}
          </div>

          {count > 0 ? (
            <button
              type="button"
              onClick={onClear}
              className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg px-3 py-2 text-[11px] font-label uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              <X size={12} /> Clear {label.toLowerCase()}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
