import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Course, HourlySlot } from '../../types';
import { WindArrow } from '../WindArrow';
import { CLUB_LOGOS } from '../../utils/clubLogos';

export function getClubLogoUrl(abbr: string, webpage: string | null | undefined): string | null {
  if (CLUB_LOGOS[abbr]) return CLUB_LOGOS[abbr];
  if (!webpage) return null;
  try {
    const domain = new URL(webpage).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return null;
  }
}

/** @deprecated use getClubLogoUrl */
export function getClubFaviconUrl(webpage: string | null | undefined): string | null {
  return getClubLogoUrl('', webpage);
}

function ClubBadge({ url, name, size = 28 }: { url: string | null; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: '#003c71', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: size * 0.5,
      }}>
        ⛳
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={name}
      onError={() => setFailed(true)}
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        objectFit: 'contain', background: '#f5f5f5',
        border: '1px solid #e4e4de',
      }}
    />
  );
}

interface Props {
  course: Course;
  currentWeather?: HourlySlot;
  isFavourite?: boolean;
  onToggleFavourite?: (id: string) => void;
}

export function CourseCard({ course, currentWeather, isFavourite, onToggleFavourite }: Props) {
  const navigate = useNavigate();
  const id = encodeURIComponent(course.id);

  return (
    <div
      onClick={() => navigate(`/course/${id}`)}
      style={{
        background: '#fff',
        border: isFavourite ? '1.5px solid #003c71' : '1px solid #e4e4de',
        borderRadius: 10,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s, transform 0.12s',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 14px rgba(0,60,113,0.13)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLDivElement).style.transform = 'none';
      }}
    >
      {/* Course info */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <ClubBadge url={getClubLogoUrl(course.extra.abbr, course.extra.webpage)} name={course.extra.club} />
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: 14, color: '#003c71',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {course.name}
          </div>
          <div style={{
            fontSize: 12, color: '#666', marginTop: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {course.extra.club}
          </div>
        </div>
      </div>

      {/* Current weather stats */}
      {currentWeather && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#222', lineHeight: 1.1 }}>
              {currentWeather.temperatureC > 0
                ? `+${currentWeather.temperatureC.toFixed(0)}`
                : currentWeather.temperatureC.toFixed(0)}°
            </div>
            {currentWeather.precipitationMm > 0.1 && (
              <div style={{ fontSize: 11, color: '#4a90d9', marginTop: 1 }}>
                {currentWeather.precipitationMm.toFixed(1)} mm
              </div>
            )}
          </div>
          <WindArrow deg={currentWeather.windDeg} mps={currentWeather.windMps} size={16} />
        </div>
      )}

      {/* Star / favourite toggle */}
      {onToggleFavourite && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavourite(course.id); }}
          aria-label={isFavourite ? 'Fjarlægja uppáhald' : 'Setja sem uppáhald'}
          style={{
            flexShrink: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
            fontSize: 20,
            lineHeight: 1,
            color: isFavourite ? '#f5a623' : '#ccc',
            transition: 'color 0.15s',
          }}
        >
          {isFavourite ? '★' : '☆'}
        </button>
      )}

      {/* Chevron — hidden when star is shown */}
      {!onToggleFavourite && (
        <div style={{ color: '#ccc', fontSize: 18, flexShrink: 0 }}>›</div>
      )}
    </div>
  );
}
