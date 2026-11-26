import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Clock, Disc, Radio, ListMusic, Heart, Play, Loader2, Mic2, BarChart3, Globe, Trophy, Film } from 'lucide-react';
import { useMacOS } from '@/contexts/MacOSContext';
import { playTrack, preloadTrackLibrary, useNowPlaying, useTrackLibrary } from '@/lib/nowPlaying';
import type { Track, Category } from '@/lib/nowPlaying';
import { NowPlayingPill } from '@/components/macos/NowPlayingPill';

type MusicTone = {
  page: string; side: string; main: string; text: string; sub: string;
  border: string; sideHover: string; selected: string; elevated: string;
};

type ViewKey =
  | 'home' | 'recent' | 'artists' | 'albums' | 'songs' | 'charts'
  | 'favorites'
  | Category;

interface NavEntry { key: ViewKey; label: string; icon: React.ReactNode; }

const CATEGORY_KEYS: Record<Category, string> = {
  'English Mix': 'englishMix',
  Anime: 'anime',
  Hindi: 'hindi',
  'Indie / Rock': 'indieRock',
  'Hip-Hop': 'hipHop',
  Electronic: 'electronic',
  'Sports / Anthems': 'sportsAnthems',
  'Movie Themes': 'movieThemes',
};

export const AppleMusicApp = () => {
  const { t } = useTranslation('appsMedia');
  const { settings } = useMacOS();
  const tracks = useTrackLibrary();
  const nowPlaying = useNowPlaying();
  const [query, setQuery] = useState('');
  const [view, setView] = useState<ViewKey>('home');
  const dark = settings.theme === 'dark';

  const tone: MusicTone = dark
    ? { page: '#1c1c1e', side: '#252528', main: '#1c1c1e', text: '#f5f5f7', sub: '#a8a8ad', border: 'rgba(255,255,255,0.08)', sideHover: 'rgba(255,255,255,0.06)', selected: 'rgba(255,255,255,0.10)', elevated: 'rgba(255,255,255,0.045)' }
    : { page: '#ffffff', side: '#f6f6f6', main: '#ffffff', text: '#1c1c1e', sub: '#737378', border: 'rgba(0,0,0,0.10)', sideHover: 'rgba(0,0,0,0.05)', selected: '#e6e6e6', elevated: 'rgba(0,0,0,0.035)' };

  const accent = '#fa2d48';
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return tracks;
    return tracks.filter((t) =>
      [t.title, t.artist, t.album, t.category].filter(Boolean).join(' ').toLowerCase().includes(q),
    );
  }, [q, tracks]);

  const byCategory = (cat: Category) => filtered.filter((t) => t.category === cat);

  // Featured picks — one from each available category, then fill
  const topPicks = useMemo(() => {
    const cats: Category[] = ['English Mix', 'Anime', 'Hindi', 'Indie / Rock', 'Hip-Hop', 'Electronic', 'Sports / Anthems', 'Movie Themes'];
    const out: Track[] = [];
    cats.forEach((c) => { const track = filtered.find((x) => x.category === c); if (track) out.push(track); });
    filtered.forEach((track) => { if (out.length < 14 && !out.includes(track)) out.push(track); });
    return out.slice(0, 14);
  }, [filtered]);

  const charts = useMemo(() => filtered.slice().sort((a, b) => a.title.localeCompare(b.title)).slice(0, 20), [filtered]);
  const recent = useMemo(() => filtered.slice().reverse().slice(0, 20), [filtered]);
  const artists = useMemo(() => {
    const map = new Map<string, Track[]>();
    filtered.forEach((track) => { const arr = map.get(track.artist) ?? []; arr.push(track); map.set(track.artist, arr); });
    return Array.from(map.entries()).map(([artist, list]) => ({ artist, list }));
  }, [filtered]);
  const albums = useMemo(() => {
    const map = new Map<string, Track[]>();
    filtered.forEach((track) => { const a = track.album || `${track.title} – ${t('apps.applemusic.single')}`; const arr = map.get(a) ?? []; arr.push(track); map.set(a, arr); });
    return Array.from(map.entries()).map(([album, list]) => ({ album, list }));
  }, [filtered, t]);

  const navTop: NavEntry[] = [
    { key: 'home', label: t('apps.applemusic.nav.home'), icon: <Heart className="w-3.5 h-3.5" style={{ color: accent }} /> },
    { key: 'charts', label: t('apps.applemusic.nav.charts'), icon: <BarChart3 className="w-3.5 h-3.5" style={{ color: accent }} /> },
  ];
  const navLibrary: NavEntry[] = [
    { key: 'songs', label: t('apps.applemusic.nav.allSongs'), icon: <ListMusic className="w-3.5 h-3.5" style={{ color: accent }} /> },
    { key: 'recent', label: t('apps.applemusic.nav.recentlyAdded'), icon: <Clock className="w-3.5 h-3.5" style={{ color: accent }} /> },
    { key: 'artists', label: t('apps.applemusic.nav.artists'), icon: <Mic2 className="w-3.5 h-3.5" style={{ color: accent }} /> },
    { key: 'albums', label: t('apps.applemusic.nav.albums'), icon: <Disc className="w-3.5 h-3.5" style={{ color: accent }} /> },
    { key: 'favorites', label: t('apps.applemusic.nav.favoriteSongs'), icon: <Heart className="w-3.5 h-3.5" style={{ color: accent }} /> },
  ];
  const navPlaylists: NavEntry[] = [
    { key: 'English Mix', label: t('apps.applemusic.playlists.englishHits'), icon: <Globe className="w-3.5 h-3.5" style={{ color: accent }} /> },
    { key: 'Anime', label: t('apps.applemusic.playlists.animeSongs'), icon: <ListMusic className="w-3.5 h-3.5" style={{ color: accent }} /> },
    { key: 'Hindi', label: t('apps.applemusic.playlists.hindiHits'), icon: <ListMusic className="w-3.5 h-3.5" style={{ color: accent }} /> },
    { key: 'Indie / Rock', label: t('apps.applemusic.playlists.indieRock'), icon: <ListMusic className="w-3.5 h-3.5" style={{ color: accent }} /> },
    { key: 'Hip-Hop', label: t('apps.applemusic.playlists.hipHop'), icon: <ListMusic className="w-3.5 h-3.5" style={{ color: accent }} /> },
    { key: 'Electronic', label: t('apps.applemusic.playlists.electronic'), icon: <ListMusic className="w-3.5 h-3.5" style={{ color: accent }} /> },
    { key: 'Sports / Anthems', label: t('apps.applemusic.playlists.sportsAnthems'), icon: <Trophy className="w-3.5 h-3.5" style={{ color: accent }} /> },
    { key: 'Movie Themes', label: t('apps.applemusic.playlists.movieThemes'), icon: <Film className="w-3.5 h-3.5" style={{ color: accent }} /> },
  ];

  const navInactive: NavEntry[] = [
    { key: 'home', label: t('apps.applemusic.nav.new'), icon: <Disc className="w-3.5 h-3.5" style={{ color: tone.sub }} /> },
    { key: 'home', label: t('apps.applemusic.nav.radio'), icon: <Radio className="w-3.5 h-3.5" style={{ color: tone.sub }} /> },
  ];

  return (
    <div
      className="h-full w-full flex flex-col select-none relative"
      style={{ background: tone.page, color: tone.text, fontFamily: '-apple-system, "SF Pro Text", Roboto, sans-serif' }}
      onMouseEnter={preloadTrackLibrary}
    >
      <div className="flex-1 grid min-h-0" style={{ gridTemplateColumns: '220px 1fr' }}>
        <aside className="overflow-y-auto no-scrollbar px-2 pb-3 border-r" style={{ background: tone.side, borderColor: tone.border }}>
          <div className="w-full pr-3 pt-3 pb-2 flex justify-end">
            <div className="font-semibold text-[15px]" style={{ color: accent }}>Music</div>
          </div>

          <div className="px-2 mb-3">
            <div className="flex items-center gap-1.5 h-8 rounded-md px-3 shadow-sm"
              style={{ width: '110%', marginLeft: '-5%',
                background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.55)',
                backdropFilter: 'blur(20px) saturate(180%)',
                border: `1px solid ${tone.border}` }}>
              <Search className="w-3.5 h-3.5" style={{ color: tone.sub }} />
              <input className="bg-transparent outline-none text-[12px] flex-1 min-w-0"
                placeholder={t('apps.applemusic.searchPlaceholder')}
                value={query} onChange={(e) => setQuery(e.target.value)} style={{ color: tone.text }} />
            </div>
          </div>

          <NavGroup>
            {navTop.map((n) => (
              <NavItem key={`t-${n.label}`} tone={tone} icon={n.icon} selected={view === n.key} onClick={() => setView(n.key)}>{n.label}</NavItem>
            ))}
            {navInactive.map((n) => (
              <NavItem key={`i-${n.label}`} tone={tone} icon={n.icon} disabled>{n.label}</NavItem>
            ))}
          </NavGroup>

          <NavTitle tone={tone}>{t('apps.applemusic.nav.library')}</NavTitle>
          <NavGroup>
            {navLibrary.map((n) => (
              <NavItem key={`l-${n.label}`} tone={tone} icon={n.icon} selected={view === n.key} onClick={() => setView(n.key)}>{n.label}</NavItem>
            ))}
          </NavGroup>

          <NavTitle tone={tone}>{t('apps.applemusic.nav.playlists')}</NavTitle>
          <NavGroup>
            {navPlaylists.map((n) => (
              <NavItem key={`p-${n.label}`} tone={tone} icon={n.icon} selected={view === n.key} onClick={() => setView(n.key)}>{n.label}</NavItem>
            ))}
          </NavGroup>
        </aside>

        <main className="overflow-y-auto no-scrollbar px-7 pt-9 pb-32" style={{ background: tone.main }}>
          {view === 'home' && (
            <>
              <HeaderRow title={t('apps.applemusic.nav.home')} sub={filtered.length === 0 ? t('apps.applemusic.loadingLibrary') : t('apps.applemusic.homeSub', { count: filtered.length, playlists: navPlaylists.length })} onPlay={() => topPicks[0] && playTrack(topPicks[0])} accent={accent} tone={tone} />
              {filtered.length === 0 && (
                <div className="flex items-center gap-2 text-[12px] mb-4" style={{ color: tone.sub }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('apps.applemusic.fetching')}
                </div>
              )}
              <SectionTitle tone={tone}>{t('apps.applemusic.featured')}</SectionTitle>
              <AlbumGrid tracks={topPicks} tone={tone} nowPlaying={nowPlaying} />

              <SectionTitle tone={tone}>{t('apps.applemusic.nav.charts')}</SectionTitle>
              <AlbumGrid tracks={charts.slice(0, 7)} tone={tone} nowPlaying={nowPlaying} />

              {(['English Mix', 'Anime', 'Hindi', 'Hip-Hop', 'Electronic', 'Indie / Rock', 'Sports / Anthems', 'Movie Themes'] as Category[]).map((cat) => {
                const list = byCategory(cat);
                if (list.length === 0) return null;
                return (
                  <div key={cat}>
                    <SectionTitle tone={tone}>{t(`apps.applemusic.categories.${CATEGORY_KEYS[cat]}`)}</SectionTitle>
                    <HorizontalTrackList tracks={list} tone={tone} nowPlaying={nowPlaying} />
                  </div>
                );
              })}
            </>
          )}

          {view === 'charts' && (<><HeaderRow title={t('apps.applemusic.nav.charts')} sub={t('apps.applemusic.chartsSub', { count: charts.length })} onPlay={() => charts[0] && playTrack(charts[0])} accent={accent} tone={tone} /><SongTable tracks={charts} tone={tone} nowPlaying={nowPlaying} /></>)}
          {view === 'recent' && (<><HeaderRow title={t('apps.applemusic.nav.recentlyAdded')} sub={t('apps.applemusic.recentSub', { count: recent.length })} onPlay={() => recent[0] && playTrack(recent[0])} accent={accent} tone={tone} /><SongTable tracks={recent} tone={tone} nowPlaying={nowPlaying} /></>)}
          {view === 'songs' && (<><HeaderRow title={t('apps.applemusic.nav.allSongs')} sub={t('apps.applemusic.songsSub', { count: filtered.length })} onPlay={() => filtered[0] && playTrack(filtered[0])} accent={accent} tone={tone} /><SongTable tracks={filtered} tone={tone} nowPlaying={nowPlaying} /></>)}
          {view === 'favorites' && (<><HeaderRow title={t('apps.applemusic.nav.favoriteSongs')} sub={t('apps.applemusic.favoritesSub')} onPlay={() => filtered[0] && playTrack(filtered[0])} accent={accent} tone={tone} /><SongTable tracks={filtered.slice(0, 12)} tone={tone} nowPlaying={nowPlaying} /></>)}

          {view === 'artists' && (
            <>
              <HeaderRow title={t('apps.applemusic.nav.artists')} sub={t('apps.applemusic.artistsSub', { count: artists.length })} accent={accent} tone={tone} />
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                {artists.map(({ artist, list }) => (
                  <button key={artist} onClick={() => list[0] && playTrack(list[0])} className="text-left">
                    <div className="aspect-square rounded-full overflow-hidden shadow-sm" style={{ border: `1px solid ${tone.border}` }}>
                      <img src={list[0].cover} alt={artist} className="w-full h-full object-cover" />
                    </div>
                    <div className="mt-2 text-[13px] font-semibold truncate text-center">{artist}</div>
                    <div className="text-[11px] text-center truncate" style={{ color: tone.sub }}>{t('apps.applemusic.songCount', { count: list.length })}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {view === 'albums' && (
            <>
              <HeaderRow title={t('apps.applemusic.nav.albums')} sub={t('apps.applemusic.albumsSub', { count: albums.length })} accent={accent} tone={tone} />
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                {albums.map(({ album, list }) => (
                  <button key={album} onClick={() => list[0] && playTrack(list[0])} className="text-left">
                    <div className="aspect-square rounded-md overflow-hidden shadow-sm" style={{ border: `1px solid ${tone.border}` }}>
                      <img src={list[0].cover} alt={album} className="w-full h-full object-cover" />
                    </div>
                    <div className="mt-1.5 text-[13px] font-semibold truncate">{album}</div>
                    <div className="text-[11px] truncate" style={{ color: tone.sub }}>{list[0].artist} · {t('apps.applemusic.songCount', { count: list.length })}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {(['English Mix', 'Anime', 'Hindi', 'Indie / Rock', 'Hip-Hop', 'Electronic', 'Sports / Anthems', 'Movie Themes'] as Category[]).includes(view as Category) && (
            <PlaylistView cat={view as Category} list={byCategory(view as Category)} tone={tone} nowPlaying={nowPlaying} accent={accent} />
          )}
        </main>
      </div>

      <NowPlayingPill dark={dark} />
    </div>
  );
};

// ============ Sub-components ============

const HeaderRow = ({ title, sub, onPlay, accent, tone }: { title: string; sub: string; onPlay?: () => void; accent: string; tone: MusicTone }) => {
  const { t } = useTranslation('appsMedia');
  return (
  <div className="flex items-end justify-between gap-4 mb-5">
    <div>
      <h1 className="text-[28px] font-bold leading-tight">{title}</h1>
      <div className="text-[12px] mt-1" style={{ color: tone.sub }}>{sub}</div>
    </div>
    {onPlay && (
      <button onClick={onPlay} className="h-9 px-4 rounded-full text-[13px] font-semibold flex items-center gap-2" style={{ background: accent, color: '#fff' }}>
        <Play className="w-3.5 h-3.5" fill="currentColor" /> {t('apps.applemusic.play')}
      </button>
    )}
  </div>
  );
};

const PlaylistView = ({ cat, list, tone, nowPlaying, accent }: { cat: Category; list: Track[]; tone: MusicTone; nowPlaying: Track; accent: string }) => {
  const { t } = useTranslation('appsMedia');
  const catName = t(`apps.applemusic.categories.${CATEGORY_KEYS[cat]}`);
  return (
  <>
    <div className="flex items-end gap-5 mb-6">
      <div className="relative">
        <div className="absolute -top-2 -left-2 w-[140px] h-[140px] rounded-lg opacity-60" style={{ background: tone.elevated, transform: 'rotate(-6deg)' }} />
        <div className="absolute -top-1 -left-1 w-[140px] h-[140px] rounded-lg opacity-80" style={{ background: tone.elevated, transform: 'rotate(-3deg)' }} />
        <img src={list[0]?.cover} alt={cat} className="relative w-[140px] h-[140px] rounded-lg object-cover shadow-md" style={{ border: `1px solid ${tone.border}` }} />
      </div>
      <div className="pb-2">
        <div className="text-[11px] uppercase tracking-wider" style={{ color: tone.sub }}>{t('apps.applemusic.yourPlaylist')}</div>
        <h1 className="text-[26px] font-bold leading-tight">{catName}</h1>
        <div className="text-[12px] mt-1" style={{ color: tone.sub }}>{t('apps.applemusic.playlistSub', { name: catName })}</div>
        <div className="text-[11px] mt-1" style={{ color: tone.sub }}>{t('apps.applemusic.playlistStats', { count: list.length, minutes: Math.round(list.length * 0.5) })}</div>
        <button onClick={() => list[0] && playTrack(list[0])} className="mt-3 h-8 px-4 rounded-full text-[12.5px] font-semibold flex items-center gap-2" style={{ background: accent, color: '#fff' }}>
          <Play className="w-3 h-3" fill="currentColor" /> {t('apps.applemusic.play')}
        </button>
      </div>
    </div>
    <SongTable tracks={list} tone={tone} nowPlaying={nowPlaying} />
  </>
  );
};

const SectionTitle = ({ children, tone }: { children: React.ReactNode; tone: MusicTone }) => (
  <div className="text-[14px] font-semibold mb-3 mt-2 flex items-center gap-2">
    {children}
    <span className="h-px flex-1" style={{ background: tone.border }} />
  </div>
);

const AlbumGrid = ({ tracks, tone, nowPlaying }: { tracks: Track[]; tone: MusicTone; nowPlaying: Track }) => {
  const { t: tr } = useTranslation('appsMedia');
  return (
  <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))' }}>
    {tracks.map((t) => (
      <button key={`${t.title}-${t.artist}`} onClick={() => playTrack(t)} className="text-left group min-w-0">
        <div className="aspect-square rounded-md overflow-hidden shadow-sm relative" style={{ border: `1px solid ${t.title === nowPlaying.title && t.artist === nowPlaying.artist ? '#fa2d48' : tone.border}` }}>
          <img src={t.cover} alt={t.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-200" />
          {!t.previewUrl && (
            <div className="absolute right-2 bottom-2 w-6 h-6 rounded-full bg-black/45 text-white flex items-center justify-center">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
          )}
        </div>
        <div className="mt-1.5 text-[10.5px] uppercase tracking-wider truncate" style={{ color: tone.sub }}>{t.category ? tr(`apps.applemusic.categories.${CATEGORY_KEYS[t.category]}`) : ''}</div>
        <div className="text-[13px] font-semibold leading-tight truncate" style={{ color: t.title === nowPlaying.title && t.artist === nowPlaying.artist ? '#fa2d48' : tone.text }}>{t.title}</div>
        <div className="text-[12px] truncate" style={{ color: tone.sub }}>{t.artist}</div>
      </button>
    ))}
  </div>
  );
};

const HorizontalTrackList = ({ tracks, tone, nowPlaying }: { tracks: Track[]; tone: MusicTone; nowPlaying: Track }) => (
  <div className="grid gap-3 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
    {tracks.slice(0, 10).map((t) => {
      const active = t.title === nowPlaying.title && t.artist === nowPlaying.artist;
      return (
        <button key={`${t.category}-${t.title}-${t.artist}`} onClick={() => playTrack(t)} className="h-[64px] rounded-lg p-2 flex items-center gap-3 text-left group"
          style={{ background: tone.elevated, border: `1px solid ${active ? '#fa2d48' : tone.border}` }}>
          <img src={t.cover} alt={t.title} className="w-12 h-12 rounded-md object-cover shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-semibold truncate" style={{ color: active ? '#fa2d48' : tone.text }}>{t.title}</div>
            <div className="text-[11.5px] truncate" style={{ color: tone.sub }}>{t.artist}</div>
          </div>
          <Play className="w-4 h-4 opacity-0 group-hover:opacity-100 transition" fill="currentColor" style={{ color: tone.sub }} />
        </button>
      );
    })}
  </div>
);

const SongTable = ({ tracks, tone, nowPlaying }: { tracks: Track[]; tone: MusicTone; nowPlaying: Track }) => {
  const { t: tr } = useTranslation('appsMedia');
  return (
  <div className="rounded-xl overflow-hidden border mb-6" style={{ borderColor: tone.border, background: tone.elevated }}>
    {tracks.map((t, i) => {
      const active = t.title === nowPlaying.title && t.artist === nowPlaying.artist;
      return (
        <button key={`row-${t.title}-${t.artist}-${i}`} onClick={() => playTrack(t)}
          className="w-full h-[54px] px-3 grid items-center text-left border-b last:border-b-0"
          style={{ gridTemplateColumns: '34px 44px 1.4fr 1fr 90px', borderColor: tone.border, color: tone.text }}>
          <span className="text-[12px]" style={{ color: active ? '#fa2d48' : tone.sub }}>{active ? '▶' : i + 1}</span>
          <img src={t.cover} alt={t.title} className="w-9 h-9 rounded object-cover" />
          <div className="min-w-0 px-3">
            <div className="text-[12.5px] font-semibold truncate" style={{ color: active ? '#fa2d48' : tone.text }}>{t.title}</div>
            <div className="text-[11px] truncate" style={{ color: tone.sub }}>{t.artist}</div>
          </div>
          <div className="text-[11.5px] truncate pr-4" style={{ color: tone.sub }}>{t.album || (t.category ? tr(`apps.applemusic.categories.${CATEGORY_KEYS[t.category]}`) : '')}</div>
          <div className="text-[11px] justify-self-end flex items-center gap-1" style={{ color: tone.sub }}>
            {t.previewUrl ? '0:30' : <><Loader2 className="w-3 h-3 animate-spin" /> {tr('apps.applemusic.loading')}</>}
          </div>
        </button>
      );
    })}
    {tracks.length === 0 && (<div className="h-28 flex items-center justify-center text-[13px]" style={{ color: tone.sub }}>{tr('apps.applemusic.noSongs')}</div>)}
  </div>
  );
};

const NavTitle = ({ children, tone }: { children: React.ReactNode; tone: MusicTone }) => (
  <h3 className="text-[10.5px] uppercase tracking-wider mt-4 mb-1.5 px-2 font-semibold" style={{ color: tone.sub }}>{children}</h3>
);

const NavGroup = ({ children }: { children: React.ReactNode }) => <ul className="space-y-px">{children}</ul>;

const NavItem = ({ children, icon, selected, tone, onClick, disabled }: { children: React.ReactNode; icon?: React.ReactNode; selected?: boolean; tone: MusicTone; onClick?: () => void; disabled?: boolean }) => (
  <li>
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className="w-full text-left flex items-center gap-2 px-2 py-[5px] rounded text-[12.5px] transition-colors"
      style={{
        background: selected ? tone.selected : 'transparent',
        color: disabled ? tone.sub : tone.text,
        fontWeight: selected ? 600 : 400,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => { if (!selected && !disabled) e.currentTarget.style.background = tone.sideHover; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
    >
      {icon}{children}
    </button>
  </li>
);
