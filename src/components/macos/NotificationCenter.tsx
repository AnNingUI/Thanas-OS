import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const NotificationCenter = ({ open, onClose }: Props) => {
  const { t } = useTranslation(['os', 'common']);
  const ref = useRef<HTMLDivElement>(null);
  const time = new Date();

  const notifs = [
    {
      app: t('notifications.items.mail.app'),
      title: t('notifications.items.mail.title'),
      body: t('notifications.items.mail.body'),
      when: t('notifications.minutesAgo', { count: 38 }),
    },
    {
      app: t('notifications.items.appleInsider.app'),
      title: t('notifications.items.appleInsider.title'),
      body: t('notifications.items.appleInsider.body'),
      when: t('notifications.minutesAgo', { count: 53 }),
    },
    {
      app: t('notifications.items.updates.app'),
      title: t('notifications.items.updates.title'),
      body: t('notifications.items.updates.body'),
      when: t('notifications.items.updates.when'),
    },
    {
      app: t('common:apps.calendar'),
      title: t('notifications.items.calendar.title'),
      body: t('notifications.items.calendar.body'),
      when: t('notifications.today'),
    },
  ];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          className="fixed top-9 right-3 z-[300] rounded-2xl p-4 text-white"
          style={{
            width: 340,
            maxHeight: '85vh',
            overflowY: 'auto',
            background: 'rgba(28,28,32,0.6)',
            backdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 60px -10px rgba(0,0,0,0.5)',
          }}
        >
          <div className="text-center mb-4">
            <div className="text-[12px] text-white/70">{time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            <div className="text-[44px] font-light leading-none mt-1">
              {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </div>
          </div>

          <div className="space-y-2">
            {notifs.map((n, i) => (
              <div key={i} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between text-[10.5px] uppercase tracking-wide text-white/60">
                  <span>{n.app}</span><span>{n.when}</span>
                </div>
                <div className="text-[13px] font-semibold mt-0.5">{n.title}</div>
                <div className="text-[12px] text-white/75 mt-0.5 leading-snug">{n.body}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
