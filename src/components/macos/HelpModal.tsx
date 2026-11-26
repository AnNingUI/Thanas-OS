import { Mail, Coffee } from 'lucide-react';
import { FaGithub, FaLinkedin } from 'react-icons/fa6';
import { Trans, useTranslation } from 'react-i18next';
import { FrostedModal } from './FrostedModal';

export const HelpModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { t } = useTranslation('os');

  const rich = {
    app: <span className="font-semibold" />,
    kbd: <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs" />,
    b: <b />,
    i: <i />,
    code: <code className="px-1 bg-white/10 rounded" />,
  };

  return (
    <FrostedModal open={open} onClose={onClose} title={t('help.title')} width={520}>
      <p className="text-sm text-white/80 leading-relaxed">
        <Trans i18nKey="help.intro" ns="os" components={rich} />
      </p>

      <div className="mt-5">
        <p className="text-xs uppercase tracking-wider text-white/50 font-semibold mb-2">{t('help.getInTouch')}</p>
        <div className="grid grid-cols-1 gap-2">
          <a href="https://github.com/Thanas-R" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10">
            <FaGithub className="w-4 h-4" /><span className="text-sm">github.com/Thanas-R</span>
          </a>
          <a href="https://www.linkedin.com/in/thanasr/" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10">
            <FaLinkedin className="w-4 h-4" /><span className="text-sm">linkedin.com/in/thanasr</span>
          </a>
          <a href="mailto:thanas5.rd@gmail.com" className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10">
            <Mail className="w-4 h-4" /><span className="text-sm">thanas5.rd@gmail.com</span>
          </a>
        </div>
      </div>

      <div className="mt-5 p-3 rounded-xl bg-white/5 text-xs text-white/70">
        <div className="flex items-center gap-2 mb-1"><Coffee className="w-3.5 h-3.5" /><b>{t('help.easterEggs')}</b></div>
        <div className="space-y-1.5 mt-1.5">
          <div>· <Trans i18nKey="help.eggTrash" ns="os" components={rich} /></div>
          <div>· <Trans i18nKey="help.eggTerminal" ns="os" components={rich} /></div>
          <div>· <Trans i18nKey="help.eggCommands" ns="os" components={rich} /></div>
          <div>· <Trans i18nKey="help.eggFinder" ns="os" components={rich} /></div>
          <div>· <Trans i18nKey="help.eggCalendar" ns="os" components={rich} /></div>
          <div>· <Trans i18nKey="help.eggRickroll" ns="os" components={rich} /></div>
          <div>· <Trans i18nKey="help.eggSecrets" ns="os" components={rich} /></div>
          <div>· <Trans i18nKey="help.eggHack" ns="os" components={rich} values={{ cmd: 'hack <target>' }} /></div>
          <div>· <Trans i18nKey="help.eggCalculator" ns="os" components={rich} /></div>
        </div>
      </div>
    </FrostedModal>
  );
};
