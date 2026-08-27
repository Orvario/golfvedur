/** Maps Belgingur/yr.no symbol codes to category, SVG icon, gradient, and Icelandic labels */

interface Props {
  symbolVar: string;
  symbolName: string;
  size?: number;
}

export type WeatherCategory =
  | 'clear'
  | 'fair'
  | 'partly-cloudy'
  | 'cloudy'
  | 'rain-showers'
  | 'rain'
  | 'heavy-rain'
  | 'sleet'
  | 'snow'
  | 'thunder'
  | 'fog'
  | 'unknown';

export function getWeatherCategory(symbolVar: string, symbolName: string): WeatherCategory {
  const v = symbolVar.toLowerCase();
  const n = symbolName.toLowerCase();
  if (n.includes('thunder') || v.includes('11')) return 'thunder';
  if (n.includes('heavy rain') || n.includes('heavy shower')) return 'heavy-rain';
  if (n.includes('sleet') || v.includes('12') || v.includes('07') || v.includes('20') || v.includes('21')) return 'sleet';
  if (n.includes('snow') || v.includes('13') || v.includes('14') || v.includes('08') || v.includes('22') || v.includes('23')) return 'snow';
  if (n.includes('fog') || v.includes('15')) return 'fog';
  if (n.includes('rain') || v.includes('09') || v.includes('10') || v.includes('46')) return 'rain';
  if (n.includes('shower') || v.includes('05') || v.includes('06')) return 'rain-showers';
  if (n.includes('clear sky') || v.startsWith('01') || v === 'mf/01d' || v === 'mf/01n' || v.includes('01d') || v.includes('01n')) return 'clear';
  if (n.includes('fair') || v.includes('02')) return 'fair';
  if (n.includes('partly cloudy') || v.includes('03')) return 'partly-cloudy';
  if (n.includes('cloudy') || v.includes('04')) return 'cloudy';
  return 'unknown';
}

function isNightSymbol(symbolVar: string): boolean {
  const v = symbolVar.toLowerCase();
  return v.includes('n') && !v.includes('sun');
}

/** Soft 3D-style weather glyphs for the dark-glass UI */
export function WeatherGlyph({
  category,
  night = false,
  size = 64,
}: {
  category: WeatherCategory;
  night?: boolean;
  size?: number;
}) {
  const id = `wg-${category}-${night ? 'n' : 'd'}-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden
      style={{ display: 'block', filter: 'drop-shadow(0 8px 16px rgba(0,40,90,0.35))' }}
    >
      <defs>
        <linearGradient id={`${id}-sun`} x1="20" y1="16" x2="60" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE566" />
          <stop offset="1" stopColor="#FF9F1A" />
        </linearGradient>
        <linearGradient id={`${id}-cloud`} x1="16" y1="36" x2="80" y2="78" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#D4E4F7" />
        </linearGradient>
        <linearGradient id={`${id}-bolt`} x1="48" y1="52" x2="58" y2="86" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE566" />
          <stop offset="1" stopColor="#FFB020" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="55%" r="45%">
          <stop stopColor="#FFE566" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFE566" stopOpacity="0" />
        </radialGradient>
      </defs>

      {(category === 'thunder' || category === 'heavy-rain') && (
        <ellipse cx="48" cy="72" rx="28" ry="14" fill={`url(#${id}-glow)`} />
      )}

      {(category === 'clear' || category === 'fair') && !night && (
        <>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <rect
              key={a}
              x="46" y="8" width="4" height="12" rx="2"
              fill="#FFD24A"
              transform={`rotate(${a} 48 48)`}
              opacity={0.9}
            />
          ))}
          <circle cx="48" cy="48" r="18" fill={`url(#${id}-sun)`} />
        </>
      )}

      {(category === 'clear' || category === 'fair') && night && (
        <>
          <circle cx="52" cy="44" r="18" fill="#E8F0FF" />
          <circle cx="60" cy="40" r="16" fill="#0B0C1E" />
          <circle cx="30" cy="28" r="1.5" fill="#fff" opacity="0.8" />
          <circle cx="70" cy="60" r="1.2" fill="#fff" opacity="0.7" />
        </>
      )}

      {(category === 'partly-cloudy' || category === 'rain-showers') && (
        <>
          <circle cx="62" cy="34" r="14" fill={`url(#${id}-sun)`} />
          <path
            d="M28 58c0-10 8-18 18-18 2.4 0 4.7.5 6.8 1.3C55.2 34.2 62 30 70 30c10 0 18 8 18 18 0 1.2-.1 2.4-.4 3.5 5.2 1.8 9 6.8 9 12.5 0 7.5-6 13.5-13.5 13.5H34C24.6 77.5 17 70 17 60.5 17 53.4 21.8 47.4 28 45.2V58z"
            fill={`url(#${id}-cloud)`}
          />
        </>
      )}

      {(category === 'cloudy' || category === 'fog' || category === 'unknown' || category === 'rain' || category === 'sleet' || category === 'snow' || category === 'thunder' || category === 'heavy-rain') && (
        <path
          d="M26 56c0-11 9-20 20-20 2.8 0 5.4.6 7.8 1.6C56.6 30.6 64 26 72.5 26 83.3 26 92 34.7 92 45.5c0 1.4-.1 2.7-.4 4 5.8 2 10 7.6 10 14 0 8.3-6.7 15-15 15H32C21.5 78.5 13 70 13 59.5 13 51.6 18.3 45 26 42.6V56z"
          fill={`url(#${id}-cloud)`}
          transform={category === 'fog' ? 'translate(0 4)' : undefined}
        />
      )}

      {(category === 'rain' || category === 'heavy-rain' || category === 'rain-showers') && (
        <>
          <path d="M36 78l-3 10" stroke="#7EC8FF" strokeWidth="3" strokeLinecap="round" />
          <path d="M48 80l-3 12" stroke="#7EC8FF" strokeWidth="3" strokeLinecap="round" />
          <path d="M60 78l-3 10" stroke="#7EC8FF" strokeWidth="3" strokeLinecap="round" />
          {category === 'heavy-rain' && (
            <>
              <path d="M42 82l-3 10" stroke="#A8DCFF" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M54 84l-3 10" stroke="#A8DCFF" strokeWidth="2.5" strokeLinecap="round" />
            </>
          )}
        </>
      )}

      {category === 'thunder' && (
        <path
          d="M52 52L44 70h10l-4 18 18-24H56l6-12H52z"
          fill={`url(#${id}-bolt)`}
        />
      )}

      {category === 'snow' && (
        <>
          <circle cx="36" cy="82" r="3" fill="#E8F4FF" />
          <circle cx="50" cy="86" r="2.5" fill="#E8F4FF" />
          <circle cx="64" cy="80" r="3" fill="#E8F4FF" />
        </>
      )}

      {category === 'sleet' && (
        <>
          <path d="M38 78l-2 8" stroke="#9ED0FF" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="52" cy="86" r="2.5" fill="#E8F4FF" />
          <path d="M64 78l-2 8" stroke="#9ED0FF" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {category === 'fog' && (
        <>
          <rect x="22" y="70" width="52" height="4" rx="2" fill="#C8D6E8" opacity="0.7" />
          <rect x="28" y="78" width="40" height="3.5" rx="1.75" fill="#C8D6E8" opacity="0.5" />
        </>
      )}
    </svg>
  );
}

export function getEmoji(symbolVar: string, symbolName: string): string {
  const cat = getWeatherCategory(symbolVar, symbolName);
  const night = isNightSymbol(symbolVar);
  switch (cat) {
    case 'clear': return night ? '🌙' : '☀️';
    case 'fair': return night ? '🌙' : '🌤️';
    case 'partly-cloudy': return '⛅';
    case 'cloudy': return '☁️';
    case 'rain-showers': return '🌦️';
    case 'rain': return '🌧️';
    case 'heavy-rain': return '🌧️';
    case 'sleet': return '🌨️';
    case 'snow': return '❄️';
    case 'thunder': return '⛈️';
    case 'fog': return '🌫️';
    default: return '🌡️';
  }
}

/** Returns a CSS gradient for use as a weather background */
export function getWeatherGradient(symbolVar: string, symbolName: string, hour?: number): string {
  const cat = getWeatherCategory(symbolVar, symbolName);
  const isNight = hour !== undefined
    ? (hour < 5 || hour >= 22)
    : symbolVar.toLowerCase().includes('n');

  if (isNight) {
    return 'linear-gradient(165deg, #1a3a6e 0%, #0f1f45 55%, #0B0C1E 100%)';
  }

  switch (cat) {
    case 'clear':
    case 'fair':
      return 'linear-gradient(165deg, #5AD0F0 0%, #2B8FE8 45%, #0575E6 100%)';
    case 'partly-cloudy':
    case 'rain-showers':
      return 'linear-gradient(165deg, #47BBE1 0%, #2B8FE8 50%, #0A66D1 100%)';
    case 'cloudy':
    case 'fog':
      return 'linear-gradient(165deg, #6A8FB8 0%, #3A6FA0 50%, #1E4A7A 100%)';
    case 'rain':
    case 'heavy-rain':
      return 'linear-gradient(165deg, #4A7A9E 0%, #2A5580 50%, #163A5C 100%)';
    case 'sleet':
    case 'snow':
      return 'linear-gradient(165deg, #8AABB8 0%, #5A8AA8 50%, #2A5A80 100%)';
    case 'thunder':
      return 'linear-gradient(165deg, #3A4A6E 0%, #1E2A48 50%, #0B0C1E 100%)';
    default:
      return 'linear-gradient(165deg, #47BBE1 0%, #2B8FE8 48%, #0575E6 100%)';
  }
}

export function getConditionText(symbolVar: string, symbolName: string): string {
  const cat = getWeatherCategory(symbolVar, symbolName);
  switch (cat) {
    case 'clear': return 'Heiðskýjað';
    case 'fair': return 'Að mestu heiðskært';
    case 'partly-cloudy': return 'Skýjað að hluta';
    case 'cloudy': return 'Skýjað';
    case 'rain-showers': return 'Líklegar skúrir';
    case 'rain': return 'Rigning';
    case 'heavy-rain': return 'Mikil rigning';
    case 'sleet': return 'Slydda';
    case 'snow': return 'Snjókoma';
    case 'thunder': return 'Þrumuveður';
    case 'fog': return 'Þoka';
    default: return symbolName || 'Óþekkt';
  }
}

export function WeatherIcon({ symbolVar, symbolName, size = 28 }: Props) {
  const cat = getWeatherCategory(symbolVar, symbolName);
  return (
    <span
      role="img"
      aria-label={symbolName || getConditionText(symbolVar, symbolName)}
      style={{ display: 'inline-flex', lineHeight: 1 }}
    >
      <WeatherGlyph category={cat} night={isNightSymbol(symbolVar)} size={size} />
    </span>
  );
}
