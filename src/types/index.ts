export interface CourseExtra {
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
}

export interface Course {
  id: string;
  name: string;
  lat: number;
  lon: number;
  extra: CourseExtra;
}

export interface HourlySlot {
  from: Date;
  to: Date;
  symbolName: string;
  symbolVar: string;
  temperatureC: number;
  windMps: number;
  windName: string;
  windDeg: number;
  windCode: string;
  precipitationMm: number;
  pressureHpa: number;
  humidityPct: number;
}

export interface DayGroup {
  date: Date;
  label: string;
  hours: HourlySlot[];
}
