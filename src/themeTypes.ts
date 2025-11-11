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


