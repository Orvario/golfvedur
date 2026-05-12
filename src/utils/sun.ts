/** NOAA solar position algorithm — accurate to ~1 minute for latitudes up to ~72° */

const DEG = Math.PI / 180;

export interface SunTimes {
  sunrise: Date | null; // null = midnight sun or polar night
  sunset: Date | null;
  /** true when sun never sets (midnight sun) */
  midnightSun: boolean;
  /** true when sun never rises (polar night) */
  polarNight: boolean;
}

export function getSunTimes(lat: number, lon: number, date: Date): SunTimes {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  // Fractional Julian Day
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4)
    - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  const jd = jdn - 0.5; // noon

  // Julian centuries from J2000
  const T = (jd - 2451545.0) / 36525;

  // Geometric mean longitude (deg)
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
  // Mean anomaly (deg)
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const Mrad = M * DEG;
  // Equation of centre
  const C = Math.sin(Mrad) * (1.914602 - T * (0.004817 + 0.000014 * T))
    + Math.sin(2 * Mrad) * (0.019993 - 0.000101 * T)
    + Math.sin(3 * Mrad) * 0.000289;
  // Sun true longitude
  const sunLon = L0 + C;
  // Apparent longitude
  const omega = 125.04 - 1934.136 * T;
  const lambda = (sunLon - 0.00569 - 0.00478 * Math.sin(omega * DEG));

  // Mean obliquity of ecliptic
  const epsilon0 = 23 + (26 + (21.448 - T * (46.8150 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const epsilon = epsilon0 + 0.00256 * Math.cos(omega * DEG);

  // Sun declination
  const decl = Math.asin(Math.sin(epsilon * DEG) * Math.sin(lambda * DEG));

  // Equation of time (minutes)
  const eLon = L0 * DEG;
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const y2 = Math.pow(Math.tan((epsilon / 2) * DEG), 2);
  const eot = 4 / DEG * (
    y2 * Math.sin(2 * eLon)
    - 2 * e * Math.sin(M * DEG)
    + 4 * e * y2 * Math.sin(M * DEG) * Math.cos(2 * eLon)
    - 0.5 * y2 * y2 * Math.sin(4 * eLon)
    - 1.25 * e * e * Math.sin(2 * M * DEG)
  );

  // Solar noon (minutes from midnight UTC)
  const solarNoon = 720 - 4 * lon - eot;

  // Hour angle at sunrise/sunset (zenith = 90.833°)
  const cosHA = (Math.cos(90.833 * DEG) - Math.sin(lat * DEG) * Math.sin(decl))
    / (Math.cos(lat * DEG) * Math.cos(decl));

  if (cosHA <= -1) {
    return { sunrise: null, sunset: null, midnightSun: true, polarNight: false };
  }
  if (cosHA >= 1) {
    return { sunrise: null, sunset: null, midnightSun: false, polarNight: true };
  }

  const ha = Math.acos(cosHA) / DEG; // degrees

  const sunriseMin = solarNoon - 4 * ha;
  const sunsetMin = solarNoon + 4 * ha;

  const base = Date.UTC(year, date.getUTCMonth(), date.getUTCDate());
  return {
    sunrise: new Date(base + sunriseMin * 60000),
    sunset: new Date(base + sunsetMin * 60000),
    midnightSun: false,
    polarNight: false,
  };
}

export function formatSunTime(date: Date | null): string {
  if (!date) return '–';
  return date.toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit', hour12: false });
}
