import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Course, HourlySlot } from '../../types';
import { WindArrow } from '../WindArrow';
import { WeatherIcon } from '../WeatherIcon';
import { CLUB_LOGOS } from '../../utils/clubLogos';
import { theme } from '../../theme';

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

function ClubBadge({ url, name, size = 36 }: { url: string | null; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 14, flexShrink: 0,
        background: theme.heroGradient, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: size * 0.4, fontWeight: 800, color: '#fff',
      }}>
        {name.slice(0, 1).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={name}
      onError={() => setFailed(true)}
      style={{
        width: size, height: size, borderRadius: 14, flexShrink: 0,
        objectFit: 'contain', background: 'rgba(255,255,255,0.92)',
        border: `1px solid ${theme.border}`,
        padding: 4,
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
        background: isFavourite
          ? 'linear-gradient(135deg, rgba(71,187,225,0.18), rgba(5,117,230,0.12))'
          : theme.bgCard,
        border: isFavourite ? `1.5px solid rgba(71,187,225,0.45)` : `1px solid ${theme.border}`,
        borderRadius: theme.radiusMd,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        userSelect: 'none',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: isFavourite ? '0 8px 24px rgba(5,117,230,0.2)' : 'none',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = theme.bgCardHover;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = isFavourite
          ? 'linear-gradient(135deg, rgba(71,187,225,0.18), rgba(5,117,230,0.12))'
          : theme.bgCard;
        (e.currentTarget as HTMLDivElement).style.transform = 'none';
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <ClubBadge url={getClubLogoUrl(course.extra.abbr, course.extra.webpage)} name={course.extra.club} />
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: 15, color: theme.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            letterSpacing: -0.2,
          }}>
            {course.name}
          </div>
          <div style={{
            fontSize: 12, color: theme.textMuted, marginTop: 3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {course.extra.club}
          </div>
        </div>
      </div>

      {currentWeather && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <WeatherIcon
            symbolVar={currentWeather.symbolVar}
            symbolName={currentWeather.symbolName}
            size={32}
          />
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 20, fontWeight: 800, color: theme.text, lineHeight: 1.1,
              fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5,
            }}>
              {currentWeather.temperatureC > 0
                ? `+${currentWeather.temperatureC.toFixed(0)}`
                : currentWeather.temperatureC.toFixed(0)}°
            </div>
            {currentWeather.precipitationMm > 0.1 && (
              <div style={{ fontSize: 11, color: theme.blueGlow, marginTop: 2, fontWeight: 600 }}>
                {currentWeather.precipitationMm.toFixed(1)} mm
              </div>
            )}
          </div>
          <WindArrow deg={currentWeather.windDeg} mps={currentWeather.windMps} size={14} />
        </div>
      )}

      {onToggleFavourite && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavourite(course.id); }}
          aria-label={isFavourite ? 'Fjarlægja uppáhald' : 'Setja sem uppáhald'}
          style={{
            flexShrink: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            fontSize: 20,
            lineHeight: 1,
            color: isFavourite ? '#FFC857' : theme.textDim,
            transition: 'color 0.15s, transform 0.12s',
          }}
        >
          {isFavourite ? '★' : '☆'}
        </button>
      )}

      {!onToggleFavourite && (
        <div style={{ color: theme.textDim, fontSize: 18, flexShrink: 0 }}>›</div>
      )}
    </div>
  );
}
