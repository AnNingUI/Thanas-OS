import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, MessageSquare, Repeat2, ShieldCheck, Award, GraduationCap } from 'lucide-react';
import { useMacOS } from '@/contexts/MacOSContext';
import linkedinPhoto from '@/assets/linkedin-profile-new.jpg';
import linkedinBanner from '@/assets/linkedin-banner.png';
import pesLogo from '@/assets/pes-logo.png';
import allenLogo from '@/assets/allen-logo.png';
import sriVaniLogo from '@/assets/sri-vani-logo.png';
import virdisProject from '@/assets/virdis-project.png';
import innovationLabLogo from '@/assets/innovation-lab-logo.png';

// Reliable cross-window opener — using onClick + window.open ensures the
// link always opens in a new tab even when the parent macOS Window swallows
// default <a> navigation behaviour.
const openExternal = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const LinkedInApp = () => {
  const { t: tr } = useTranslation('appsMedia');
  const { settings, openApp } = useMacOS();
  const dark = settings.theme === 'dark';

  const t = dark
    ? { page: '#1b1f23', card: '#1d2226', cardBorder: 'rgba(255,255,255,0.08)', text: '#e8e6e3', sub: '#a8aeb4', muted: '#8b9298', link: '#70b5f9', divider: 'rgba(255,255,255,0.08)', chipBg: 'rgba(255,255,255,0.06)' }
    : { page: '#f4f2ee', card: '#ffffff', cardBorder: 'rgba(0,0,0,0.08)', text: '#1d2226', sub: '#404a52', muted: '#666', link: '#0a66c2', divider: 'rgba(0,0,0,0.08)', chipBg: '#f3f2ef' };

  const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`rounded-lg overflow-hidden ${className}`} style={{ background: t.card, border: `1px solid ${t.cardBorder}` }}>{children}</div>
  );

  const skills = [
    { name: 'Python (Programming Language)', endorse: 1 },
    { name: 'Full-Stack Development' },
    { name: 'Artificial Intelligence (AI)' },
    { name: 'Team Leadership' },
    { name: 'Retrieval-Augmented Generation (RAG)' },
    { name: 'Java' },
    { name: 'C++' },
    { name: 'C (Programming Language)' },
    { name: 'GitHub' },
    { name: 'React.js' },
    { name: 'TypeScript' },
    { name: 'Creative Problem Solving' },
  ];

  const languages = [
    { lang: 'English', levelKey: 'native' },
    { lang: 'Hindi', levelKey: 'limited' },
    { lang: 'Kannada', levelKey: 'native' },
  ];

const A = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <span
    role="link"
    tabIndex={0}
    onClick={() => openExternal(href)}
    onKeyDown={(e) => {
      if (e.key === 'Enter') openExternal(href);
    }}
    style={{ color: t.link }}
    className="hover:underline cursor-pointer"
  >
    {children}
  </span>
);

  return (
    <div className="min-h-full pb-10" style={{ background: t.page, color: t.text }}>
      <div className="max-w-3xl mx-auto px-4 pt-12 space-y-3">
        {/* Profile */}
        <Card>
          <div className="h-36 relative overflow-hidden"><img src={linkedinBanner} alt="" className="w-full h-full object-cover" /></div>
          <div className="px-6 pb-5 -mt-14 relative">
            <div
              className="w-32 h-32 rounded-full overflow-hidden ring-4 shadow-md"
              style={{ background: t.card, '--tw-ring-color': t.card } as CSSProperties}
            >
              <img src={linkedinPhoto} alt="Thanas R" className="w-full h-full object-cover" />
            </div>

            <div className="mt-3 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-[24px] font-bold leading-tight">Thanas R</h1>
                  <ShieldCheck className="w-5 h-5" style={{ color: dark ? '#9ca3af' : '#6b7280' }} />
                  <span className="text-[13px]" style={{ color: t.sub }}>He/Him</span>
                </div>
                <div className="text-[15px] mt-1">B.Tech CSE [AIML] Student | PES University</div>
                <div className="flex items-center gap-2 text-[13px] mt-1" style={{ color: t.sub }}>
                  <span>Bengaluru, Karnataka, India</span>
                  <span style={{ color: t.sub }}>·</span>
                  <button
                    onClick={() => openApp('contact')}
                    className="hover:underline"
                    style={{ color: t.link }}
                  >{tr('apps.linkedin.contactInfo')}</button>
                </div>

                <div className="text-[13px] font-semibold mt-2" style={{ color: t.link }}>{tr('apps.linkedin.connections', { count: 132 })}</div>
              </div>

             <div className="flex flex-col items-end gap-4 shrink-0 pt-1 translate-x-4">
  <div className="flex items-center gap-2 min-w-[220px]">
    <div className="w-7 h-7 flex items-center justify-center shrink-0 overflow-hidden rounded-[4px]">
      <img
        src={pesLogo}
        alt="PES University"
        className="max-w-full max-h-full object-contain"
      />
    </div>

    <span className="text-[14px] font-semibold leading-none">
      PES University
    </span>
  </div>

  <div className="flex items-center gap-2 min-w-[220px]">
    <div className="w-7 h-7 flex items-center justify-center shrink-0 overflow-hidden rounded-[4px]">
      <img
        src={innovationLabLogo}
        alt="The Innovation Lab"
        className="max-w-full max-h-full object-contain"
      />
    </div>

    <span className="text-[14px] font-semibold leading-none">
      The Innovation Lab
    </span>
  </div>
</div>
            </div>
          </div>
        </Card>

        {/* About */}
        <Card>
          <div className="p-5">
            <h2 className="text-[20px] font-semibold mb-2">{tr('apps.linkedin.sections.about')}</h2>
            <div className="text-[14px] leading-relaxed space-y-3" style={{ color: t.sub }}>
              <p>{tr('apps.linkedin.about.p1')}</p>
              <p>{tr('apps.linkedin.about.p2')}</p>
              <p>{tr('apps.linkedin.about.p3')}</p>
              <p>{tr('apps.linkedin.about.more')} <A href="https://thanas.vercel.app">thanas.vercel.app</A></p>
            </div>
            <div className="mt-4 rounded-lg border p-4 flex items-center gap-3" style={{ borderColor: t.divider }}>
              <Award className="w-5 h-5" style={{ color: t.text }} />
              <div>
                <div className="text-[14px] font-semibold">{tr('apps.linkedin.sections.topSkills')}</div>
                <div className="text-[13px]" style={{ color: t.sub }}>Artificial Intelligence (AI) • Full-Stack Development • Team Leadership • Creative Problem Solving</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Activity */}
        <Card>
          <div className="p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[20px] font-semibold">{tr('apps.linkedin.sections.activity')}</h2>
              <div className="text-[13px] font-semibold" style={{ color: t.link }}>{tr('apps.linkedin.followers', { count: 140 })}</div>
            </div>
            <div className="mt-4 rounded-lg border p-4" style={{ borderColor: t.divider }}>
              <div className="flex items-start gap-3">
                <img src={linkedinPhoto} alt="" className="w-10 h-10 rounded-full object-cover" />
                <div className="flex-1">
                  <div className="flex items-center gap-1 text-[14px] font-semibold">
                    Thanas R <ShieldCheck className="w-3.5 h-3.5" style={{ color: t.link }} /> <span className="font-normal" style={{ color: t.sub }}>· {tr('apps.linkedin.you')}</span>
                  </div>
                  <div className="text-[12px]" style={{ color: t.sub }}>B.Tech CSE [AIML] Student | PES University</div>
                </div>
              </div>
              <div className="text-[14px] mt-2 space-y-2">
                <p>Our team made it to the final round of the SustainX hackathon, finishing in the top 6 at an event hosted by <A href="https://www.linkedin.com/company/solaris-pesu-ecc/">Solaris PESU</A> at PESU EC Campus</p>
                <p>Along with <A href="https://www.linkedin.com/in/tanay-s-8a46b0390/">Tanay S</A> and <A href="https://www.linkedin.com/in/vajjhala-sai-muralidhar-8712b13a8/">Vajjhala Sai Muralidhar</A>, we built "Virdis", a satellite powered platform for agricultural and land analytics that helps users analyze regions and get automated, visual crop planning insights based on real geospatial data and databases</p>
                <p>Would love for you to check it out:</p>
                <p>Live demo: <A href="https://virdis.vercel.app">https://virdis.vercel.app</A></p>
                <p>GitHub Repository: <A href="https://github.com/Thanas-R/Virdis">https://github.com/Thanas-R/Virdis</A></p>
                <p>Project Detail page: <A href="https://thanas.vercel.app/projects/virdis">https://thanas.vercel.app/projects/virdis</A></p>
                <p>Hope you like it. Always open to feedback</p>
              </div>
              <div className="mt-3 rounded-lg overflow-hidden border" style={{ borderColor: t.divider }}>
                <img src={virdisProject} alt="Virdis project" className="w-full h-auto block" />
              </div>
              <div className="flex items-center gap-5 mt-3 text-[12.5px]" style={{ color: t.sub }}>
                <span className="inline-flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" />46</span>
                <span className="inline-flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{tr('apps.linkedin.comments', { count: 5 })}</span>
                <span className="inline-flex items-center gap-1"><Repeat2 className="w-3.5 h-3.5" />{tr('apps.linkedin.reposts', { count: 1 })}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Education */}
        <Card>
          <div className="p-5">
            <h2 className="text-[20px] font-semibold mb-3">{tr('apps.linkedin.sections.education')}</h2>
            <div className="space-y-4">
              {[
                { title: 'PES University', sub: 'Bachelor of Technology, Computer Science and Engineering (AI&ML)', when: '2025 – 2029', logo: pesLogo },
                { title: 'ALLEN', sub: 'JEE Preparation', when: '2023 – 2025', logo: allenLogo },
                { title: 'Sri Vani Education Centre', sub: 'Schooling', when: '2013 – 2023', logo: sriVaniLogo },
              ].map((e) => (
                <div key={e.title} className="flex gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden" style={{ background: t.chipBg }}>
                    {e.logo
                      ? <img src={e.logo} alt="" className="w-12 h-12 object-cover rounded-full" />
                      : <GraduationCap className="w-6 h-6" style={{ color: t.link }} />}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-[15px]">{e.title}</div>
                    {e.sub && <div className="text-[13px]" style={{ color: t.sub }}>{e.sub}</div>}
                    <div className="text-[12.5px]" style={{ color: t.muted }}>{e.when}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Skills */}
        <Card>
          <div className="p-5">
            <h2 className="text-[20px] font-semibold mb-3">{tr('apps.linkedin.sections.skills')}</h2>
            <div className="space-y-3">
              {skills.map((s, i) => (
                <div key={s.name}>
                  <div className="text-[15px] font-semibold">{s.name}</div>
                  {s.endorse && <div className="text-[12.5px] mt-0.5" style={{ color: t.sub }}>{tr('apps.linkedin.endorsed', { count: s.endorse })}</div>}
                  {i < skills.length - 1 && <div className="border-t mt-3" style={{ borderColor: t.divider }} />}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Languages */}
        <Card>
          <div className="p-5">
            <h2 className="text-[20px] font-semibold mb-3">{tr('apps.linkedin.sections.languages')}</h2>
            <div className="space-y-3">
              {languages.map((l, i) => (
                <div key={l.lang}>
                  <div className="text-[15px] font-semibold">{l.lang}</div>
                  <div className="text-[13px]" style={{ color: t.sub }}>{tr(`apps.linkedin.proficiency.${l.levelKey}`)}</div>
                  {i < languages.length - 1 && <div className="border-t mt-3" style={{ borderColor: t.divider }} />}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
