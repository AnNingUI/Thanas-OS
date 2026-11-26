import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, ArrowRight, RotateCw, Plus, Lock, X, Home,
  Loader2,
} from 'lucide-react';
import { PROJECTS } from '@/lib/projects';
import { consumePendingSafariUrl } from '@/lib/installedApps';
import { useBookmarks } from '@/lib/bookmarks';
import { registerAppMenus } from '@/types/macos';

interface Tab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  loading: boolean;
  history: string[];
  histIdx: number;
}

const START_PAGE = 'thanasos://favorites';
const SEARCH_PAGE = 'https://duckduckgo.com/?q=';

// Bookmarks now live in localStorage via useBookmarks()

const isUrlLike = (s: string) => /^[a-z]+:\/\//i.test(s) || /^[\w-]+(\.[\w-]+)+(\/.*)?$/i.test(s);

const faviconFor = (url: string): string | undefined => {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
  } catch { return undefined; }
};

export const SafariApp = () => {
  const { t } = useTranslation('appsCore');
  const favoritesLabel = t('apps.safari.favorites');

  const createTab = (url = START_PAGE, title = favoritesLabel): Tab => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    url, title, loading: false, history: [url], histIdx: 0,
  });

  const initial = useRef<Tab | null>(null);
  if (!initial.current) {
    const pending = consumePendingSafariUrl();
    initial.current = pending
      ? createTab(pending, (() => { try { return new URL(pending).hostname; } catch { return pending; } })())
      : createTab();
  }
  const { bookmarks } = useBookmarks();
  const [tabs, setTabs] = useState<Tab[]>([initial.current]);
  const [activeId, setActiveId] = useState(initial.current.id);
  const [addressBar, setAddressBar] = useState(initial.current.url);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showBookmarksBar, setShowBookmarksBar] = useState(true);
  const active = tabs.find(t => t.id === activeId)!;

  useEffect(() => { setAddressBar(active.url); }, [active.url, activeId]);

  const updateActive = useCallback((patch: Partial<Tab>) => {
    setTabs(prev => prev.map(t => t.id === activeId ? { ...t, ...patch } : t));
  }, [activeId]);

  const goTo = useCallback((url: string, title: string) => {
    setTabs(prev => prev.map(t => {
      if (t.id !== activeId) return t;
      const newHist = t.history.slice(0, t.histIdx + 1).concat(url);
      return { ...t, url, title, favicon: faviconFor(url), loading: url !== START_PAGE, history: newHist, histIdx: newHist.length - 1 };
    }));
  }, [activeId]);

  const navigate = (raw: string) => {
    const input = raw.trim();
    if (!input) return;
    if (input === 'favorites' || input === START_PAGE) { goTo(START_PAGE, favoritesLabel); return; }
    let url: string;
    if (isUrlLike(input)) url = /^https?:\/\//.test(input) ? input : 'https://' + input;
    else url = SEARCH_PAGE + encodeURIComponent(input);
    let title = url;
    try { title = new URL(url).hostname; } catch { /* noop */ }
    goTo(url, title);
  };

  const back = () => {
    if (active.histIdx > 0) {
      const idx = active.histIdx - 1;
      const url = active.history[idx];
      updateActive({ url, histIdx: idx, loading: url !== START_PAGE, title: (() => { try { return new URL(url).hostname; } catch { return url; } })() });
    }
  };
  const forward = () => {
    if (active.histIdx < active.history.length - 1) {
      const idx = active.histIdx + 1;
      const url = active.history[idx];
      updateActive({ url, histIdx: idx, loading: url !== START_PAGE, title: (() => { try { return new URL(url).hostname; } catch { return url; } })() });
    }
  };

  const addTab = () => { const tab = createTab(); setTabs(p => [...p, tab]); setActiveId(tab.id); };
  const closeTab = (id: string) => {
    setTabs(prev => {
      const next = prev.filter(tab => tab.id !== id);
      if (next.length === 0) { const tab = createTab(); setActiveId(tab.id); return [tab]; }
      if (id === activeId) setActiveId(next[next.length - 1].id);
      return next;
    });
  };

  const isFavorites = active.url === START_PAGE;

  // Iframe load → flip loading off
  const onIframeLoad = () => updateActive({ loading: false });

  useEffect(() => {
    registerAppMenus('safari', {
      File: [
        { label: t('apps.safari.newTab'), shortcut: '⌘T', action: addTab },
        { label: t('apps.safari.closeTab'), shortcut: '⌘W', action: () => closeTab(activeId) },
      ],
      Edit: [
        { label: t('apps.safari.cut'), shortcut: '⌘X', action: () => document.execCommand('cut') },
        { label: t('apps.safari.copy'), shortcut: '⌘C', action: () => document.execCommand('copy') },
        { label: t('apps.safari.paste'), shortcut: '⌘V', action: () => document.execCommand('paste') },
      ],
      View: [
        { label: t('apps.safari.reloadPage'), shortcut: '⌘R', action: () => navigate(active.url) },
        { label: showBookmarksBar ? t('apps.safari.hideBookmarksBar') : t('apps.safari.showBookmarksBar'), action: () => setShowBookmarksBar(s => !s) },
        { label: showSidebar ? t('apps.safari.hideSidebar') : t('apps.safari.showSidebar'), action: () => setShowSidebar(s => !s) },
      ],
      Window: [
        { label: t('apps.safari.home'), action: () => goTo(START_PAGE, favoritesLabel) },
      ],
    });
    return () => registerAppMenus('safari', null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, active.url, showBookmarksBar, showSidebar, t]);

  return (
    <div className="h-full w-full flex flex-col bg-background text-foreground">
      {/* Top toolbar — single row with traffic-light room, URL pill, share/menu */}
      <div className="flex items-center gap-1.5 pl-[80px] pr-3 py-2 bg-neutral-100/80 dark:bg-neutral-900/80 border-b border-black/10 dark:border-white/10 backdrop-blur-xl">
        <ToolbarBtn onClick={back} disabled={active.histIdx === 0}><ArrowLeft className="w-4 h-4" /></ToolbarBtn>
        <ToolbarBtn onClick={forward} disabled={active.histIdx >= active.history.length - 1}><ArrowRight className="w-4 h-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => navigate(active.url)}><RotateCw className="w-4 h-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => goTo(START_PAGE, favoritesLabel)}><Home className="w-4 h-4" /></ToolbarBtn>

        <form
          onSubmit={(e) => { e.preventDefault(); navigate(addressBar); }}
          className="flex-1 flex items-center gap-3 bg-white dark:bg-neutral-800 rounded-md px-3 py-1 border border-black/5 dark:border-white/10 max-w-[590px] mx-auto"
        >
          {active.loading ? <Loader2 className="w-3 h-3 text-blue-500 animate-spin" /> : <Lock className="w-3 h-3 text-neutral-500" />}
          <input
            value={addressBar}
            onChange={(e) => setAddressBar(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[13px] text-neutral-800 dark:text-neutral-100 min-w-0"
            placeholder={t('apps.safari.searchPlaceholder')}
          />
        </form>
      </div>

      {/* Body: tab sidebar + content */}
      <div className="flex-1 flex overflow-hidden">
        {showSidebar && (
          <aside className="w-56 shrink-0 bg-neutral-100/80 dark:bg-neutral-900/60 border-r border-black/10 dark:border-white/10 p-2 pt-[34px] overflow-auto flex flex-col gap-3">
            <div>
              <div className="flex items-center justify-between px-2 py-1">
                <div className="text-[12px] font-semibold uppercase tracking-wider text-neutral-500">{t('apps.safari.tabs')}</div>
                <button onClick={addTab} className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {tabs.map(tab => (
                <div
                  key={tab.id}
                  onClick={() => setActiveId(tab.id)}
                  className={`group flex items-center gap-2 px-2 py-1.5 rounded-md text-[14.5px] cursor-pointer ${
                    tab.id === activeId
                      ? 'bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-neutral-100'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-white/50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  {tab.loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-blue-500" />
                  ) : tab.favicon ? (
                    <img src={tab.favicon} alt="" className="w-4 h-4 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-sm bg-neutral-400/30 shrink-0" />
                  )}
                  <span className="truncate flex-1">{tab.url === START_PAGE ? favoritesLabel : tab.title}</span>
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                      className="opacity-0 group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 rounded p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div>
              <div className="text-[12px] font-semibold uppercase tracking-wider text-neutral-500 px-2 py-1">{t('apps.safari.bookmarks')}</div>
              {bookmarks.map(b => (
                <button
                  key={b.url}
                  onClick={() => navigate(b.url)}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-[14.5px] text-left"
                >
                  <img src={faviconFor(b.url)} alt="" className="w-4 h-4" />
                  <span className="truncate">{b.name}</span>
                </button>
              ))}
            </div>
          </aside>
        )}

        <div className="flex-1 overflow-hidden bg-white dark:bg-neutral-950">
          {isFavorites ? (
            <div className="h-full overflow-auto py-12 px-6 flex flex-col items-center">
              <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100 mb-8 text-center">{t('apps.safari.favorites')}</h1>
              <div className="grid grid-cols-4 gap-x-8 gap-y-6 mb-12 mx-auto place-items-center">
                {PROJECTS.map(p => (
                  <button key={p.id} onClick={() => goTo(p.liveUrl, p.name)} className="flex flex-col items-center gap-2 group w-24">
                    <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-black/5 dark:border-white/10 flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform">
                      <img src={p.favicon} alt={p.name} className="w-12 h-12 object-cover" />
                    </div>
                    <span className="text-xs text-neutral-700 dark:text-neutral-300 text-center truncate w-full">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <iframe
              key={active.url}
              src={active.url}
              title={active.title}
              className="w-full h-full border-0 bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              onLoad={onIframeLoad}
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}
        </div>
      </div>
    </div>
  );
};

const ToolbarBtn = ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md text-neutral-700 dark:text-neutral-300 disabled:opacity-30 disabled:hover:bg-transparent"
  >
    {children}
  </button>
);

