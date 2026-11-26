import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun,
  Droplets, Eye, Gauge, MapPin, Search, Sun, Sunrise, Wind,
} from 'lucide-react';

type Condition = 'clear' | 'partly' | 'cloudy' | 'drizzle' | 'rain' | 'storm' | 'snow' | 'fog';

interface City {
  id: string; name: string; temp: number; condition: Condition; high: number; low: number;
  humidity: number; wind: number; uv: number; visibility: number; pressure: number;
  sunrise: string; sunset: string;
}

const CITIES: City[] = [
  { id: 'bengaluru', name: 'Bengaluru', temp: 26, condition: 'drizzle', high: 28, low: 20, humidity: 74, wind: 11, uv: 4, visibility: 8, pressure: 1012, sunrise: '06:18', sunset: '17:52' },
  { id: 'tokyo', name: 'Tokyo', temp: 18, condition: 'partly', high: 21, low: 13, humidity: 58, wind: 14, uv: 5, visibility: 16, pressure: 1018, sunrise: '06:12', sunset: '16:38' },
  { id: 'london', name: 'London', temp: 11, condition: 'rain', high: 13, low: 8, humidity: 82, wind: 19, uv: 2, visibility: 9, pressure: 1004, sunrise: '07:24', sunset: '16:02' },
];

const ICONS: Record<Condition, typeof Sun> = {
  clear: Sun, partly: CloudSun, cloudy: Cloud, drizzle: CloudDrizzle,
  rain: CloudRain, storm: CloudRain, snow: CloudSnow, fog: CloudFog,
};

const CONDITIONS: Condition[] = ['clear', 'partly', 'cloudy', 'drizzle', 'rain', 'storm', 'snow', 'fog'];

export const WeatherApp = () => {
  const { t, i18n } = useTranslation('appsNew');
  const [cityId, setCityId] = useState('bengaluru');
  const [query, setQuery] = useState('');
  const city = CITIES.find(c => c.id === cityId) ?? CITIES[0];
  const Icon = ICONS[city.condition];

  const hours = Array.from({ length: 8 }, (_, i) => {
    const hour = (new Date().getHours() + i) % 24;
    const condition = CONDITIONS[(i + CITIES.indexOf(city)) % CONDITIONS.length];
    return { hour, temp: city.temp + [0, 1, 2, 2, 1, 0, -1, -1][i], condition };
  });

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const condition = CONDITIONS[(i * 2 + CITIES.indexOf(city)) % CONDITIONS.length];
    return { label: new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(d), condition, high: city.high - (i % 3), low: city.low - (i % 2) };
  });

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-sky-500 via-sky-400 to-blue-600 text-white">
      <div className="h-14 shrink-0 flex items-center gap-3 pl-24 pr-4">
        <MapPin size={14} />
        <span className="text-[13px] font-semibold">{city.name}</span>
        <div className="relative ml-auto w-56">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/70" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('weather.search')} className="w-full rounded-md bg-white/20 placeholder-white/60 pl-8 pr-2 py-1.5 text-[11px] outline-none" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="flex items-start justify-between max-w-3xl mx-auto">
          <div>
            <div className="text-[64px] leading-none font-light">{city.temp}°</div>
            <div className="text-[15px] mt-1">{t(`weather.condition.${city.condition}`)}</div>
            <div className="text-[12px] text-white/80 mt-1">
              {t('weather.highLow', { high: city.high, low: city.low })} · {t('weather.feelsLike', { temp: city.temp + 2 })}
            </div>
          </div>
          <Icon size={76} className="mt-1 opacity-95" />
        </div>

        <div className="max-w-3xl mx-auto mt-6 rounded-2xl bg-white/15 backdrop-blur p-3">
          <div className="text-[10px] uppercase tracking-wide text-white/70 mb-2">{t('weather.hourly')}</div>
          <div className="flex justify-between gap-2 overflow-x-auto">
            {hours.map((h, i) => {
              const HIcon = ICONS[h.condition];
              return (
                <div key={i} className="flex flex-col items-center gap-1.5 min-w-[44px]">
                  <span className="text-[10px] text-white/80">{i === 0 ? t('weather.now') : `${h.hour}:00`}</span>
                  <HIcon size={20} />
                  <span className="text-[12px]">{h.temp}°</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="max-w-3xl mx-auto mt-3 rounded-2xl bg-white/15 backdrop-blur p-3">
          <div className="text-[10px] uppercase tracking-wide text-white/70 mb-1">{t('weather.daily')}</div>
          {days.map((d, i) => {
            const DIcon = ICONS[d.condition];
            return (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b border-white/10 last:border-0">
                <span className="w-12 text-[12px]">{i === 0 ? t('weather.today') : d.label}</span>
                <DIcon size={18} />
                <span className="flex-1 text-[10px] text-white/70">{t(`weather.condition.${d.condition}`)}</span>
                <span className="text-[12px] text-white/70 w-8 text-right">{d.low}°</span>
                <div className="w-24 h-1.5 rounded-full bg-gradient-to-r from-cyan-200 to-amber-300" />
                <span className="text-[12px] w-8">{d.high}°</span>
              </div>
            );
          })}
        </div>

        <div className="max-w-3xl mx-auto mt-3 grid grid-cols-3 gap-2">
          {[
            { icon: Droplets, label: t('weather.humidity'), value: `${city.humidity}%` },
            { icon: Wind, label: t('weather.wind'), value: `${city.wind} km/h` },
            { icon: Sun, label: t('weather.uv'), value: `${city.uv}` },
            { icon: Eye, label: t('weather.visibility'), value: `${city.visibility} km` },
            { icon: Gauge, label: t('weather.pressure'), value: `${city.pressure} hPa` },
            { icon: Sunrise, label: t('weather.sun'), value: `${city.sunrise} / ${city.sunset}` },
          ].map(({ icon: CIcon, label, value }) => (
            <div key={label} className="rounded-xl bg-white/15 backdrop-blur p-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/70"><CIcon size={12} />{label}</div>
              <div className="text-[18px] mt-1">{value}</div>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto mt-4 flex gap-2">
          {CITIES.map(c => (
            <button key={c.id} onClick={() => setCityId(c.id)} className={`px-3 py-1.5 rounded-full text-[11px] ${cityId === c.id ? 'bg-white text-blue-600' : 'bg-white/15 hover:bg-white/25'}`}>
              {c.name} · {c.temp}°
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
