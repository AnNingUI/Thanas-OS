import { useMemo, useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, SquarePen, Send, Smile, Video } from 'lucide-react';

interface Message { id: number; text: string; mine: boolean; time: string }
interface Conversation { id: string; name: string; initial: string; color: string; preview: string; time: string; unread?: boolean; messages: Message[] }

const CONVERSATIONS: Conversation[] = [
  {
    id: 'aisha', name: 'Aisha', initial: 'A', color: 'from-pink-500 to-rose-500', time: '09:38', unread: true,
    preview: 'The new build looks great 🔥',
    messages: [
      { id: 1, text: 'Hey! Did you see the new window animations?', mine: false, time: '09:30' },
      { id: 2, text: 'Yes — the genie restore is so smooth now.', mine: true, time: '09:32' },
      { id: 3, text: 'The new build looks great 🔥', mine: false, time: '09:38' },
    ],
  },
  {
    id: 'design', name: 'Design Team', initial: 'D', color: 'from-blue-500 to-cyan-500', time: 'Yesterday',
    preview: 'Maya: Updated the icons',
    messages: [
      { id: 1, text: 'Maya: Updated the icons for Mail and Photos.', mine: false, time: '16:20' },
      { id: 2, text: 'Nice, I will take a look after lunch.', mine: true, time: '16:24' },
      { id: 3, text: 'Maya: They are in the shared folder.', mine: false, time: '16:31' },
    ],
  },
  {
    id: 'dad', name: 'Dad', initial: 'D', color: 'from-amber-500 to-orange-500', time: 'Yesterday',
    preview: 'Call me when you are free',
    messages: [
      { id: 1, text: 'Call me when you are free.', mine: false, time: '18:02' },
      { id: 2, text: 'Will do tonight!', mine: true, time: '18:15' },
    ],
  },
  {
    id: 'thanas', name: 'Thanas R', initial: 'T', color: 'from-emerald-500 to-teal-500', time: 'Monday',
    preview: 'You: shipped it',
    messages: [
      { id: 1, text: 'Ready for the release?', mine: false, time: '11:10' },
      { id: 2, text: 'shipped it', mine: true, time: '11:12' },
    ],
  },
];

export const MessagesApp = () => {
  const { t, i18n } = useTranslation('appsNew');
  const [conversations, setConversations] = useState(CONVERSATIONS);
  const [selectedId, setSelectedId] = useState('aisha');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const selected = conversations.find(c => c.id === selectedId) ?? conversations[0];
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter(c => !q || c.name.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q));
  }, [conversations, query]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [selected.messages.length, selectedId]);

  const time = new Date().toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setConversations(prev => prev.map(c => c.id === selected.id ? {
      ...c,
      preview: text,
      time,
      messages: [...c.messages, { id: Date.now(), text, mine: true, time }],
    } : c));
    setDraft('');
  };

  return (
    <div className="h-full flex bg-background text-foreground">
      <aside className="w-72 shrink-0 border-r border-border flex flex-col">
        <div className="h-14 shrink-0 flex items-center gap-2 pl-24 pr-3 border-b border-border">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('messages.search')} className="w-full rounded-md bg-muted pl-8 pr-2 py-1 text-[11px] outline-none" />
          </div>
          <button className="p-1.5 rounded hover:bg-muted" title={t('messages.newMessage')}><SquarePen size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {list.map(c => (
            <button key={c.id} onClick={() => setSelectedId(c.id)} className={`w-full text-left px-3 py-2.5 flex gap-2.5 border-b border-border/50 ${selectedId === c.id ? 'bg-blue-500/10' : 'hover:bg-muted/60'}`}>
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${c.color} text-white flex items-center justify-center text-[12px] font-semibold shrink-0`}>{c.initial}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold truncate">{c.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{c.time}</span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">{c.preview}</div>
              </div>
              {c.unread && <span className="w-2 h-2 rounded-full bg-blue-500 self-center" />}
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold">{selected.name}</span>
            <span className="text-[10px] text-muted-foreground">{t('messages.iMessage')}</span>
          </div>
          <button className="p-1.5 rounded hover:bg-muted" title={t('messages.video')}><Video size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {selected.messages.map(m => (
            <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-3 py-1.5 text-[12px] leading-5 ${m.mine ? 'bg-blue-500 text-white rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
                {m.text}
                <div className={`text-[9px] mt-0.5 ${m.mine ? 'text-white/70' : 'text-muted-foreground'}`}>{m.time}</div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="h-14 shrink-0 flex items-center gap-2 px-3 border-t border-border">
          <button className="p-1.5 rounded hover:bg-muted"><Smile size={16} /></button>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send(); }}
            placeholder={t('messages.placeholder')}
            className="flex-1 rounded-full bg-muted px-3 py-1.5 text-[12px] outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button onClick={send} disabled={!draft.trim()} className="p-1.5 rounded-full bg-blue-500 text-white disabled:opacity-40"><Send size={15} /></button>
        </div>
      </main>
    </div>
  );
};
