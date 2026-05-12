/** Maps Belgingur/yr.no symbol codes to emoji, background gradient, and condition text */

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

export function getEmoji(symbolVar: string, symbolName: string): string {
  const cat = getWeatherCategory(symbolVar, symbolName);
  const isNight = symbolVar.toLowerCase().includes('n') && !symbolVar.toLowerCase().includes('sun');
  switch (cat) {
    case 'clear': return isNight ? '🌙' : '☀️';
    case 'fair': return isNight ? '🌙' : '🌤️';
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
  const isNight = hour !== undefined ? (hour < 5 || hour >= 22) : symbolVar.toLowerCase().includes('n.84') || symbolVar.toLowerCase().includes('n');

  switch (cat) {
    case 'clear':
      return isNight
        ? 'linear-gradient(180deg, #0d1b3e 0%, #1a3060 50%, #2a4d80 100%)'
        : 'linear-gradient(180deg, #1a6bb5 0%, #3a8fd1 40%, #6ab4e8 100%)';
    case 'fair':
      return isNight
        ? 'linear-gradient(180deg, #1a2a50 0%, #2a3f70 50%, #3a5490 100%)'
        : 'linear-gradient(180deg, #2878c0 0%, #4a9ad8 40%, #7fc0ee 100%)';
    case 'partly-cloudy':
      return 'linear-gradient(180deg, #3a5f88 0%, #5a7fa8 40%, #8ab0cc 100%)';
    case 'cloudy':
      return 'linear-gradient(180deg, #5a6b7a 0%, #7a8d9e 40%, #9fb3c2 100%)';
    case 'rain-showers':
      return 'linear-gradient(180deg, #4a5e70 0%, #5e7282 40%, #7a8e9e 100%)';
    case 'rain':
      return 'linear-gradient(180deg, #384858 0%, #4a5e6e 40%, #627888 100%)';
    case 'heavy-rain':
      return 'linear-gradient(180deg, #2c3a47 0%, #3c4e5e 40%, #506070 100%)';
    case 'sleet':
      return 'linear-gradient(180deg, #5a6878 0%, #7a8898 40%, #9aaab8 100%)';
    case 'snow':
      return 'linear-gradient(180deg, #7085a0 0%, #90a8c0 40%, #b8cede 100%)';
    case 'thunder':
      return 'linear-gradient(180deg, #1e2530 0%, #2c3545 40%, #3c4858 100%)';
    case 'fog':
      return 'linear-gradient(180deg, #7a8490 0%, #96a0aa 40%, #b4bec8 100%)';
    default:
      return 'linear-gradient(180deg, #4a6080 0%, #6a8090 40%, #8aa0b0 100%)';
  }
}

/** Short human-readable condition summary */
export function getConditionText(symbolVar: string, symbolName: string): string {
  const cat = getWeatherCategory(symbolVar, symbolName);
  switch (cat) {
    case 'clear': return 'Heiðskært';
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
  return (
    <span
      role="img"
      aria-label={symbolName}
      style={{ fontSize: size, lineHeight: 1, display: 'block', textAlign: 'center' }}
    >
      {getEmoji(symbolVar, symbolName)}
    </span>
  );
}
