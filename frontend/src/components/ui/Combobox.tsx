// frontend/src/components/ui/Combobox.tsx
// Smart multi-select combobox with type-to-filter and custom entry support (P5)
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

export interface ComboboxProps {
  /** Label shown above the control */
  label?: string;
  /** Placeholder text when nothing is selected */
  placeholder?: string;
  /** Currently selected values */
  value: string[];
  /** Callback when selection changes */
  onChange: (selected: string[]) => void;
  /** Predefined option list */
  options: string[];
  /** Allow user to type and add custom values not in options list */
  allowCustom?: boolean;
  /** Maximum number of selections (0 = unlimited) */
  maxItems?: number;
  /** Extra class names for the wrapper */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export default function Combobox({
  label,
  placeholder = "Search or select…",
  value,
  onChange,
  options,
  allowCustom = false,
  maxItems = 0,
  className = "",
  disabled = false,
}: ComboboxProps) {
  const [query, setQuery]     = useState("");
  const [open, setOpen]       = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1); // TC-012: keyboard nav
  const containerRef          = useRef<HTMLDivElement>(null);
  const inputRef              = useRef<HTMLInputElement>(null);

  const filtered = options.filter(
    opt => opt.toLowerCase().includes(query.toLowerCase()) && !value.includes(opt)
  );

  const showAddOption = allowCustom && query.trim() && !options.includes(query.trim()) && !value.includes(query.trim());
  const menuItems     = showAddOption ? [...filtered, `Add "${query.trim()}"`] : filtered;
  const atMax         = maxItems > 0 && value.length >= maxItems;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addValue = (val: string) => {
    if (atMax) return;
    const cleaned = val.startsWith('Add "') ? val.slice(5, -1) : val;
    if (!value.includes(cleaned)) {
      onChange([...value, cleaned]);
    }
    setQuery("");
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const removeValue = (val: string) => {
    onChange(value.filter(v => v !== val));
  };

  // TC-012: keyboard navigation with ArrowUp/Down
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex(i => Math.min(i + 1, menuItems.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < menuItems.length) {
        addValue(menuItems[activeIndex]);
        return;
      }
      if (query.trim()) {
        if (filtered.length > 0) {
          addValue(filtered[0]);
        } else if (allowCustom) {
          addValue(query.trim());
        }
      }
      return;
    }
    if (e.key === "Backspace" && !query && value.length > 0) {
      removeValue(value[value.length - 1]);
    }
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      setActiveIndex(-1);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
          {label}
        </label>
      )}

      {/* Input box with chips */}
      <div
        onClick={() => { if (!disabled) { setOpen(true); inputRef.current?.focus(); } }}
        className={`min-h-[42px] flex flex-wrap gap-1.5 items-center px-3 py-1.5 border rounded-lg transition cursor-text
          ${disabled ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60" : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"}
          ${open ? "ring-2 ring-green-500 border-transparent" : ""}
        `}
      >
        {/* Selected chips */}
        {value.map(v => (
          <span
            key={v}
            className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 text-xs font-semibold rounded-full"
          >
            {v}
            {!disabled && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); removeValue(v); }}
                className="ml-0.5 hover:text-red-600 dark:hover:text-red-400 transition leading-none text-sm"
                aria-label={`Remove ${v}`}
              >
                ×
              </button>
            )}
          </span>
        ))}

        {/* Text input */}
        {!atMax && !disabled && (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); setActiveIndex(-1); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ""}
            aria-activedescendant={activeIndex >= 0 ? `combo-item-${activeIndex}` : undefined}
            className="flex-1 min-w-[120px] outline-none text-sm text-gray-800 dark:text-gray-100 bg-transparent placeholder-gray-400 dark:placeholder-gray-500 py-0.5"
          />
        )}

        {atMax && (
          <span className="flex-1 text-xs text-gray-400 dark:text-gray-500 py-1">
            Max {maxItems} selected
          </span>
        )}
      </div>

      {/* Dropdown */}
      {open && !disabled && menuItems.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl
            max-h-52 overflow-y-auto overscroll-contain touch-pan-y py-1"
        >
          {menuItems.map((opt, i) => (
            <li
              key={i}
              id={`combo-item-${i}`}
              role="option"
              aria-selected={value.includes(opt)}
              onClick={() => addValue(opt)}
              className={`px-4 py-2 text-sm cursor-pointer transition select-none
                ${opt.startsWith('Add "')
                  ? "text-green-700 dark:text-green-400 font-semibold"
                  : "text-gray-800 dark:text-gray-100"}
                ${i === activeIndex
                  ? "bg-green-100 dark:bg-green-900/50"
                  : "hover:bg-green-50 dark:hover:bg-green-900/30"}
              `}
            >
              {opt.startsWith('Add "') ? <span>＋ {opt}</span> : opt}
            </li>
          ))}
        </ul>
      )}

      {/* No results message */}
      {open && !disabled && menuItems.length === 0 && query.trim() && !allowCustom && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl px-4 py-3 text-sm text-gray-400 dark:text-gray-500">
          No results found.
        </div>
      )}
    </div>
  );
}
