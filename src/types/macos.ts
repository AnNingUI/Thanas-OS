export interface MenuItem {
  label?: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
}

export interface AppMenus {
  File?: MenuItem[];
  Edit?: MenuItem[];
  View?: MenuItem[];
  Window?: MenuItem[];
}

export interface AppConfig {
  id: string;
  name: string;
  icon: string;
  component: React.ComponentType;
  defaultSize?: { width: number; height: number };
  minSize?: { width: number; height: number };
  maxSize?: { width: number; height: number };
  /** Window cannot be resized (hides resize handles). */
  nonResizable?: boolean;
  /** Hide the green traffic light (no maximize). */
  noMaximize?: boolean;
  /**
   * 'default' (with title bar + name), 'transparent' (title bar visible w/ chromeColor, no text),
   * or 'integrated' (no title bar; traffic lights overlaid as floating buttons over the app content).
   */
  chromeMode?: 'default' | 'transparent' | 'integrated';
  /** Background color for the title bar when chromeMode === 'transparent'. */
  chromeColor?: string;
}

export interface WindowState {
  id: string;
  appId: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized: boolean;
  /** 正在播放还原动画：先以隐藏状态挂载，动画结束再显示。 */
  isRestoring?: boolean;
  isMaximized: boolean;
  zIndex: number;
  preMaximizePosition?: { x: number; y: number };
  preMaximizeSize?: { width: number; height: number };
}

export interface MacOSSettings {
  wallpaper: string;
  customWallpaper?: string; // data URL
  theme: 'light' | 'dark';
  dockAutoHide: boolean;
  dockMagnification: number;
  reducedMotion: boolean;
  brightness?: number;
  volume?: number;
  wifi?: boolean;
  bluetooth?: boolean;
  airdrop?: boolean;
  focus?: boolean;
  doNotDisturb?: boolean;
  lowPowerMode?: boolean;
  defaultBrowser?: 'safari' | 'google';
  googleInstalled?: boolean;
  /** 是否用 HTML-in-Canvas 把整个桌面作为一张 WebGPU 纹理绘制（实验性）。 */
  htmlInCanvas?: boolean;
  /** HTML-in-Canvas 模式下，最小化 Genie 动画时长（毫秒）。 */
  genieDuration?: number;
  /** HTML-in-Canvas 模式下，关窗烟雾动画时长（毫秒）。 */
  closeDuration?: number;
}

export interface DockItem {
  appId: string;
  badge?: number;
}

// Cross-app menu registry — apps publish their menus here, MenuBar reads them.
type MenuRegistry = Record<string, AppMenus>;
const registry: MenuRegistry = {};
const subs = new Set<() => void>();

export const registerAppMenus = (appId: string, menus: AppMenus | null) => {
  if (menus) registry[appId] = menus;
  else delete registry[appId];
  subs.forEach(fn => fn());
};
export const getAppMenus = (appId: string): AppMenus | undefined => registry[appId];
export const subscribeMenuRegistry = (fn: () => void) => {
  subs.add(fn);
  return () => { subs.delete(fn); };
};
