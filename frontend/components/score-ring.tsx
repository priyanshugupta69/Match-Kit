"use client";

export function ScoreRing({
  score,
  size = 64,
  label,
}: {
  score: number;
  size?: number;
  label?: string;
}) {
  const pct = Math.round(score * 100);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score * circumference);

  const color =
    pct >= 75 ? "#1a3cff" : pct >= 50 ? "#f59e0b" : "#e8440a";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e5e5"
          strokeWidth={4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize={size * 0.24}
          fontWeight={600}
          fontFamily="monospace"
          transform={`rotate(90, ${size / 2}, ${size / 2})`}
        >
          {pct}%
        </text>
      </svg>
      {label && (
        <span className="text-xs text-zinc-500 font-mono">{label}</span>
      )}
    </div>
  );
}
