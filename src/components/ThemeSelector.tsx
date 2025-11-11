import React, { useState } from 'react';
import { useTheme } from '../ThemeContext';
import { Palette, Check } from 'lucide-react';

const ThemeSelector: React.FC = () => {
  const { theme, defaultThemeName, setTheme, availableThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 flex items-center gap-2 hover:bg-[var(--color-hover)] transition rounded-lg"
        style={{ color: 'var(--color-text)' }}
        title={`Global UI Theme: ${theme.displayName} (controls sidebar and UI chrome)`}
      >
        <Palette className="w-5 h-5" />
        <div className="flex-1 text-left">
          <span className="text-sm font-medium">{theme.displayName}</span>
          <div className="text-xs" style={{ color: 'var(--color-textMuted)' }}>
            Global UI Theme
          </div>
        </div>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Theme menu */}
          <div
            className="absolute left-0 top-full mt-2 w-full rounded-lg shadow-lg z-50 overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bgSecondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            {availableThemes.map((t) => (
              <button
                key={t.name}
                onClick={() => {
                  setTheme(t.name);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--color-hover)] transition text-left"
                style={{ color: 'var(--color-text)' }}
              >
                <span className="font-medium">{t.displayName}</span>
                {defaultThemeName === t.name && (
                  <Check className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ThemeSelector;

