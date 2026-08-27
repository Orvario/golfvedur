interface Props {
  deg: number;
  mps: number;
  size?: number;
  light?: boolean;
}

export function WindArrow({ deg, mps, size = 20, light = false }: Props) {
  const fill = light ? '#FFFFFF' : '#7EC8FF';
  const text = light ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.75)';
  const unit = light ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.4)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        style={{ transform: `rotate(${deg}deg)`, display: 'block' }}
      >
        <polygon points="12,3 16,18 12,15 8,18" fill={fill} opacity={0.9} />
      </svg>
      <span style={{ fontSize: 11, color: text, fontWeight: 600, letterSpacing: 0, fontVariantNumeric: 'tabular-nums' }}>
        {mps.toFixed(0)}
        <span style={{ fontSize: 9, color: unit }}>m/s</span>
      </span>
    </div>
  );
}
