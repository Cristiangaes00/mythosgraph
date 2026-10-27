import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Plus, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  count?: number;
}

interface CreatableSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  emptyHint?: string;
}

export default function CreatableSelect({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar o escribir...',
  disabled = false,
  emptyHint = 'Escribe para crear una nueva opción...',
}: CreatableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsFiltering(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!isFiltering || !filterText.trim()) return options;
    const q = filterText.trim().toLowerCase();
    return options.filter((o) => o.value.toLowerCase().includes(q));
  }, [options, filterText, isFiltering]);

  const exactMatchExists = useMemo(() => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return true;
    return options.some((o) => o.value.toLowerCase() === trimmed);
  }, [options, value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    onChange(nextVal);
    setFilterText(nextVal);
    setIsFiltering(true);
    if (!isOpen) setIsOpen(true);
  };

  const handleSelectOption = (optValue: string) => {
    onChange(optValue);
    setIsFiltering(false);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setFilterText('');
    setIsFiltering(false);
  };

  return (
    <div
      ref={containerRef}
      className={`creatable-select ${disabled ? 'disabled' : ''} ${isOpen ? 'open' : ''}`}
    >
      <div className="creatable-select-control">
        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={handleInputChange}
          onFocus={() => {
            setIsFiltering(false);
            setIsOpen(true);
          }}
          className="creatable-select-input"
        />
        <div className="creatable-select-EndIcons">
          {value && !disabled && (
            <button
              type="button"
              className="creatable-clear-btn"
              onClick={handleClear}
              title="Limpiar selección"
            >
              <X size={13} />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            className="creatable-chevron-btn"
            onClick={() => {
              if (disabled) return;
              setIsFiltering(false);
              setIsOpen((prev) => !prev);
            }}
            title="Ver opciones disponibles"
          >
            <ChevronDown
              size={15}
              style={{
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            />
          </button>
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="creatable-select-menu">
          {value.trim() && !exactMatchExists && (
            <div
              className="creatable-select-item create-new"
              onClick={() => handleSelectOption(value.trim())}
            >
              <span className="creatable-item-left">
                <Plus size={14} />
                <span>
                  Crear nueva: <strong>"{value.trim()}"</strong>
                </span>
              </span>
              <span className="new-badge">NUEVA</span>
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div className="creatable-select-empty">{emptyHint}</div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.value.toLowerCase() === value.trim().toLowerCase();
              return (
                <div
                  key={opt.value}
                  className={`creatable-select-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectOption(opt.value)}
                >
                  <span className="creatable-item-left">
                    <span>{opt.value}</span>
                  </span>
                  <span className="creatable-item-right">
                    {opt.count !== undefined && (
                      <span className="creatable-count">{opt.count}</span>
                    )}
                    {isSelected && <Check size={14} style={{ color: 'var(--primary)' }} />}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
