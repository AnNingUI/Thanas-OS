import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { WindowState, MacOSSettings, DockItem, AppConfig } from '@/types/macos';
import { useGoogleInstalled } from '@/lib/installedApps';
import { setPlayerVolume } from '@/lib/nowPlaying';
import { emitEffect, type EffectKind } from '@/canvas-os/effect-bus';

interface MacOSContextType {
  windows: WindowState[];
  settings: MacOSSettings;
  dockItems: DockItem[];
  focusedWindowId: string | null;
  openApp: (appId: string) => void;
  closeWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  minimizeAllWindows: () => void;
  maximizeWindow: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  updateWindowPosition: (windowId: string, position: { x: number; y: number }) => void;
  updateWindowSize: (windowId: string, size: { width: number; height: number }) => void;
  updateSettings: (settings: Partial<MacOSSettings>) => void;
  openUrl: (url: string) => void;
  apps: AppConfig[];
}

const MacOSContext = createContext<MacOSContextType | undefined>(undefined);

const DEFAULT_SETTINGS: MacOSSettings = {
  wallpaper: 'wallpaper-mountain',
  theme: 'dark',
  dockAutoHide: false,
  dockMagnification: 75,
  reducedMotion: false,
  brightness: 80,
  volume: 65,
  wifi: true,
  bluetooth: true,
  airdrop: true,
  focus: false,
  genieDuration: 1000,
  closeDuration: 1600,
};

export const MacOSProvider = ({ children, apps }: { children: ReactNode; apps: AppConfig[] }) => {
  const desktopScale = 0.9;
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [focusedWindowId, setFocusedWindowId] = useState<string | null>(null);
  // 反向 Genie 由 Surface 播放；播放结束通过事件通知这里取消隐藏标记。
  useEffect(() => {
    const onDone = (e: Event) => {
      const id = (e as CustomEvent<{ windowId?: string }>).detail?.windowId;
      if (!id) return;
      setWindows(prev => prev.map(w => (w.id === id ? { ...w, isRestoring: false } : w)));
    };
    window.addEventListener('hic:restore-done', onDone);
    return () => window.removeEventListener('hic:restore-done', onDone);
  }, []);

  const [settings, setSettings] = useState<MacOSSettings>(() => {
    const saved = localStorage.getItem('macos-settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });
  const googleInstalled = useGoogleInstalled();
  const dockItems: DockItem[] = useMemo(() => {
    const out: DockItem[] = [];
    apps.forEach(a => {
      if (a.id === 'google' && !googleInstalled) return;
      out.push({ appId: a.id });
    });
    return out;
  }, [apps, googleInstalled]);

  useEffect(() => {
    localStorage.setItem('macos-settings', JSON.stringify(settings));
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    setPlayerVolume(settings.volume ?? 65);
  }, [settings]);

  const triggerWindowEffect = (kind: EffectKind, windowId: string, duration?: number) => {
    if (!settings.htmlInCanvas) return;
    const target = windows.find(w => w.id === windowId);
    if (!target) return;
    const top = windows.reduce((a, b) => (a.zIndex >= b.zIndex ? a : b), windows[0]);
    if (!top || top.id !== windowId) return;
    const el = document.querySelector<HTMLElement>(`[data-window-id="${windowId}"]`);
    if (!el) return;
    emitEffect({ kind, element: el, appId: target.appId, windowId, duration });
  };

  const openApp = (appId: string) => {
    if (appId !== 'launchpad') {
      const lp = windows.find(w => w.appId === 'launchpad' && !w.isMinimized);
      if (lp) {
        setWindows(prev => prev.filter(w => w.id !== lp.id));
      }
    }

    const existingWindow = windows.find(w => w.appId === appId && !w.isMinimized);
    if (existingWindow) {
      // Launchpad: clicking dock icon again closes it
      if (appId === 'launchpad') {
        closeWindow(existingWindow.id);
        return;
      }
      // If window is already open and focused, minimize it
      minimizeWindow(existingWindow.id);
      return;
    }

    const minimizedWindow = windows.find(w => w.appId === appId && w.isMinimized);
    if (minimizedWindow) {
      setWindows(prev =>
        prev.map(w => (w.id === minimizedWindow.id ? { ...w, isMinimized: false, isRestoring: true } : w))
      );
      focusWindow(minimizedWindow.id);
      // 兜底：动画事件丢失时也不能让窗口永远隐藏
      window.setTimeout(() => {
        setWindows(prev => prev.map(w => (w.id === minimizedWindow.id ? { ...w, isRestoring: false } : w)));
      }, (settings.genieDuration ?? 1000) + 500);
      if (settings.htmlInCanvas) {
        emitEffect({
          kind: 'genie-restore',
          appId,
          windowId: minimizedWindow.id,
          duration: settings.genieDuration,
        });
      }
      return;
    }

    const app = apps.find(a => a.id === appId);
    if (!app) return;

    const menuBarHeight = 28;
    const dockHeight = 100;
    const vw = window.innerWidth / desktopScale;
    const vh = window.innerHeight / desktopScale;
    const availableHeight = vh - menuBarHeight - dockHeight;
    const availableWidth = vw - 40;

    // Cap the default size so windows don't overflow the usable area
    const requestedW = app.defaultSize?.width || 800;
    const requestedH = app.defaultSize?.height || 600;
    const width = Math.min(requestedW, Math.max(420, availableWidth - 40));
    const height = Math.min(requestedH, Math.max(360, availableHeight - 20));

    // Center near (slightly above) the middle, with mild jitter so stacks fan out
    const jitterX = (Math.random() - 0.5) * 40;
    const jitterY = (Math.random() - 0.5) * 24;
    const x = Math.max(10, Math.min(vw - width - 10, (vw - width) / 2 + jitterX));
    const y = Math.max(menuBarHeight + 10, Math.min(vh - dockHeight - height - 10, menuBarHeight + (availableHeight - height) / 2 + jitterY));

    const newWindow: WindowState = {
      id: `${appId}-${Date.now()}`,
      appId,
      position: { x, y },
      size: { width, height },
      isMinimized: false,
      isMaximized: false,
      zIndex: Math.max(...windows.map(w => w.zIndex), 0) + 1,
    };

    setWindows(prev => [...prev, newWindow]);
    setFocusedWindowId(newWindow.id);
  };

  const closeWindow = (windowId: string) => {
    triggerWindowEffect('smoke', windowId, settings.closeDuration);
    setWindows(prev => prev.filter(w => w.id !== windowId));
    if (focusedWindowId === windowId) {
      const remaining = windows.filter(w => w.id !== windowId);
      setFocusedWindowId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
    }
  };

  const minimizeWindow = (windowId: string) => {
    triggerWindowEffect('genie', windowId, settings.genieDuration);
    setWindows(prev =>
      prev.map(w => (w.id === windowId ? { ...w, isMinimized: true } : w))
    );
  };

  const minimizeAllWindows = () => {
    setWindows(prev =>
      prev.map(w => ({ ...w, isMinimized: true }))
    );
    setFocusedWindowId(null);
  };

  const maximizeWindow = (windowId: string) => {
    const w = windows.find(x => x.id === windowId);
    if (!w) return;

    const scale = 0.9;
    const containerW = window.innerWidth / scale;
    const containerH = window.innerHeight / scale;
    const maxRect = {
      x: 0,
      y: 28,
      width: containerW,
      height: containerH - 28 - 86,
    };
    const restoreRect = {
      x: w.preMaximizePosition?.x ?? w.position.x,
      y: w.preMaximizePosition?.y ?? w.position.y,
      width: w.preMaximizeSize?.width ?? w.size.width,
      height: w.preMaximizeSize?.height ?? w.size.height,
    };
    const toMax = !w.isMaximized;
    const target = toMax ? maxRect : restoreRect;

    // 结束后提交 React 状态；DOM 内联样式已经先落到目标值，提交时不会闪。
    const commit = () => {
      setWindows(prev =>
        prev.map(item => {
          if (item.id !== windowId) return item;
          if (item.isMaximized) {
            return {
              ...item,
              isMaximized: false,
              position: item.preMaximizePosition || item.position,
              size: item.preMaximizeSize || item.size,
              preMaximizePosition: undefined,
              preMaximizeSize: undefined,
            };
          }
          return {
            ...item,
            isMaximized: true,
            preMaximizePosition: item.position,
            preMaximizeSize: item.size,
            position: { x: 0, y: 28 },
            size: { width: maxRect.width, height: maxRect.height },
          };
        })
      );
    };

    const el = document.querySelector<HTMLElement>(`[data-window-id="${windowId}"]`);
    if (!el || settings.reducedMotion) {
      commit();
      return;
    }
    // 防止动画中途重复点击
    if (el.dataset.maximizing === '1') return;
    el.dataset.maximizing = '1';

    const current = el.getBoundingClientRect();
    const from = {
      x: toMax ? current.left / scale : parseFloat(el.style.left) || w.position.x,
      y: toMax ? current.top / scale : parseFloat(el.style.top) || w.position.y,
      width: toMax ? current.width / scale : parseFloat(el.style.width) || w.size.width,
      height: toMax ? current.height / scale : parseFloat(el.style.height) || w.size.height,
    };

    // 先把当前几何写死成显式像素，避免 maximized 状态下的 right/bottom 干扰过渡
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.left = `${from.x}px`;
    el.style.top = `${from.y}px`;
    el.style.width = `${from.width}px`;
    el.style.height = `${from.height}px`;
    void el.offsetWidth; // 强制 reflow，transition 才有起点

    el.style.transition =
      'left 220ms cubic-bezier(0.2, 0.7, 0.2, 1), '
      + 'top 220ms cubic-bezier(0.2, 0.7, 0.2, 1), '
      + 'width 220ms cubic-bezier(0.2, 0.7, 0.2, 1), '
      + 'height 220ms cubic-bezier(0.2, 0.7, 0.2, 1)';
    el.style.left = `${target.x}px`;
    el.style.top = `${target.y}px`;
    el.style.width = `${target.width}px`;
    el.style.height = `${target.height}px`;

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      delete el.dataset.maximizing;
      el.style.transition = '';
      // 与 React 将要写的样式保持一致，避免提交时跳动
      if (toMax) {
        el.style.left = '0px';
        el.style.top = '28px';
        el.style.right = '0px';
        el.style.bottom = '86px';
        el.style.width = 'auto';
        el.style.height = 'auto';
      } else {
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        el.style.left = `${target.x}px`;
        el.style.top = `${target.y}px`;
        el.style.width = `${target.width}px`;
        el.style.height = `${target.height}px`;
      }
      commit();
    };
    el.addEventListener('transitionend', (ev) => {
      if ((ev as TransitionEvent).propertyName === 'width') finish();
    }, { once: true });
    window.setTimeout(finish, 260);
  };

  const focusWindow = (windowId: string) => {
    const maxZ = Math.max(...windows.map(w => w.zIndex), 0);
    setWindows(prev =>
      prev.map(w => (w.id === windowId ? { ...w, zIndex: maxZ + 1 } : w))
    );
    setFocusedWindowId(windowId);
  };

  const updateWindowPosition = (windowId: string, position: { x: number; y: number }) => {
    setWindows(prev =>
      prev.map(w => (w.id === windowId ? { ...w, position } : w))
    );
  };

  const updateWindowSize = (windowId: string, size: { width: number; height: number }) => {
    setWindows(prev =>
      prev.map(w => (w.id === windowId ? { ...w, size } : w))
    );
  };

  const updateSettings = (newSettings: Partial<MacOSSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const openUrl = (url: string) => {
    // route through default browser
    import('@/lib/installedApps').then(m => m.setPendingSafariUrl(url));
    const browser = settings.defaultBrowser === 'google' && settings.googleInstalled ? 'google' : 'safari';
    openApp(browser);
  };

  return (
    <MacOSContext.Provider
      value={{
        windows,
        settings,
        dockItems,
        focusedWindowId,
        openApp,
        closeWindow,
        minimizeWindow,
        minimizeAllWindows,
        maximizeWindow,
        focusWindow,
        updateWindowPosition,
        updateWindowSize,
        updateSettings,
        openUrl,
        apps,
      }}
    >
      {children}
    </MacOSContext.Provider>
  );
};

export const useMacOS = () => {
  const context = useContext(MacOSContext);
  if (!context) throw new Error('useMacOS must be used within MacOSProvider');
  return context;
};
