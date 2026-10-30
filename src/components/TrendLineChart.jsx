import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

function useWidth() {
  const [el, setEl] = useState(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, w];
}

const H = 220;
const M = { top: 14, right: 14, bottom: 26, left: 40 };

/**
 * Single-series % line over `n` slots (days). Always draws the full axis.
 * points: [{ i: 1..n, pct: 0..100, tip: 'text' }] in order; slots without a point are left as gaps.
 * xLabel(i) -> axis text; highlight = slot to emphasise (today).
 */
export default function TrendLineChart({ title, subtitle, n, points, xLabel, highlight, emptyText }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const innerW = Math.max(width - M.left - M.right, 0);
  const innerH = H - M.top - M.bottom;
  const x = (i) => M.left + ((i - 1) / Math.max(n - 1, 1)) * innerW;
  const y = (p) => M.top + innerH - (p / 100) * innerH;
  const byI = new Map(points.map((p) => [p.i, p]));

  // break the line where a day has no data
  let d = '';
  let prev = null;
  for (const p of points) {
    d += `${prev !== null && p.i === prev + 1 ? 'L' : 'M'}${x(p.i)},${y(p.pct)} `;
    prev = p.i;
  }
  const step = innerW / Math.max(n - 1, 1) < 40 ? 5 : 1;
  const hp = hover ? byI.get(hover) : null;
  const last = points.at(-1);

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - rect.left - M.left) / innerW) * (n - 1)) + 1;
    setHover(byI.has(i) ? i : null);
  };

  return (
    <Card sx={{ minWidth: 0 }}>
      <CardContent>
        <Typography variant="h6">{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{subtitle}</Typography>}
        <Box
          ref={ref}
          sx={(theme) => ({ position: 'relative', width: '100%', height: H, overflow: 'hidden', '--line': '#4f46e5', ...theme.applyStyles('dark', { '--line': '#7477f5' }) })}
        >
          {width > 0 && (
            <svg width={width} height={H} style={{ position: 'absolute', inset: 0 }} onMouseMove={onMove} onMouseLeave={() => setHover(null)} onClick={onMove} role="img" aria-label={title}>
              {[0, 50, 100].map((v) => (
                <g key={v}>
                  <line x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} stroke="var(--mui-palette-divider)" strokeWidth="1" />
                  <text x={M.left - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--mui-palette-text-secondary)">{v}%</text>
                </g>
              ))}
              {Array.from({ length: n }, (_, k) => k + 1).filter((i) => i === 1 || i % step === 0 || i === n).map((i) => (
                <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--mui-palette-text-secondary)" fontWeight={i === highlight ? 700 : 400}>
                  {xLabel(i)}
                </text>
              ))}
              {d && <path d={d} fill="none" stroke="var(--line)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
              {/* single isolated points still show as dots */}
              {points.filter((p) => !byI.has(p.i - 1) && !byI.has(p.i + 1)).map((p) => (
                <circle key={p.i} cx={x(p.i)} cy={y(p.pct)} r="4" fill="var(--line)" />
              ))}
              {hp && <line x1={x(hp.i)} x2={x(hp.i)} y1={M.top} y2={y(0)} stroke="var(--mui-palette-text-secondary)" strokeWidth="1" opacity="0.5" />}
              {(hp || last) && (
                <circle cx={x((hp || last).i)} cy={y((hp || last).pct)} r="5" fill="var(--line)" stroke="var(--mui-palette-background-paper)" strokeWidth="2" />
              )}
            </svg>
          )}
          {points.length === 0 && emptyText && (
            <Box sx={{ position: 'absolute', inset: `${M.top}px ${M.right}px ${M.bottom}px ${M.left}px`, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
              <Typography variant="body2" color="text.secondary" sx={{ bgcolor: 'background.paper', px: 1.5, py: 0.5, borderRadius: 1 }}>{emptyText}</Typography>
            </Box>
          )}
          {hp && (
            <Box sx={{ position: 'absolute', top: 0, left: Math.min(Math.max(x(hp.i) - 75, 0), Math.max(width - 150, 0)), width: 150, pointerEvents: 'none', bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, boxShadow: 3, px: 1.25, py: 0.75 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{hp.tip}</Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
