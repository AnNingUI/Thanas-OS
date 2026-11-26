import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, CheckCircle2, Circle, Flag, ListTodo, Plus, Search, Star } from 'lucide-react';

type ListId = 'today' | 'scheduled' | 'all' | 'flagged' | 'work' | 'personal' | 'shopping';

interface Reminder { id: string; key: string; text?: string; list: ListId; due?: string; flagged?: boolean; done?: boolean }

const INITIAL: Reminder[] = [
  { id: 'r1', key: 'design', list: 'work', due: 'today', flagged: true },
  { id: 'r2', key: 'release', list: 'work', due: 'today' },
  { id: 'r3', key: 'groceries', list: 'shopping', due: 'today' },
  { id: 'r4', key: 'call', list: 'personal', due: 'tomorrow' },
  { id: 'r5', key: 'book', list: 'personal', due: 'weekend', done: true },
  { id: 'r6', key: 'invoice', list: 'work', due: 'tomorrow' },
];

export const RemindersApp = () => {
  const { t } = useTranslation('appsNew');
  const [listId, setListId] = useState<ListId>('today');
  const [items, setItems] = useState(INITIAL);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(i => {
      if (listId === 'today' && i.due !== 'today') return false;
      if (listId === 'scheduled' && !i.due) return false;
      if (listId === 'flagged' && !i.flagged) return false;
      if (['work', 'personal', 'shopping'].includes(listId) && i.list !== listId) return false;
      const label = i.text ?? t(`reminders.items.${i.key}`);
      if (q && !label.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, listId, query, t]);

  const lists: { id: ListId; icon: typeof ListTodo; color: string }[] = [
    { id: 'today', icon: CalendarDays, color: 'text-blue-500' },
    { id: 'scheduled', icon: CalendarDays, color: 'text-red-500' },
    { id: 'all', icon: ListTodo, color: 'text-gray-500' },
    { id: 'flagged', icon: Flag, color: 'text-orange-500' },
  ];

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setItems(prev => [{ id: `r${Date.now()}`, key: '', text, list: 'personal', due: 'today' }, ...prev]);
    setDraft('');
  };

  return (
    <div className="h-full flex bg-background text-foreground">
      <aside className="w-56 shrink-0 border-r border-border p-2 flex flex-col">
        <div className="h-12 flex items-center gap-2 pl-20 pr-1">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('reminders.search')} className="w-full rounded-md bg-muted pl-7 pr-2 py-1 text-[10px] outline-none" />
          </div>
        </div>
        <div className="space-y-0.5">
          {lists.map(({ id, icon: Icon, color }) => (
            <button key={id} onClick={() => setListId(id)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] ${listId === id ? 'bg-blue-500 text-white' : 'hover:bg-muted'}`}>
              <Icon size={14} className={listId === id ? '' : color} /> {t(`reminders.${id}`)}
            </button>
          ))}
        </div>
        <div className="mt-4 px-2 text-[10px] uppercase tracking-wide text-muted-foreground">{t('reminders.myLists')}</div>
        {(['work', 'personal', 'shopping'] as const).map(id => (
          <button key={id} onClick={() => setListId(id)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] ${listId === id ? 'bg-blue-500 text-white' : 'hover:bg-muted'}`}>
            <Circle size={9} className="fill-blue-500 text-blue-500" /> {t(`reminders.${id}`)}
          </button>
        ))}
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-border">
          <h1 className="text-[18px] font-semibold">{t(`reminders.${listId}`)}</h1>
          <div className="text-[11px] text-muted-foreground">{t('reminders.remaining', { count: filtered.filter(i => !i.done).length })}</div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1">
          {filtered.map(item => (
            <div key={item.id} className="flex items-start gap-3 py-1.5 group">
              <button
                onClick={() => setItems(prev => prev.map(i => i.id === item.id ? { ...i, done: !i.done } : i))}
                className="mt-0.5 shrink-0"
              >
                {item.done ? <CheckCircle2 size={17} className="text-blue-500" /> : <Circle size={17} className="text-muted-foreground" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-[13px] ${item.done ? 'line-through text-muted-foreground' : ''}`}>{item.text ?? t(`reminders.items.${item.key}`)}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{item.due ? t(`reminders.due.${item.due}`) : ''} · {t(`reminders.${item.list}`)}</div>
              </div>
              <button onClick={() => setItems(prev => prev.map(i => i.id === item.id ? { ...i, flagged: !i.flagged } : i))} className="opacity-0 group-hover:opacity-100">
                <Star size={13} className={item.flagged ? 'fill-orange-500 text-orange-500' : 'text-muted-foreground'} />
              </button>
            </div>
          ))}
          {!filtered.length && <div className="py-12 text-center text-[12px] text-muted-foreground">{t('reminders.empty')}</div>}
        </div>
        <div className="h-14 shrink-0 flex items-center gap-2 px-5 border-t border-border">
          <Plus size={15} className="text-muted-foreground" />
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add(); }}
            placeholder={t('reminders.placeholder')}
            className="flex-1 bg-transparent text-[12px] outline-none"
          />
          <button onClick={add} disabled={!draft.trim()} className="text-[11px] text-blue-500 disabled:opacity-40">{t('reminders.add')}</button>
        </div>
      </main>
    </div>
  );
};
