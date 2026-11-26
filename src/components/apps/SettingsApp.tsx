import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Bluetooth, Battery, HardDrive, Lock as LockIcon, ChevronRight, Bell,
  Volume2, Moon, Clock, Globe, RefreshCw, Settings as SettingsIcon, Eye, Layout, Palette, Compass,
  Sun, Star, ArrowDownToLine, Languages, Database, Share2, Keyboard, Gauge, User, type LucideIcon,
} from 'lucide-react';
import { IoIosWifi } from 'react-icons/io';
import airdropImg from '@/assets/airdrop-icon-new.png';
import { useMacOS } from '@/contexts/MacOSContext';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, setLanguage } from '@/i18n';
import { useGoogleInstalled } from '@/lib/installedApps';
import { Switch } from '@/components/ui/switch';
import { AppleSlider } from '@/components/ui/AppleSlider';
import wallpaper1 from '@/assets/wallpaper-1.jpg';
import wallpaper2 from '@/assets/wallpaper-2.jpg';
import wallpaper3 from '@/assets/wallpaper-3.jpg';
import wallpaperTahoe from '@/assets/wallpaper-tahoe.jpg';
import wallpaperVineyard from '@/assets/wallpaper-vineyard.jpg';
import wallpaperCatalina from '@/assets/wallpaper-catalina.jpg';
import wallpaperValley from '@/assets/wallpaper-valley.jpg';
import wallpaperMountain from '@/assets/wallpaper-mountain.jpg';
import wallpaperBigsur from '@/assets/wallpaper-bigsur.jpg';
import wallpaperSnow from '@/assets/wallpaper-snow.jpg';
import wallpaperAurora from '@/assets/wallpaper-aurora.jpg';
import wallpaperCanyon from '@/assets/wallpaper-canyon.jpg';
import wallpaperViaduct from '@/assets/wallpaper-viaduct.jpg';
import wallpaperDolomites from '@/assets/wallpaper-dolomites.jpg';
import wallpaperVestrahorn from '@/assets/wallpaper-vestrahorn.jpg';
import wallpaperAnnapurna from '@/assets/wallpaper-annapurna.jpg';
import wallpaperAlps from '@/assets/wallpaper-alps.jpg';
import wallpaperCat from '@/assets/wallpaper-cat.jpg';
import safariIcon from '@/assets/safari-icon.png';
import googleIcon from '@/assets/google-icon-new.png';
import profilePhoto from '@/assets/profile-photo-new.jpg';

const wallpapers = [
  { id: 'wallpaper-mountain', src: wallpaperMountain, nameKey: 'wallpaperNames.highlands' },
  { id: 'wallpaper-tahoe', src: wallpaperTahoe, nameKey: 'wallpaperNames.lakeTahoe' },
  { id: 'wallpaper-viaduct', src: wallpaperViaduct, nameKey: 'wallpaperNames.glenfinnanViaduct' },
  { id: 'wallpaper-dolomites', src: wallpaperDolomites, nameKey: 'wallpaperNames.dolomites' },
  { id: 'wallpaper-vestrahorn', src: wallpaperVestrahorn, nameKey: 'wallpaperNames.vestrahorn' },
  { id: 'wallpaper-annapurna', src: wallpaperAnnapurna, nameKey: 'wallpaperNames.annapurnaNight' },
  { id: 'wallpaper-alps', src: wallpaperAlps, nameKey: 'wallpaperNames.swissAlps' },
  { id: 'wallpaper-cat', src: wallpaperCat, nameKey: 'wallpaperNames.curiousCat' },
  { id: 'wallpaper-bigsur', src: wallpaperBigsur, nameKey: 'wallpaperNames.bigSur' },
  { id: 'wallpaper-aurora', src: wallpaperAurora, nameKey: 'wallpaperNames.aurora' },
  { id: 'wallpaper-snow', src: wallpaperSnow, nameKey: 'wallpaperNames.winterTrail' },
  { id: 'wallpaper-canyon', src: wallpaperCanyon, nameKey: 'wallpaperNames.canyonStars' },
  { id: 'wallpaper-vineyard', src: wallpaperVineyard, nameKey: 'wallpaperNames.vineyardHills' },
  { id: 'wallpaper-catalina', src: wallpaperCatalina, nameKey: 'wallpaperNames.catalina' },
  { id: 'wallpaper-valley', src: wallpaperValley, nameKey: 'wallpaperNames.paintedValley' },
  { id: 'wallpaper-1', src: wallpaper1, nameKey: 'wallpaperNames.mountainLake' },
  { id: 'wallpaper-2', src: wallpaper2, nameKey: 'wallpaperNames.mistyValley' },
  { id: 'wallpaper-3', src: wallpaper3, nameKey: 'wallpaperNames.winterForest' },
];

type SectionId =
  | 'apple-account'
  | 'wifi' | 'bluetooth' | 'battery' | 'notifications' | 'sound' | 'focus'
  | 'general' | 'appearance' | 'desktop' | 'displays' | 'wallpaper' | 'browser' | 'privacy';

type GeneralSubsection = 'about' | 'software' | 'storage' | 'airdrop' | 'login' | 'language' | 'datetime' | 'sharing' | 'time-machine' | 'transfer' | 'startup';

const SIDEBAR_TOP = [
  { id: 'wifi', labelKey: 'sidebar.wifi', icon: IoIosWifi, tint: '#0a84ff' },
  { id: 'bluetooth', labelKey: 'sidebar.bluetooth', icon: Bluetooth, tint: '#0a84ff' },
  { id: 'battery', labelKey: 'sidebar.battery', icon: Battery, tint: '#34c759' },
] as const;
const SIDEBAR_MID = [
  { id: 'notifications', labelKey: 'sidebar.notifications', icon: Bell, tint: '#ff453a' },
  { id: 'sound', labelKey: 'sidebar.sound', icon: Volume2, tint: '#ff375f' },
  { id: 'focus', labelKey: 'sidebar.focus', icon: Moon, tint: '#a855f7' },
] as const;
const SIDEBAR_BOTTOM = [
  { id: 'general', labelKey: 'sidebar.general', icon: SettingsIcon, tint: '#8e8e93' },
  { id: 'appearance', labelKey: 'sidebar.appearance', icon: Palette, tint: '#1c1c1e' },
  { id: 'privacy', labelKey: 'sidebar.privacy', icon: LockIcon, tint: '#0a84ff' },
  { id: 'desktop', labelKey: 'sidebar.desktop', icon: Layout, tint: '#8e8e93' },
  { id: 'displays', labelKey: 'sidebar.displays', icon: Sun, tint: '#0a84ff' },
  { id: 'wallpaper', labelKey: 'sidebar.wallpaper', icon: ArrowDownToLine, tint: '#06b6d4' },
  { id: 'browser', labelKey: 'sidebar.browser', icon: Compass, tint: '#0a84ff' },
] as const;

const GENERAL_ITEMS: { id: GeneralSubsection; labelKey: string; icon: LucideIcon; tint: string }[] = [
  { id: 'about', labelKey: 'general.items.about', icon: SettingsIcon, tint: '#0a84ff' },
  { id: 'software', labelKey: 'general.items.software', icon: RefreshCw, tint: '#8e8e93' },
  { id: 'storage', labelKey: 'general.items.storage', icon: HardDrive, tint: '#8e8e93' },
  { id: 'airdrop', labelKey: 'general.items.airdrop', icon: Share2, tint: '#0a84ff' },
  { id: 'login', labelKey: 'general.items.login', icon: User, tint: '#34c759' },
  { id: 'language', labelKey: 'general.items.language', icon: Languages, tint: '#0a84ff' },
  { id: 'datetime', labelKey: 'general.items.datetime', icon: Clock, tint: '#0a84ff' },
  { id: 'sharing', labelKey: 'general.items.sharing', icon: Share2, tint: '#34c759' },
  { id: 'time-machine', labelKey: 'general.items.timeMachine', icon: Database, tint: '#34c759' },
  { id: 'transfer', labelKey: 'general.items.transfer', icon: ArrowDownToLine, tint: '#8e8e93' },
  { id: 'startup', labelKey: 'general.items.startup', icon: HardDrive, tint: '#8e8e93' },
];

export const SettingsApp = () => {
  const { t, i18n } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const { settings, updateSettings } = useMacOS();
  const googleInstalled = useGoogleInstalled();
  const [section, setSection] = useState<SectionId>('apple-account');
  const [generalSub, setGeneralSub] = useState<GeneralSubsection>('about');
  const [query, setQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [batteryCharging, setBatteryCharging] = useState(false);

  // Battery API
  useEffect(() => {
    type BatteryManager = EventTarget & { level: number; charging: boolean };
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManager> };
    if (!nav.getBattery) return;
    let battery: BatteryManager | undefined;
    const update = () => { if (battery) { setBatteryLevel(Math.round(battery.level * 100)); setBatteryCharging(!!battery.charging); } };
    nav.getBattery().then((b) => { battery = b; update(); b.addEventListener('levelchange', update); b.addEventListener('chargingchange', update); });
  }, []);

  // Spotlight handoff
  useEffect(() => {
    const fn = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.appId === 'settings' && d?.payload?.section) {
        setSection(d.payload.section as SectionId);
      }
    };
    window.addEventListener('spotlight:open', fn);
    return () => window.removeEventListener('spotlight:open', fn);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && /image\/(jpeg|jpg|png)/.test(file.type)) {
      const r = new FileReader();
      r.onload = ev => updateSettings({ wallpaper: 'custom', customWallpaper: ev.target?.result as string });
      r.readAsDataURL(file);
    }
  };

  const allNav = useMemo(() => [...SIDEBAR_TOP, ...SIDEBAR_MID, ...SIDEBAR_BOTTOM], []);
  const filteredSidebar = useMemo(
    () => allNav.filter(n => !query || t(n.labelKey).toLowerCase().includes(query.toLowerCase())),
    [query, allNav, t, i18n.language]
  );

  const activeNav = allNav.find(n => n.id === section);
  const sectionLabel = activeNav ? t(activeNav.labelKey) : t('sidebar.settings');

  return (
    <div className="h-full w-full flex bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 text-[14px]">
      {/* Sidebar — extends to top, traffic lights overlay above the search */}
      <aside className="w-[240px] shrink-0 bg-neutral-200/70 dark:bg-neutral-900/70 backdrop-blur-xl border-r border-black/5 dark:border-white/5 flex flex-col">
        {/* Search row leaves ~78px on the left for traffic lights */}
        <div className="pt-2.5 pb-2">
      <div className="px-3 h-[20px]" />
  <div className="mt-2 px-3">
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 ring-1 ring-black/5 dark:ring-white/10">
      <Search className="w-4 h-4 text-neutral-500 dark:text-neutral-400 shrink-0" />
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={t('search.placeholder')}
        className="flex-1 bg-transparent outline-none text-[13px] min-w-0"
      />
    </div>
  </div>
</div>
        {/* Profile / Apple Account row */}
        <button
          onClick={() => setSection('apple-account')}
          className={`mx-3 mb-2 flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors ${
            section === 'apple-account'
              ? 'bg-neutral-300/70 dark:bg-neutral-700/60'
              : 'hover:bg-neutral-300/60 dark:hover:bg-neutral-800/60'
          }`}
        >
          <img src={profilePhoto} alt="Thanas R" className="w-10 h-10 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10" />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold truncate">Thanas R</div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">{t('sidebar.appleAccount')}</div>
          </div>
        </button>

        <nav className="flex-1 overflow-auto thin-scrollbar px-2 pb-3 pt-[2px] space-y-0.5">
          {filteredSidebar.map((n, i) => {
            const prev = filteredSidebar[i - 1];
            const groupOf = (id: string) => {
              if (SIDEBAR_TOP.some(x => x.id === id)) return 'top';
              if (SIDEBAR_MID.some(x => x.id === id)) return 'mid';
              return 'bot';
            };
            const showSep = prev && groupOf(prev.id) !== groupOf(n.id);
            return (
              <div key={`nv-${n.id}`}>
                {showSep && <div className="h-2" />}
                <NavRow label={t(n.labelKey)} icon={n.icon} tint={n.tint} active={section === n.id} onClick={() => setSection(n.id as SectionId)} />
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Right pane */}
      {section === 'apple-account' ? (
        <div className="flex-1 overflow-auto bg-white dark:bg-neutral-900 thin-scrollbar">
          <AppleAccountPane />
        </div>
      ) : section === 'general' ? (
        <div className="flex-1 min-h-0 bg-white dark:bg-neutral-900">
          <GeneralPane sub={generalSub} setSub={setGeneralSub} batteryLevel={batteryLevel} batteryCharging={batteryCharging} />
        </div>
      ) : (
        <div className="flex-1 overflow-auto bg-white dark:bg-neutral-900 thin-scrollbar">
          <div className="px-7 pt-5 pb-10 max-w-3xl">
            <h1 className="text-[20px] font-semibold mb-5">{sectionLabel}</h1>

            {section === 'appearance' && (
              <Card>
                <Row label={t('rows.appearance.style.label')} desc={t('rows.appearance.style.desc')}>
                  <div className="flex gap-3">
                    {(['light', 'dark'] as const).map(opt => {
                      const active = settings.theme === opt;
                      return (
                        <button key={opt} onClick={() => updateSettings({ theme: opt })} className="flex flex-col items-center gap-1">
                          <div className={`w-16 h-10 rounded-md ring-2 ${active ? 'ring-blue-500' : 'ring-transparent'}`} style={{ background: opt === 'light' ? '#f5f5f7' : '#1c1c1e' }} />
                          <div className="text-[11px] capitalize">{opt === 'light' ? t('rows.appearance.theme.light') : t('rows.appearance.theme.dark')}</div>
                        </button>
                      );
                    })}
                  </div>
                </Row>
                <Row label={t('rows.appearance.reducedMotion.label')} desc={t('rows.appearance.reducedMotion.desc')}>
                  <Switch checked={!!settings.reducedMotion} onCheckedChange={v => updateSettings({ reducedMotion: v })} />
                </Row>
                <Row label={tCommon('language.label')} desc={LANGUAGE_LABELS[i18n.language as keyof typeof LANGUAGE_LABELS] ?? 'English'}>
                  <div className="flex gap-2">
                    {SUPPORTED_LANGUAGES.map(l => (
                      <button
                        key={l}
                        onClick={() => setLanguage(l)}
                        className={`px-3 py-1.5 rounded-md text-[12px] border ${i18n.language === l ? 'bg-blue-500 text-white border-blue-500' : 'bg-secondary text-secondary-foreground border-border hover:bg-muted'}`}
                      >
                        {LANGUAGE_LABELS[l]}
                      </button>
                    ))}
                  </div>
                </Row>
              </Card>
            )}

            {section === 'wifi' && (
              <Card>
                <Row label={t('rows.wifi.toggle.label')} desc={settings.wifi ? t('rows.wifi.toggle.descOn') : t('rows.wifi.toggle.descOff')}>
                  <Switch checked={!!settings.wifi} onCheckedChange={v => updateSettings({ wifi: v })} />
                </Row>
                {settings.wifi && (
                  <>
                    <Row label={t('rows.wifi.networkName.label')} desc={t('rows.wifi.networkName.desc')} />
                    <Row label={t('rows.wifi.askToJoin.label')} desc={t('rows.wifi.askToJoin.desc')}>
                      <Switch checked defaultChecked />
                    </Row>
                  </>
                )}
              </Card>
            )}

            {section === 'bluetooth' && (
              <Card>
                <Row label={t('rows.bluetooth.toggle.label')} desc={settings.bluetooth ? t('values.on') : t('values.off')}>
                  <Switch checked={!!settings.bluetooth} onCheckedChange={v => updateSettings({ bluetooth: v })} />
                </Row>
              </Card>
            )}

            {section === 'sound' && (
              <Card>
                <Row label={t('rows.sound.outputVolume.label')} desc={t('rows.sound.outputVolume.desc', { percent: settings.volume ?? 65 })}>
                  <div className="w-48"><AppleSlider value={settings.volume ?? 65} onChange={v => updateSettings({ volume: v })} /></div>
                </Row>
                <Row label={t('rows.sound.mute.label')} desc={t('rows.sound.mute.desc')}>
                  <Switch checked={(settings.volume ?? 65) === 0} onCheckedChange={v => updateSettings({ volume: v ? 0 : 65 })} />
                </Row>
              </Card>
            )}

            {section === 'focus' && (
              <Card>
                <Row label={t('rows.focus.doNotDisturb.label')} desc={t('rows.focus.doNotDisturb.desc')}>
                  <Switch checked={!!settings.focus} onCheckedChange={v => updateSettings({ focus: v })} />
                </Row>
              </Card>
            )}

            {section === 'displays' && (
              <Card>
                <Row label={t('rows.displays.brightness.label')} desc={t('rows.displays.brightness.desc', { percent: settings.brightness ?? 80 })}>
                  <div className="w-48"><AppleSlider value={settings.brightness ?? 80} min={20} onChange={v => updateSettings({ brightness: v })} /></div>
                </Row>
                <Row label={t('rows.displays.htmlInCanvas.label')} desc={t('rows.displays.htmlInCanvas.desc')}>
                  <Switch checked={!!settings.htmlInCanvas} onCheckedChange={v => updateSettings({ htmlInCanvas: v })} />
                </Row>
                <Row label={t('rows.displays.minimizeAnimation.label')} desc={t('rows.displays.minimizeAnimation.desc', { ms: settings.genieDuration ?? 1000 })}>
                  <div className="w-48"><AppleSlider value={settings.genieDuration ?? 1000} min={200} max={2500} step={50} onChange={v => updateSettings({ genieDuration: v })} /></div>
                </Row>
                <Row label={t('rows.displays.closeAnimation.label')} desc={t('rows.displays.closeAnimation.desc', { ms: settings.closeDuration ?? 1600 })}>
                  <div className="w-48"><AppleSlider value={settings.closeDuration ?? 1600} min={300} max={3000} step={50} onChange={v => updateSettings({ closeDuration: v })} /></div>
                </Row>
              </Card>
            )}

            {section === 'desktop' && (
              <Card>
                <Row label={t('rows.desktop.autoHideDock.label')} desc={t('rows.desktop.autoHideDock.desc')}>
                  <Switch checked={!!settings.dockAutoHide} onCheckedChange={v => updateSettings({ dockAutoHide: v })} />
                </Row>
                <Row label={t('rows.desktop.magnification.label')} desc={t('rows.desktop.magnification.desc', { percent: settings.dockMagnification })}>
                  <div className="w-48"><AppleSlider value={settings.dockMagnification} max={150} onChange={v => updateSettings({ dockMagnification: v })} /></div>
                </Row>
                <Row label={t('rows.desktop.reduceMotion.label')} desc={t('rows.desktop.reduceMotion.desc')}>
                  <Switch checked={!!settings.reducedMotion} onCheckedChange={v => updateSettings({ reducedMotion: v })} />
                </Row>
              </Card>
            )}

            {section === 'wallpaper' && (
              <Card>
                <div className="grid grid-cols-2 gap-3 p-3">
                  {wallpapers.map(w => (
                    <button
                      key={w.id}
                      onClick={() => updateSettings({ wallpaper: w.id })}
                      className={`relative rounded-xl overflow-hidden aspect-video transition-transform ${
                        settings.wallpaper === w.id ? 'ring-2 ring-blue-500' : 'hover:scale-[1.02] opacity-90'
                      }`}
                    >
                      <img src={w.src} alt={t(w.nameKey)} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-1.5 text-white text-[11px]">{t(w.nameKey)}</div>
                    </button>
                  ))}
                </div>
                <div className="border-t border-black/5 dark:border-white/10 mt-2" />
                <div className="px-3 pt-4 pb-5 mt-2 flex justify-start">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[12.5px] px-3.5 py-1.5 rounded-md bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 ring-1 ring-black/5 dark:ring-white/10 transition-colors"
                  >
                    {t('actions.chooseCustomImage')}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </div>
              </Card>
            )}

            {section === 'battery' && (
              <Card>
                <Row label={t('rows.battery.level.label')} desc={batteryLevel !== null ? (batteryCharging ? t('rows.battery.level.descCharging', { percent: batteryLevel }) : t('rows.battery.level.desc', { percent: batteryLevel })) : t('rows.battery.level.descUnavailable')} />
                <Row label={t('rows.battery.lowPowerMode.label')} desc={t('rows.battery.lowPowerMode.desc')}>
                  <Switch checked={!!settings.lowPowerMode} onCheckedChange={v => updateSettings({ lowPowerMode: v })} />
                </Row>
              </Card>
            )}

            {section === 'browser' && (
              <Card>
                <Row label={t('rows.browser.defaultBrowser.label')} desc={googleInstalled ? t('rows.browser.defaultBrowser.desc') : t('rows.browser.defaultBrowser.descNoGoogle')}>
                  <div className="flex gap-3">
                    <BrowserChoice img={safariIcon} label="Safari" active={settings.defaultBrowser !== 'google' || !googleInstalled} onClick={() => updateSettings({ defaultBrowser: 'safari' })} />
                    <BrowserChoice img={googleIcon} label="Google" disabled={!googleInstalled} active={!!googleInstalled && settings.defaultBrowser === 'google'} onClick={() => updateSettings({ defaultBrowser: 'google' })} />
                  </div>
                </Row>
              </Card>
            )}

            {section === 'privacy' && (
              <Card>
                <Row label={t('rows.privacy.locationServices.label')} desc={t('values.off')}><Switch checked={false} onCheckedChange={() => {}} /></Row>
                <Row label={t('rows.privacy.analytics.label')} desc={t('rows.privacy.analytics.desc')}><Switch checked={false} onCheckedChange={() => {}} /></Row>
              </Card>
            )}

            {section === 'notifications' && (
              <Card>
                <Row label={sectionLabel} desc={t('rows.notifications.reserved.desc')} />
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AppleAccountPane = () => {
  const { t } = useTranslation('settings');

  return (
    <div className="px-8 pt-5 pb-10 max-w-2xl mx-auto">
      <div className="flex flex-col items-center pt-4 pb-6 text-center">
        <img src={profilePhoto} alt="Thanas R" className="w-20 h-20 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10 mb-3" />
        <div className="text-[22px] font-semibold text-center">Thanas R</div>
        <div className="text-[13px] text-neutral-500 text-center">thanas5.rd@gmail.com</div>
        <div className="text-[12px] text-neutral-500 mt-0.5 text-center">{t('appleAccount.title')}</div>
      </div>
      <Card>
        <KV k={t('appleAccount.personalInformation')} v={t('values.manage')} />
        <KV k={t('appleAccount.signInSecurity')} v={t('values.manage')} />
        <KV k={t('appleAccount.paymentShipping')} v={t('values.none')} />
      </Card>
      <div className="text-[13px] font-semibold mt-6 mb-2">{t('appleAccount.icloud')}</div>
      <Card>
        <KV k={t('appleAccount.icloudPlus')} v={t('appleAccount.icloudPlan', { gb: 200 })} />
        <KV k={t('appleAccount.icloudDrive')} v={t('values.on')} />
        <KV k={t('appleAccount.photos')} v={t('values.on')} />
      </Card>
      <div className="text-[13px] font-semibold mt-6 mb-2">{t('appleAccount.devicesTitle')}</div>
      <Card>
        <KV k={t('appleAccount.devices.macbookAirM6.name')} v={t('appleAccount.devices.macbookAirM6.value')} />
        <KV k={t('appleAccount.devices.thanasIphone17.name')} v={t('appleAccount.devices.thanasIphone17.value')} />
        <KV k={t('appleAccount.devices.thanasIphone.name')} v={t('appleAccount.devices.thanasIphone.value')} />
        <KV k={t('appleAccount.devices.ipad.name')} v={t('appleAccount.devices.ipad.value')} />
        <KV k={t('appleAccount.devices.iphone5.name')} v={t('appleAccount.devices.iphone5.value')} />
        <KV k={t('appleAccount.devices.iphone8Plus.name')} v={t('appleAccount.devices.iphone8Plus.value')} />
        <KV k={t('appleAccount.devices.thanasLaptop.name')} v={t('appleAccount.devices.thanasLaptop.value')} />
        <KV k={t('appleAccount.devices.thanasIpad.name')} v={t('appleAccount.devices.thanasIpad.value')} />
        <KV k={t('appleAccount.devices.thanasIphone13ProMax.name')} v={t('appleAccount.devices.thanasIphone13ProMax.value')} />
        <KV k={t('appleAccount.devices.thanasIphoneXr.name')} v={t('appleAccount.devices.thanasIphoneXr.value')} />
      </Card>
    </div>
  );
};

const GeneralPane = ({ sub, setSub, batteryLevel, batteryCharging }: { sub: GeneralSubsection; setSub: (s: GeneralSubsection) => void; batteryLevel: number | null; batteryCharging: boolean }) => {
  const { t } = useTranslation('settings');
  const activeItem = GENERAL_ITEMS.find(g => g.id === sub);

  const renderAbout = () => (
    <div className="px-8 pt-5 pb-10 max-w-2xl">
      <div className="flex flex-col items-center pb-6">
        <img src={profilePhoto} alt="ThanasOS" className="w-32 h-32 object-contain rounded-2xl" />
        <div className="text-[28px] font-semibold mt-3">ThanasOS</div>
        <div className="text-[13px] text-neutral-500">2026</div>
      </div>
      <Card>
        <KV k={t('about.modelName')} v="MacBook Air" />
        <KV k={t('about.modelIdentifier')} v="MacBookAir2026,1" />
        <KV k={t('about.chip')} v="Apple M5" />
        <KV k={t('about.cores')} v={t('about.coresValue', { total: 10, performance: 4, efficiency: 6 })} />
        <KV k={t('about.memory')} v={t('about.memoryValue', { gb: 24 })} />
        <KV k={t('about.storage')} v={t('about.storageValue', { gb: 512 })} />
        <KV k={t('about.display')} v={t('about.displayValue', { size: 13.6, width: 2560, height: 1664 })} />
        <KV k={t('about.serialNumber')} v="THANAS-OS-2026" />
        <KV k={t('about.battery')} v={batteryLevel !== null ? (batteryCharging ? t('about.batteryChargingValue', { percent: batteryLevel }) : t('about.batteryValue', { percent: batteryLevel })) : t('values.unavailable')} />
      </Card>
      <div className="text-[13px] font-semibold mt-6 mb-2">{t('about.macos')}</div>
      <Card>
        <KV k="ThanasOS" v={t('about.version', { version: '1.0', build: '2026.05' })} />
      </Card>
    </div>
  );

  return (
    <div className="flex h-full">
      {/* macOS-style General sub-sidebar */}
      <div className="w-[220px] shrink-0 border-r border-black/5 dark:border-white/5 overflow-auto thin-scrollbar p-2 space-y-0.5 bg-neutral-100/40 dark:bg-neutral-900/40">
        <div className="px-2 py-1 text-[11px] uppercase tracking-wider text-neutral-500">{t('general.title')}</div>
        {GENERAL_ITEMS.map((g) => {
          const I = g.icon;
          const active = g.id === sub;
          return (
            <button
              key={g.id}
              onClick={() => setSub(g.id)}
              className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13.5px] text-left transition-colors ${
                active ? 'bg-neutral-300/70 dark:bg-neutral-700/60 text-neutral-900 dark:text-neutral-100'
                       : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/70 dark:hover:bg-neutral-800/60'
              }`}
            >
              <span className="w-6 h-6 rounded-[6px] flex items-center justify-center text-white" style={{ background: g.tint }}>
                <I className="w-4 h-4" />
              </span>
              <span className="truncate">{t(g.labelKey)}</span>
              <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-auto thin-scrollbar">
        {sub === 'about' ? renderAbout() : (
          <div className="px-8 pt-5 pb-10 max-w-2xl">
            <h1 className="text-[20px] font-semibold mb-5">{activeItem ? t(activeItem.labelKey) : ''}</h1>
            <Card><Row label={t('general.reserved.label')} desc={t('general.reserved.desc')} /></Card>
          </div>
        )}
      </div>
    </div>
  );
};

const KV = ({ k, v }: { k: string; v: string }) => (
  <div className="flex items-center justify-between px-4 py-3">
    <div className="text-[13px]">{k}</div>
    <div className="text-[13px] text-neutral-500">{v}</div>
  </div>
);

const NavRow = ({ label, icon: I, tint, active, onClick }: { label: string; icon: React.ComponentType<{ className?: string }>; tint: string; active: boolean; onClick: () => void }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[14px] transition-colors ${
    active ? 'bg-neutral-300/70 dark:bg-neutral-700/60 text-neutral-900 dark:text-neutral-100'
           : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/70 dark:hover:bg-neutral-800/60'
  }`}>
    <span className="w-6 h-6 rounded-[6px] flex items-center justify-center text-white" style={{ background: tint }}>
      {label === 'AirDrop & Handoff' ? <img src={airdropImg} alt="" className="w-4 h-4 object-contain" /> : <I className="w-4 h-4" />}
    </span>
    <span className="truncate">{label}</span>
  </button>
);

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/60 ring-1 ring-black/5 dark:ring-white/5 divide-y divide-black/5 dark:divide-white/5 mb-4">
    {children}
  </div>
);

const Row = ({ label, desc, children }: { label: string; desc?: string; children?: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4 px-4 py-3">
    <div className="min-w-0">
      <div className="font-medium">{label}</div>
      {desc && <div className="text-[11.5px] text-neutral-500 dark:text-neutral-400">{desc}</div>}
    </div>
    {children}
  </div>
);

const BrowserChoice = ({ img, label, active, disabled, onClick }: { img: string; label: string; active: boolean; disabled?: boolean; onClick: () => void }) => (
  <button onClick={disabled ? undefined : onClick} disabled={disabled} className={`flex flex-col items-center gap-1 p-2 rounded-lg ring-2 transition-colors ${active ? 'ring-blue-500' : 'ring-transparent'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>
    <img src={img} alt={label} className="w-10 h-10 object-contain" />
    <div className="text-[11px]">{label}</div>
  </button>
);
