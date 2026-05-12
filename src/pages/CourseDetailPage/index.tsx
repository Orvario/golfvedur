import { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCourses, fetchForecast } from '../../api';
import type { Course, DayGroup, HourlySlot } from '../../types';
import { HourlyStrip, ROW_TIME_H, ROW_ICON_H, ROW_TEMP_H, ROW_PRECIP_H, ROW_WIND_H } from '../../components/HourlyStrip';
import { WeatherIcon, getWeatherGradient, getConditionText, getEmoji } from '../../components/WeatherIcon';
import { WindArrow } from '../../components/WindArrow';

type MainTab = 'now' | 'forecast';

const ROW_LABELS = ['Time', 'Weather', 'Temperature', 'Rain (mm)', 'Wind'];
const ROW_HEIGHTS = [ROW_TIME_H, ROW_ICON_H, ROW_TEMP_H, ROW_PRECIP_H, ROW_WIND_H];

// Wind chill approximation (°C, wind in m/s)
function feelsLike(tempC: number, windMps: number): number {
  if (tempC > 10 || windMps < 1.3) return tempC;
  const v = windMps * 3.6; // km/h
  return 13.12 + 0.6215 * tempC - 11.37 * Math.pow(v, 0.16) + 0.3965 * tempC * Math.pow(v, 0.16);
}

function formatTemp(t: number): string {
  const r = Math.round(t);
  return r > 0 ? `+${r}°` : `${r}°`;
}

// Group hours into 6-hour slot blocks: 01-07, 07-13, 13-19, 19-01
type SlotLabel = 'Night' | 'Morning' | 'Afternoon' | 'Evening';
interface SixHourSlot {
  label: SlotLabel;
  timeRange: string;
  hours: HourlySlot[];
  icon: HourlySlot;
  tempMin: number;
  tempMax: number;
  totalPrecip: number;
  avgWindMps: number;
  maxWindMps: number;
  dominantWindDeg: number;
}

function groupIntoSixHourSlots(hours: HourlySlot[]): SixHourSlot[] {
  const SLOTS: { label: SlotLabel; range: string; start: number; end: number }[] = [
    { label: 'Night', range: '01–07', start: 1, end: 7 },
    { label: 'Morning', range: '07–13', start: 7, end: 13 },
    { label: 'Afternoon', range: '13–19', start: 13, end: 19 },
    { label: 'Evening', range: '19–01', start: 19, end: 25 },
  ];
  const results: SixHourSlot[] = [];
  for (const s of SLOTS) {
    const slotHours = hours.filter((h) => {
      const hr = h.from.getHours();
      return hr >= s.start && hr < s.end;
    });
    if (slotHours.length === 0) continue;
    // Representative hour: midpoint or noon for morning etc.
    const midIdx = Math.floor(slotHours.length / 2);
    const icon = slotHours[midIdx];
    results.push({
      label: s.label,
      timeRange: s.range,
      hours: slotHours,
      icon,
      tempMin: Math.min(...slotHours.map((h) => h.temperatureC)),
      tempMax: Math.max(...slotHours.map((h) => h.temperatureC)),
      totalPrecip: slotHours.reduce((sum, h) => sum + h.precipitationMm, 0),
      avgWindMps: slotHours.reduce((sum, h) => sum + h.windMps, 0) / slotHours.length,
      maxWindMps: Math.max(...slotHours.map((h) => h.windMps)),
      dominantWindDeg: icon.windDeg,
    });
  }
  return results;
}


// ─── Now Hero ──────────────────────────────────────────────────────────────────

const COL_W = 64;

interface TimelineStripProps {
  hours: HourlySlot[];
  nowIdx: number;
  activeIdx: number;
  onActiveChange: (idx: number) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

function HourlyTimelineStrip({ hours, nowIdx, activeIdx, onActiveChange, scrollRef }: TimelineStripProps) {
  // On mount, scroll to bring the current hour to the left edge
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollLeft = Math.max(0, nowIdx * COL_W - 12);
  }, [nowIdx]);

  function handleScroll() {
    if (!scrollRef.current) return;
    const idx = Math.round(scrollRef.current.scrollLeft / COL_W);
    onActiveChange(Math.max(0, Math.min(idx, hours.length - 1)));
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    if (!el) return;
    const startX = e.pageX;
    const startScroll = el.scrollLeft;
    let moved = false;
    const onMove = (ev: MouseEvent) => {
      const dx = ev.pageX - startX;
      if (Math.abs(dx) > 4) moved = true;
      if (moved) {
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
    void moved;
  }

  const totalWidth = hours.length * COL_W;

  return (
    <div style={{ position: 'relative' }}>
      {/* Left "Now" anchor indicator */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
        background: 'rgba(255,255,255,0.35)', zIndex: 3, pointerEvents: 'none',
      }} />
      {/* Right fade */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 40,
        background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.4))',
        pointerEvents: 'none', zIndex: 2,
      }} />

      <div
        ref={scrollRef}
        style={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          cursor: 'grab',
          userSelect: 'none',
          scrollbarWidth: 'none',
        }}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
      >
        <style>{`
          .now-timeline::-webkit-scrollbar { display: none; }
        `}</style>
        <div className="now-timeline" style={{ width: totalWidth, display: 'flex' }}>
          {hours.map((slot, i) => {
            const isActive = i === activeIdx;
            const isNow = i === nowIdx;
            const hourLabel = slot.from.toLocaleTimeString('en-GB', {
              hour: '2-digit', minute: '2-digit', hour12: false,
            });

            return (
              <div
                key={i}
                style={{
                  width: COL_W,
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '12px 0 12px',
                  gap: 5,
                  background: isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
              >
                {/* "Now" pill */}
                {isNow && (
                  <div style={{
                    position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
                    background: '#fff', color: '#003c71', fontSize: 8, fontWeight: 800,
                    padding: '2px 6px', borderRadius: 6, letterSpacing: 0.5,
                    textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                    Now
                  </div>
                )}
                <div style={{
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                  marginTop: isNow ? 8 : 0,
                }}>
                  {hourLabel}
                </div>
                <span style={{ fontSize: 22, lineHeight: 1 }}>
                  {getEmoji(slot.symbolVar, slot.symbolName)}
                </span>
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.8)',
                }}>
                  {formatTemp(slot.temperatureC)}
                </div>
                {slot.precipitationMm >= 0.2 && (
                  <div style={{ fontSize: 10, color: 'rgba(180,220,255,0.9)', fontWeight: 600 }}>
                    {slot.precipitationMm.toFixed(1)}
                  </div>
                )}
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
                  {slot.windMps.toFixed(0)} m/s
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NowHero({ days }: { course: Course; days: DayGroup[] }) {
  const now = new Date();
  const allHours = useMemo(() => days.flatMap((d) => d.hours), [days]);
  const nowIdx = useMemo(() => {
    const idx = allHours.findIndex((h) => h.from <= now && h.to > now);
    return Math.max(0, idx);
  }, [allHours]);

  const [activeIdx, setActiveIdx] = useState(nowIdx);
  const stripScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setActiveIdx(nowIdx); }, [nowIdx]);

  // Sync strip scroll position whenever activeIdx changes programmatically
  function changeActive(idx: number) {
    const clamped = Math.max(0, Math.min(idx, allHours.length - 1));
    setActiveIdx(clamped);
    if (stripScrollRef.current) {
      stripScrollRef.current.scrollLeft = clamped * COL_W;
    }
  }

  // Hero-area drag/swipe — controls same activeIdx as the strip
  const heroRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startIdx: number; axis: 'h' | 'v' | null } | null>(null);

  function onHeroTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    dragState.current = { startX: t.clientX, startIdx: activeIdx, axis: null };
  }
  function onHeroTouchMove(e: React.TouchEvent) {
    if (!dragState.current) return;
    const t = e.touches[0];
    const dx = t.clientX - dragState.current.startX;
    // Determine axis on first significant movement
    if (dragState.current.axis === null) {
      const dy = Math.abs((e.touches[0] as Touch & { clientY: number }).clientY - (e.changedTouches[0] as Touch).clientY);
      if (Math.abs(dx) > 6 || dy > 6) {
        dragState.current.axis = Math.abs(dx) >= dy ? 'h' : 'v';
      }
    }
    if (dragState.current.axis !== 'h') return;
    e.preventDefault(); // prevent page scroll while swiping horizontally
    const delta = Math.round(-dx / COL_W);
    changeActive(dragState.current.startIdx + delta);
  }
  function onHeroTouchEnd() {
    dragState.current = null;
  }

  function onHeroMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    // Only handle clicks on the hero body, not the strip
    const startX = e.clientX;
    const startActiveIdx = activeIdx;
    let moved = false;
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 6) moved = true;
      if (moved) changeActive(startActiveIdx + Math.round(-dx / COL_W));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (heroRef.current) heroRef.current.style.cursor = 'grab';
    };
    if (heroRef.current) heroRef.current.style.cursor = 'grabbing';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    void moved;
  }

  const slot = allHours[activeIdx] ?? allHours[0];
  const isNowSlot = activeIdx === nowIdx;

  const slotDay = days.find((d) => d.hours.some((h) => h.from.getTime() === slot?.from.getTime()));
  const dayHours = slotDay?.hours ?? days[0]?.hours ?? [];
  const dayTemps = dayHours.map((h) => h.temperatureC);
  const high = Math.max(...dayTemps);
  const low = Math.min(...dayTemps);
  const dayPrecip = dayHours.reduce((sum, h) => sum + h.precipitationMm, 0);

  const bg = slot
    ? getWeatherGradient(slot.symbolVar, slot.symbolName, slot.from.getHours())
    : 'linear-gradient(180deg, #4a6080 0%, #8aa0b0 100%)';

  const fl = slot ? Math.round(feelsLike(slot.temperatureC, slot.windMps)) : null;
  const conditionText = slot ? getConditionText(slot.symbolVar, slot.symbolName) : '';

  const slotDateLabel = slot
    ? slot.from.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  return (
    <div
      style={{
        background: bg,
        minHeight: 'calc(100vh - 56px)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        transition: 'background 0.6s ease',
      }}
    >
      {slot && isRainy(slot.symbolVar, slot.symbolName) && <RainStreaks />}

      {/* Hero content — full area is draggable */}
      <div
        ref={heroRef}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px 16px',
          zIndex: 1,
          position: 'relative',
          cursor: 'grab',
          userSelect: 'none',
          touchAction: 'pan-y', // allow vertical scroll; we intercept horizontal
        }}
        onMouseDown={onHeroMouseDown}
        onTouchStart={onHeroTouchStart}
        onTouchMove={onHeroTouchMove}
        onTouchEnd={onHeroTouchEnd}
      >
        {/* Date label when not "now" */}
        {!isNowSlot && slot && (
          <div style={{
            fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8,
            fontWeight: 500, letterSpacing: 0.2,
          }}>
            {slotDateLabel} · {slot.from.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </div>
        )}

        {slot && (
          <div style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 60, lineHeight: 1 }}>
              {getEmoji(slot.symbolVar, slot.symbolName)}
            </span>
          </div>
        )}

        {/* Temperature */}
        {slot && (
          <div style={{
            fontSize: 80, fontWeight: 300, color: '#fff',
            lineHeight: 1, letterSpacing: -2,
            textShadow: '0 2px 16px rgba(0,0,0,0.25)',
          }}>
            {formatTemp(slot.temperatureC)}
          </div>
        )}

        {/* Feels like */}
        {fl !== null && (
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, marginTop: 7 }}>
            Feels like {formatTemp(fl)}
          </div>
        )}

        {/* Wind */}
        {slot && (
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 5 }}>
            {slot.windName} from {slot.windCode} · {slot.windMps.toFixed(1)} m/s
          </div>
        )}

        {/* Condition */}
        <div style={{
          color: '#fff', fontSize: 18, fontWeight: 600, marginTop: 22,
          textAlign: 'center', textShadow: '0 1px 8px rgba(0,0,0,0.3)',
        }}>
          {conditionText}.
        </div>

        {/* High / low / precip for that day */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, marginTop: 16,
          color: 'rgba(255,255,255,0.85)', fontSize: 14,
        }}>
          <span>
            <span style={{ color: '#ffca80' }}>↑</span>
            {' '}<span style={{ fontWeight: 600 }}>{formatTemp(high)}</span>
          </span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
          <span>
            <span style={{ color: '#80c8ff' }}>↓</span>
            {' '}<span style={{ fontWeight: 600 }}>{formatTemp(low)}</span>
          </span>
          {dayPrecip > 0.05 && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
              <span style={{ color: 'rgba(180,220,255,0.9)', fontWeight: 600 }}>
                {dayPrecip.toFixed(1)} mm
              </span>
            </>
          )}
        </div>
      </div>

      {/* Scrollable hourly timeline */}
      <div style={{
        zIndex: 1, position: 'relative',
        borderTop: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(0,0,0,0.22)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}>
        <HourlyTimelineStrip
          hours={allHours}
          nowIdx={nowIdx}
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

function RainStreaks() {
  const streaks = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      left: `${(i * 5.3) % 100}%`,
      animationDelay: `${(i * 0.13) % 1.5}s`,
      animationDuration: `${0.7 + (i % 5) * 0.12}s`,
      opacity: 0.08 + (i % 4) * 0.05,
    }));
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
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
            position: 'absolute',
            left: s.left,
            top: 0,
            width: 1.5,
            height: 24,
            background: 'rgba(180,210,255,0.6)',
            borderRadius: 1,
            animation: `rain-fall ${s.animationDuration} ${s.animationDelay} linear infinite`,
            opacity: s.opacity,
          }}
        />
      ))}
    </div>
  );
}

// ─── Forecast List ─────────────────────────────────────────────────────────────

function ForecastList({ days }: { days: DayGroup[] }) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  return (
    <div style={{ background: '#f5f5f0', minHeight: 'calc(100vh - 56px)', paddingBottom: 24 }}>
      {days.map((day, dayIdx) => {
        const slots = groupIntoSixHourSlots(day.hours);
        const isExpanded = expandedDay === dayIdx;

        return (
          <div key={dayIdx} style={{ marginBottom: 0 }}>
            {/* Day header */}
            <div
              style={{
                padding: '14px 16px 6px',
                background: '#f5f5f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#333',
                  textTransform: 'none',
                }}
              >
                {dayIdx === 0 ? 'Today' : dayIdx === 1 ? 'Tomorrow' : ''}
                <span style={{ fontWeight: 400, color: '#888', marginLeft: dayIdx <= 1 ? 8 : 0 }}>
                  {day.date.toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </span>
              </span>
            </div>

            {/* Slot rows */}
            <div
              style={{
                background: '#fff',
                borderTop: '1px solid #eaeae4',
                borderBottom: '1px solid #eaeae4',
              }}
            >
              {slots.map((slot, slotIdx) => (
                <div
                  key={slotIdx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 16px',
                    borderBottom: slotIdx < slots.length - 1 ? '1px solid #f0f0ea' : 'none',
                    gap: 14,
                  }}
                >
                  {/* Time range */}
                  <div
                    style={{
                      fontSize: 13,
                      color: '#666',
                      fontWeight: 500,
                      minWidth: 46,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {slot.timeRange}
                  </div>

                  {/* Weather icon */}
                  <div style={{ width: 36, flexShrink: 0, textAlign: 'center' }}>
                    <WeatherIcon
                      symbolVar={slot.icon.symbolVar}
                      symbolName={slot.icon.symbolName}
                      size={26}
                    />
                  </div>

                  {/* Temperature */}
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 15,
                      fontWeight: 600,
                    }}
                  >
                    {slot.tempMin !== slot.tempMax ? (
                      <>
                        <span style={{ color: slot.tempMax < 0 ? '#3a7ab8' : '#1a1a1a' }}>
                          {formatTemp(slot.tempMax)}
                        </span>
                        <span style={{ color: '#bbb', fontWeight: 400, fontSize: 12 }}>/</span>
                        <span style={{ color: '#888', fontSize: 13, fontWeight: 500 }}>
                          {formatTemp(slot.tempMin)}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: slot.tempMax < 0 ? '#3a7ab8' : '#1a1a1a' }}>
                        {formatTemp(slot.tempMax)}
                      </span>
                    )}
                    {slot.totalPrecip >= 0.2 && (
                      <span style={{ color: '#4a90d9', fontSize: 12, marginLeft: 6, fontWeight: 500 }}>
                        {slot.totalPrecip.toFixed(1)} mm
                      </span>
                    )}
                  </div>

                  {/* Wind */}
                  <div style={{ flexShrink: 0 }}>
                    <WindArrow deg={slot.dominantWindDeg} mps={slot.avgWindMps} size={16} />
                  </div>
                </div>
              ))}

              {/* Details toggle */}
              <button
                onClick={() => setExpandedDay(isExpanded ? null : dayIdx)}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  borderTop: '1px solid #eaeae4',
                  padding: '9px 16px',
                  fontSize: 13,
                  color: '#003c71',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {isExpanded ? '▲' : '▼'} Details
              </button>

              {/* Expanded hourly strip */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid #eaeae4' }}>
                  <div style={{ display: 'flex' }}>
                    {/* Row label column */}
                    <div
                      style={{
                        flexShrink: 0,
                        borderRight: '1px solid #e4e4de',
                        background: '#fafaf8',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {ROW_LABELS.map((label, i) => (
                        <div
                          key={label}
                          style={{
                            height: ROW_HEIGHTS[i],
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 10px',
                            fontSize: 11,
                            color: '#999',
                            fontWeight: 500,
                            borderBottom: i < ROW_LABELS.length - 1 ? '1px solid #e8e8e4' : 'none',
                            whiteSpace: 'nowrap',
                            minWidth: 82,
                          }}
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <HourlyStrip hours={day.hours} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Course Info ───────────────────────────────────────────────────────────────

function CourseInfoCard({ course }: { course: Course }) {
  return (
    <div
      style={{
        background: '#fff',
        borderTop: '1px solid #eaeae4',
        borderBottom: '1px solid #eaeae4',
        padding: '16px 20px',
        marginTop: 8,
      }}
    >
      <h2 style={{ margin: '0 0 12px', fontSize: 14, color: '#003c71', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Course info
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {(course.extra.address ?? []).length > 0 && (
          <InfoRow label="Address" value={course.extra.address.join(', ')} />
        )}
        {course.extra.phone && (
          <InfoRow label="Phone" value={<a href={`tel:${course.extra.phone}`} style={{ color: '#003c71' }}>{course.extra.phone}</a>} />
        )}
        {course.extra.email && (
          <InfoRow label="Email" value={<a href={`mailto:${course.extra.email}`} style={{ color: '#003c71' }}>{course.extra.email}</a>} />
        )}
        {course.extra.webpage && (
          <InfoRow label="Website" value={
            <a href={course.extra.webpage} target="_blank" rel="noopener noreferrer" style={{ color: '#003c71' }}>
              {course.extra.webpage.replace(/^https?:\/\//, '')}
            </a>
          } />
        )}
        <InfoRow label="Coordinates" value={`${course.lat.toFixed(4)}°N, ${Math.abs(course.lon).toFixed(4)}°W`} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
      <span style={{ color: '#aaa', minWidth: 76, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#222' }}>{value}</span>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [days, setDays] = useState<DayGroup[]>([]);
  const [mainTab, setMainTab] = useState<MainTab>('now');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const decodedId = decodeURIComponent(id);
    fetchCourses()
      .then((list) => {
        const found = list.find((c) => c.id === decodedId);
        if (!found) { setError('Course not found.'); setLoading(false); return undefined; }
        setCourse(found);
        return fetchForecast(found.lat, found.lon);
      })
      .then((dayGroups) => {
        if (dayGroups) setDays(dayGroups);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load forecast.');
        setLoading(false);
      });
  }, [id]);

  // Determine header bg — transparent over hero, solid over list
  const headerBg = mainTab === 'now' && days.length > 0
    ? 'transparent'
    : '#003c71';

  // For gradient header when on "now" tab
  const nowSlot = days[0]?.hours[0];
  const heroGrad = nowSlot
    ? getWeatherGradient(nowSlot.symbolVar, nowSlot.symbolName, nowSlot.from.getHours())
    : undefined;

  const headerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 200,
    background: mainTab === 'now' && heroGrad
      ? heroGrad.split(' ')[2] // Use first color stop of gradient
      : '#003c71',
    borderBottom: mainTab === 'forecast' ? '1px solid rgba(255,255,255,0.1)' : 'none',
    padding: '0 16px',
    display: 'flex',
    alignItems: 'center',
    height: 52,
    gap: 10,
  };

  void headerBg; // suppress unused

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', paddingTop: 52, paddingBottom: 56 }}>
      {/* Fixed top header */}
      <div style={headerStyle}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            color: '#fff',
            borderRadius: 6,
            padding: '5px 10px',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'inherit',
            flexShrink: 0,
          }}
        >
          ‹
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700,
            fontSize: 16,
            color: '#fff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {course?.name ?? '…'}
          </div>
          {course && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>
              {course.extra.club}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 80, color: '#888' }}>Loading forecast…</div>
      )}
      {error && (
        <div style={{ textAlign: 'center', padding: 40, color: '#c00' }}>{error}</div>
      )}

      {!loading && !error && days.length > 0 && course && (
        <>
          {mainTab === 'now' && <NowHero course={course} days={days} />}
          {mainTab === 'forecast' && (
            <>
              <ForecastList days={days} />
              <CourseInfoCard course={course} />
            </>
          )}
        </>
      )}

      {/* Fixed bottom tab bar */}
      {!loading && !error && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 56,
            background: '#fff',
            borderTop: '1px solid #e0e0da',
            display: 'flex',
            zIndex: 200,
            boxShadow: '0 -2px 12px rgba(0,0,0,0.07)',
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
                borderTop: mainTab === tab ? '3px solid #003c71' : '3px solid transparent',
                color: mainTab === tab ? '#003c71' : '#888',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: mainTab === tab ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                paddingTop: 4,
                transition: 'color 0.12s',
              }}
            >
              <span style={{ fontSize: 18 }}>{tab === 'now' ? '🌡️' : '📅'}</span>
              <span>{tab === 'now' ? 'Now' : 'Forecast'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
