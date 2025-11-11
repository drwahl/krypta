import React, { useState } from 'react';
import { X, Palette, Bell, SortAsc } from 'lucide-react';
import ThemeSelector from './ThemeSelector';
import NotificationSettings from './NotificationSettings';
import SortSelector, { SortMode } from './SortSelector';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, sortMode, onSortChange }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'appearance'>('general');

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Settings Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 w-96 z-50 shadow-2xl flex flex-col"
        style={{
          backgroundColor: 'var(--color-bg)',
          borderLeft: '1px solid var(--color-border)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition hover:bg-[var(--color-hover)]"
            style={{ color: 'var(--color-textMuted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex border-b flex-shrink-0"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-bgSecondary)',
          }}
        >
          <button
            onClick={() => setActiveTab('general')}
            className="flex-1 px-4 py-3 text-sm font-medium transition"
            style={{
              color: activeTab === 'general' ? 'var(--color-primary)' : 'var(--color-textMuted)',
              borderBottom: activeTab === 'general' ? '2px solid var(--color-primary)' : 'none',
              backgroundColor: activeTab === 'general' ? 'var(--color-bg)' : 'transparent',
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <SortAsc className="w-4 h-4" />
              General
            </div>
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className="flex-1 px-4 py-3 text-sm font-medium transition"
            style={{
              color: activeTab === 'notifications' ? 'var(--color-primary)' : 'var(--color-textMuted)',
              borderBottom: activeTab === 'notifications' ? '2px solid var(--color-primary)' : 'none',
              backgroundColor: activeTab === 'notifications' ? 'var(--color-bg)' : 'transparent',
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </div>
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className="flex-1 px-4 py-3 text-sm font-medium transition"
            style={{
              color: activeTab === 'appearance' ? 'var(--color-primary)' : 'var(--color-textMuted)',
              borderBottom: activeTab === 'appearance' ? '2px solid var(--color-primary)' : 'none',
              backgroundColor: activeTab === 'appearance' ? 'var(--color-bg)' : 'transparent',
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <Palette className="w-4 h-4" />
              Appearance
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'general' && (
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--color-text)' }}>
                General Settings
              </h3>
              
              {/* Sort Mode */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                  Room Sorting
                </label>
                <SortSelector currentSort={sortMode} onSortChange={onSortChange} />
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <NotificationSettings />
          )}

          {activeTab === 'appearance' && (
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--color-text)' }}>
                Appearance
              </h3>
              <ThemeSelector />
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t flex-shrink-0"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-bgSecondary)',
          }}
        >
          <p className="text-xs text-center" style={{ color: 'var(--color-textMuted)' }}>
            NyChatt - A modern Matrix client
          </p>
        </div>
      </div>
    </>
  );
};

export default Settings;

