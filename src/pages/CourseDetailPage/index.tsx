import { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCourses, fetchForecast } from '../../api';
import type { Course, DayGroup, HourlySlot } from '../../types';
import { HourlyStrip, ROW_TIME_H, ROW_ICON_H, ROW_TEMP_H, ROW_PRECIP_H, ROW_WIND_H } from '../../components/HourlyStrip';
import { WeatherIcon, getWeatherGradient, getConditionText, getEmoji } from '../../components/WeatherIcon';
import { getSunTimes, formatSunTime } from '../../utils/sun';
import { getClubLogoUrl } from '../../components/CourseCard';

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
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        objectFit: 'contain', background: 'rgba(255,255,255,0.9)',
        border: '1.5px solid rgba(255,255,255,0.4)',
        padding: 2,
      }}
    />
  );
}

const ROW_LABELS = ['Tími', 'Veður', 'Hitastig', 'Rigning (mm)', 'Vindur'];
const ROW_HEIGHTS = [ROW_TIME_H, ROW_ICON_H, ROW_TEMP_H, ROW_PRECIP_H, ROW_WIND_H];

// Wind chill approximation (°C, wind in m/s)

function formatTemp(t: number): string {
  const r = Math.round(t);
  return r > 0 ? `+${r}°` : `${r}°`;
}

const WIND_NAME_IS: Record<string, string> = {
  'calm': 'Logn',
  'light air': 'Andvari',
  'light breeze': 'Kul',
  'gentle breeze': 'Gola',
  'moderate breeze': 'Stinningsgola',
  'fresh breeze': 'Kaldi',
  'strong breeze': 'Stór kaldi',
  'near gale': 'Allhvasst',
  'gale': 'Hvassviðri',
  'strong gale': 'Stormur',
  'storm': 'Rok',
  'violent storm': 'Ofsaveður',
  'hurricane': 'Fárviðri',
};

function translateWindName(name: string): string {
  return WIND_NAME_IS[name.toLowerCase()] ?? name;
}

const IS_MONTHS = ['jan', 'feb', 'mar', 'apr', 'maí', 'jún', 'júl', 'ágú', 'sep', 'okt', 'nóv', 'des'];
const IS_WEEKDAYS = ['sunnudagur', 'mánudagur', 'þriðjudagur', 'miðvikudagur', 'fimmtudagur', 'föstudagur', 'laugardagur'];

function formatDateIS(date: Date): string {
  const weekday = IS_WEEKDAYS[date.getDay()];
  const day = date.getDate();
  const month = IS_MONTHS[date.getMonth()];
  return `${weekday} ${day}. ${month}`;
}



// ─── Now Hero ──────────────────────────────────────────────────────────────────

const COL_W = 64;

interface TimelineStripProps {
  hours: HourlySlot[];
  activeIdx: number;
  onActiveChange: (idx: number) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

function HourlyTimelineStrip({ hours, activeIdx, onActiveChange, scrollRef }: TimelineStripProps) {
  // Track drag distance to distinguish tap from scroll on mouse
  const dragMoved = useRef(false);

  // Keep strip scrolled so the active column is visible (but don't fight user scrolling)
  const prevActiveIdx = useRef(activeIdx);
  useEffect(() => {
    if (!scrollRef.current) return;
    // Only auto-scroll when activeIdx was changed programmatically (hero drag),
    // not when it changed because the user scrolled the strip itself.
    if (prevActiveIdx.current !== activeIdx) {
      scrollRef.current.scrollLeft = activeIdx * COL_W;
    }
    prevActiveIdx.current = activeIdx;
  }, [activeIdx]);

  function handleScroll() {
    if (!scrollRef.current) return;
    const idx = Math.round(scrollRef.current.scrollLeft / COL_W);
    prevActiveIdx.current = idx; // mark as strip-driven so useEffect doesn't fight it
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
            const isNow = i === 0;
            const hourLabel = slot.from.toLocaleTimeString('is-IS', {
              hour: '2-digit', minute: '2-digit', hour12: false,
            });

            return (
              <div
                key={i}
                onClick={() => { if (!dragMoved.current) onActiveChange(i); }}
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
                  cursor: 'pointer',
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
                    Nú
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

function NowHero({ days, onActiveSlotChange }: { course: Course; days: DayGroup[]; onActiveSlotChange?: (slot: HourlySlot) => void }) {
  const now = new Date();

  // Slice away past hours so the strip always starts at the current hour
  const allHours = useMemo(() => {
    const hours = days.flatMap((d) => d.hours);
    const idx = hours.findIndex((h) => h.from <= now && h.to > now);
    return idx > 0 ? hours.slice(idx) : hours;
  }, [days]);

  const [activeIdx, setActiveIdx] = useState(0);
  const stripScrollRef = useRef<HTMLDivElement>(null);

  // Sync strip scroll position whenever activeIdx changes programmatically
  function changeActive(idx: number) {
    const clamped = Math.max(0, Math.min(idx, allHours.length - 1));
    setActiveIdx(clamped);
    if (stripScrollRef.current) {
      stripScrollRef.current.scrollLeft = clamped * COL_W;
    }
    if (allHours[clamped]) onActiveSlotChange?.(allHours[clamped]);
  }

  // Report initial slot to parent
  useEffect(() => {
    if (allHours[0]) onActiveSlotChange?.(allHours[0]);
  }, [allHours]);

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
  const slotDay = days.find((d) => d.hours.some((h) => h.from.getTime() === slot?.from.getTime()));
  const dayHours = slotDay?.hours ?? days[0]?.hours ?? [];
  const dayTemps = dayHours.map((h) => h.temperatureC);
  const high = Math.max(...dayTemps);
  const low = Math.min(...dayTemps);
  const dayPrecip = dayHours.reduce((sum, h) => sum + h.precipitationMm, 0);

  const bg = slot
    ? getWeatherGradient(slot.symbolVar, slot.symbolName, slot.from.getHours())
    : 'linear-gradient(180deg, #4a6080 0%, #8aa0b0 100%)';


  const conditionText = slot ? getConditionText(slot.symbolVar, slot.symbolName) : '';

  const slotDateLabel = slot ? formatDateIS(slot.from) : '';

  return (
    <div
      className="now-hero"
      style={{
        background: bg,
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
        {/* Time + date */}
        {slot && (
          <div style={{ marginBottom: 12, textAlign: 'center' }}>
            <div style={{
              fontSize: 36, fontWeight: 700, color: '#fff',
              letterSpacing: 1, lineHeight: 1,
            }}>
              {slot.from.toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </div>
            <div style={{
              fontSize: 13, color: 'rgba(255,255,255,0.65)',
              fontWeight: 500, marginTop: 5, letterSpacing: 0.3,
              textTransform: 'uppercase',
            }}>
              {slotDateLabel}
            </div>
          </div>
        )}

        {/* Icon */}
        {slot && (
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 56, lineHeight: 1 }}>
              {getEmoji(slot.symbolVar, slot.symbolName)}
            </span>
          </div>
        )}

        {/* Temperature */}
        {slot && (
          <div style={{
            fontSize: 80, fontWeight: 700, color: '#fff',
            lineHeight: 1, letterSpacing: -2,
          }}>
            {formatTemp(slot.temperatureC)}
          </div>
        )}

        {/* Condition */}
        {conditionText && (
          <div style={{
            color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 700,
            marginTop: 8, textTransform: 'uppercase', letterSpacing: 1,
          }}>
            {conditionText}
              </div>
            )}

        {/* Wind */}
        {slot && (
          <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: 600, marginTop: 10, textAlign: 'center' }}>
            {translateWindName(slot.windName)} frá {slot.windCode} · {slot.windMps.toFixed(1)} m/s
          </div>
        )}

        {/* High / low / precip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, marginTop: 16,
          fontSize: 13, fontWeight: 600,
          borderTop: '1px solid rgba(255,255,255,0.2)',
          paddingTop: 14,
        }}>
          <span style={{ color: 'rgba(255,255,255,0.9)' }}>
            <span style={{ color: '#ffca80' }}>↑</span> {formatTemp(high)}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
          <span style={{ color: 'rgba(255,255,255,0.9)' }}>
            <span style={{ color: '#80c8ff' }}>↓</span> {formatTemp(low)}
          </span>
          {dayPrecip > 0.05 && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
              <span style={{ color: 'rgba(180,220,255,0.9)' }}>
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

type ForecastView = 'list' | 'graph';

function ForecastList({ days, course }: { days: DayGroup[]; course: Course }) {
  const [view, setView] = useState<ForecastView>('list');

  return (
    <div style={{ background: '#eaecf2', minHeight: 'calc(100dvh - 108px)', paddingBottom: 32 }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {days.map((day, dayIdx) => {
        const sun = getSunTimes(course.lat, course.lon, day.date);
        return (
        <div key={dayIdx} style={{ marginBottom: 0 }}>
          {/* Day header */}
          <div style={{
            background: '#003c71',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{
              fontSize: 12, fontWeight: 800, color: '#fff',
              letterSpacing: 1.5, textTransform: 'uppercase',
            }}>
              {dayIdx === 0 ? 'Í dag' : dayIdx === 1 ? 'Á morgun' : formatDateIS(day.date)}
            </span>

            {/* LIST / GRAF toggle — shown on every day header */}
            <div style={{
              display: 'flex', borderRadius: 6, overflow: 'hidden',
              border: '1.5px solid rgba(255,255,255,0.3)',
            }}>
              {(['list', 'graph'] as ForecastView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding: '4px 12px',
                    border: 'none',
                    cursor: 'pointer',
                    background: view === v ? '#fff' : 'transparent',
                    color: view === v ? '#003c71' : 'rgba(255,255,255,0.75)',
                    fontSize: 11, fontWeight: 800, letterSpacing: 1,
                    textTransform: 'uppercase', fontFamily: 'inherit',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {v === 'list' ? 'Listi' : 'Graf'}
                </button>
              ))}
            </div>
          </div>

          {/* Content card */}
          <div style={{ background: '#fff', borderBottom: '1px solid #dde0e8' }}>
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
                      padding: '12px 16px',
                      borderBottom: i < day.hours.length - 1 ? '1px solid #f0f2f5' : 'none',
                      gap: 14,
                    }}
                  >
                    {/* Time */}
                    <div style={{
                      width: 46, flexShrink: 0,
                      fontSize: 14, fontWeight: 700, color: '#222',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {time}
                    </div>

                    {/* Icon */}
                    <div style={{ width: 34, flexShrink: 0 }}>
                      <WeatherIcon symbolVar={slot.symbolVar} symbolName={slot.symbolName} size={28} />
                    </div>

                    {/* Temperature */}
                    <div style={{
                      width: 52, flexShrink: 0,
                      fontSize: 22, fontWeight: 800, lineHeight: 1,
                      color: slot.temperatureC < 0 ? '#3a7ab8' : '#1a1a1a',
                    }}>
                      {tempInt > 0 ? `+${tempInt}` : tempInt}°
                    </div>

                    {/* Wind */}
                    <div style={{
                      flex: 1,
                      fontSize: 13, fontWeight: 600, color: '#555',
                    }}>
                      {slot.windMps.toFixed(1)} m/s {slot.windCode}
                    </div>

                    {/* Precipitation */}
                    <div style={{
                      flexShrink: 0, textAlign: 'right',
                      fontSize: 13, fontWeight: 600,
                      color: slot.precipitationMm >= 0.1 ? '#4a90d9' : '#ccc',
                    }}>
                      {slot.precipitationMm >= 0.1
                        ? `${slot.precipitationMm.toFixed(1)} mm`
                        : '–'}
                    </div>
                  </div>
                );
              })
            ) : (
              /* Graph view */
              <div>
                <div style={{ display: 'flex' }}>
                  <div style={{
                    flexShrink: 0, borderRight: '1px solid #e4e4de',
                    background: '#fafaf8', display: 'flex', flexDirection: 'column',
                  }}>
                    {ROW_LABELS.map((label, i) => (
                      <div
                        key={label}
                        style={{
                          height: ROW_HEIGHTS[i],
                          display: 'flex', alignItems: 'center',
                          padding: '0 10px',
                          fontSize: 11, color: '#999', fontWeight: 500,
                          borderBottom: i < ROW_LABELS.length - 1 ? '1px solid #e8e8e4' : 'none',
                          whiteSpace: 'nowrap', minWidth: 82,
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

          {/* Sunrise / sunset row */}
          {!sun.polarNight && (
            <div style={{
              background: '#fff',
              borderBottom: '1px solid #dde0e8',
              padding: '9px 16px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 20,
              fontSize: 12,
              color: '#888',
              fontWeight: 500,
            }}>
              {sun.midnightSun ? (
                <span style={{ color: '#f5a623' }}>Miðnætursól — sól sest ekki</span>
              ) : (
                <>
                  <span>🌅 {formatSunTime(sun.sunrise)}</span>
                  <span>🌇 {formatSunTime(sun.sunset)}</span>
          </>
        )}
      </div>
          )}
        </div>
        );
      })}
      </div>
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
        Upplýsingar um völl
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {(course.extra.address ?? []).length > 0 && (
          <InfoRow label="Heimilisfang" value={course.extra.address.join(', ')} />
        )}
        {course.extra.phone && (
          <InfoRow label="Sími" value={<a href={`tel:${course.extra.phone}`} style={{ color: '#003c71' }}>{course.extra.phone}</a>} />
        )}
        {course.extra.email && (
          <InfoRow label="Netfang" value={<a href={`mailto:${course.extra.email}`} style={{ color: '#003c71' }}>{course.extra.email}</a>} />
        )}
        {course.extra.webpage && (
          <InfoRow label="Vefsíða" value={
            <a href={course.extra.webpage} target="_blank" rel="noopener noreferrer" style={{ color: '#003c71' }}>
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
      <span style={{ color: '#aaa', minWidth: 76, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#222' }}>{value}</span>
    </div>
  );
}

// ─── Share Dialog ──────────────────────────────────────────────────────────────

function ShareDialog({ course, slot, onClose }: { course: Course; slot: HourlySlot | null; onClose: () => void }) {
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const tempStr = slot
    ? `${Math.round(slot.temperatureC) > 0 ? '+' : ''}${Math.round(slot.temperatureC)}°`
    : '';
  const windStr = slot ? `${slot.windMps.toFixed(1)} m/s ${slot.windCode}` : '';
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
        .catch(() => {}); // user cancelled
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
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '18px 18px 0 0',
          padding: '24px 20px 36px',
          width: '100%', maxWidth: 520,
          boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
        }}
      >
        {/* Handle bar */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#ddd', margin: '0 auto 20px' }} />

        <div style={{ fontSize: 17, fontWeight: 700, color: '#111', marginBottom: 16 }}>Deila veðri</div>

        {/* Weather preview */}
        {slot && (
          <div style={{
            background: '#f5f7fa', borderRadius: 12, padding: '12px 16px',
            marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ fontSize: 36 }}>{getEmoji(slot.symbolVar, slot.symbolName)}</div>
            <div>
              <div style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>
                {course.name} · {dateStr} {timeStr}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#111', marginTop: 2 }}>
                {tempStr}
                <span style={{ fontSize: 14, fontWeight: 600, color: '#555', marginLeft: 10 }}>
                  {windStr}
                </span>
              </div>
              {condStr && (
                <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>{condStr}</div>
              )}
            </div>
          </div>
        )}

        {/* Message input */}
        <textarea
          placeholder="Bæta við skilaboðum (valfrjálst)…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={200}
          style={{
            width: '100%', boxSizing: 'border-box',
            border: '1px solid #dde0e8', borderRadius: 10,
            padding: '10px 12px', fontSize: 14, fontFamily: 'inherit',
            resize: 'none', outline: 'none', color: '#222',
            background: '#fafafa',
          }}
        />

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 10,
              border: '1px solid #dde0e8', background: '#fff',
              fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
              cursor: 'pointer', color: '#555',
            }}
          >
            Hætta við
          </button>
          <button
            onClick={doShare}
            style={{
              flex: 2, padding: '12px 0', borderRadius: 10,
              border: 'none', background: '#003c71',
              fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
              cursor: 'pointer', color: '#fff',
            }}
          >
            {copied ? '✓ Afritað' : (navigator.share ? 'Deila' : 'Afrita tengil')}
          </button>
        </div>
      </div>
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
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          {course && (
            <HeaderClubBadge url={getClubLogoUrl(course.extra.abbr, course.extra.webpage)} name={course.extra.club} />
          )}
          <div style={{ minWidth: 0 }}>
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

        {/* Share button */}
        {course && days.length > 0 && (
          <button
            onClick={() => setShowShareDialog(true)}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none', color: '#fff', borderRadius: 6,
              padding: '5px 10px', cursor: 'pointer',
              fontSize: 12, fontFamily: 'inherit', flexShrink: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              fontWeight: 600, lineHeight: 1.2,
            }}
            aria-label="Deila veðri"
          >
            <span style={{ fontSize: 16 }}>↑</span>
            <span>Deila</span>
          </button>
        )}
      </div>

      {/* Content */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 80, color: '#888' }}>Sæki veðurspá…</div>
      )}
      {error && (
        <div style={{ textAlign: 'center', padding: 40, color: '#c00' }}>{error}</div>
      )}

      {!loading && !error && days.length > 0 && course && (
        <>
          {mainTab === 'now' && (
            <NowHero course={course} days={days} onActiveSlotChange={setActiveSlot} />
          )}
          {mainTab === 'forecast' && (
            <>
              <ForecastList days={days} course={course} />
              <CourseInfoCard course={course} />
            </>
          )}
        </>
      )}

      {/* Share dialog */}
      {showShareDialog && course && (
        <ShareDialog
          course={course}
          slot={activeSlot ?? days[0]?.hours[0] ?? null}
          onClose={() => setShowShareDialog(false)}
        />
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
                fontSize: 14,
                fontWeight: mainTab === tab ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.12s',
              }}
            >
              <span>{tab === 'now' ? 'Núna' : 'Næstu 5 dagar'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
