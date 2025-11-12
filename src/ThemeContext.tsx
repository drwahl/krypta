import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useMatrix } from './MatrixContext';
import { Theme } from './themeTypes';
import { BUILT_IN_THEMES } from './themePresets';
import { ThemeDefinition, ThemeServerDefaultMaps } from './types';

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
  allThemes: Record<string, Theme>;
  serverRoomDefaults: ThemeServerDefaultMaps['rooms'];
  serverSpaceDefaults: ThemeServerDefaultMaps['spaces'];
  serverThemeDefinitions: Record<string, Record<string, ThemeDefinition>>;
  resolveTheme: (themeName: string) => Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { roomThemeDefaults, spaceThemeDefaults, themeDefinitions } = useMatrix();

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

  const combinedThemes = useMemo(() => {
    const merged: Record<string, Theme> = { ...BUILT_IN_THEMES };
    Object.values(themeDefinitions).forEach((definitions) => {
      Object.entries(definitions).forEach(([themeId, definition]) => {
        merged[themeId] = definition.theme;
      });
    });
    return merged;
  }, [themeDefinitions]);

  // Ensure default theme always points to a valid theme
  useEffect(() => {
    if (!combinedThemes[defaultThemeName]) {
      setDefaultThemeName('terminal');
    }
  }, [combinedThemes, defaultThemeName]);

  // Global theme always uses the default (for UI chrome)
  const globalTheme = combinedThemes[defaultThemeName] || combinedThemes.terminal || BUILT_IN_THEMES.terminal;
  
  // Room theme uses hierarchy for the active room: room > space > global
  const serverRoomDefault = currentRoomId ? roomThemeDefaults[currentRoomId] : undefined;
  const serverSpaceDefault = currentSpaceId ? spaceThemeDefaults[currentSpaceId] : undefined;

  const roomThemeName = 
    (currentRoomId && roomThemeOverrides[currentRoomId]) || 
    (currentSpaceId && spaceThemeOverrides[currentSpaceId]) || 
    (serverRoomDefault?.themeId && combinedThemes[serverRoomDefault.themeId] ? serverRoomDefault.themeId : null) ||
    (serverSpaceDefault?.themeId && combinedThemes[serverSpaceDefault.themeId] ? serverSpaceDefault.themeId : null) ||
    defaultThemeName;
  // For backwards compatibility, 'theme' returns the global theme
  const theme = globalTheme;
  const themeName = defaultThemeName;

  const setTheme = (newThemeName: string) => {
    if (combinedThemes[newThemeName]) {
      setDefaultThemeName(newThemeName);
      localStorage.setItem('nychatt_theme', newThemeName);
    }
  };

  const setRoomTheme = (roomId: string, themeName: string) => {
    if (combinedThemes[themeName]) {
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
    if (combinedThemes[themeName]) {
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
    const serverRoom = roomThemeDefaults[roomId];
    const serverSpace = spaceId ? spaceThemeDefaults[spaceId] : undefined;
    const effectiveThemeName =
      roomOverride ||
      spaceOverride ||
      (serverRoom?.themeId && combinedThemes[serverRoom.themeId] ? serverRoom.themeId : null) ||
      (serverSpace?.themeId && combinedThemes[serverSpace.themeId] ? serverSpace.themeId : null) ||
      defaultThemeName;
    return combinedThemes[effectiveThemeName] || combinedThemes.terminal || BUILT_IN_THEMES.terminal;
  };

  const availableThemes = useMemo(() => Object.values(combinedThemes), [combinedThemes]);

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

  const contextValue = useMemo(() => ({
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
    availableThemes,
    allThemes: combinedThemes,
    serverRoomDefaults: roomThemeDefaults,
    serverSpaceDefaults: spaceThemeDefaults,
    serverThemeDefinitions: themeDefinitions,
    resolveTheme: (name: string) => combinedThemes[name] || combinedThemes.terminal || BUILT_IN_THEMES.terminal,
  }), [
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
    setCurrentRoomWrapper,
    availableThemes,
    combinedThemes,
    roomThemeDefaults,
    spaceThemeDefaults,
    themeDefinitions,
  ]);

  return (
    <ThemeContext.Provider value={contextValue}>
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

