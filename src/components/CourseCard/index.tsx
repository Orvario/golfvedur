import { useNavigate } from 'react-router-dom';
import type { Course, HourlySlot } from '../../types';
import { WeatherIcon } from '../WeatherIcon';
import { WindArrow } from '../WindArrow';

interface Props {
  course: Course;
  currentWeather?: HourlySlot;
}

export function CourseCard({ course, currentWeather }: Props) {
  const navigate = useNavigate();
  const id = encodeURIComponent(course.id);

  return (
    <div
      onClick={() => navigate(`/course/${id}`)}
      style={{
        background: '#fff',
        border: '1px solid #e4e4de',
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
      {/* Weather icon */}
      <div style={{ width: 44, flexShrink: 0, textAlign: 'center' }}>
        {currentWeather ? (
          <WeatherIcon
            symbolVar={currentWeather.symbolVar}
            symbolName={currentWeather.symbolName}
            size={32}
          />
        ) : (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#eee',
              margin: '0 auto',
            }}
          />
        )}
      </div>

      {/* Course info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: '#003c71',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {course.name}
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#666',
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {course.extra.club}
        </div>
      </div>

      {/* Current weather stats */}
      {currentWeather && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#222', lineHeight: 1.1 }}>
              {currentWeather.temperatureC > 0
                ? `+${currentWeather.temperatureC.toFixed(0)}`
                : currentWeather.temperatureC.toFixed(0)}
              °
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

      {/* Chevron */}
      <div style={{ color: '#ccc', fontSize: 18, flexShrink: 0 }}>›</div>
    </div>
  );
}
