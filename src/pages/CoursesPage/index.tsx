import { useEffect, useState, useMemo } from 'react';
import { fetchCourses, fetchForecast } from '../../api';
import type { Course, HourlySlot } from '../../types';
import { CourseCard } from '../../components/CourseCard';

function SkeletonCard() {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e4e4de',
        borderRadius: 10,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div
        style={{ width: 36, height: 36, borderRadius: '50%', background: '#eee', flexShrink: 0 }}
      />
      <div style={{ flex: 1 }}>
        <div
          style={{
            height: 13,
            width: '55%',
            background: '#eee',
            borderRadius: 4,
            marginBottom: 7,
          }}
        />
        <div style={{ height: 11, width: '75%', background: '#f2f2f2', borderRadius: 4 }} />
      </div>
      <div style={{ width: 32, height: 20, background: '#eee', borderRadius: 4 }} />
    </div>
  );
}

export function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [currentWeather, setCurrentWeather] = useState<Map<string, HourlySlot>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses()
      .then((list) => {
        setCourses(list);
        setLoading(false);
        loadAllCurrentWeather(list);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load golf courses. Please try again.');
        setLoading(false);
      });
  }, []);

  async function loadAllCurrentWeather(list: Course[]) {
    const now = new Date();
    const CHUNK = 10;
    for (let i = 0; i < list.length; i += CHUNK) {
      const chunk = list.slice(i, i + CHUNK);
      const results = await Promise.allSettled(
        chunk.map((c) => fetchForecast(c.lat, c.lon))
      );
      setCurrentWeather((prev) => {
        const next = new Map(prev);
        results.forEach((r, idx) => {
          if (r.status === 'fulfilled' && r.value.length > 0) {
            const allHours = r.value.flatMap((d) => d.hours);
            const current =
              allHours.find((h) => h.from <= now && h.to > now) ?? allHours[0];
            if (current) next.set(chunk[idx].id, current);
          }
        });
        return next;
      });
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.extra.club.toLowerCase().includes(q) ||
        (c.extra.address ?? []).some((a) => a.toLowerCase().includes(q)) ||
        (c.extra.abbr ?? '').toLowerCase().includes(q)
    );
  }, [courses, search]);

  const weatherLoaded = currentWeather.size;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0' }}>
      {/* Header */}
      <div
        style={{
          background: '#003c71',
          color: '#fff',
          padding: '20px 16px 20px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 24, lineHeight: 1 }}>⛳</span>
            <h1
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: -0.4,
                flex: 1,
              }}
            >
              Golfveður
            </h1>
            {courses.length > 0 && (
              <span
                style={{
                  fontSize: 12,
                  opacity: 0.65,
                  background: 'rgba(255,255,255,0.12)',
                  borderRadius: 20,
                  padding: '3px 9px',
                }}
              >
                {weatherLoaded}/{courses.length} loaded
              </span>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 15,
                opacity: 0.5,
              }}
            >
              🔍
            </span>
            <input
              type="search"
              placeholder="Search courses or clubs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 36px',
                borderRadius: 8,
                border: '1.5px solid rgba(255,255,255,0.2)',
                fontSize: 14,
                background: 'rgba(255,255,255,0.12)',
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.border = '1.5px solid rgba(255,255,255,0.4)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.border = '1.5px solid rgba(255,255,255,0.2)';
              }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '14px 12px 40px' }}>
        {error && (
          <div
            style={{
              textAlign: 'center',
              padding: 32,
              color: '#c00',
              background: '#fff',
              borderRadius: 8,
              border: '1px solid #f0d0d0',
              marginBottom: 12,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 48,
              color: '#999',
              background: '#fff',
              borderRadius: 10,
              border: '1px solid #e4e4de',
              fontSize: 14,
            }}
          >
            No courses match <strong>"{search}"</strong>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                currentWeather={currentWeather.get(course.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
