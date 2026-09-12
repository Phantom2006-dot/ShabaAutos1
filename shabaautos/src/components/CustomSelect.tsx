import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
  badge?: string;
  icon?: React.ReactNode;
  hint?: string;
}

interface CustomSelectProps {
  id?: string;
  label?: string;
  options: (string | CustomSelectOption)[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  variant?: 'light' | 'dark';
  icon?: React.ReactNode;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  className = '',
  variant = 'light',
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options to objects
  const normalizedOptions: CustomSelectOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const isDark = variant === 'dark';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className={`block text-[11px] font-bold uppercase mb-1 tracking-wider ${
            isDark ? 'text-gray-300' : 'text-gray-500'
          }`}
        >
          {label}
        </label>
      )}

      {/* Button toggle */}
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 border ${
          isDark
            ? 'bg-slate-900/90 text-white border-white/20 hover:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30'
            : 'bg-white text-gray-800 border-[#d4ded8] hover:border-[#158047] hover:bg-[#fbfdfc] focus:ring-2 focus:ring-[#12492f]/20 focus:border-[#12492f]'
        } ${isOpen ? (isDark ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-[#12492f] ring-2 ring-[#12492f]/20') : ''}`}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          {icon && <span className={isDark ? 'text-emerald-400' : 'text-[#158047]'}>{icon}</span>}
          {selectedOption ? (
            <span className="truncate">{selectedOption.label}</span>
          ) : (
            <span className={isDark ? 'text-gray-400' : 'text-gray-400'}>{placeholder}</span>
          )}
          {selectedOption?.badge && (
            <span className="text-[10px] bg-emerald-100 text-[#12492f] px-1.5 py-0.5 rounded font-bold">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#158047]' : isDark ? 'text-gray-400' : 'text-[#12492f]'
          }`}
        />
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-xl p-1.5 z-50 shadow-xl border ${
            isDark
              ? 'bg-slate-900 text-white border-slate-700/80 shadow-black/50'
              : 'bg-white text-gray-800 border-[#d4ded8] shadow-emerald-950/10'
          } animate-in fade-in zoom-in-95 duration-100`}
        >
          {normalizedOptions.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors duration-100 ${
                  isSelected
                    ? isDark
                      ? 'bg-emerald-950/80 text-emerald-300 font-bold'
                      : 'bg-[#e7f2ec] text-[#12492f] font-bold'
                    : isDark
                    ? 'hover:bg-slate-800 text-gray-200'
                    : 'hover:bg-[#f0f6f2] text-gray-700 hover:text-[#12492f]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {option.icon && <span className="shrink-0">{option.icon}</span>}
                  <div className="truncate">
                    <div className="truncate">{option.label}</div>
                    {option.hint && (
                      <div className={`text-[10px] font-normal truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {option.hint}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {option.badge && (
                    <span className="text-[9px] bg-emerald-100 text-[#12492f] px-1.5 py-0.5 rounded font-bold">
                      {option.badge}
                    </span>
                  )}
                  {isSelected && (
                    <Check size={13} className={isDark ? 'text-emerald-400' : 'text-[#158047]'} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
