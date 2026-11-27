import React from 'react';
import { MoodEntry, WeeklyEvaluation } from '../types';

export interface RadarAxis {
  label: string;
  value: number; // 0..100
}

export const RadarChart: React.FC<{ axes: RadarAxis[]; size?: number }> = ({
  axes,
  size = 290,
}) => {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.34;
  const levels = [25, 50, 75, 100];
  const n = axes.length;

  const pointAt = (index: number, pct: number) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    const r = (maxR * Math.max(0, Math.min(100, pct))) / 100;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const polygonPoints = axes
    .map((a, i) => {
      const p = pointAt(i, a.value);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full max-w-[310px] mx-auto block select-none"
      role="img"
      aria-label="رسم رادار لدرجات الشخصية"
    >
      {/* Concentric rings */}
      {levels.map((lvl) => {
        const pts = axes
          .map((_, i) => {
            const p = pointAt(i, lvl);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          })
          .join(' ');
        return (
          <polygon
            key={lvl}
            points={pts}
            fill="none"
            stroke="rgba(255,255,255,0.09)"
            strokeWidth="1"
          />
        );
      })}

      {/* Radial axes */}
      {axes.map((_, i) => {
        const outer = pointAt(i, 100);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={outer.x}
            y2={outer.y}
            stroke="rgba(255,255,255,0.09)"
            strokeWidth="1"
          />
        );
      })}

      {/* Filled data polygon */}
      <polygon
        points={polygonPoints}
        fill="rgba(212, 168, 83, 0.22)"
        stroke="#D4A853"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      {/* Data nodes & labels */}
      {axes.map((axis, i) => {
        const pt = pointAt(i, axis.value);
        const labelPt = pointAt(i, 126);
        const anchor =
          Math.abs(labelPt.x - cx) < 12
            ? 'middle'
            : labelPt.x > cx
            ? 'start'
            : 'end';

        return (
          <g key={axis.label}>
            <circle cx={pt.x} cy={pt.y} r="4" fill="#D4A853" stroke="#0B0D12" strokeWidth="1.5" />
            <text
              x={labelPt.x}
              y={labelPt.y - 3}
              textAnchor={anchor}
              fill="#E5E1D8"
              fontSize="11.5"
              fontWeight="600"
            >
              {axis.label}
            </text>
            <text
              x={labelPt.x}
              y={labelPt.y + 12}
              textAnchor={anchor}
              fill="#D4A853"
              fontSize="11"
              fontWeight="700"
              className="tabular-nums"
            >
              {axis.value}%
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export const MoodLineChart: React.FC<{ entries: MoodEntry[] }> = ({ entries }) => {
  const recent = [...entries].slice(0, 14).reverse();
  if (recent.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-[#9CA3AF]">
        سجّل حالتك المزاجية ليظهر مسارك النفسي هنا.
      </div>
    );
  }

  const w = 360;
  const h = 150;
  const padX = 28;
  const padY = 20;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;

  const coords = recent.map((entry, idx) => {
    const x =
      recent.length === 1
        ? w / 2
        : padX + (innerW * idx) / (recent.length - 1);
    const y = padY + innerH - ((entry.level - 1) / 4) * innerH;
    return { x, y, entry };
  });

  const polyline = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPath =
    coords.length > 1
      ? `M ${coords[0].x},${padY + innerH} ` +
        coords.map((c) => `L ${c.x},${c.y}`).join(' ') +
        ` L ${coords[coords.length - 1].x},${padY + innerH} Z`
      : '';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40 block select-none" role="img" aria-label="رسم بياني للمزاج">
      {[1, 2, 3, 4, 5].map((lvl) => {
        const y = padY + innerH - ((lvl - 1) / 4) * innerH;
        return (
          <g key={lvl}>
            <line
              x1={padX}
              y1={y}
              x2={w - padX}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="3 3"
            />
            <text x={12} y={y + 4} fill="#6B7280" fontSize="10" className="tabular-nums">
              {lvl}
            </text>
          </g>
        );
      })}

      {areaPath && <path d={areaPath} fill="rgba(212, 168, 83, 0.12)" />}

      {coords.length > 1 && (
        <polyline
          points={polyline}
          fill="none"
          stroke="#D4A853"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {coords.map((c) => (
        <g key={c.entry.id}>
          <circle
            cx={c.x}
            cy={c.y}
            r="4.5"
            fill={c.entry.level <= 2 ? '#F87171' : c.entry.level === 3 ? '#F59E0B' : '#D4A853'}
            stroke="#0B0D12"
            strokeWidth="1.5"
          />
          <text
            x={c.x}
            y={h - 4}
            textAnchor="middle"
            fill="#6B7280"
            fontSize="9"
            className="tabular-nums"
          >
            {c.entry.date.slice(5)}
          </text>
        </g>
      ))}
    </svg>
  );
};

export const WeeklyProgressChart: React.FC<{ evaluations: WeeklyEvaluation[] }> = ({
  evaluations,
}) => {
  const recent = [...evaluations].slice(0, 8).reverse();
  if (recent.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-[#9CA3AF]">
        أضف أول تقييم أسبوعي لتتبع تطورك عبر الأسابيع.
      </div>
    );
  }

  const w = 360;
  const h = 165;
  const padX = 28;
  const padTop = 18;
  const padBottom = 28;
  const innerW = w - padX * 2;
  const innerH = h - padTop - padBottom;

  const avgOf = (ev: WeeklyEvaluation) => {
    const s = ev.scores;
    return (s.emotionalBalance + s.boundaries + s.presence + s.persuasion + s.discipline) / 5;
  };

  const barW = Math.min(34, Math.max(16, innerW / recent.length - 10));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44 block select-none" role="img" aria-label="رسم التقييم الأسبوعي">
      {[2, 4, 6, 8, 10].map((v) => {
        const y = padTop + innerH - (v / 10) * innerH;
        return (
          <g key={v}>
            <line x1={padX} y1={y} x2={w - padX} y2={y} stroke="rgba(255,255,255,0.06)" />
            <text x={10} y={y + 3} fill="#6B7280" fontSize="9.5" className="tabular-nums">
              {v}
            </text>
          </g>
        );
      })}

      {recent.map((ev, i) => {
        const avg = avgOf(ev);
        const slot = innerW / recent.length;
        const cx = padX + slot * i + slot / 2;
        const bh = (avg / 10) * innerH;
        const y = padTop + innerH - bh;
        return (
          <g key={ev.id}>
            <rect
              x={cx - barW / 2}
              y={y}
              width={barW}
              height={bh}
              rx="6"
              fill="#D4A853"
              fillOpacity="0.82"
            />
            <text
              x={cx}
              y={y - 5}
              textAnchor="middle"
              fill="#F2EFE9"
              fontSize="10"
              fontWeight="700"
              className="tabular-nums"
            >
              {avg.toFixed(1)}
            </text>
            <text
              x={cx}
              y={h - 8}
              textAnchor="middle"
              fill="#9CA3AF"
              fontSize="9.5"
            >
              {ev.weekLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
