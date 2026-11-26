import { useTranslation } from 'react-i18next';
import { FrostedModal } from './FrostedModal';

const SHORTCUTS: { keys: string; key: string }[] = [
  { keys: '⌘ K', key: 'spotlight' },
  { keys: '⌘ N', key: 'newWindow' },
  { keys: '⌘ T', key: 'newTab' },
  { keys: '⌘ W', key: 'close' },
  { keys: '⌘ M', key: 'minimize' },
  { keys: '⌃ ⌘ F', key: 'fullScreen' },
  { keys: '⌘ Q', key: 'quit' },
  { keys: 'F11', key: 'showDesktop' },
  { keys: 'Esc', key: 'closeOverlay' },
  { keys: '⌘ ,', key: 'settings' },
];

export const ShortcutsModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { t } = useTranslation('os');

  return (
    <FrostedModal open={open} onClose={onClose} title={t('shortcuts.title')} width={520}>
      <div className="grid grid-cols-1 gap-2">
        {SHORTCUTS.map(s => (
          <div key={s.key} className="flex items-center justify-between rounded-xl px-3 py-2 bg-white/5">
            <span className="text-sm text-white/85">{t(`shortcuts.items.${s.key}`)}</span>
            <kbd className="font-mono text-xs px-2 py-1 rounded-md bg-white/10 border border-white/15">{s.keys}</kbd>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-white/50">{t('shortcuts.tip')}</p>
    </FrostedModal>
  );
};
