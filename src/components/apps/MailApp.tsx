import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Archive, AlertOctagon, FileText, Forward, Inbox, Mail, PenLine,
  Reply, Search, Send, Star, Trash2, X,
} from 'lucide-react';

type Folder = 'inbox' | 'vip' | 'sent' | 'drafts' | 'junk' | 'trash';

interface MailItem {
  id: string;
  from: string;
  subject: string;
  preview: string;
  body: string;
  time: string;
  unread?: boolean;
  flagged?: boolean;
  folder: Folder;
}

const MAILS: MailItem[] = [
  {
    id: 'welcome', from: 'ThanasOS', time: '09:41', unread: true, flagged: true, folder: 'inbox',
    subject: 'Welcome to your new Mac',
    preview: 'A few tips to help you get the most out of ThanasOS.',
    body: 'Welcome aboard.\n\nYour desktop is ready. Try Spotlight with Cmd + K, open the Dock, or drop a new wallpaper into Settings. Everything you can click is real.\n\n— The ThanasOS team',
  },
  {
    id: 'github', from: 'GitHub', time: '08:16', unread: true, folder: 'inbox',
    subject: '[thanas-os] New pull request #42',
    preview: 'feat: add genie restore animation',
    body: 'A new pull request is ready for review.\n\nfeat: add genie restore animation\n+1,204 −318 in 14 files\n\nReview it on GitHub when you have a minute.',
  },
  {
    id: 'calendar', from: 'Calendar', time: 'Yesterday', folder: 'inbox',
    subject: 'Design review moved to 10:00',
    preview: 'The weekly design review has a new time.',
    body: 'The weekly design review moved from 10:30 to 10:00.\n\nJoin from the Calendar app. The event has been updated automatically.',
  },
  {
    id: 'photos', from: 'Photos', time: 'Yesterday', folder: 'inbox',
    subject: 'Your Memories are ready',
    preview: 'Relive your trip to the mountains.',
    body: 'We put together a new Memory from your latest photos.\n\nOpen Photos → For You to take a look.',
  },
  {
    id: 'receipt', from: 'App Store', time: 'Monday', folder: 'inbox',
    subject: 'Your receipt from App Store',
    preview: 'Order #MK-2049 · ThanasOS Pro',
    body: 'Thanks for your purchase.\n\nOrder #MK-2049\nThanasOS Pro — $0.00\n\nThis is a demo receipt, nothing was charged.',
  },
  {
    id: 'sent-1', from: 'Me', time: 'Monday', folder: 'sent',
    subject: 'Re: Genie effect timings',
    preview: 'Looks good — ship it.',
    body: 'Looks good — ship it.\n\nI checked the 250 ms window and it feels right on a 120 Hz display.',
  },
];

export const MailApp = () => {
  const { t } = useTranslation('appsNew');
  const [folder, setFolder] = useState<Folder>('inbox');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>('welcome');
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  const folders: { id: Folder; icon: typeof Inbox; count?: number }[] = [
    { id: 'inbox', icon: Inbox, count: MAILS.filter(m => m.folder === 'inbox' && m.unread).length },
    { id: 'vip', icon: Star },
    { id: 'sent', icon: Send },
    { id: 'drafts', icon: FileText, count: 2 },
    { id: 'junk', icon: AlertOctagon },
    { id: 'trash', icon: Trash2 },
  ];

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MAILS.filter(m => m.folder === folder).filter(m =>
      !q || (m.subject + ' ' + m.from + ' ' + m.preview).toLowerCase().includes(q)
    );
  }, [folder, query]);

  const selected = MAILS.find(m => m.id === selectedId);

  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      <div className="h-14 shrink-0 flex items-center gap-3 pl-24 pr-4 border-b border-border">
        <button
          onClick={() => setComposeOpen(true)}
          className="flex items-center gap-2 rounded-md bg-blue-500 text-white px-3 py-1.5 text-[12px] hover:bg-blue-600"
        >
          <PenLine size={14} /> {t('mail.newMessage')}
        </button>
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('mail.searchPlaceholder')}
            className="w-full rounded-md bg-muted pl-9 pr-3 py-1.5 text-[12px] outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <aside className="w-52 shrink-0 border-r border-border p-2">
          <div className="px-2 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t('mail.mailboxes')}</div>
          {folders.map(f => {
            const Icon = f.icon;
            const active = folder === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFolder(f.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] ${active ? 'bg-blue-500 text-white' : 'hover:bg-muted'}`}
              >
                <Icon size={14} />
                <span className="flex-1 text-left">{t(`mail.${f.id}`)}</span>
                {f.count ? <span className={active ? 'text-white/80' : 'text-muted-foreground'}>{f.count}</span> : null}
              </button>
            );
          })}
        </aside>

        <section className="w-80 shrink-0 border-r border-border flex flex-col">
          <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-border">
            <span className="text-[13px] font-semibold capitalize">{t(`mail.${folder}`)}</span>
            <span className="text-[11px] text-muted-foreground">{t('mail.messageCount', { count: list.length })}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {list.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                className={`w-full text-left px-3 py-2.5 border-b border-border/60 ${selectedId === m.id ? 'bg-blue-500/10' : 'hover:bg-muted/60'}`}
              >
                <div className="flex items-center gap-2">
                  {m.unread && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                  <span className="flex-1 text-[12px] font-semibold truncate">{m.from}</span>
                  <span className="text-[10px] text-muted-foreground">{m.time}</span>
                </div>
                <div className="text-[12px] truncate mt-0.5">{m.subject}</div>
                <div className="text-[11px] text-muted-foreground truncate mt-0.5">{m.preview}</div>
              </button>
            ))}
            {!list.length && <div className="p-6 text-center text-[12px] text-muted-foreground">{t('mail.empty')}</div>}
          </div>
        </section>

        <main className="flex-1 min-w-0 flex flex-col">
          {selected ? (
            <>
              <div className="h-11 shrink-0 flex items-center gap-1 px-3 border-b border-border">
                <button className="p-1.5 rounded hover:bg-muted" title={t('mail.reply')}><Reply size={15} /></button>
                <button className="p-1.5 rounded hover:bg-muted" title={t('mail.forward')}><Forward size={15} /></button>
                <button className="p-1.5 rounded hover:bg-muted" title={t('mail.archive')}><Archive size={15} /></button>
                <button className="p-1.5 rounded hover:bg-muted" title={t('mail.delete')}><Trash2 size={15} /></button>
                <div className="flex-1" />
                <span className="text-[11px] text-muted-foreground">{selected.time}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <h1 className="text-[20px] font-semibold">{selected.subject}</h1>
                <div className="mt-3 flex items-center gap-2 text-[12px] text-muted-foreground">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-[11px]">
                    {selected.from.slice(0, 1)}
                  </div>
                  <span className="font-medium text-foreground">{selected.from}</span>
                  <span>· {selected.time}</span>
                </div>
                <div className="mt-6 whitespace-pre-wrap text-[13px] leading-6 text-foreground/90">{selected.body}</div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[12px] text-muted-foreground">
              <div className="text-center"><Mail size={28} className="mx-auto mb-2 opacity-50" />{t('mail.noSelection')}</div>
            </div>
          )}
        </main>
      </div>

      {composeOpen && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-8">
          <div className="w-[560px] max-w-full rounded-xl bg-background border border-border shadow-2xl overflow-hidden">
            <div className="h-11 flex items-center justify-between px-4 border-b border-border">
              <span className="text-[13px] font-semibold">{t('mail.newMessage')}</span>
              <button onClick={() => setComposeOpen(false)} className="p-1 rounded hover:bg-muted"><X size={15} /></button>
            </div>
            <div className="p-4 space-y-2 text-[12px]">
              <input value={composeTo} onChange={e => setComposeTo(e.target.value)} placeholder={t('mail.to')} className="w-full bg-transparent border-b border-border py-1.5 outline-none" />
              <input value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder={t('mail.subject')} className="w-full bg-transparent border-b border-border py-1.5 outline-none" />
              <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} placeholder={t('mail.body')} className="w-full h-44 bg-transparent resize-none outline-none py-2" />
            </div>
            <div className="h-12 flex items-center justify-end gap-2 px-4 border-t border-border">
              <button onClick={() => setComposeOpen(false)} className="px-3 py-1.5 rounded-md border border-border text-[12px]">{t('common:actions.cancel')}</button>
              <button
                onClick={() => { setComposeOpen(false); setComposeTo(''); setComposeSubject(''); setComposeBody(''); }}
                className="px-3 py-1.5 rounded-md bg-blue-500 text-white text-[12px] hover:bg-blue-600"
              >{t('mail.send')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
