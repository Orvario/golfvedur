import { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCourses, fetchForecast } from '../../api';
import type { Course, DayGroup, HourlySlot } from '../../types';
import { HourlyStrip, ROW_TIME_H, ROW_ICON_H, ROW_TEMP_H, ROW_PRECIP_H, ROW_WIND_H } from '../../components/HourlyStrip';
import { WeatherIcon, WeatherGlyph, getWeatherGradient, getConditionText, getEmoji, getWeatherCategory } from '../../components/WeatherIcon';
import { getSunTimes, formatSunTime } from '../../utils/sun';
import { getClubLogoUrl } from '../../components/CourseCard';
import { theme } from '../../theme';

type MainTab = 'now' | 'forecast';

function HeaderClubBadge({ url, name }: { url: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return null;
  return (
    <img
      src={url}
      alt={name}
      onError={() => setFailed(true)}
      style={{
        width: 32, height: 32, borderRadius: 12, flexShrink: 0,
        objectFit: 'contain', background: 'rgba(255,255,255,0.92)',
        border: '1px solid rgba(255,255,255,0.25)',
        padding: 2,
      }}
    />
  );
}

const ROW_LABELS = ['Tími', 'Veður', 'Hitastig', 'Rigning (mm)', 'Vindur'];
const ROW_HEIGHTS = [ROW_TIME_H, ROW_ICON_H, ROW_TEMP_H, ROW_PRECIP_H, ROW_WIND_H];

function formatTemp(t: number): string {
  const r = Math.round(t);
  return r > 0 ? `+${r}°` : `${r}°`;
}

const IS_MONTHS = ['jan', 'feb', 'mar', 'apr', 'maí', 'jún', 'júl', 'ágú', 'sep', 'okt', 'nóv', 'des'];
const IS_WEEKDAYS = ['sunnudagur', 'mánudagur', 'þriðjudagur', 'miðvikudagur', 'fimmtudagur', 'föstudagur', 'laugardagur'];
const IS_DAYS_SHORT = ['Sun', 'Mán', 'Þri', 'Mið', 'Fim', 'Fös', 'Lau'];

function formatDateIS(date: Date): string {
  const weekday = IS_WEEKDAYS[date.getDay()];
  const day = date.getDate();
  const month = IS_MONTHS[date.getMonth()];
  return `${weekday} ${day}. ${month}`;
}

function MetricIcon({ kind }: { kind: 'wind' | 'humidity' | 'rain' }) {
  if (kind === 'wind') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 8h10a3 3 0 100-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 12h14a3 3 0 110 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 16h8a2.5 2.5 0 110 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'humidity') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3c3.5 4.5 7 8.2 7 12a7 7 0 11-14 0c0-3.8 3.5-7.5 7-12z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 4v10a4 4 0 108 0V8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 14v4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// ─── Hourly timeline (hero) ───────────────────────────────────────────────────

const COL_W = 72;

interface TimelineStripProps {
  hours: HourlySlot[];
  activeIdx: number;
  onActiveChange: (idx: number) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

function HourlyTimelineStrip({ hours, activeIdx, onActiveChange, scrollRef }: TimelineStripProps) {
  const dragMoved = useRef(false);
  const prevActiveIdx = useRef(activeIdx);

  useEffect(() => {
    if (!scrollRef.current) return;
    if (prevActiveIdx.current !== activeIdx) {
      scrollRef.current.scrollLeft = activeIdx * COL_W;
    }
    prevActiveIdx.current = activeIdx;
  }, [activeIdx, scrollRef]);

  function handleScroll() {
    if (!scrollRef.current) return;
    const idx = Math.round(scrollRef.current.scrollLeft / COL_W);
    prevActiveIdx.current = idx;
    onActiveChange(Math.max(0, Math.min(idx, hours.length - 1)));
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    if (!el) return;
    const startX = e.pageX;
    const startScroll = el.scrollLeft;
    dragMoved.current = false;
    const onMove = (ev: MouseEvent) => {
      const dx = ev.pageX - startX;
      if (Math.abs(dx) > 4) dragMoved.current = true;
      if (dragMoved.current) {
        el.scrollLeft = startScroll - dx;
        onActiveChange(Math.max(0, Math.min(Math.round(el.scrollLeft / COL_W), hours.length - 1)));
      }
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      el.style.cursor = 'grab';
    };
    el.style.cursor = 'grabbing';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={scrollRef}
        style={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          cursor: 'grab',
          userSelect: 'none',
          scrollbarWidth: 'none',
          padding: '4px 4px 8px',
        }}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
      >
        <style>{`.now-timeline::-webkit-scrollbar { display: none; }`}</style>
        <div className="now-timeline" style={{ display: 'flex', gap: 10, width: hours.length * COL_W }}>
          {hours.map((slot, i) => {
            const isActive = i === activeIdx;
            const hourLabel = slot.from.toLocaleTimeString('is-IS', {
              hour: '2-digit', minute: '2-digit', hour12: false,
            });
            const prevSlot = hours[i - 1];
            const isDayBoundary = i > 0 && prevSlot &&
              slot.from.getDate() !== prevSlot.from.getDate();

            return (
              <div
                key={i}
                onClick={() => { if (!dragMoved.current) onActiveChange(i); }}
                style={{
                  width: COL_W - 10,
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '14px 6px',
                  gap: 8,
                  background: isActive ? theme.heroGradient : 'rgba(255,255,255,0.04)',
                  border: isActive
                    ? `1.5px solid ${theme.blueGlow}`
                    : `1px solid ${theme.border}`,
                  borderRadius: theme.radiusMd,
                  boxShadow: isActive ? theme.shadowGlow : 'none',
                  position: 'relative',
                  transition: 'background 0.2s, box-shadow 0.2s, border-color 0.2s',
                  cursor: 'pointer',
                }}
              >
                {isDayBoundary && (
                  <div style={{
                    position: 'absolute', top: 4, left: 6,
                    fontSize: 8, fontWeight: 800, color: theme.textDim,
                    textTransform: 'uppercase', letterSpacing: 0.4,
                  }}>
                    {IS_DAYS_SHORT[slot.from.getDay()]}
                  </div>
                )}
                <div style={{
                  fontSize: 15, fontWeight: 800, color: theme.text,
                  fontVariantNumeric: 'tabular-nums', letterSpacing: -0.3,
                }}>
                  {formatTemp(slot.temperatureC)}
                </div>
                <WeatherIcon symbolVar={slot.symbolVar} symbolName={slot.symbolName} size={36} />
                <div style={{
                  fontSize: 11, fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'rgba(255,255,255,0.9)' : theme.textMuted,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {hourLabel}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Now Hero ─────────────────────────────────────────────────────────────────

function NowHero({
  days,
  onActiveSlotChange,
  onOpenForecast,
}: {
  course: Course;
  days: DayGroup[];
  onActiveSlotChange?: (slot: HourlySlot) => void;
  onOpenForecast: () => void;
}) {
  const now = new Date();

  const allHours = useMemo(() => {
    const hours = days.flatMap((d) => d.hours);
    const idx = hours.findIndex((h) => h.from <= now && h.to > now);
    return idx > 0 ? hours.slice(idx) : hours;
  }, [days]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [baseBg, setBaseBg] = useState(theme.heroGradient);
  const [overlayBg, setOverlayBg] = useState(theme.heroGradient);
  const [overlayOn, setOverlayOn] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [contentShift, setContentShift] = useState(0);
  const [contentFade, setContentFade] = useState(1);
  const stripScrollRef = useRef<HTMLDivElement>(null);
  const activeIdxRef = useRef(0);
  const overlayOnRef = useRef(false);
  const overlayBgRef = useRef(theme.heroGradient);
  const settleTimerRef = useRef<number | null>(null);
  const contentRafRef = useRef<number | null>(null);
  const draggingRef = useRef(false);

  function applyHour(idx: number, opts?: { fromStrip?: boolean }) {
    const clamped = Math.max(0, Math.min(idx, allHours.length - 1));
    const prev = activeIdxRef.current;
    if (clamped === prev) return;

    const dir: 1 | -1 = clamped > prev ? 1 : -1;
    const nextSlot = allHours[clamped];
    const nextBg = nextSlot
      ? getWeatherGradient(nextSlot.symbolVar, nextSlot.symbolName, nextSlot.from.getHours())
      : theme.heroGradient;

    // Soft crossfade between persistent layers (no remount / keyframe restart).
    // During an active drag, keep opacity up and just swap colors so hour snaps don't flicker.
    if (draggingRef.current) {
      if (overlayOnRef.current) setBaseBg(overlayBgRef.current);
      overlayBgRef.current = nextBg;
      setOverlayBg(nextBg);
      setOverlayOn(true);
      overlayOnRef.current = true;
    } else {
      if (overlayOnRef.current) setBaseBg(overlayBgRef.current);
      overlayBgRef.current = nextBg;
      setOverlayBg(nextBg);
      setOverlayOn(false);
      overlayOnRef.current = false;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setOverlayOn(true);
          overlayOnRef.current = true;
        });
      });
    }

    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => {
      setBaseBg(nextBg);
      setOverlayOn(false);
      overlayOnRef.current = false;
    }, 720);

    if (!draggingRef.current) {
      if (contentRafRef.current) cancelAnimationFrame(contentRafRef.current);
      setContentFade(0.62);
      setContentShift(dir * 12);
      contentRafRef.current = requestAnimationFrame(() => {
        contentRafRef.current = requestAnimationFrame(() => {
          setContentFade(1);
          setContentShift(0);
        });
      });
    }

    activeIdxRef.current = clamped;
    setActiveIdx(clamped);

    if (!opts?.fromStrip && stripScrollRef.current) {
      if (draggingRef.current) {
        stripScrollRef.current.scrollLeft = clamped * COL_W;
      } else {
        stripScrollRef.current.scrollTo({ left: clamped * COL_W, behavior: 'smooth' });
      }
    }
    if (allHours[clamped]) onActiveSlotChange?.(allHours[clamped]);
  }

  function changeActive(idx: number) {
    applyHour(idx, { fromStrip: true });
  }

  useEffect(() => {
    const first = allHours[0];
    if (!first) return;
    onActiveSlotChange?.(first);
    const initial = getWeatherGradient(first.symbolVar, first.symbolName, first.from.getHours());
    setBaseBg(initial);
    setOverlayBg(initial);
    overlayBgRef.current = initial;
  }, [allHours]);

  useEffect(() => () => {
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    if (contentRafRef.current) cancelAnimationFrame(contentRafRef.current);
  }, []);

  const heroRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startIdx: number; axis: 'h' | 'v' | null } | null>(null);

  function onHeroTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    draggingRef.current = true;
    dragState.current = { startX: t.clientX, startIdx: activeIdxRef.current, axis: null };
  }
  function onHeroTouchMove(e: React.TouchEvent) {
    if (!dragState.current) return;
    const t = e.touches[0];
    const dx = t.clientX - dragState.current.startX;
    if (dragState.current.axis === null) {
      const dy = Math.abs(t.clientY - (e.changedTouches[0]?.clientY ?? t.clientY));
      if (Math.abs(dx) > 6 || dy > 6) {
        dragState.current.axis = Math.abs(dx) >= dy ? 'h' : 'v';
      }
    }
    if (dragState.current.axis !== 'h') return;
    e.preventDefault();
    setDragX(dx);
    applyHour(dragState.current.startIdx + Math.round(-dx / COL_W));
  }
  function onHeroTouchEnd() {
    draggingRef.current = false;
    dragState.current = null;
    setDragX(0);
  }

  function onHeroMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const startX = e.clientX;
    const startActiveIdx = activeIdxRef.current;
    draggingRef.current = true;
    let moved = false;
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 6) moved = true;
      if (!moved) return;
      setDragX(dx);
      applyHour(startActiveIdx + Math.round(-dx / COL_W));
    };
    const onUp = () => {
      draggingRef.current = false;
      setDragX(0);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (heroRef.current) heroRef.current.style.cursor = 'grab';
    };
    if (heroRef.current) heroRef.current.style.cursor = 'grabbing';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  const slot = allHours[activeIdx] ?? allHours[0];
  const slotDay = days.find((d) => d.hours.some((h) => h.from.getTime() === slot?.from.getTime()));
  const dayHours = slotDay?.hours ?? days[0]?.hours ?? [];
  const remainingHours = slot
    ? dayHours.filter((h) => h.from.getTime() >= slot.from.getTime())
    : dayHours;
  const dayPrecip = remainingHours.reduce((sum, h) => sum + h.precipitationMm, 0);

  const conditionText = slot ? getConditionText(slot.symbolVar, slot.symbolName) : '';
  const slotDateLabel = slot ? formatDateIS(slot.from) : '';
  const cat = slot ? getWeatherCategory(slot.symbolVar, slot.symbolName) : 'unknown';

  const parallax = dragX * 0.18 + contentShift;
  const bgParallax = dragX * 0.06;

  return (
    <div
      className="now-hero"
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: theme.bg,
        padding: '8px 14px 20px',
        animation: 'gv-fade-up 0.45s ease-out both',
      }}
    >
      <div
        ref={heroRef}
        style={{
          background: theme.bg,
          borderRadius: theme.radiusXl,
          padding: '28px 22px 22px',
          boxShadow: theme.shadowHero,
          position: 'relative',
          overflow: 'hidden',
          cursor: 'grab',
          userSelect: 'none',
          touchAction: 'pan-y',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 340,
        }}
        onMouseDown={onHeroMouseDown}
        onTouchStart={onHeroTouchStart}
        onTouchMove={onHeroTouchMove}
        onTouchEnd={onHeroTouchEnd}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: '-2%',
            borderRadius: theme.radiusXl,
            background: baseBg,
            zIndex: 0,
            pointerEvents: 'none',
            transform: `translate3d(${bgParallax}px, 0, 0) scale(1.04)`,
            transition: dragX !== 0
              ? 'none'
              : 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
            willChange: 'transform',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: '-2%',
            borderRadius: theme.radiusXl,
            background: overlayBg,
            zIndex: 0,
            pointerEvents: 'none',
            opacity: overlayOn ? 1 : 0,
            transform: `translate3d(${bgParallax}px, 0, 0) scale(1.04)`,
            transition: 'opacity 0.65s cubic-bezier(0.33, 1, 0.4, 1), transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
            willChange: 'opacity, transform',
          }}
        />

        {slot && isRainy(slot.symbolVar, slot.symbolName) && <RainStreaks precipMm={slot.precipitationMm} />}

        <div
          style={{
            position: 'relative', zIndex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', flex: 1, textAlign: 'center',
            transform: `translate3d(${parallax}px, 0, 0)`,
            opacity: contentFade,
            transition: dragX !== 0
              ? 'none'
              : 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease',
            willChange: 'transform, opacity',
          }}
        >
          {slot && (
            <div style={{ marginBottom: 8, animation: 'gv-icon-float 4s ease-in-out infinite' }}>
              <WeatherGlyph
                category={cat}
                night={slot.symbolVar.toLowerCase().includes('n')}
                size={110}
              />
            </div>
          )}

          {slot && (
            <div style={{
              fontSize: 72, fontWeight: 800, color: '#fff',
              lineHeight: 0.95, letterSpacing: -3,
              fontVariantNumeric: 'tabular-nums',
              textShadow: '0 4px 24px rgba(0,40,100,0.25)',
            }}>
              {Math.round(slot.temperatureC)}°
            </div>
          )}

          {conditionText && (
            <div style={{
              color: '#fff', fontSize: 18, fontWeight: 700,
              marginTop: 10, letterSpacing: -0.2,
            }}>
              {conditionText}
            </div>
          )}

          {slot && (
            <div style={{
              fontSize: 13, color: 'rgba(255,255,255,0.7)',
              fontWeight: 500, marginTop: 4, textTransform: 'capitalize',
            }}>
              {slotDateLabel}
            </div>
          )}

          {slot && (
            <div style={{
              display: 'flex', justifyContent: 'space-around', width: '100%',
              marginTop: 22, paddingTop: 16,
              borderTop: '1px solid rgba(255,255,255,0.2)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <MetricIcon kind="wind" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round(slot.windMps)} m/s
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <MetricIcon kind="humidity" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round(slot.humidityPct)}%
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <MetricIcon kind="rain" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                  {dayPrecip > 0.05 ? `${Math.round(dayPrecip * 10) / 10} mm` : '0 mm'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Today + hourly */}
      <div style={{ marginTop: 22 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 12, padding: '0 4px',
        }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: theme.text, letterSpacing: -0.3 }}>
            Í dag
          </span>
          <button
            onClick={onOpenForecast}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: theme.blueGlow, fontSize: 14, fontWeight: 700,
              fontFamily: 'inherit', padding: 0,
            }}
          >
            5 dagar ›
          </button>
        </div>
        <HourlyTimelineStrip
          hours={allHours}
          activeIdx={activeIdx}
          onActiveChange={changeActive}
          scrollRef={stripScrollRef}
        />
      </div>
    </div>
  );
}

function isRainy(symbolVar: string, symbolName: string): boolean {
  const n = symbolName.toLowerCase();
  const v = symbolVar.toLowerCase();
  return n.includes('rain') || n.includes('shower') || v.includes('09') || v.includes('10') || v.includes('05') || v.includes('06');
}

function RainStreaks({ precipMm }: { precipMm: number }) {
  const intensity = precipMm < 0.5 ? 0.3 : precipMm < 2 ? 0.65 : 1;
  const count = Math.round(10 + intensity * 25);

  const streaks = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      left: `${(i * (100 / count) + (i % 3) * 1.7) % 100}%`,
      animationDelay: `${(i * 0.11) % 1.8}s`,
      animationDuration: `${(1.1 - intensity * 0.35) + (i % 4) * 0.08}s`,
      opacity: (0.06 + (i % 4) * 0.04) * (0.5 + intensity * 0.5),
      height: 18 + intensity * 14,
    }));
  }, [count, intensity]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <style>{`
        @keyframes rain-fall {
          from { transform: translateY(-40px); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          to   { transform: translateY(100vh); opacity: 0; }
        }
      `}</style>
      {streaks.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute', left: s.left, top: 0,
            width: 1.5, height: s.height,
            background: 'rgba(180,210,255,0.55)',
            borderRadius: 1,
            animation: `rain-fall ${s.animationDuration} ${s.animationDelay} linear infinite`,
            opacity: s.opacity,
          }}
        />
      ))}
    </div>
  );
}

// ─── Forecast ─────────────────────────────────────────────────────────────────

type ForecastView = 'list' | 'graph';

function daySummary(day: DayGroup) {
  const temps = day.hours.map((h) => h.temperatureC);
  const high = Math.max(...temps);
  const low = Math.min(...temps);
  const mid = day.hours[Math.floor(day.hours.length / 2)] ?? day.hours[0];
  const precip = day.hours.reduce((s, h) => s + h.precipitationMm, 0);
  const avgWind = day.hours.reduce((s, h) => s + h.windMps, 0) / Math.max(day.hours.length, 1);
  const avgHum = day.hours.reduce((s, h) => s + h.humidityPct, 0) / Math.max(day.hours.length, 1);
  return { high, low, mid, precip, avgWind, avgHum };
}

function ForecastList({ days, course }: { days: DayGroup[]; course: Course }) {
  const [view, setView] = useState<ForecastView>('list');
  const tomorrow = days[1] ?? days[0];
  const summary = tomorrow ? daySummary(tomorrow) : null;

  return (
    <div style={{ background: theme.bg, minHeight: 'calc(100dvh - 108px)', padding: '12px 14px 32px' }}>
      <div style={{ maxWidth: theme.maxWidth, margin: '0 auto' }}>
        {/* Tomorrow summary card */}
        {tomorrow && summary && (
          <div style={{
            background: theme.heroGradientSoft,
            borderRadius: theme.radiusXl,
            padding: '20px 20px 18px',
            marginBottom: 20,
            boxShadow: theme.shadowHero,
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <WeatherIcon
                symbolVar={summary.mid.symbolVar}
                symbolName={summary.mid.symbolName}
                size={72}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                  {days[1] ? 'Á morgun' : 'Í dag'}
                </div>
                <div style={{
                  fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: -1.5,
                  fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, marginTop: 2,
                }}>
                  {Math.round(summary.high)}/{Math.round(summary.low)}°
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
                  {getConditionText(summary.mid.symbolVar, summary.mid.symbolName)}
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-around',
              marginTop: 16, paddingTop: 14,
              borderTop: '1px solid rgba(255,255,255,0.2)',
            }}>
              <div style={{ textAlign: 'center' }}>
                <MetricIcon kind="wind" />
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 4 }}>
                  {Math.round(summary.avgWind)} m/s
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <MetricIcon kind="humidity" />
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 4 }}>
                  {Math.round(summary.avgHum)}%
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <MetricIcon kind="rain" />
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 4 }}>
                  {summary.precip > 0.05 ? `${Math.round(summary.precip * 10) / 10} mm` : '0 mm'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View toggle */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', marginBottom: 12,
        }}>
          <div style={{
            display: 'flex', borderRadius: theme.radiusPill, overflow: 'hidden',
            border: `1px solid ${theme.border}`, background: theme.bgCard,
          }}>
            {(['list', 'graph'] as ForecastView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '6px 14px',
                  border: 'none',
                  cursor: 'pointer',
                  background: view === v ? theme.heroGradient : 'transparent',
                  color: view === v ? '#fff' : theme.textMuted,
                  fontSize: 12, fontWeight: 700, letterSpacing: 0.3,
                  fontFamily: 'inherit',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {v === 'list' ? 'Listi' : 'Graf'}
              </button>
            ))}
          </div>
        </div>

        {/* Day rows + detail */}
        {days.map((day, dayIdx) => {
          const sun = getSunTimes(course.lat, course.lon, day.date);
          const s = daySummary(day);
          const label = dayIdx === 0 ? 'Í dag' : dayIdx === 1 ? 'Á morgun' : IS_DAYS_SHORT[day.date.getDay()];

          return (
            <div key={dayIdx} style={{ marginBottom: 16 }}>
              {/* Day summary row (mock-style) */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 4px',
              }}>
                <div style={{
                  width: 42, fontSize: 14, fontWeight: 700, color: theme.textMuted,
                }}>
                  {label}
                </div>
                <WeatherIcon symbolVar={s.mid.symbolVar} symbolName={s.mid.symbolName} size={34} />
                <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: theme.text }}>
                  {getConditionText(s.mid.symbolVar, s.mid.symbolName)}
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 700, color: theme.text,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  <span>{formatTemp(s.high)}</span>
                  {' '}
                  <span style={{ color: theme.textMuted }}>{formatTemp(s.low)}</span>
                </div>
              </div>

              {/* Hourly detail card */}
              <div style={{
                background: theme.bgElevated,
                borderRadius: theme.radiusLg,
                border: `1px solid ${theme.border}`,
                overflow: 'hidden',
              }}>
                {view === 'list' ? (
                  day.hours.map((slot, i) => {
                    const time = slot.from.toLocaleTimeString('is-IS', {
                      hour: '2-digit', minute: '2-digit', hour12: false,
                    });
                    const tempInt = Math.round(slot.temperatureC);
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px 14px',
                          borderBottom: i < day.hours.length - 1 ? `1px solid ${theme.border}` : 'none',
                          gap: 12,
                        }}
                      >
                        <div style={{
                          width: 46, flexShrink: 0,
                          fontSize: 13, fontWeight: 700, color: theme.textMuted,
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {time}
                        </div>
                        <div style={{ width: 34, flexShrink: 0 }}>
                          <WeatherIcon symbolVar={slot.symbolVar} symbolName={slot.symbolName} size={28} />
                        </div>
                        <div style={{
                          width: 52, flexShrink: 0,
                          fontSize: 20, fontWeight: 800, lineHeight: 1,
                          color: theme.text, fontVariantNumeric: 'tabular-nums',
                        }}>
                          {tempInt > 0 ? `+${tempInt}` : tempInt}°
                        </div>
                        <div style={{
                          flex: 1, fontSize: 13, fontWeight: 600, color: theme.textMuted,
                        }}>
                          {Math.round(slot.windMps)} m/s {slot.windCode}
                        </div>
                        <div style={{
                          flexShrink: 0, textAlign: 'right',
                          fontSize: 13, fontWeight: 600,
                          color: slot.precipitationMm >= 0.1 ? theme.blueGlow : theme.textDim,
                        }}>
                          {slot.precipitationMm >= 0.1
                            ? `${slot.precipitationMm.toFixed(1)} mm`
                            : '–'}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ display: 'flex' }}>
                    <div style={{
                      flexShrink: 0, borderRight: `1px solid ${theme.border}`,
                      background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column',
                    }}>
                      {ROW_LABELS.map((lbl, i) => (
                        <div
                          key={lbl}
                          style={{
                            height: ROW_HEIGHTS[i],
                            display: 'flex', alignItems: 'center',
                            padding: '0 10px',
                            fontSize: 11, color: theme.textDim, fontWeight: 500,
                            borderBottom: i < ROW_LABELS.length - 1 ? `1px solid ${theme.border}` : 'none',
                            whiteSpace: 'nowrap', minWidth: 82,
                          }}
                        >
                          {lbl}
                        </div>
                      ))}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <HourlyStrip hours={day.hours} />
                    </div>
                  </div>
                )}

                {!sun.polarNight && (
                  <div style={{
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 18,
                    fontSize: 12,
                    color: theme.textMuted,
                    fontWeight: 500,
                    borderTop: `1px solid ${theme.border}`,
                  }}>
                    {sun.midnightSun ? (
                      <span style={{ color: '#FFC857' }}>Miðnætursól — sól sest ekki</span>
                    ) : (
                      <>
                        <span>Sólarupprás {formatSunTime(sun.sunrise)}</span>
                        <span>Sólsetur {formatSunTime(sun.sunset)}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Course Info ──────────────────────────────────────────────────────────────

function CourseInfoCard({ course }: { course: Course }) {
  return (
    <div
      style={{
        background: theme.bgElevated,
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radiusLg,
        padding: '18px 18px',
        margin: '0 14px 24px',
        maxWidth: theme.maxWidth,
      }}
    >
      <h2 style={{
        margin: '0 0 14px', fontSize: 13, color: theme.blueGlow,
        fontWeight: 700, letterSpacing: 0.3,
      }}>
        Upplýsingar um völl
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(course.extra.address ?? []).length > 0 && (
          <InfoRow label="Heimilisfang" value={course.extra.address.join(', ')} />
        )}
        {course.extra.phone && (
          <InfoRow label="Sími" value={<a href={`tel:${course.extra.phone}`} style={{ color: theme.accent }}>{course.extra.phone}</a>} />
        )}
        {course.extra.email && (
          <InfoRow label="Netfang" value={<a href={`mailto:${course.extra.email}`} style={{ color: theme.accent }}>{course.extra.email}</a>} />
        )}
        {course.extra.webpage && (
          <InfoRow label="Vefsíða" value={
            <a href={course.extra.webpage} target="_blank" rel="noopener noreferrer" style={{ color: theme.accent }}>
              {course.extra.webpage.replace(/^https?:\/\//, '')}
            </a>
          } />
        )}
        <InfoRow label="Hnit" value={`${course.lat.toFixed(4)}°N, ${Math.abs(course.lon).toFixed(4)}°V`} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
      <span style={{ color: theme.textDim, minWidth: 76, flexShrink: 0 }}>{label}</span>
      <span style={{ color: theme.text }}>{value}</span>
    </div>
  );
}

// ─── Share Dialog ─────────────────────────────────────────────────────────────

function ShareDialog({ course, slot, onClose }: { course: Course; slot: HourlySlot | null; onClose: () => void }) {
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const tempStr = slot
    ? `${Math.round(slot.temperatureC) > 0 ? '+' : ''}${Math.round(slot.temperatureC)}°`
    : '';
  const windStr = slot ? `${Math.round(slot.windMps)} m/s ${slot.windCode}` : '';
  const condStr = slot ? getConditionText(slot.symbolVar, slot.symbolName) : '';
  const timeStr = slot
    ? slot.from.toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '';
  const dateStr = slot ? formatDateIS(slot.from) : '';

  const shareText = [
    message.trim(),
    `${course.name} — ${dateStr} ${timeStr}`,
    `${getEmoji(slot?.symbolVar ?? '', slot?.symbolName ?? '')} ${tempStr} · ${windStr}${condStr ? ` · ${condStr}` : ''}`,
  ].filter(Boolean).join('\n');

  function doShare() {
    if (navigator.share) {
      navigator.share({ title: 'Golfveður', text: shareText, url: window.location.href })
        .then(onClose)
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(`${shareText}\n${window.location.href}`);
      setCopied(true);
      setTimeout(onClose, 1200);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.bgElevated,
          borderRadius: `${theme.radiusXl}px ${theme.radiusXl}px 0 0`,
          padding: '24px 20px 36px',
          width: '100%', maxWidth: 520,
          border: `1px solid ${theme.border}`,
          boxShadow: '0 -8px 40px rgba(0,0,0,0.45)',
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 20px' }} />
        <div style={{ fontSize: 17, fontWeight: 700, color: theme.text, marginBottom: 16 }}>Deila veðri</div>

        {slot && (
          <div style={{
            background: theme.heroGradient, borderRadius: theme.radiusMd, padding: '12px 16px',
            marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <WeatherIcon symbolVar={slot.symbolVar} symbolName={slot.symbolName} size={44} />
            <div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                {course.name} · {dateStr} {timeStr}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginTop: 2 }}>
                {tempStr}
                <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginLeft: 10 }}>
                  {windStr}
                </span>
              </div>
              {condStr && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{condStr}</div>
              )}
            </div>
          </div>
        )}

        <textarea
          placeholder="Bæta við skilaboðum (valfrjálst)…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={200}
          style={{
            width: '100%', boxSizing: 'border-box',
            border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm,
            padding: '10px 12px', fontSize: 14, fontFamily: 'inherit',
            resize: 'none', outline: 'none', color: theme.text,
            background: 'rgba(255,255,255,0.05)',
          }}
        />

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '12px 0', borderRadius: theme.radiusSm,
              border: `1px solid ${theme.border}`, background: 'transparent',
              fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
              cursor: 'pointer', color: theme.textMuted,
            }}
          >
            Hætta við
          </button>
          <button
            onClick={doShare}
            style={{
              flex: 2, padding: '12px 0', borderRadius: theme.radiusSm,
              border: 'none', background: theme.heroGradient,
              fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
              cursor: 'pointer', color: '#fff',
            }}
          >
            {copied ? '✓ Afritað' : ('share' in navigator ? 'Deila' : 'Afrita tengil')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [days, setDays] = useState<DayGroup[]>([]);
  const [mainTab, setMainTab] = useState<MainTab>('now');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<HourlySlot | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);

  useEffect(() => {
    if (!id) return;
    const decodedId = decodeURIComponent(id);
    fetchCourses()
      .then((list) => {
        const found = list.find((c) => c.id === decodedId);
        if (!found) { setError('Völlur fannst ekki.'); setLoading(false); return undefined; }
        setCourse(found);
        return fetchForecast(found.lat, found.lon);
      })
      .then((dayGroups) => {
        if (dayGroups) setDays(dayGroups);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Tókst ekki að sækja veðurspá.');
        setLoading(false);
      });
  }, [id]);

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.bg,
      paddingTop: 56,
      paddingBottom: 64,
    }}>
      {/* Fixed top header */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, zIndex: 200,
        height: 56,
        padding: '0 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(11,12,30,0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${theme.border}`,
      }}>
        <button
          onClick={() => navigate('/')}
          aria-label="Til baka"
          style={{
            width: 36, height: 36,
            background: 'rgba(255,255,255,0.08)',
            border: `1px solid ${theme.border}`,
            color: '#fff',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: 18,
            fontWeight: 600,
            fontFamily: 'inherit',
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ‹
        </button>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
          {course && (
            <HeaderClubBadge url={getClubLogoUrl(course.extra.abbr, course.extra.webpage)} name={course.extra.club} />
          )}
          <div style={{ minWidth: 0, textAlign: 'center' }}>
            <div style={{
              fontWeight: 700, fontSize: 16, color: '#fff',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              letterSpacing: -0.2,
            }}>
              {course?.name ?? '…'}
            </div>
            {course && (
              <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }}>
                {course.extra.club}
              </div>
            )}
          </div>
        </div>

        {course && days.length > 0 ? (
          <button
            onClick={() => setShowShareDialog(true)}
            style={{
              width: 36, height: 36,
              background: 'rgba(255,255,255,0.08)',
              border: `1px solid ${theme.border}`,
              color: '#fff', borderRadius: '50%',
              cursor: 'pointer',
              fontSize: 14, fontFamily: 'inherit', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700,
            }}
            aria-label="Deila veðri"
          >
            ⋯
          </button>
        ) : (
          <div style={{ width: 36, flexShrink: 0 }} />
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 80, color: theme.textMuted }}>Sæki veðurspá…</div>
      )}
      {error && (
        <div style={{ textAlign: 'center', padding: 40, color: '#FF8A8A' }}>{error}</div>
      )}

      {!loading && !error && days.length > 0 && course && (
        <>
          {mainTab === 'now' && (
            <NowHero
              course={course}
              days={days}
              onActiveSlotChange={setActiveSlot}
              onOpenForecast={() => setMainTab('forecast')}
            />
          )}
          {mainTab === 'forecast' && (
            <>
              <ForecastList days={days} course={course} />
              <div style={{ maxWidth: theme.maxWidth, margin: '0 auto' }}>
                <CourseInfoCard course={course} />
              </div>
            </>
          )}
        </>
      )}

      {showShareDialog && course && (
        <ShareDialog
          course={course}
          slot={activeSlot ?? days[0]?.hours[0] ?? null}
          onClose={() => setShowShareDialog(false)}
        />
      )}

      {!loading && !error && (
        <div
          style={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            height: 60,
            background: 'rgba(11,12,30,0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: `1px solid ${theme.border}`,
            display: 'flex',
            zIndex: 200,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {(['now', 'forecast'] as MainTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setMainTab(tab)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                color: mainTab === tab ? theme.blueGlow : theme.textMuted,
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: mainTab === tab ? 800 : 500,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                transition: 'color 0.12s',
              }}
            >
              <span style={{
                width: 28, height: 3, borderRadius: 2,
                background: mainTab === tab ? theme.blueGlow : 'transparent',
                marginBottom: 2,
              }} />
              <span>{tab === 'now' ? 'Núna' : 'Næstu 5 dagar'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
