import React, { useState } from 'react';
import { ArrowUpDown, Clock, SortAsc, GripVertical } from 'lucide-react';

export type SortMode = 'activity' | 'alphabetical' | 'custom';

interface SortSelectorProps {
  currentSort: SortMode;
  onSortChange: (sort: SortMode) => void;
}

const SortSelector: React.FC<SortSelectorProps> = ({ currentSort, onSortChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const sortOptions: { mode: SortMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'activity', label: 'By Activity', icon: <Clock className="w-4 h-4" /> },
    { mode: 'alphabetical', label: 'Alphabetical', icon: <SortAsc className="w-4 h-4" /> },
    { mode: 'custom', label: 'Custom Order', icon: <GripVertical className="w-4 h-4" /> },
  ];

  const currentOption = sortOptions.find(opt => opt.mode === currentSort);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 transition"
        style={{
          padding: 'var(--spacing-roomItemPadding)',
          borderRadius: 'var(--sizing-borderRadius)',
          color: 'var(--color-text)',
          fontSize: 'var(--sizing-textSm)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title="Sort rooms and spaces"
      >
        <ArrowUpDown className="w-4 h-4" style={{ color: 'var(--color-textMuted)' }} />
        <span className="flex-1 text-left">Sort: {currentOption?.label}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Sort menu */}
          <div
            className="absolute left-0 bottom-full mb-2 w-full shadow-lg z-50 overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bgSecondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--sizing-borderRadius)',
            }}
          >
            {sortOptions.map((option) => (
              <button
                key={option.mode}
                onClick={() => {
                  onSortChange(option.mode);
                  setIsOpen(false);
                }}
                className="w-full text-left transition flex items-center gap-3"
                style={{
                  padding: 'var(--spacing-roomItemPadding)',
                  backgroundColor: currentSort === option.mode ? 'var(--color-hover)' : 'transparent',
                  color: 'var(--color-text)',
                  fontSize: 'var(--sizing-textSm)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-hover)';
                }}
                onMouseLeave={(e) => {
                  if (currentSort !== option.mode) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {option.icon}
                <span>{option.label}</span>
                {currentSort === option.mode && (
                  <span style={{ marginLeft: 'auto', color: 'var(--color-success)' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default SortSelector;

