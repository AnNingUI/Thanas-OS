import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Cpu, HardDrive, MemoryStick, Network, Search } from 'lucide-react';

type Tab = 'cpu' | 'memory' | 'energy' | 'disk' | 'network';

interface ProcessRow { name: string; pid: number; cpu: number; memory: number; threads: number; user: string }

const BASE: ProcessRow[] = [
  { name: 'WindowServer', pid: 214, cpu: 12.4, memory: 486, threads: 18, user: 'root' },
  { name: 'Safari', pid: 1301, cpu: 8.1, memory: 742, threads: 24, user: 'thanas' },
  { name: 'ThanasOS', pid: 981, cpu: 6.7, memory: 356, threads: 15, user: 'thanas' },
  { name: 'Music', pid: 1442, cpu: 3.2, memory: 214, threads: 9, user: 'thanas' },
  { name: 'Finder', pid: 620, cpu: 2.4, memory: 168, threads: 7, user: 'thanas' },
  { name: 'Terminal', pid: 1520, cpu: 1.8, memory: 96, threads: 5, user: 'thanas' },
  { name: 'Spotlight', pid: 410, cpu: 1.1, memory: 84, threads: 4, user: 'thanas' },
  { name: 'Dock', pid: 388, cpu: 0.8, memory: 122, threads: 6, user: 'thanas' },
  { name: 'cloudd', pid: 502, cpu: 0.4, memory: 64, threads: 3, user: 'thanas' },
  { name: 'kernel_task', pid: 0, cpu: 3.9, memory: 1024, threads: 32, user: 'root' },
];

export const ActivityMonitorApp = () => {
  const { t } = useTranslation('appsNew');
  const [tab, setTab] = useState<Tab>('cpu');
  const [query, setQuery] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(v => v + 1), 1500);
    return () => clearInterval(id);
  }, []);

  const rows = useMemo(() => BASE
    .map(p => ({ ...p, cpu: Math.max(0, +(p.cpu + Math.sin(tick + p.pid) * 1.6).toFixed(1)), memory: Math.max(32, Math.round(p.memory + Math.cos(tick + p.pid) * 8)) }))
    .filter(p => !query.trim() || p.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => b.cpu - a.cpu), [tick, query]);

  const tabs: { id: Tab; icon: typeof Cpu }[] = [
    { id: 'cpu', icon: Cpu }, { id: 'memory', icon: MemoryStick }, { id: 'energy', icon: Activity },
    { id: 'disk', icon: HardDrive }, { id: 'network', icon: Network },
  ];

  const stats = tab === 'cpu'
    ? [{ label: t('activity.system'), value: '4%' }, { label: t('activity.user'), value: '18%' }, { label: t('activity.idle'), value: '78%' }]
    : tab === 'memory'
      ? [{ label: t('activity.physical'), value: '8 GB' }, { label: t('activity.used'), value: '5.2 GB' }, { label: t('activity.cached'), value: '2.1 GB' }]
      : [{ label: t('activity.sent'), value: '1.4 MB' }, { label: t('activity.received'), value: '8.7 MB' }, { label: t('activity.threads'), value: '184' }];

  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      <div className="h-14 shrink-0 flex items-center gap-1 pl-24 pr-4 border-b border-border">
        {tabs.map(({ id, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={`px-3 py-1.5 rounded-md text-[12px] flex items-center gap-1.5 ${tab === id ? 'bg-blue-500 text-white' : 'hover:bg-muted'}`}>
            <Icon size={13} /> {t(`activity.${id}`)}
          </button>
        ))}
        <div className="relative ml-auto w-52">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('activity.search')} className="w-full rounded-md bg-muted pl-8 pr-2 py-1.5 text-[11px] outline-none" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 gap-3 p-4">
          {stats.map(s => (
            <div key={s.label} className="rounded-xl border border-border p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
              <div className="text-[24px] font-light mt-1">{s.value}</div>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-blue-500" style={{ width: s.value.replace('%', '') + '%' }} /></div>
            </div>
          ))}
        </div>

        <div className="px-4 pb-4">
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_70px_70px_70px_70px_70px] bg-muted/70 px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground">
              <span>{t('activity.process')}</span>
              <span className="text-right">{t('activity.pid')}</span>
              <span className="text-right">% CPU</span>
              <span className="text-right">{t('activity.memory')}</span>
              <span className="text-right">{t('activity.threads')}</span>
              <span className="text-right">{t('activity.user')}</span>
            </div>
            {rows.map(p => (
              <div key={p.pid} className="grid grid-cols-[1fr_70px_70px_70px_70px_70px] px-3 py-1.5 text-[11px] border-t border-border/60 hover:bg-muted/40">
                <span className="truncate">{p.name}</span>
                <span className="text-right text-muted-foreground">{p.pid}</span>
                <span className="text-right">{p.cpu.toFixed(1)}</span>
                <span className="text-right">{p.memory} MB</span>
                <span className="text-right text-muted-foreground">{p.threads}</span>
                <span className="text-right text-muted-foreground">{p.user}</span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground mt-2">{t('activity.hint')}</div>
        </div>
      </div>
    </div>
  );
};
