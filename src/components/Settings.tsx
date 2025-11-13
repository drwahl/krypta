import React, { useState } from 'react';
import { X, Palette, Bell, SortAsc } from 'lucide-react';
import ThemeSelector from './ThemeSelector';
import NotificationSettings from './NotificationSettings';
import SortSelector, { SortMode } from './SortSelector';
import { useMultiRoom } from '../contexts/MultiRoomContext';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, sortMode, onSortChange }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'appearance'>('general');
  const { maxRooms, setMaxRooms } = useMultiRoom();

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
            className="flex-1 px-2 py-3 text-sm font-medium transition min-w-0"
            style={{
              color: activeTab === 'general' ? 'var(--color-primary)' : 'var(--color-textMuted)',
              borderBottom: activeTab === 'general' ? '2px solid var(--color-primary)' : 'none',
              backgroundColor: activeTab === 'general' ? 'var(--color-bg)' : 'transparent',
            }}
          >
            <div className="flex items-center justify-center gap-1.5">
              <SortAsc className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">General</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className="flex-1 px-2 py-3 text-sm font-medium transition min-w-0"
            style={{
              color: activeTab === 'notifications' ? 'var(--color-primary)' : 'var(--color-textMuted)',
              borderBottom: activeTab === 'notifications' ? '2px solid var(--color-primary)' : 'none',
              backgroundColor: activeTab === 'notifications' ? 'var(--color-bg)' : 'transparent',
            }}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Bell className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Notify</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className="flex-1 px-2 py-3 text-sm font-medium transition min-w-0"
            style={{
              color: activeTab === 'appearance' ? 'var(--color-primary)' : 'var(--color-textMuted)',
              borderBottom: activeTab === 'appearance' ? '2px solid var(--color-primary)' : 'none',
              backgroundColor: activeTab === 'appearance' ? 'var(--color-bg)' : 'transparent',
            }}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Palette className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Theme</span>
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

              {/* Max Open Rooms */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                  Maximum Open Rooms
                </label>
                <p className="text-xs mb-3" style={{ color: 'var(--color-textMuted)' }}>
                  When opening more rooms than this limit, the oldest room will be closed automatically.
                </p>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={maxRooms}
                    onChange={(e) => setMaxRooms(parseInt(e.target.value, 10))}
                    className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${((maxRooms - 1) / 9) * 100}%, var(--color-border) ${((maxRooms - 1) / 9) * 100}%, var(--color-border) 100%)`,
                    }}
                  />
                  <div
                    className="w-16 text-center py-2 px-3 rounded font-medium"
                    style={{
                      backgroundColor: 'var(--color-bgSecondary)',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {maxRooms}
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--color-textMuted)' }}>
                  <span>1 room</span>
                  <span>10 rooms</span>
                </div>
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
            Krypta - A modern Matrix client
          </p>
        </div>
      </div>
    </>
  );
};

export default Settings;

