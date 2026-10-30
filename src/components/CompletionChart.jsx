import { useEffect, useMemo, useRef, useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import BarChartIcon from '@mui/icons-material/BarChart';
import TableRowsIcon from '@mui/icons-material/TableRows';
import { prettyDate } from '../utils';

const HEIGHT = 200;
const M = { top: 12, right: 8, bottom: 26, left: 40 };
const TICKS = [0, 50, 100];
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pctOf = (d) => (d.total ? Math.round((d.done / d.total) * 100) : null);

function weekday(date) {
  const [y, m, d] = date.split('-').map(Number);
  return WEEKDAY[new Date(y, m - 1, d).getDay()];
}

function shortDate(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Column path with a 4px rounded data-end and a square baseline */
function barPath(x, y, w, h) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/**
 * Daily task-completion % as a column chart. Always rendered (axes + empty note when there is no data).
 * days: [{ date: 'YYYY-MM-DD', total, done }]
 */
export default function CompletionChart({ title, days, today, loading }) {
  const [ref, width] = useWidth();
  const [view, setView] = useState('chart');
  const [active, setActive] = useState(null);

  const tracked = useMemo(() => (days || []).filter((d) => d.total > 0), [days]);
  const avg = tracked.length
    ? Math.round(tracked.reduce((s, d) => s + d.done / d.total, 0) / tracked.length * 100)
    : null;
  const best = tracked.reduce((b, d) => (b === null || pctOf(d) > pctOf(b) ? d : b), null);

  const n = days?.length || 0;
  const innerW = Math.max(width - M.left - M.right, 0);
  const innerH = HEIGHT - M.top - M.bottom;
  const band = n ? innerW / n : 0;
  const barW = Math.max(Math.min(24, band - 2), 2);
  const labelStep = band ? Math.max(1, Math.ceil(30 / band)) : 1;
  const y = (p) => M.top + innerH - (p / 100) * innerH;

  const activeDay = active !== null ? days[active] : null;

  return (
    <Card sx={{ minWidth: 0 }}>
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6">{title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {avg === null
                ? 'Roz ka task completion %'
                : `Average ${avg}% · ${tracked.length} din tracked${best ? ` · Best ${pctOf(best)}% on ${shortDate(best.date)}` : ''}`}
            </Typography>
          </Box>
          <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}>
            <ToggleButton value="chart" aria-label="Chart view"><BarChartIcon fontSize="small" /></ToggleButton>
            <ToggleButton value="table" aria-label="Table view"><TableRowsIcon fontSize="small" /></ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {loading && !days ? (
          <Skeleton variant="rounded" height={HEIGHT} />
        ) : view === 'table' ? (
          <Box sx={{ maxHeight: HEIGHT + 40, overflowY: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Done</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">%</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(days || []).filter((d) => !today || d.date <= today).slice().reverse().map((d) => (
                  <TableRow key={d.date}>
                    <TableCell>{weekday(d.date)}, {prettyDate(d.date)}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{d.done}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{d.total}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{pctOf(d) === null ? '–' : `${pctOf(d)}%`}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        ) : (
          <Box
            ref={ref}
            onMouseLeave={() => setActive(null)}
            sx={(theme) => ({
              position: 'relative',
              width: '100%',
              minWidth: 0,
              overflow: 'hidden',
              height: HEIGHT,
              '--bar': '#4f46e5',
              ...theme.applyStyles('dark', { '--bar': '#7477f5' }),
            })}
          >
            {width > 0 && (
              <svg
                width={width}
                height={HEIGHT}
                role="img"
                aria-label={`${title}: daily completion percentage`}
                // absolute so the svg never props the card open; the box's own width drives the redraw
                style={{ position: 'absolute', inset: 0, display: 'block' }}
              >
                {/* recessive hairline grid + y ticks */}
                {TICKS.map((t) => (
                  <g key={t}>
                    <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="var(--mui-palette-divider)" strokeWidth="1" />
                    <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--mui-palette-text-secondary)">
                      {t}%
                    </text>
                  </g>
                ))}

                {(days || []).map((d, i) => {
                  const x = M.left + i * band;
                  const p = pctOf(d);
                  const isActive = active === i;
                  const isToday = d.date === today;
                  const future = today && d.date > today;
                  const h = p === null ? 0 : Math.max((p / 100) * innerH, 2);
                  return (
                    <g key={d.date}>
                      {isActive && <rect x={x} y={M.top} width={band} height={innerH} fill="var(--mui-palette-action-hover)" />}
                      {p !== null && (
                        <path
                          d={barPath(x + (band - barW) / 2, M.top + innerH - h, barW, h)}
                          fill="var(--bar)"
                          opacity={p === 0 ? 0.45 : 1}
                        />
                      )}
                      {i % labelStep === 0 || isToday ? (
                        <text
                          x={x + band / 2}
                          y={HEIGHT - 8}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight={isToday ? 700 : 400}
                          fill={isToday ? 'var(--mui-palette-text-primary)' : 'var(--mui-palette-text-secondary)'}
                          opacity={future ? 0.5 : 1}
                        >
                          {Number(d.date.slice(8))}
                        </text>
                      ) : null}
                      {/* hit target: the whole column, bigger than the bar */}
                      <rect
                        x={x}
                        y={M.top}
                        width={band}
                        height={innerH + M.bottom}
                        fill="transparent"
                        onMouseEnter={() => setActive(i)}
                        onClick={() => setActive(i)}
                        style={{ cursor: 'pointer' }}
                      />
                    </g>
                  );
                })}
              </svg>
            )}

            {tracked.length === 0 && (
              <Box sx={{ position: 'absolute', inset: `${M.top}px ${M.right}px ${M.bottom}px ${M.left}px`, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
                <Typography variant="body2" color="text.secondary" sx={{ bgcolor: 'background.paper', px: 1.5, py: 0.5, borderRadius: 1 }}>
                  Abhi data nahi hai. Tasks add karo, bars yahan dikhenge.
                </Typography>
              </Box>
            )}

            {activeDay && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: Math.min(Math.max(M.left + active * band + band / 2 - 80, 0), Math.max(width - 160, 0)),
                  width: 160,
                  pointerEvents: 'none',
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  boxShadow: 3,
                  px: 1.25,
                  py: 0.75,
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {weekday(activeDay.date)}, {prettyDate(activeDay.date)}
                </Typography>
                {activeDay.total ? (
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: 'var(--bar)' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {activeDay.done}/{activeDay.total} done · {pctOf(activeDay)}%
                    </Typography>
                  </Stack>
                ) : (
                  <Typography variant="body2">{today && activeDay.date > today ? 'Abhi aane wala din' : 'Koi task nahi'}</Typography>
                )}
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
