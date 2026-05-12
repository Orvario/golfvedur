import { useMemo, useRef } from 'react';
import type { HourlySlot } from '../../types';
import { WeatherIcon } from '../WeatherIcon';
import { WindArrow } from '../WindArrow';

interface Props {
  hours: HourlySlot[];
}

export const COL_W = 64;

// Explicit row heights — exported so StripWithLabels can stay in sync
export const ROW_TIME_H = 36;
export const ROW_ICON_H = 46;
export const ROW_TEMP_H = 76;
export const ROW_PRECIP_H = 40;
export const ROW_WIND_H = 52;

function formatHour(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function TempCurve({ hours, width }: { hours: HourlySlot[]; width: number }) {
  const temps = hours.map((h) => h.temperatureC);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const range = max - min || 1;

  const h = ROW_TEMP_H;
  const padTop = 18;
  const padBot = 8;

  const points = hours.map((slot, i) => {
    const x = i * COL_W + COL_W / 2;
    const y = padTop + ((max - slot.temperatureC) / range) * (h - padTop - padBot);
    return { x, y, t: slot.temperatureC };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg width={width} height={h} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a90d9" stopOpacity={0.25} />
          <stop offset="100%" stopColor="#4a90d9" stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        points={[
          `${points[0].x},${h}`,
          ...points.map((p) => `${p.x},${p.y}`),
          `${points[points.length - 1].x},${h}`,
        ].join(' ')}
        fill="url(#tempGrad)"
      />
      <polyline
        points={polyline}
        fill="none"
        stroke="#4a90d9"
        strokeWidth={2.2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={2.5} fill="#4a90d9" />
          <text
            x={p.x}
            y={p.y - 7}
            textAnchor="middle"
            fontSize={11}
            fontWeight={600}
            fill={p.t < 0 ? '#3a7ab8' : '#1a1a1a'}
            fontFamily="inherit"
          >
            {p.t > 0 ? `+${p.t.toFixed(0)}` : p.t.toFixed(0)}°
          </text>
        </g>
      ))}
    </svg>
  );
}

function PrecipBars({ hours, width }: { hours: HourlySlot[]; width: number }) {
  const maxPrecip = Math.max(...hours.map((h) => h.precipitationMm), 0.5);
  const h = ROW_PRECIP_H;
  const barMaxH = h - 10;

  return (
    <svg width={width} height={h} style={{ display: 'block' }}>
      {hours.map((slot, i) => {
        const barH = (slot.precipitationMm / maxPrecip) * barMaxH;
        const x = i * COL_W + COL_W / 2 - 11;
        return (
          <g key={i}>
            <rect
              x={x}
              y={h - barH - 4}
              width={22}
              height={Math.max(barH, 0)}
              fill="#4a90d9"
              opacity={0.72}
              rx={2.5}
            />
            {slot.precipitationMm >= 0.2 && (
              <text
                x={x + 11}
                y={h - barH - 7}
                textAnchor="middle"
                fontSize={9}
                fill="#2971b8"
                fontFamily="inherit"
                fontWeight={600}
              >
                {slot.precipitationMm.toFixed(1)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

const ROW_BORDER = '1px solid #e8e8e4';

export function HourlyStrip({ hours }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const totalWidth = useMemo(() => hours.length * COL_W, [hours.length]);

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    if (!el) return;
    const startX = e.pageX;
    const startScroll = el.scrollLeft;
    let dragged = false;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.pageX - startX;
      if (Math.abs(dx) > 4) dragged = true;
      if (dragged) el.scrollLeft = startScroll - dx;
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
      {/* Fade hint on right edge */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 32,
          background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.85))',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
      <div
        ref={scrollRef}
        style={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          cursor: 'grab',
          userSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
      >
        <div style={{ width: totalWidth }}>
          {/* Time labels row */}
          <div style={{ display: 'flex', height: ROW_TIME_H, borderBottom: ROW_BORDER }}>
            {hours.map((slot, i) => (
              <div
                key={i}
                style={{
                  width: COL_W,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#555',
                  fontSize: 12,
                  fontWeight: 500,
                  borderRight: ROW_BORDER,
                }}
              >
                {formatHour(slot.from)}
              </div>
            ))}
          </div>

          {/* Weather icons row */}
          <div style={{ display: 'flex', height: ROW_ICON_H, borderBottom: ROW_BORDER }}>
            {hours.map((slot, i) => (
              <div
                key={i}
                style={{
                  width: COL_W,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRight: ROW_BORDER,
                }}
              >
                <WeatherIcon symbolVar={slot.symbolVar} symbolName={slot.symbolName} size={26} />
              </div>
            ))}
          </div>

          {/* Temperature curve row */}
          <div style={{ borderBottom: ROW_BORDER, overflow: 'visible' }}>
            <TempCurve hours={hours} width={totalWidth} />
          </div>

          {/* Precipitation row */}
          <div style={{ background: '#f7f8fb', borderBottom: ROW_BORDER }}>
            <PrecipBars hours={hours} width={totalWidth} />
          </div>

          {/* Wind row */}
          <div style={{ display: 'flex', height: ROW_WIND_H }}>
            {hours.map((slot, i) => (
              <div
                key={i}
                style={{
                  width: COL_W,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRight: ROW_BORDER,
                }}
              >
                <WindArrow deg={slot.windDeg} mps={slot.windMps} size={18} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
