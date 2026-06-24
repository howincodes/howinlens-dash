interface Props {
  score: number | null;
  size?: number;
}

export default function ConsistencyGauge({ score, size = 120 }: Props) {
  if (score === null || score === undefined) {
    return (
      <div className="flex flex-col items-center text-sm text-muted-foreground" style={{ width: size }}>
        <div className="flex items-center justify-center" style={{ width: size, height: size }}>
          No data
        </div>
      </div>
    );
  }
  const pct = Math.max(0, Math.min(1, score)) * 100;
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct / 100);

  let colorClass = 'text-red-500';
  if (pct > 70) colorClass = 'text-green-500';
  else if (pct > 40) colorClass = 'text-amber-500';

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeOpacity={0.15} strokeWidth={8} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className={colorClass}
            stroke="currentColor"
            strokeWidth={8}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-2xl font-bold">{Math.round(pct)}%</div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-2">Consistency</div>
    </div>
  );
}
