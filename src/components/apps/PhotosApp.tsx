import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Heart, Images, MapPin, Search, Users, X, ZoomIn } from 'lucide-react';

import w1 from '@/assets/wallpaper-1.jpg';
import w2 from '@/assets/wallpaper-alps.jpg';
import w3 from '@/assets/wallpaper-aurora.jpg';
import w4 from '@/assets/wallpaper-bigsur.jpg';
import w5 from '@/assets/wallpaper-canyon.jpg';
import w6 from '@/assets/wallpaper-catalina.jpg';
import w7 from '@/assets/wallpaper-dolomites.jpg';
import w8 from '@/assets/wallpaper-tahoe.jpg';
import w9 from '@/assets/wallpaper-vestrahorn.jpg';
import profile from '@/assets/profile-photo-new.jpg';
import banner from '@/assets/linkedin-banner.png';
import journey from '@/assets/virdis-project.png';

type AlbumId = 'travel' | 'wallpapers' | 'people';
type PersonId = 'thanas' | 'team';
type Tab = 'library' | 'favorites' | 'recents' | 'albums' | 'people' | 'places';
type Collection = { type: 'album'; id: AlbumId } | { type: 'person'; id: PersonId } | { type: 'place'; id: string };

interface Photo {
  id: string; src: string; title: string; place: string; year: number;
  album: AlbumId; people: PersonId[];
}

const PHOTOS: Photo[] = [
  { id: 'p1', src: w1, title: 'Tahoe', place: 'Lake Tahoe', year: 2025, album: 'travel', people: [] },
  { id: 'p2', src: w2, title: 'Alps', place: 'Swiss Alps', year: 2024, album: 'travel', people: [] },
  { id: 'p3', src: w3, title: 'Aurora', place: 'Tromsø', year: 2025, album: 'travel', people: [] },
  { id: 'p4', src: w4, title: 'Big Sur', place: 'California', year: 2024, album: 'wallpapers', people: [] },
  { id: 'p5', src: w5, title: 'Canyon', place: 'Arizona', year: 2023, album: 'wallpapers', people: [] },
  { id: 'p6', src: w6, title: 'Catalina', place: 'Avalon', year: 2024, album: 'wallpapers', people: [] },
  { id: 'p7', src: w7, title: 'Dolomites', place: 'Italy', year: 2025, album: 'travel', people: [] },
  { id: 'p8', src: w8, title: 'Tahoe', place: 'Lake Tahoe', year: 2025, album: 'wallpapers', people: [] },
  { id: 'p9', src: w9, title: 'Vestrahorn', place: 'Iceland', year: 2023, album: 'travel', people: [] },
  { id: 'p10', src: profile, title: 'Portrait', place: 'Bengaluru', year: 2026, album: 'people', people: ['thanas'] },
  { id: 'p11', src: banner, title: 'Studio', place: 'Bengaluru', year: 2026, album: 'people', people: ['thanas', 'team'] },
  { id: 'p12', src: journey, title: 'Journey', place: 'Bengaluru', year: 2026, album: 'people', people: ['team'] },
];

export const PhotosApp = () => {
  const { t } = useTranslation('appsNew');
  const [tab, setTab] = useState<Tab>('library');
  const [collection, setCollection] = useState<Collection | null>(null);
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(['p1', 'p3', 'p7']);
  const [selected, setSelected] = useState<string | null>(null);

  const albums: AlbumId[] = ['travel', 'wallpapers', 'people'];
  const people: PersonId[] = ['thanas', 'team'];
  const places = useMemo(() => {
    const map = new Map<string, Photo[]>();
    for (const p of PHOTOS) map.set(p.place, [...(map.get(p.place) ?? []), p]);
    return [...map.entries()].map(([place, photos]) => ({ place, photos }));
  }, []);

  const baseList = useMemo(() => {
    if (tab === 'favorites') return PHOTOS.filter(p => favorites.includes(p.id));
    if (tab === 'recents') return [...PHOTOS].sort((a, b) => b.year - a.year).slice(0, 8);
    if (collection?.type === 'album') return PHOTOS.filter(p => p.album === collection.id);
    if (collection?.type === 'person') return PHOTOS.filter(p => p.people.includes(collection.id));
    if (collection?.type === 'place') return PHOTOS.filter(p => p.place === collection.id);
    return PHOTOS;
  }, [tab, collection, favorites]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return baseList.filter(p => !q || (p.title + ' ' + p.place).toLowerCase().includes(q));
  }, [baseList, query]);

  const active = PHOTOS.find(p => p.id === selected);
  const toggleFav = (id: string) => setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const tabs: { id: Tab; icon: typeof Images }[] = [
    { id: 'library', icon: Images },
    { id: 'favorites', icon: Heart },
    { id: 'recents', icon: ZoomIn },
    { id: 'albums', icon: Images },
    { id: 'people', icon: Users },
    { id: 'places', icon: MapPin },
  ];

  const switchTab = (next: Tab) => { setTab(next); setCollection(null); setQuery(''); };
  const showGrid = tab === 'library' || tab === 'favorites' || tab === 'recents' || collection !== null;

  const headerTitle = collection
    ? collection.type === 'album'
      ? t(`photos.album.${collection.id}`)
      : collection.type === 'person'
        ? t(`photos.person.${collection.id}`)
        : collection.id
    : t(`photos.${tab}`);

  const sectionCount = showGrid ? list.length : tab === 'albums' ? albums.length : tab === 'people' ? people.length : places.length;
  const sectionCountKey = showGrid ? 'photos.count' : tab === 'albums' ? 'photos.albumCount' : tab === 'people' ? 'photos.personCount' : 'photos.placeCount';

  const grid = (
    <div className="grid grid-cols-3 xl:grid-cols-4 gap-2">
      {list.map(p => (
        <button key={p.id} onClick={() => setSelected(p.id)} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
          <img src={p.src} alt={p.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-left text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
            {p.title} · {p.place}
          </span>
          <span
            onClick={e => { e.stopPropagation(); toggleFav(p.id); }}
            className={`absolute top-2 right-2 p-1 rounded-full ${favorites.includes(p.id) ? 'bg-white/90 text-red-500' : 'bg-black/30 text-white opacity-0 group-hover:opacity-100'}`}
          >
            <Heart size={13} fill={favorites.includes(p.id) ? 'currentColor' : 'none'} />
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative h-full flex flex-col overflow-hidden bg-background text-foreground">
      <div className="h-14 shrink-0 flex items-center gap-3 pl-24 pr-4 border-b border-border">
        <span className="text-[14px] font-semibold">{t('photos.title')}</span>
        <div className="relative ml-auto w-64">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('photos.search')} className="w-full rounded-md bg-muted pl-8 pr-2 py-1.5 text-[11px] outline-none" />
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <aside className="w-52 shrink-0 border-r border-border p-2 space-y-0.5">
          {tabs.map(({ id, icon: Icon }) => (
            <button key={id} onClick={() => switchTab(id)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] ${tab === id ? 'bg-blue-500 text-white' : 'hover:bg-muted'}`}>
              <Icon size={14} /> {t(`photos.${id}`)}
            </button>
          ))}
          <div className="pt-4 px-2 text-[10px] uppercase tracking-wide text-muted-foreground">{t('photos.albums')}</div>
          {albums.map(a => (
            <button
              key={a}
              onClick={() => { setTab('albums'); setCollection({ type: 'album', id: a }); }}
              className={`w-full text-left px-2 py-1 text-[11px] rounded ${collection?.type === 'album' && collection.id === a ? 'bg-blue-500/10 text-blue-500' : 'text-muted-foreground hover:bg-muted'}`}
            >
              {t(`photos.album.${a}`)}
            </button>
          ))}
        </aside>

        <main className="flex-1 min-w-0 overflow-y-auto p-4">
          <div className="flex items-end justify-between mb-3">
            <div className="flex items-center gap-2">
              {collection && (
                <button onClick={() => setCollection(null)} className="p-1 rounded hover:bg-muted" title={t('photos.back')}>
                  <ArrowLeft size={15} />
                </button>
              )}
              <div>
                <h1 className="text-[18px] font-semibold">{headerTitle}</h1>
                <div className="text-[11px] text-muted-foreground">{t(sectionCountKey, { count: sectionCount })}</div>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">{t('photos.years', { year: 2026 })}</div>
          </div>

          {showGrid ? (list.length ? grid : <div className="py-16 text-center text-[12px] text-muted-foreground">{t('photos.empty')}</div>) : tab === 'albums' ? (
            <div className="grid grid-cols-3 gap-3">
              {albums.map(a => {
                const cover = PHOTOS.find(p => p.album === a)!;
                const count = PHOTOS.filter(p => p.album === a).length;
                return (
                  <button key={a} onClick={() => setCollection({ type: 'album', id: a })} className="group text-left">
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                      <img src={cover.src} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                        <div className="text-[13px] font-semibold text-white">{t(`photos.album.${a}`)}</div>
                        <div className="text-[10px] text-white/80">{t('photos.count', { count })}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : tab === 'people' ? (
            <div className="grid grid-cols-3 gap-3">
              {people.map(person => {
                const items = PHOTOS.filter(p => p.people.includes(person));
                return (
                  <button key={person} onClick={() => setCollection({ type: 'person', id: person })} className="group text-left">
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                      <img src={items[0]?.src} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                        <div className="text-[13px] font-semibold text-white">{t(`photos.person.${person}`)}</div>
                        <div className="text-[10px] text-white/80">{t('photos.count', { count: items.length })}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {places.map(({ place, photos }) => (
                <button key={place} onClick={() => setCollection({ type: 'place', id: place })} className="group text-left">
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                    <img src={photos[0].src} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                      <div className="text-[13px] font-semibold text-white">{place}</div>
                      <div className="text-[10px] text-white/80">{t('photos.count', { count: photos.length })}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>

      {active && (
        <div className="absolute inset-0 z-30 flex flex-col bg-black/90">
          <div className="h-12 shrink-0 flex items-center gap-2 pl-24 pr-4 text-white">
            <div className="flex-1 min-w-0 text-[12px] truncate">{active.title} · {active.place} · {active.year}</div>
            <button onClick={() => setSelected(null)} className="p-1.5 rounded-full hover:bg-white/10" title={t('photos.close')}>
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center p-4 overflow-hidden">
            <img src={active.src} alt={active.title} className="block max-h-full max-w-full w-auto h-auto object-contain rounded-lg shadow-2xl" />
          </div>
          <div className="h-12 shrink-0 flex items-center justify-center gap-2">
            <button onClick={() => toggleFav(active.id)} className={`px-3 py-1.5 rounded-full text-[12px] ${favorites.includes(active.id) ? 'bg-white text-black' : 'bg-white/15 text-white'}`}>
              <Heart size={13} className="inline mr-1" fill={favorites.includes(active.id) ? 'currentColor' : 'none'} /> {t('photos.favorite')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
