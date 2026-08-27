import { useEffect, useState, useMemo } from 'react';
import { fetchCourses, fetchForecast } from '../../api';
import type { Course, HourlySlot } from '../../types';
import { CourseCard } from '../../components/CourseCard';
import { theme } from '../../theme';

function SkeletonCard() {
  return (
    <div
      style={{
        background: theme.bgCard,
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radiusMd,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 14, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 13, width: '55%', background: 'rgba(255,255,255,0.08)', borderRadius: 4, marginBottom: 7 }} />
        <div style={{ height: 11, width: '75%', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
      </div>
      <div style={{ width: 40, height: 22, background: 'rgba(255,255,255,0.08)', borderRadius: 6 }} />
    </div>
  );
}

const FAVOURITE_KEY = 'golfvedur_favourite_course';

export function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [currentWeather, setCurrentWeather] = useState<Map<string, HourlySlot>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favouriteId, setFavouriteId] = useState<string | null>(
    () => localStorage.getItem(FAVOURITE_KEY)
  );

  function toggleFavourite(id: string) {
    const next = favouriteId === id ? null : id;
    setFavouriteId(next);
    if (next) localStorage.setItem(FAVOURITE_KEY, next);
    else localStorage.removeItem(FAVOURITE_KEY);
  }

  useEffect(() => {
    fetchCourses()
      .then((list) => {
        setCourses(list);
        setLoading(false);
        loadAllCurrentWeather(list);
      })
      .catch((err) => {
        console.error(err);
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Tókst ekki að sækja golfvelli: ${msg}`);
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
  const favouriteCourse = courses.find((c) => c.id === favouriteId) ?? null;

  return (
    <div style={{
      minHeight: '100vh',
      background: `
        radial-gradient(ellipse 80% 50% at 50% -10%, rgba(71,187,225,0.22), transparent 55%),
        radial-gradient(ellipse 60% 40% at 100% 20%, rgba(5,117,230,0.12), transparent 50%),
        ${theme.bg}
      `,
    }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '18px 16px 16px',
          background: 'rgba(11,12,30,0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <div style={{ maxWidth: theme.maxWidth, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: theme.heroGradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(5,117,230,0.35)',
              fontSize: 18,
            }}>
              ⛳
            </div>
            <h1 style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: -0.6,
              flex: 1,
              color: theme.text,
            }}>
              Golfveður
            </h1>
            {courses.length > 0 && (
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: theme.textMuted,
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${theme.border}`,
                borderRadius: theme.radiusPill,
                padding: '4px 10px',
              }}>
                {weatherLoaded}/{courses.length}
              </span>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.45 }}
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" stroke="#fff" strokeWidth="2" />
              <path d="M20 20l-3.5-3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Leita að velli eða klúbbi…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px 12px 40px',
                borderRadius: theme.radiusSm,
                border: `1px solid ${theme.border}`,
                fontSize: 14,
                fontWeight: 500,
                background: 'rgba(255,255,255,0.06)',
                color: theme.text,
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.border = `1px solid rgba(71,187,225,0.5)`;
                e.currentTarget.style.background = 'rgba(255,255,255,0.09)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = `1px solid ${theme.border}`;
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: theme.maxWidth, margin: '0 auto', padding: '16px 14px 48px' }}>
        {error && (
          <div style={{
            textAlign: 'center', padding: 24, color: '#FF8A8A',
            background: 'rgba(255,80,80,0.08)', borderRadius: theme.radiusMd,
            border: '1px solid rgba(255,100,100,0.25)',
            marginBottom: 12, fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {!loading && !search && favouriteCourse && (
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: theme.blueGlow,
              letterSpacing: 0.4, marginBottom: 8, paddingLeft: 4,
            }}>
              Uppáhaldsvöllur
            </div>
            <CourseCard
              course={favouriteCourse}
              currentWeather={currentWeather.get(favouriteCourse.id)}
              isFavourite
              onToggleFavourite={toggleFavourite}
            />
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : !error && filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 48, color: theme.textMuted,
            background: theme.bgCard, borderRadius: theme.radiusMd,
            border: `1px solid ${theme.border}`, fontSize: 14,
          }}>
            {search.trim()
              ? <>Enginn völlur passar við <strong style={{ color: theme.text }}>„{search}"</strong></>
              : 'Engir golfvellir fundust.'}
          </div>
        ) : !error && filtered.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                currentWeather={currentWeather.get(course.id)}
                isFavourite={course.id === favouriteId}
                onToggleFavourite={toggleFavourite}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
