import { XMLParser } from 'fast-xml-parser';
import type { Course, HourlySlot, DayGroup } from '../types';

// API calls go through Netlify serverless functions to avoid browser origin restrictions.
// The upstream API (wod.belgingur.is) only allows requests from golfvedur.is origin.

interface RawStation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  extra: {
    abbr: string;
    address: string[];
    club: string;
    email: string | null;
    facebook: string | null;
    phone: string | null;
    rid: string | null;
    rss: string | null;
    twitter: string | null;
    webpage: string | null;
  };
}

let cachedCourses: Course[] | null = null;

export async function fetchCourses(): Promise<Course[]> {
  if (cachedCourses) return cachedCourses;

  const res = await fetch('/.netlify/functions/courses');
  if (!res.ok) throw new Error(`Courses HTTP ${res.status}`);
  const stations: RawStation[] = await res.json();

  if (!Array.isArray(stations) || stations.length === 0) {
    throw new Error('No courses returned from server');
  }

  cachedCourses = stations.map((s) => ({
    id: s.id,
    name: s.name,
    lat: s.lat,
    lon: s.lon,
    extra: s.extra,
  }));

  return cachedCourses;
}

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

export async function fetchForecast(lat: number, lon: number): Promise<DayGroup[]> {
  const url = `/.netlify/functions/forecast?lat=${lat}&lon=${lon}`;
  const res = await fetch(url);
  const xml = await res.text();
  const parsed = xmlParser.parse(xml);

  const times = parsed?.weatherdata?.forecast?.tabular?.time ?? [];
  const timeArr: unknown[] = Array.isArray(times) ? times : [times];

  const slots: HourlySlot[] = timeArr.map((t: unknown) => {
    const entry = t as Record<string, unknown>;
    const sym = entry['symbol'] as Record<string, string> | undefined;
    const temp = entry['temperature'] as Record<string, string> | undefined;
    const wind = entry['windSpeed'] as Record<string, string> | undefined;
    const windDir = entry['windDirection'] as Record<string, string> | undefined;
    const precip = entry['precipitation'] as Record<string, string> | undefined;
    const pressure = entry['pressure'] as Record<string, string> | undefined;
    const humidity = entry['humidity'] as Record<string, string> | undefined;

    return {
      from: new Date(entry['@_from'] as string),
      to: new Date(entry['@_to'] as string),
      symbolName: sym?.['@_name'] ?? '',
      symbolVar: sym?.['@_var'] ?? '',
      temperatureC: parseFloat(temp?.['@_value'] ?? '0'),
      windMps: parseFloat(wind?.['@_mps'] ?? '0'),
      windName: wind?.['@_name'] ?? '',
      windDeg: parseFloat(windDir?.['@_deg'] ?? '0'),
      windCode: windDir?.['@_code'] ?? '',
      precipitationMm: parseFloat(precip?.['@_value'] ?? '0'),
      pressureHpa: parseFloat(pressure?.['@_value'] ?? '0'),
      humidityPct: parseFloat(humidity?.['@_value'] ?? '0'),
    };
  });

  return groupByDay(slots);
}

function groupByDay(slots: HourlySlot[]): DayGroup[] {
  const map = new Map<string, HourlySlot[]>();

  for (const slot of slots) {
    const key = slot.from.toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(slot);
  }

  const today = new Date().toDateString();
  const tomorrow = new Date(Date.now() + 86400000).toDateString();

  return Array.from(map.entries()).map(([key, hours]) => {
    let label: string;
    if (key === today) label = 'Today';
    else if (key === tomorrow) label = 'Tomorrow';
    else {
      const d = new Date(key);
      label = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
    }
    return { date: new Date(key), label, hours };
  });
}
