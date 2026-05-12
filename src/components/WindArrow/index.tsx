interface Props {
  deg: number;
  mps: number;
  size?: number;
}

export function WindArrow({ deg, mps, size = 20 }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        style={{ transform: `rotate(${deg}deg)`, display: 'block' }}
      >
        {/* Arrow pointing "from" direction — rotate so 0° = N */}
        <polygon
          points="12,3 16,18 12,15 8,18"
          fill="#003c71"
          opacity={0.85}
        />
      </svg>
      <span style={{ fontSize: 11, color: '#444', fontWeight: 500, letterSpacing: 0 }}>
        {mps.toFixed(0)}<span style={{ fontSize: 9, color: '#888' }}>m/s</span>
      </span>
    </div>
  );
}
