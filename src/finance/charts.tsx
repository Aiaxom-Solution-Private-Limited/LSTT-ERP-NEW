/**
 * Small SVG/HTML charts for the finance dashboard. Colours follow the validated
 * default categorical palette (slot 1 blue, slot 2 orange); light mode only,
 * matching the rest of the ERP. Text uses text colours, never series colours.
 */
import React, { useState } from 'react';
import { inr } from './api';

const SERIES = ['#2a78d6', '#eb6834'];

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p) * p;
}
const compact = (v: number) => {
  const a = Math.abs(v), s = v < 0 ? '−' : '';
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(a >= 1e8 ? 0 : 1)}Cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(a >= 1e6 ? 0 : 1)}L`;
  if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(0)}k`;
  return `${s}₹${a.toFixed(0)}`;
};

export interface Series { name: string; values: (string | number)[] }

/** Grouped (or single) vertical bars with a shared zero baseline; supports negatives. */
export const BarChart: React.FC<{ categories: string[]; series: Series[]; height?: number; empty?: string }> = ({ categories, series, height = 220, empty = 'No data for this period' }) => {
  const [hover, setHover] = useState<number | null>(null);
  if (!categories.length) return <div className="text-xs text-slate-400 py-10 text-center">{empty}</div>;
  const vals = series.flatMap((s) => s.values.map(Number));
  const max = niceMax(Math.max(0, ...vals));
  const min = Math.min(0, ...vals) < 0 ? -niceMax(-Math.min(...vals)) : 0;
  const W = 480, H = height, padL = 56, padB = 34, padT = 10;
  const plotH = H - padB - padT, plotW = W - padL - 8;
  const y = (v: number) => padT + ((max - v) / (max - min)) * plotH;
  const band = plotW / categories.length;
  const barW = Math.max(4, Math.min(28, (band - 10) / series.length - 2));
  const ticks = [min, min / 2, 0, max / 2, max].filter((v, i, a) => a.indexOf(v) === i && (v !== min / 2 || min < 0));
  return (
    <div className="relative">
      {series.length > 1 && (
        <div className="flex gap-4 mb-2 text-[11px] text-slate-600">
          {series.map((s, i) => <span key={s.name} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: SERIES[i] }} />{s.name}</span>)}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={series.map((s) => s.name).join(' and ') + ' by ' + categories.join(', ')}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - 8} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#94a3b8' : '#e2e8f0'} strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize={12} fill="#64748b">{compact(t)}</text>
          </g>
        ))}
        {categories.map((c, ci) => {
          const x0 = padL + ci * band + (band - (barW + 2) * series.length) / 2;
          return (
            <g key={c} onMouseEnter={() => setHover(ci)} onMouseLeave={() => setHover(null)}>
              <rect x={padL + ci * band} y={padT} width={band} height={plotH} fill={hover === ci ? '#f1f5f9' : 'transparent'} />
              {series.map((s, si) => {
                const v = Number(s.values[ci]);
                const top = Math.min(y(v), y(0)), h = Math.max(1, Math.abs(y(v) - y(0)));
                return <rect key={si} x={x0 + si * (barW + 2)} y={top} width={barW} height={h} rx={Math.min(4, barW / 2)} fill={SERIES[si]} />;
              })}
              <text x={padL + ci * band + band / 2} y={H - padB + 14} textAnchor="middle" fontSize={12} fill="#64748b">
                {c.length > 12 ? c.slice(0, 11) + '…' : c}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="absolute top-6 right-2 bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 text-[11px] pointer-events-none">
          <div className="font-semibold text-slate-900 mb-1">{categories[hover]}</div>
          {series.map((s, i) => (
            <div key={s.name} className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2 h-2 rounded-sm" style={{ background: SERIES[i] }} />{s.name}: <span className="tabular-nums font-semibold">{inr(String(s.values[hover]))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** Ranked horizontal bars (single series) — category and supplier distribution. */
export const HBars: React.FC<{ rows: { label: string; value: string }[]; empty?: string; limit?: number }> = ({ rows, empty = 'No recorded amounts', limit = 10 }) => {
  const sorted = [...rows].filter((r) => Number(r.value) !== 0).sort((a, b) => Number(b.value) - Number(a.value)).slice(0, limit);
  if (!sorted.length) return <div className="text-xs text-slate-400 py-6 text-center">{empty}</div>;
  const max = Math.max(...sorted.map((r) => Math.abs(Number(r.value))));
  return (
    <ul className="space-y-2">
      {sorted.map((r) => (
        <li key={r.label} className="text-xs" title={`${r.label}: ${inr(r.value)}`}>
          <div className="flex justify-between gap-2 mb-0.5">
            <span className="text-slate-700 truncate">{r.label}</span>
            <span className="tabular-nums text-slate-900 font-semibold">{inr(r.value, { decimals: false })}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded">
            <div className="h-2 rounded" style={{ width: `${Math.max(1, (Math.abs(Number(r.value)) / max) * 100)}%`, background: SERIES[0] }} />
          </div>
        </li>
      ))}
    </ul>
  );
};
