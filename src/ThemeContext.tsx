import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Theme {
  name: string;
  displayName: string;
  colors: {
    bg: string;
    bgSecondary: string;
    bgTertiary: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    primary: string;
    primaryHover: string;
    border: string;
    messageBubbleOwn: string;
    messageBubbleOther: string;
    hover: string;
    accent: string;
    success: string;
    error: string;
    warning: string;
  };
  fonts: {
    body: string;
    mono: string;
  };
  spacing: {
    roomItemPadding: string;
    roomItemGap: string;
    sidebarPadding: string;
    messagePadding: string;
    messageGap: string;
    inputPadding: string;
  };
  sizing: {
    textBase: string;
    textSm: string;
    textXs: string;
    textLg: string;
    textXl: string;
    roomItemHeight: string;
    avatarSize: string;
    avatarSizeSmall: string;
    borderRadius: string;
  };
  style: {
    showRoomPrefix: boolean;
    roomPrefix: string;
    messageStyle: 'bubbles' | 'terminal';
    compactMode: boolean;
  };
}

const themes: Record<string, Theme> = {
  dark: {
    name: 'dark',
    displayName: 'Dark Mode',
    colors: {
      bg: '#0f172a',
      bgSecondary: '#1e293b',
      bgTertiary: '#334155',
      text: '#f1f5f9',
      textSecondary: '#cbd5e1',
      textMuted: '#64748b',
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      border: '#475569',
      messageBubbleOwn: '#3b82f6',
      messageBubbleOther: '#1e293b',
      hover: '#334155',
      accent: '#8b5cf6',
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
    },
    fonts: {
      body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: '"Fira Code", "Cascadia Code", "Source Code Pro", Menlo, Monaco, Consolas, monospace',
    },
    spacing: {
      roomItemPadding: '0.75rem',
      roomItemGap: '0.75rem',
      sidebarPadding: '1rem',
      messagePadding: '1rem 1.5rem',
      messageGap: '1rem',
      inputPadding: '1rem',
    },
    sizing: {
      textBase: '0.875rem',
      textSm: '0.75rem',
      textXs: '0.625rem',
      textLg: '1rem',
      textXl: '1.25rem',
      roomItemHeight: 'auto',
      avatarSize: '2.5rem',
      avatarSizeSmall: '2rem',
      borderRadius: '0.5rem',
    },
    style: {
      showRoomPrefix: false,
      roomPrefix: '',
      messageStyle: 'bubbles',
      compactMode: false,
    },
  },
  terminal: {
    name: 'terminal',
    displayName: 'Unix Terminal',
    colors: {
      bg: '#000000',
      bgSecondary: '#0a0a0a',
      bgTertiary: '#1a1a1a',
      text: '#00ff00',
      textSecondary: '#00cc00',
      textMuted: '#008800',
      primary: '#00ff00',
      primaryHover: '#00cc00',
      border: '#003300',
      messageBubbleOwn: '#003300',
      messageBubbleOther: '#001a00',
      hover: '#001100',
      accent: '#00ffff',
      success: '#00ff00',
      error: '#ff0000',
      warning: '#ffff00',
    },
    fonts: {
      body: '"IBM Plex Mono", "Courier New", Courier, monospace',
      mono: '"IBM Plex Mono", "Courier New", Courier, monospace',
    },
    spacing: {
      roomItemPadding: '0.25rem 0.5rem',
      roomItemGap: '0.25rem',
      sidebarPadding: '0.5rem',
      messagePadding: '0.25rem 0.5rem',
      messageGap: '0.125rem',
      inputPadding: '0.5rem',
    },
    sizing: {
      textBase: '0.75rem',
      textSm: '0.6875rem',
      textXs: '0.625rem',
      textLg: '0.8125rem',
      textXl: '0.875rem',
      roomItemHeight: 'auto',
      avatarSize: '1.25rem',
      avatarSizeSmall: '1rem',
      borderRadius: '0',
    },
    style: {
      showRoomPrefix: true,
      roomPrefix: '$ cd ',
      messageStyle: 'terminal',
      compactMode: true,
    },
  },
};

interface ThemeContextType {
  theme: Theme; // Global theme (for UI chrome)
  themeName: string;
  defaultThemeName: string;
  currentRoomId: string | null;
  currentSpaceId: string | null;
  getRoomThemeObject: (roomId: string, spaceId: string | null) => Theme; // Get theme object for a specific room
  setTheme: (themeName: string) => void;
  setRoomTheme: (roomId: string, themeName: string) => void;
  clearRoomTheme: (roomId: string) => void;
  getRoomTheme: (roomId: string) => string | null;
  setSpaceTheme: (spaceId: string, themeName: string) => void;
  clearSpaceTheme: (spaceId: string) => void;
  getSpaceTheme: (spaceId: string) => string | null;
  setCurrentRoom: (roomId: string | null, spaceId?: string | null) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [defaultThemeName, setDefaultThemeName] = useState<string>(() => {
    return localStorage.getItem('nychatt_theme') || 'terminal';
  });

  const [roomThemeOverrides, setRoomThemeOverrides] = useState<Record<string, string>>(() => {
    const stored = localStorage.getItem('nychatt_room_themes');
    return stored ? JSON.parse(stored) : {};
  });

  const [spaceThemeOverrides, setSpaceThemeOverrides] = useState<Record<string, string>>(() => {
    const stored = localStorage.getItem('nychatt_space_themes');
    return stored ? JSON.parse(stored) : {};
  });

  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentSpaceId, setCurrentSpaceId] = useState<string | null>(null);

  // Global theme always uses the default (for UI chrome)
  const globalTheme = themes[defaultThemeName] || themes.terminal;
  
  // Room theme uses hierarchy for the active room: room > space > global
  const roomThemeName = 
    (currentRoomId && roomThemeOverrides[currentRoomId]) || 
    (currentSpaceId && spaceThemeOverrides[currentSpaceId]) || 
    defaultThemeName;
  const roomTheme = themes[roomThemeName] || themes.terminal;
  
  // For backwards compatibility, 'theme' returns the global theme
  const theme = globalTheme;
  const themeName = defaultThemeName;

  const setTheme = (newThemeName: string) => {
    if (themes[newThemeName]) {
      setDefaultThemeName(newThemeName);
      localStorage.setItem('nychatt_theme', newThemeName);
    }
  };

  const setRoomTheme = (roomId: string, themeName: string) => {
    if (themes[themeName]) {
      const newOverrides = { ...roomThemeOverrides, [roomId]: themeName };
      setRoomThemeOverrides(newOverrides);
      localStorage.setItem('nychatt_room_themes', JSON.stringify(newOverrides));
    }
  };

  const clearRoomTheme = (roomId: string) => {
    const newOverrides = { ...roomThemeOverrides };
    delete newOverrides[roomId];
    setRoomThemeOverrides(newOverrides);
    localStorage.setItem('nychatt_room_themes', JSON.stringify(newOverrides));
  };

  const getRoomTheme = (roomId: string): string | null => {
    return roomThemeOverrides[roomId] || null;
  };

  const setSpaceTheme = (spaceId: string, themeName: string) => {
    if (themes[themeName]) {
      const newOverrides = { ...spaceThemeOverrides, [spaceId]: themeName };
      setSpaceThemeOverrides(newOverrides);
      localStorage.setItem('nychatt_space_themes', JSON.stringify(newOverrides));
    }
  };

  const clearSpaceTheme = (spaceId: string) => {
    const newOverrides = { ...spaceThemeOverrides };
    delete newOverrides[spaceId];
    setSpaceThemeOverrides(newOverrides);
    localStorage.setItem('nychatt_space_themes', JSON.stringify(newOverrides));
  };

  const getSpaceTheme = (spaceId: string): string | null => {
    return spaceThemeOverrides[spaceId] || null;
  };

  const setCurrentRoomWrapper = (roomId: string | null, spaceId?: string | null) => {
    setCurrentRoomId(roomId);
    if (spaceId !== undefined) {
      setCurrentSpaceId(spaceId);
    }
  };

  // Helper to get the theme object for a specific room (respecting hierarchy)
  const getRoomThemeObject = (roomId: string, spaceId: string | null): Theme => {
    const roomOverride = roomThemeOverrides[roomId];
    const spaceOverride = spaceId ? spaceThemeOverrides[spaceId] : null;
    const effectiveThemeName = roomOverride || spaceOverride || defaultThemeName;
    return themes[effectiveThemeName] || themes.terminal;
  };

  const availableThemes = Object.values(themes);

  // Apply GLOBAL theme CSS variables to document root (for UI chrome)
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply colors as CSS variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    // Apply fonts
    root.style.setProperty('--font-body', theme.fonts.body);
    root.style.setProperty('--font-mono', theme.fonts.mono);
    
    // Apply spacing
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });
    
    // Apply sizing
    Object.entries(theme.sizing).forEach(([key, value]) => {
      root.style.setProperty(`--sizing-${key}`, value);
    });
    
    // Apply style flags as data attributes
    root.setAttribute('data-theme', theme.name);
    root.setAttribute('data-compact-mode', theme.style.compactMode ? 'true' : 'false');
    root.setAttribute('data-message-style', theme.style.messageStyle);
    
    // Apply body font
    document.body.style.fontFamily = theme.fonts.body;
    document.body.style.fontSize = theme.sizing.textBase;
    
    // Apply background color
    document.body.style.backgroundColor = theme.colors.bg;
    document.body.style.color = theme.colors.text;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      themeName, 
      defaultThemeName,
      currentRoomId,
      currentSpaceId,
      getRoomThemeObject,
      setTheme, 
      setRoomTheme,
      clearRoomTheme,
      getRoomTheme,
      setSpaceTheme,
      clearSpaceTheme,
      getSpaceTheme,
      setCurrentRoom: setCurrentRoomWrapper,
      availableThemes 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

