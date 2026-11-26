import { useTranslation } from 'react-i18next';
import { MapPin, GraduationCap, Cake, ExternalLink } from 'lucide-react';
import profilePhoto from '@/assets/profile-photo-new.jpg';

// Group labels are translated at render time; the item names are proper nouns.
const TECH_STACK: { group: string; items: string[] }[] = [
  { group: 'languages', items: ['TypeScript', 'JavaScript', 'Python', 'C++', 'HTML', 'CSS'] },
  { group: 'frameworks', items: ['React', 'Next.js', 'Vite', 'Tailwind CSS', 'Node.js', 'Express'] },
  { group: 'aiMl', items: ['PyTorch', 'TensorFlow', 'scikit-learn', 'Pandas', 'NumPy'] },
  { group: 'tooling', items: ['Git', 'GitHub Actions', 'Docker', 'Vercel', 'Supabase', 'Figma'] },
];

export const AboutApp = () => {
  const { t } = useTranslation('appsCore');

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start gap-6">
        <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-lg">
          <img src={profilePhoto} alt="Thanas R" className="w-full h-full object-cover" loading="eager" decoding="async" />
        </div>
        <div className="flex-1">
          <h1 className="text-4xl font-bold mb-2">Thanas R</h1>
          <p className="text-muted-foreground text-lg mb-4">{t('apps.about.tagline')}</p>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Cake className="w-4 h-4" />
              <span>{t('apps.about.age', { age: 18 })}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <GraduationCap className="w-4 h-4" />
              <span>{t('apps.about.education')}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{t('apps.about.location')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <h2 className="text-2xl font-bold mb-3">{t('apps.about.aboutMe')}</h2>
        <p className="text-base leading-relaxed">{t('apps.about.bio1')}</p>
        <p className="text-base leading-relaxed mt-3">{t('apps.about.bio2')}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-secondary rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-primary">6+</div>
          <div className="text-sm text-muted-foreground mt-1">{t('apps.about.stats.yearsCoding')}</div>
        </div>
        <div className="bg-secondary rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-primary">11</div>
          <div className="text-sm text-muted-foreground mt-1">{t('apps.about.stats.projectsBuilt')}</div>
        </div>
        <div className="bg-secondary rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-primary">∞</div>
          <div className="text-sm text-muted-foreground mt-1">{t('apps.about.stats.learningGoals')}</div>
        </div>
      </div>

      <a
        href="https://thanas.vercel.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-4 bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors mt-4"
      >
        <ExternalLink className="w-5 h-5 text-primary" />
        <div>
          <span className="text-sm font-semibold text-primary">{t('apps.about.portfolioCta')}</span>
          <p className="text-xs text-muted-foreground">{t('apps.about.portfolioDesc')}</p>
        </div>
      </a>

      {/* Tech stack — moved here from the (now removed) Technologies app */}
      <div className="pt-2">
        <h2 className="text-2xl font-bold mb-4">{t('apps.about.techStack')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TECH_STACK.map((g) => (
            <div key={g.group} className="bg-secondary/60 rounded-xl p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
                {t(`apps.about.techGroups.${g.group}`)}
              </div>
              <div className="flex flex-wrap gap-2">
                {g.items.map((it) => (
                  <span
                    key={it}
                    className="px-2.5 py-1 rounded-md bg-background/80 text-[12.5px] border border-border"
                  >
                    {it}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
